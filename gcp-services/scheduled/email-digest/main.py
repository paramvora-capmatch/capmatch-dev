"""Main entry point for email digest worker."""

import sys
import logging
from datetime import datetime, timedelta, date, timezone
from typing import List, Dict, Any

from config import Config
from database import Database
from preferences import filter_events_by_preferences, get_user_preferences
from email_builder import build_digest_email
from email_sender import send_digest_email

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Reduce noise from httpx and httpcore
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('httpcore').setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


def process_user_digest(
    db: Database,
    user: Dict[str, Any],
    digest_date: date,
    start_time: str,
    end_time: str
) -> tuple[bool, int]:
    """
    Process digest for a single user.
    
    Returns: (success: bool, event_count: int)
    """
    user_id = user['user_id']
    user_email = user['email']
    user_name = user.get('full_name')
    
    try:
        # Load user preferences once (cache for all events)
        user_preferences = get_user_preferences(db, user_id)
        logger.debug(f"Loaded {len(user_preferences)} preferences for user {user_id}")
        
        # Get unprocessed events for this user
        logger.info(f"Processing digest for user {user_id} ({user_email})")
        events = db.get_unprocessed_events(user_id, digest_date, start_time, end_time)
        
        if not events:
            logger.info(f"No events found for user {user_id} - skipping")
            return True, 0
        
        logger.info(f"Found {len(events)} unprocessed events for user {user_id}")
        
        # Filter events by user preferences (using cached preferences)
        filtered_events = filter_events_by_preferences(events, user_preferences, user_id)
        
        if not filtered_events:
            logger.info(f"No events match digest preferences for user {user_id} - skipping")
            return True, 0
        
        logger.info(f"{len(filtered_events)} events match digest preferences")
        
        # Batch query recipients for all filtered events
        recipients_map = db.get_batch_event_recipients(filtered_events)
        
        # Filter events where user is a recipient
        recipient_events = []
        events_needing_resource_check = []
        
        for event in filtered_events:
            event_id = str(event.get('id'))
            recipients = recipients_map.get(event_id, set())
            
            if user_id in recipients:
                # For document events, also check resource access
                if event.get('resource_id'):
                    events_needing_resource_check.append(event)
                else:
                    recipient_events.append(event)
            else:
                logger.debug(
                    "[recipients] user %s not in recipients for event %s (recipients=%s)",
                    user_id,
                    event.get("id"),
                    list(recipients)[:5],  # Log first 5 for brevity
                )
        
        # Batch check resource access for events that need it
        if events_needing_resource_check:
            resource_ids = [e['resource_id'] for e in events_needing_resource_check if e.get('resource_id')]
            resource_access_map = db.check_resource_access_batch(user_id, resource_ids)
            
            for event in events_needing_resource_check:
                resource_id = event.get('resource_id')
                if resource_id and resource_access_map.get(resource_id, False):
                    recipient_events.append(event)
                else:
                    logger.debug(
                        "[resource-access] user %s denied access to resource %s for event %s",
                        user_id,
                        resource_id,
                        event.get("id"),
                    )
        
        if not recipient_events:
            logger.info(f"User {user_id} is not a recipient of any events - skipping")
            return True, 0
        
        logger.info(f"User {user_id} is recipient of {len(recipient_events)} events")
        
        # Get project names for email
        project_ids = list(set(e['project_id'] for e in recipient_events if e.get('project_id')))
        project_names = db.get_project_names(project_ids)
        
        # Build email
        digest_timestamp = datetime.combine(digest_date, datetime.min.time(), tzinfo=timezone.utc)
        html_body, text_body = build_digest_email(
            recipient_events,
            user_name,
            project_names,
            user_id,
            digest_timestamp,
        )
        
        if not html_body or not text_body:
            logger.warning(f"Failed to build email for user {user_id}")
            return False, 0
        
        # Send email
        success = send_digest_email(
            user_email,
            user_name,
            html_body,
            text_body,
            len(recipient_events)
        )
        
        if success:
            # Mark events as processed
            db.mark_events_processed(recipient_events, user_id, digest_date)
            logger.info(f"Successfully processed digest for user {user_id} with {len(recipient_events)} events")
            return True, len(recipient_events)
        else:
            logger.error(f"Failed to send email for user {user_id}")
            return False, 0
            
    except Exception as e:
        logger.error(f"Error processing digest for user {user_id}: {e}", exc_info=True)
        return False, 0


def main():
    """Main execution function."""
    start_time = datetime.now(timezone.utc)
    logger.info("=" * 80)
    logger.info("Starting email digest job")
    logger.info(f"Started at: {start_time.isoformat()}")
    logger.info("=" * 80)
    
    try:
        # Validate configuration
        Config.validate()
        if Config.SKIP_IDEMPOTENCY_CHECK:
            logger.warning("[idempotency] SKIP_IDEMPOTENCY_CHECK enabled – worker will reprocess events (testing only)")
        
        # Initialize database
        db = Database(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY,
            skip_idempotency=Config.SKIP_IDEMPOTENCY_CHECK,
        )
        
        # Compute sliding 24-hour window (UTC)
        window_start, window_end = Config.get_digest_window()
        digest_date = window_end.date()
        
        logger.info(f"Processing digest window: {window_start.isoformat()} to {window_end.isoformat()}")
        
        # Get users with digest preferences
        users = db.get_users_with_digest_preferences()
        logger.info(f"Found {len(users)} users with digest preferences")
        
        if not users:
            logger.info("No users to process - exiting")
            return
        
        # Process each user sequentially
        total_processed = 0
        total_events = 0
        total_failed = 0
        
        for user in users:
            success, event_count = process_user_digest(
                db,
                user,
                digest_date,
                window_start.isoformat(),
                window_end.isoformat()
            )
            
            if success:
                total_processed += 1
                total_events += event_count
            else:
                total_failed += 1
        
        # Summary
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 80)
        logger.info("Email digest job completed")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info(f"Users processed: {total_processed}")
        logger.info(f"Users failed: {total_failed}")
        logger.info(f"Total events processed: {total_events}")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"Fatal error in email digest job: {e}", exc_info=True)
        sys.exit(1)
    finally:
        # Supabase client doesn't need explicit close
        pass


if __name__ == "__main__":
    main()

