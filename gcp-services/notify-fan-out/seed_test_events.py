#!/usr/bin/env python3
"""
Seed script to populate domain_events table with test events for notify-fan-out service.

Usage:
    python seed_test_events.py --env-file .env.local
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID

from dotenv import load_dotenv
from supabase import Client, create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def get_sample_ids(client: Client) -> Dict[str, Any]:
    """Fetch sample IDs from database for realistic test data."""
    logger.info("Fetching sample IDs from database...")

    sample_ids = {
        "user_ids": [],
        "org_ids": [],
        "project_ids": [],
        "thread_ids": [],
        "meeting_ids": [],
        "resource_ids": [],
    }

    # Get sample users
    try:
        response = client.table("profiles").select("id").limit(5).execute()
        sample_ids["user_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample users", len(sample_ids["user_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample users: %s", e)

    # Get sample orgs
    try:
        response = client.table("orgs").select("id").limit(3).execute()
        sample_ids["org_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample orgs", len(sample_ids["org_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample orgs: %s", e)

    # Get sample projects
    try:
        response = client.table("projects").select("id").limit(5).execute()
        sample_ids["project_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample projects", len(sample_ids["project_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample projects: %s", e)

    # Get sample chat threads
    try:
        response = client.table("chat_threads").select("id").limit(3).execute()
        sample_ids["thread_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample threads", len(sample_ids["thread_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample threads: %s", e)

    # Get sample meetings
    try:
        response = client.table("meetings").select("id").limit(3).execute()
        sample_ids["meeting_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample meetings", len(sample_ids["meeting_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample meetings: %s", e)

    # Get sample resources
    try:
        response = client.table("resources").select("id").limit(5).execute()
        sample_ids["resource_ids"] = [row["id"] for row in (response.data or [])]
        logger.info("Found %d sample resources", len(sample_ids["resource_ids"]))
    except Exception as e:
        logger.warning("Could not fetch sample resources: %s", e)

    return sample_ids


def create_test_events(client: Client, sample_ids: Dict[str, Any]) -> None:
    """Create test domain events for each event type."""

    # Helper to safely get IDs with fallback
    def get_user_id(index: int = 0) -> str:
        return sample_ids["user_ids"][index] if sample_ids["user_ids"] else "00000000-0000-0000-0000-000000000000"

    def get_org_id(index: int = 0) -> str:
        return sample_ids["org_ids"][index] if sample_ids["org_ids"] else "00000000-0000-0000-0000-000000000000"

    def get_project_id(index: int = 0) -> str:
        return sample_ids["project_ids"][index] if sample_ids["project_ids"] else "00000000-0000-0000-0000-000000000000"

    def get_thread_id(index: int = 0) -> str:
        return sample_ids["thread_ids"][index] if sample_ids["thread_ids"] else "00000000-0000-0000-0000-000000000000"

    def get_meeting_id(index: int = 0) -> str:
        return sample_ids["meeting_ids"][index] if sample_ids["meeting_ids"] else "00000000-0000-0000-0000-000000000000"

    def get_resource_id(index: int = 0) -> str:
        return sample_ids["resource_ids"][index] if sample_ids["resource_ids"] else "00000000-0000-0000-0000-000000000000"

    events: List[Dict[str, Any]] = [
        # 1. document_uploaded events
        {
            "event_type": "document_uploaded",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "org_id": get_org_id(0),
            "resource_id": get_resource_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "resource_name": "Financial_Projections_Q4.xlsx",
                "resource_type": "spreadsheet",
                "uploader_name": "John Smith",
                "file_size_bytes": 245678,
            },
        },
        {
            "event_type": "document_uploaded",
            "actor_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
            "project_id": get_project_id(1) if len(sample_ids["project_ids"]) > 1 else get_project_id(0),
            "org_id": get_org_id(0),
            "resource_id": get_resource_id(1) if len(sample_ids["resource_ids"]) > 1 else get_resource_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "resource_name": "Property_Appraisal_Report.pdf",
                "resource_type": "pdf",
                "uploader_name": "Sarah Johnson",
                "file_size_bytes": 1245678,
            },
        },

        # 2. chat_message_sent events
        {
            "event_type": "chat_message_sent",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "thread_id": get_thread_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "message_content": "Hey team, I've reviewed the latest financials. Looking good!",
                "message_id": "msg_001",
                "sender_name": "John Smith",
                "mentioned_user_ids": [],
            },
        },
        {
            "event_type": "chat_message_sent",
            "actor_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
            "project_id": get_project_id(0),
            "thread_id": get_thread_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "message_content": f"@{get_user_id(0)} Can you take a look at the cap stack section?",
                "message_id": "msg_002",
                "sender_name": "Sarah Johnson",
                "mentioned_user_ids": [get_user_id(0)],
            },
        },

        # 3. thread_unread_stale events (email only, no in-app notification)
        {
            "event_type": "thread_unread_stale",
            "project_id": get_project_id(0),
            "thread_id": get_thread_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": get_user_id(0),
                "unread_count": 3,
                "thread_name": "Project Discussion - Downtown Development",
            },
        },

        # 4. meeting_invited events
        {
            "event_type": "meeting_invited",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "meeting_id": get_meeting_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "invited_user_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
                "meeting_title": "Q4 Financial Review",
                "start_time": "2025-12-20T14:00:00Z",
                "organizer_name": "John Smith",
            },
        },

        # 5. meeting_updated events
        {
            "event_type": "meeting_updated",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "meeting_id": get_meeting_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "meeting_title": "Q4 Financial Review - Updated",
                "start_time": "2025-12-20T15:00:00Z",
                "changes": {
                    "timeChanged": True,
                    "participantsChanged": False,
                },
            },
        },

        # 6. meeting_reminder events
        {
            "event_type": "meeting_reminder",
            "project_id": get_project_id(0),
            "meeting_id": get_meeting_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": get_user_id(0),
                "meeting_title": "Q4 Financial Review",
                "start_time": "2025-12-20T15:00:00Z",
                "meeting_link": "https://meet.google.com/abc-defg-hij",
                "reminder_minutes": 30,
            },
        },

        # 7. resume_incomplete_nudge events
        {
            "event_type": "resume_incomplete_nudge",
            "project_id": get_project_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": get_user_id(0),
                "resume_type": "project",
                "completion_percent": 45,
                "nudge_tier": 1,
            },
        },
        {
            "event_type": "resume_incomplete_nudge",
            "project_id": get_project_id(1) if len(sample_ids["project_ids"]) > 1 else get_project_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": get_user_id(0),
                "resume_type": "borrower",
                "completion_percent": 60,
                "nudge_tier": 2,
            },
        },

        # 8. invite_accepted events
        {
            "event_type": "invite_accepted",
            "actor_id": get_user_id(2) if len(sample_ids["user_ids"]) > 2 else get_user_id(0),
            "org_id": get_org_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "new_member_id": get_user_id(2) if len(sample_ids["user_ids"]) > 2 else get_user_id(0),
                "new_member_name": "Alex Martinez",
                "new_member_email": "alex@example.com",
                "org_name": "Downtown Development LLC",
            },
        },

        # 9. project_access_granted events
        {
            "event_type": "project_access_granted",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "affected_user_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
                "project_name": "Downtown Mixed-Use Development",
                "new_permission": "view",
            },
        },

        # 10. project_access_changed events
        {
            "event_type": "project_access_changed",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "affected_user_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
                "project_name": "Downtown Mixed-Use Development",
                "old_permission": "view",
                "new_permission": "edit",
            },
        },

        # 11. project_access_revoked events
        {
            "event_type": "project_access_revoked",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "affected_user_id": get_user_id(3) if len(sample_ids["user_ids"]) > 3 else get_user_id(0),
                "project_name": "Downtown Mixed-Use Development",
            },
        },

        # 12. document_permission_granted events
        {
            "event_type": "document_permission_granted",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "resource_id": get_resource_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "affected_user_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
                "project_name": "Downtown Mixed-Use Development",
                "resource_name": "Financial_Projections_Q4.xlsx",
                "new_permission": "view",
            },
        },

        # 13. document_permission_changed events
        {
            "event_type": "document_permission_changed",
            "actor_id": get_user_id(0),
            "project_id": get_project_id(0),
            "resource_id": get_resource_id(0),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "affected_user_id": get_user_id(1) if len(sample_ids["user_ids"]) > 1 else get_user_id(0),
                "project_name": "Downtown Mixed-Use Development",
                "resource_name": "Financial_Projections_Q4.xlsx",
                "old_permission": "view",
                "new_permission": "edit",
            },
        },
    ]

    # Filter out events that require meetings if no meetings exist
    has_meetings = len(sample_ids["meeting_ids"]) > 0
    if not has_meetings:
        logger.warning("No meetings found - skipping meeting-related events")
        events = [e for e in events if e.get("meeting_id") is None]

    logger.info("Inserting %d test events into domain_events table...", len(events))

    try:
        response = client.table("domain_events").insert(events).execute()
        inserted_count = len(response.data or [])
        logger.info("✓ Successfully inserted %d test events", inserted_count)

        # Show event IDs
        if response.data:
            logger.info("Event IDs created:")
            for event in response.data:
                logger.info("  - Event %d: %s", event["id"], event["event_type"])

        if not has_meetings:
            logger.info("")
            logger.info("Note: Meeting-related events (meeting_invited, meeting_updated, meeting_reminder)")
            logger.info("were skipped because no meetings exist in the database.")
            logger.info("Create some meetings first to test those event types.")

    except Exception as e:
        logger.error("Failed to insert test events: %s", e, exc_info=True)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Seed domain_events table with test data for notify-fan-out service"
    )
    parser.add_argument(
        "--env-file",
        type=str,
        default=".env.local",
        help="Path to environment file (default: .env.local)",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing domain_events and notification_processing entries before seeding",
    )
    args = parser.parse_args()

    # Load environment
    if os.path.exists(args.env_file):
        load_dotenv(args.env_file)
        logger.info("Loaded environment from %s", args.env_file)
    else:
        logger.warning("Environment file %s not found, using system environment", args.env_file)

    # Validate required environment variables
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # Create Supabase client
    client = create_client(supabase_url, supabase_key)
    logger.info("Connected to Supabase at %s", supabase_url)

    # Clear existing data if requested
    if args.clear:
        logger.warning("Clearing existing domain_events and notification_processing data...")
        try:
            # Clear notification_processing first (foreign key constraint)
            client.table("notification_processing").delete().neq("event_id", 0).execute()
            logger.info("✓ Cleared notification_processing table")

            # Clear domain_events
            client.table("domain_events").delete().neq("id", 0).execute()
            logger.info("✓ Cleared domain_events table")
        except Exception as e:
            logger.error("Failed to clear tables: %s", e, exc_info=True)
            sys.exit(1)

    # Fetch sample IDs
    sample_ids = get_sample_ids(client)

    # Warn if no sample data found
    if not sample_ids["user_ids"]:
        logger.warning("No sample users found - using placeholder UUIDs")
    if not sample_ids["project_ids"]:
        logger.warning("No sample projects found - using placeholder UUIDs")

    # Create test events
    create_test_events(client, sample_ids)

    logger.info("")
    logger.info("=" * 80)
    logger.info("Seeding completed successfully!")
    logger.info("=" * 80)
    logger.info("")
    logger.info("Next steps:")
    logger.info("1. Run the notify-fan-out service with DRY_RUN=true:")
    logger.info("   NOTIFY_FANOUT_DRY_RUN=true uv run --env-file .env.local python main.py")
    logger.info("")
    logger.info("2. Check the logs to verify event processing")
    logger.info("")
    logger.info("3. Run with DRY_RUN=false to actually create notifications:")
    logger.info("   uv run --env-file .env.local python main.py")
    logger.info("")
    logger.info("4. Query results:")
    logger.info("   SELECT * FROM notification_processing ORDER BY created_at DESC;")
    logger.info("   SELECT * FROM notifications ORDER BY created_at DESC;")
    logger.info("   SELECT * FROM pending_emails ORDER BY created_at DESC;")
    logger.info("")


if __name__ == "__main__":
    main()
