"""
Meeting Reminders - Scheduled job

Replaces: supabase/functions/meeting-reminders/index.ts

Schedule: Every 5 minutes (*/5 * * * *)

This job fetches meetings that need 30-minute reminders and creates domain events
for each participant. The notify-fan-out service will process these events and
create notifications.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional, TypedDict

from supabase import Client, create_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


class MeetingNeedingReminder(TypedDict):
    """Meeting participant needing reminder."""

    meeting_id: str
    participant_id: str
    meeting_title: str
    start_time: str
    meeting_link: Optional[str]
    project_id: Optional[str]


def main():
    """Main entry point for meeting-reminders job."""
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 80)
    logger.info("Starting Meeting Reminders Job")
    logger.info(f"Started at: {start_time.isoformat()}")
    logger.info("=" * 80)

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    dry_run = os.getenv("DRY_RUN", "false").lower() == "true"

    if not supabase_url or not service_role_key:
        logger.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return 1

    logger.info(f"DRY_RUN: {dry_run}")

    # Create Supabase admin client
    supabase: Client = create_client(supabase_url, service_role_key)

    try:
        # Get meetings that need 30-minute reminders
        logger.info("Fetching meetings needing 30-minute reminders...")
        response = supabase.rpc("get_meetings_needing_reminders", {"p_minutes_before": 30}).execute()

        meetings = response.data if response.data else []

        if not meetings:
            logger.info("No meetings need reminders")
            logger.info("=" * 80)
            logger.info("Job completed: 0 reminders to send")
            logger.info("=" * 80)
            return 0

        logger.info(f"Found {len(meetings)} participants needing reminders")

        success_count = 0
        error_count = 0

        # Process each participant
        for meeting in meetings:
            try:
                meeting_id = meeting["meeting_id"]
                participant_id = meeting["participant_id"]
                meeting_title = meeting.get("meeting_title", "Meeting")

                logger.info(f"Processing reminder for participant {participant_id} - meeting: {meeting_title}")

                if not dry_run:
                    # Create domain event for reminder
                    event_response = supabase.rpc(
                        "insert_meeting_reminder_event",
                        {
                            "p_meeting_id": meeting_id,
                            "p_user_id": participant_id,
                            "p_reminder_minutes": 30,
                        },
                    ).execute()

                    if event_response.data is None:
                        logger.error(f"Error creating event for participant {participant_id}")
                        error_count += 1
                        continue

                    event_id = event_response.data

                    # Note: Domain event created. The GCP notify-fan-out service will automatically
                    # poll and process this event within 0-60 seconds (avg 30s).
                    logger.info(f"Created domain event {event_id} for participant {participant_id}")

                    # Mark reminder as sent
                    insert_response = supabase.from_("meeting_reminders_sent").insert(
                        {
                            "meeting_id": meeting_id,
                            "user_id": participant_id,
                            "reminder_type": "30min",
                        }
                    ).execute()

                    if insert_response.data is None:
                        logger.warning(f"Failed to mark reminder as sent for participant {participant_id} (non-critical)")
                        # Don't increment error count - notification event was created successfully

                else:
                    logger.info(f"[DRY_RUN] Would create domain event for participant {participant_id}")

                success_count += 1

            except Exception as error:
                logger.error(f"Unexpected error processing reminder: {error}", exc_info=True)
                error_count += 1

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(f"Job completed in {duration:.2f} seconds")
        logger.info(f"Processed: {len(meetings)} participants, Success: {success_count}, Errors: {error_count}")
        logger.info("=" * 80)

        return 0 if error_count == 0 else 1

    except Exception as error:
        logger.error(f"Fatal error in meeting-reminders job: {error}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
