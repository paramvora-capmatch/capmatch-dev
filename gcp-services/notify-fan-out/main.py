"""
Main polling loop for notify-fan-out service.

Polls domain_events table every 1 minute via cron.
Processes unprocessed events in batches and creates notifications/emails.
"""

import logging
from datetime import datetime
from database import Database, DomainEvent
from config import Config
import handlers

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def dispatch_event(db: Database, event: DomainEvent) -> tuple[int, int]:
    """
    Route event to appropriate handler based on event_type.

    Args:
        db: Database instance
        event: Domain event to process

    Returns:
        Tuple of (inserted_count, emails_queued)
    """
    handlers_map = {
        "document_uploaded": handlers.handle_document_uploaded,
        "chat_message_sent": handlers.handle_chat_message,
        "thread_unread_stale": handlers.handle_thread_unread_stale,
        "meeting_invited": handlers.handle_meeting_invited,
        "meeting_updated": handlers.handle_meeting_updated,
        "meeting_reminder": handlers.handle_meeting_reminder,
        "resume_incomplete_nudge": handlers.handle_resume_incomplete_nudge,
        "invite_accepted": handlers.handle_invite_accepted,
        "project_access_granted": handlers.handle_project_access_granted,
        "project_access_changed": handlers.handle_project_access_changed,
        "project_access_revoked": handlers.handle_project_access_revoked,
        "document_permission_granted": handlers.handle_document_permission_granted,
        "document_permission_changed": handlers.handle_document_permission_changed,
    }

    handler = handlers_map.get(event.event_type)
    if not handler:
        logger.warning("No handler for event type: %s", event.event_type)
        return (0, 0)

    return handler(db, event)


def main():
    """Main entry point for notify-fan-out polling job."""
    start_time = datetime.now()

    logger.info("=" * 80)
    logger.info("Starting Notify Fan-Out Job")
    logger.info("Started at: %s", start_time.isoformat())
    logger.info("=" * 80)

    # Validate configuration
    try:
        Config.validate()
        logger.info(Config.log_config())
    except ValueError as e:
        logger.error("Configuration validation failed: %s", e)
        return 1

    # Initialize database connection
    db = Database()

    total_processed = 0
    total_notifications = 0
    total_emails = 0
    batch_num = 0

    # Process events in batches
    while True:
        batch_num += 1
        events = db.get_pending_events(limit=Config.BATCH_SIZE)

        if not events:
            logger.info("No pending events to process")
            break

        logger.info("Processing batch %d with %d events", batch_num, len(events))

        for event in events:
            try:
                # Atomic claim
                if not db.mark_event_processing(event.id):
                    logger.debug("Event %d already claimed", event.id)
                    continue

                # DRY_RUN check - log only, don't actually process
                if Config.DRY_RUN:
                    logger.info(
                        "[DRY_RUN] Would process event %d (%s) for project %s",
                        event.id,
                        event.event_type,
                        event.project_id,
                    )
                    db.mark_event_completed(event.id)
                    total_processed += 1
                    continue

                # Dispatch to handler
                inserted, emails_queued = dispatch_event(db, event)

                # Mark completed
                db.mark_event_completed(event.id)
                total_processed += 1
                total_notifications += inserted
                total_emails += emails_queued

                logger.info(
                    "Event %d (%s) completed: %d notifications, %d emails",
                    event.id,
                    event.event_type,
                    inserted,
                    emails_queued,
                )

            except Exception as e:
                logger.error(
                    "Error processing event %d: %s", event.id, e, exc_info=True
                )
                try:
                    db.mark_event_failed(event.id, str(e))
                except Exception as mark_err:
                    logger.error(
                        "Failed to mark event %d as failed: %s",
                        event.id,
                        mark_err,
                        exc_info=True,
                    )

        # Exit if batch < BATCH_SIZE (no more events)
        if len(events) < Config.BATCH_SIZE:
            break

    duration = (datetime.now() - start_time).total_seconds()
    logger.info("=" * 80)
    logger.info(
        "Job completed in %.2f seconds, processed %d events", duration, total_processed
    )
    logger.info(
        "Created %d notifications, queued %d emails",
        total_notifications,
        total_emails,
    )
    logger.info("=" * 80)

    return 0


if __name__ == "__main__":
    exit(main())
