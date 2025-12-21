"""
Unread Thread Nudges - Scheduled job

Replaces: supabase/functions/unread-thread-nudges/index.ts

Schedule: Every 15 minutes (*/15 * * * *)

This job finds chat threads with stale unread messages (3+ hours old) and creates
domain events to nudge users. The notify-fan-out service processes these events.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, TypedDict

from supabase import Client, create_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# 3 hours in milliseconds
DEFAULT_STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000


class StaleThreadRow(TypedDict):
    """Stale thread with unread messages."""

    thread_id: str
    project_id: str
    topic: Optional[str]
    user_id: str
    last_read_at: str
    latest_message_at: str
    latest_sender_id: str
    unread_count: int


def check_user_preference(
    supabase: Client,
    user_id: str,
    scope_type: str,
    scope_id: str,
    event_type: str,
    channel: str,
    project_id: str,
) -> bool:
    """
    Check if user has muted notifications.

    Args:
        supabase: Supabase client
        user_id: User ID
        scope_type: Scope type (thread, project, global)
        scope_id: Scope ID (thread_id or project_id)
        event_type: Event type
        channel: Notification channel (in_app, email, *)
        project_id: Project ID

    Returns:
        True if muted, False otherwise
    """
    response = supabase.from_("user_notification_preferences").select("*").eq("user_id", user_id).execute()

    prefs = response.data if response.data else []
    if not prefs:
        return False

    # Filter to relevant preferences
    relevant = [
        p for p in prefs if (p["event_type"] == event_type or p["event_type"] == "*") and (p["channel"] == channel or p["channel"] == "*")
    ]

    # Check Thread scope (highest priority)
    thread_pref = next((p for p in relevant if p["scope_type"] == "thread" and p["scope_id"] == scope_id), None)
    if thread_pref:
        return thread_pref["status"] == "muted"

    # Check Project scope
    project_pref = next((p for p in relevant if p["scope_type"] == "project" and p["scope_id"] == project_id), None)
    if project_pref:
        return project_pref["status"] == "muted"

    # Check Global scope
    global_pref = next((p for p in relevant if p["scope_type"] == "global"), None)
    if global_pref:
        return global_pref["status"] == "muted"

    return False


def get_project_name(supabase: Client, project_id: str) -> str:
    """Get project name."""
    response = supabase.from_("projects").select("name").eq("id", project_id).single().execute()
    return response.data["name"] if response.data else "Project"


def process_unread_thread_nudges(
    supabase: Client, now: datetime, dry_run: bool, threshold_ms: int
) -> Dict[str, Any]:
    """
    Process unread thread nudges.

    Args:
        supabase: Supabase client
        now: Current time
        dry_run: If True, don't create events
        threshold_ms: Threshold in milliseconds for stale messages

    Returns:
        Result summary
    """
    logger.info(f"Starting processing. dry_run={dry_run}, threshold={threshold_ms / 60000}min")

    threshold_time = now - timedelta(milliseconds=threshold_ms)

    # Step 1: Get all chat threads
    threads_response = supabase.from_("chat_threads").select("id, project_id, topic").execute()

    threads = threads_response.data if threads_response.data else []

    if not threads:
        logger.info("No threads found")
        return {"processed": 0, "eventsCreated": 0, "dryRun": dry_run}

    stale_unread_list: List[StaleThreadRow] = []

    # Step 2: For each thread, check if there are stale unread messages
    for thread in threads:
        thread_id = thread["id"]

        # Get the latest message in this thread
        latest_msg_response = (
            supabase.from_("project_messages")
            .select("created_at, user_id")
            .eq("thread_id", thread_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        latest_messages = latest_msg_response.data if latest_msg_response.data else []

        if not latest_messages:
            continue  # No messages in thread

        latest_message = latest_messages[0]
        latest_message_at = datetime.fromisoformat(latest_message["created_at"].replace("Z", "+00:00"))

        # Check if the latest message is older than threshold
        if latest_message_at >= threshold_time:
            continue  # Message is not stale yet

        # Get all participants in this thread
        participants_response = (
            supabase.from_("chat_thread_participants").select("user_id, last_read_at").eq("thread_id", thread_id).execute()
        )

        participants = participants_response.data if participants_response.data else []

        if not participants:
            continue

        # Check each participant (except the message sender)
        for participant in participants:
            # Skip the sender
            if participant["user_id"] == latest_message["user_id"]:
                continue

            last_read_at = datetime.fromisoformat(participant["last_read_at"].replace("Z", "+00:00"))

            # Check if this participant has unread messages (hasn't read since latest message)
            if last_read_at >= latest_message_at:
                continue  # They've already read it

            # Count unread messages for this participant
            count_response = (
                supabase.from_("project_messages")
                .select("id", count="exact")
                .eq("thread_id", thread_id)
                .gt("created_at", participant["last_read_at"])
                .execute()
            )

            unread_count = count_response.count if count_response.count is not None else 1

            # This participant has unread stale messages
            stale_unread_list.append(
                {
                    "thread_id": thread_id,
                    "project_id": thread["project_id"],
                    "topic": thread.get("topic"),
                    "user_id": participant["user_id"],
                    "last_read_at": participant["last_read_at"],
                    "latest_message_at": latest_message["created_at"],
                    "latest_sender_id": latest_message["user_id"],
                    "unread_count": unread_count,
                }
            )

    logger.info(f"Found {len(stale_unread_list)} stale unread thread/user combinations")

    if not stale_unread_list:
        return {"processed": 0, "eventsCreated": 0, "dryRun": dry_run}

    events_created = 0
    preview = []

    # Step 3: Process each stale unread entry
    for entry in stale_unread_list:
        # Check dedupe log - has this user already been notified for this thread with this latest message?
        dedupe_response = (
            supabase.from_("unread_thread_stale_log")
            .select("id")
            .eq("thread_id", entry["thread_id"])
            .eq("user_id", entry["user_id"])
            .eq("latest_message_at", entry["latest_message_at"])
            .limit(1)
            .execute()
        )

        existing_log = dedupe_response.data if dedupe_response.data else []

        if existing_log:
            # Already notified for this latest message batch
            continue

        # Check user preferences (mute check)
        is_muted = check_user_preference(
            supabase,
            entry["user_id"],
            scope_type="thread",
            scope_id=entry["thread_id"],
            event_type="thread_unread_stale",
            channel="in_app",
            project_id=entry["project_id"],
        )

        if is_muted:
            logger.info(f"User {entry['user_id']} has muted notifications for thread {entry['thread_id']}")
            continue

        # Get project name for the notification
        project_name = get_project_name(supabase, entry["project_id"])
        topic = entry.get("topic")
        thread_label = f"#{topic}" if topic and not topic.startswith("#") else (topic if topic else "#general")

        if dry_run:
            preview.append(
                {
                    "thread_id": entry["thread_id"],
                    "project_id": entry["project_id"],
                    "project_name": project_name,
                    "thread_label": thread_label,
                    "user_id": entry["user_id"],
                    "last_read_at": entry["last_read_at"],
                    "latest_message_at": entry["latest_message_at"],
                    "latest_sender_id": entry["latest_sender_id"],
                    "unread_count": entry["unread_count"],
                    "would_notify": True,
                }
            )
            continue

        # Create domain event
        event_response = (
            supabase.from_("domain_events")
            .insert(
                {
                    "event_type": "thread_unread_stale",
                    "actor_id": None,  # System-generated
                    "project_id": entry["project_id"],
                    "thread_id": entry["thread_id"],
                    "payload": {
                        "user_id": entry["user_id"],
                        "thread_topic": entry.get("topic"),
                        "latest_message_at": entry["latest_message_at"],
                        "latest_sender_id": entry["latest_sender_id"],
                        "anchor_last_read_at": entry["last_read_at"],
                        "unread_count": entry["unread_count"],
                    },
                    "occurred_at": now.isoformat(),
                }
            )
            .execute()
            .data
        )

        if not event_response or not event_response[0]:
            logger.error("Error creating domain event")
            continue

        domain_event = event_response[0]
        logger.info(f"Created domain event {domain_event['id']} for user {entry['user_id']} in thread {entry['thread_id']}")

        # Insert into dedupe log (keyed by latest_message_at so new messages trigger new nudges)
        supabase.from_("unread_thread_stale_log").insert(
            {
                "thread_id": entry["thread_id"],
                "user_id": entry["user_id"],
                "latest_message_at": entry["latest_message_at"],
                "event_id": domain_event["id"],
                "sent_at": now.isoformat(),
            }
        ).execute()

        # Note: Domain event created. The GCP notify-fan-out service will automatically
        # poll and process this event within 0-60 seconds (avg 30s).

        events_created += 1

    logger.info(f"Completed. Created {events_created} domain events.")

    return {
        "processed": len(stale_unread_list),
        "eventsCreated": events_created,
        "dryRun": dry_run,
        "preview": preview if dry_run else None,
    }


def main():
    """Main entry point for unread-thread-nudges job."""
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 80)
    logger.info("Starting Unread Thread Nudges Job")
    logger.info(f"Started at: {start_time.isoformat()}")
    logger.info("=" * 80)

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    dry_run = os.getenv("DRY_RUN", "false").lower() == "true"
    threshold_minutes = int(os.getenv("THRESHOLD_MINUTES", "180"))  # Default: 3 hours

    if not supabase_url or not service_role_key:
        logger.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return 1

    logger.info(f"DRY_RUN: {dry_run}")
    logger.info(f"THRESHOLD_MINUTES: {threshold_minutes}")

    # Create Supabase admin client
    supabase: Client = create_client(supabase_url, service_role_key)

    try:
        threshold_ms = threshold_minutes * 60 * 1000
        result = process_unread_thread_nudges(supabase, start_time, dry_run, threshold_ms)

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(f"Job completed in {duration:.2f} seconds")
        logger.info(f"Processed: {result['processed']}, Events Created: {result['eventsCreated']}")
        if result.get("preview"):
            logger.info(f"Preview (dry run): {len(result['preview'])} would be notified")
        logger.info("=" * 80)

        return 0

    except Exception as error:
        logger.error(f"Fatal error in unread-thread-nudges job: {error}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
