"""Instant (near-real-time) job entrypoint for email-notifications service."""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

from config import Config
from database import Database
from email_builder import render_email_from_body_data
from email_sender import send_email


logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# Reduce noise from httpx and httpcore
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


def main() -> None:
    """Main instant notifications job - polls pending_emails."""
    start_time = datetime.now(timezone.utc)
    logger.info("=" * 80)
    logger.info("Starting Email Notifications - Instant Job (pending_emails)")
    logger.info("Started at: %s", start_time.isoformat())
    logger.info("=" * 80)

    try:
        Config.validate()
        logger.info("Configuration validated")

        db = Database()
        logger.info("Connected to Supabase at %s", Config.SUPABASE_URL)

        BATCH_SIZE = 500
        total_processed = 0
        batch_num = 0

        while True:
            batch_num += 1

            # Fetch pending immediate emails
            pending_emails = db.get_pending_immediate_emails(limit=BATCH_SIZE)

            if not pending_emails:
                if batch_num == 1:
                    logger.info("No pending immediate emails found")
                else:
                    logger.info("Batch %d: No more emails to process", batch_num)
                break

            logger.info("Batch %d: Found %d pending immediate email(s)", batch_num, len(pending_emails))

            processed_count = 0

            for email in pending_emails:
                try:
                    # Atomically claim this email
                    if not db.mark_email_processing(email.id):
                        logger.debug("Email %d already claimed by another job, skipping", email.id)
                        continue

                    # Fetch user profile for personalization
                    user_profile = db.get_user_profile(email.user_id)
                    if not user_profile or not user_profile.get("email"):
                        logger.warning("Skipping email %d - user %s has no profile/email", email.id, email.user_id)
                        db.mark_email_failed(email.id)
                        continue

                    # Render email from body_data
                    html_body, text_body = render_email_from_body_data(email, user_profile)

                    # Send email
                    if send_email(
                        user_profile["email"],
                        email.subject,
                        html_body,
                        text_body,
                        email.event_type
                    ):
                        db.mark_email_sent(email.id)
                        processed_count += 1
                        logger.debug("Email %d sent successfully to %s", email.id, user_profile["email"])
                    else:
                        db.mark_email_failed(email.id)
                        logger.warning("Failed to send email %d to %s", email.id, user_profile["email"])

                except Exception as e:
                    logger.error("Error processing email %d: %s", email.id, e, exc_info=True)
                    try:
                        db.mark_email_failed(email.id)
                    except Exception:
                        logger.error("Failed to mark email %d as failed", email.id, exc_info=True)

            total_processed += processed_count
            logger.info("Batch %d: Successfully sent %d emails", batch_num, processed_count)

            # If we got fewer than BATCH_SIZE, we've processed all pending emails
            if len(pending_emails) < BATCH_SIZE:
                logger.info("Batch %d: Processed final batch (%d emails)", batch_num, len(pending_emails))
                break

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(
            "Instant job completed in %.2f seconds, sent %d emails across %d batch(es)",
            duration,
            total_processed,
            batch_num
        )
        logger.info("=" * 80)

    except Exception as e:
        logger.error("Fatal error in instant job: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
