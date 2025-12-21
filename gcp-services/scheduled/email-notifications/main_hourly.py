"""Hourly job entrypoint for email-notifications service."""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

from config import Config
from database import Database
from email_builder import render_email_from_body_data, build_aggregated_digest
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
    """Main hourly digest job - polls pending_emails."""
    start_time = datetime.now(timezone.utc)
    logger.info("=" * 80)
    logger.info("Starting Email Notifications - Hourly Digest Job (pending_emails)")
    logger.info("Started at: %s", start_time.isoformat())
    logger.info("=" * 80)

    try:
        Config.validate()
        logger.info("Configuration validated")

        db = Database()
        logger.info("Connected to Supabase at %s", Config.SUPABASE_URL)

        BATCH_SIZE = 500
        total_emails_sent = 0  # Number of digest emails sent
        total_events_processed = 0  # Number of pending_emails processed
        batch_num = 0

        while True:
            batch_num += 1

            # Fetch pending aggregated emails
            pending_emails = db.get_pending_aggregated_emails(limit=BATCH_SIZE)

            if not pending_emails:
                if batch_num == 1:
                    logger.info("No pending aggregated emails found")
                else:
                    logger.info("Batch %d: No more emails to process", batch_num)
                break

            logger.info("Batch %d: Found %d pending aggregated email(s)", batch_num, len(pending_emails))

            # Group by user_id for digest aggregation
            from typing import Dict, List
            emails_by_user: Dict[str, List] = {}
            for email in pending_emails:
                user_id = email.user_id
                if user_id not in emails_by_user:
                    emails_by_user[user_id] = []
                emails_by_user[user_id].append(email)

            logger.info("Batch %d: Grouped into %d user digest(s)", batch_num, len(emails_by_user))

            processed_count = 0
            emails_sent_count = 0

            for user_id, user_emails in emails_by_user.items():
                try:
                    # Atomically claim all emails for this user
                    claimed_emails = []
                    for email in user_emails:
                        if db.mark_email_processing(email.id):
                            claimed_emails.append(email)
                        else:
                            logger.debug("Email %d already claimed, skipping", email.id)

                    if not claimed_emails:
                        logger.debug("No emails claimed for user %s, skipping", user_id)
                        continue

                    # Fetch user profile
                    user_profile = db.get_user_profile(user_id)
                    if not user_profile or not user_profile.get("email"):
                        logger.warning("Skipping user %s - no profile/email found", user_id)
                        # Mark all claimed emails as failed
                        for email in claimed_emails:
                            db.mark_email_failed(email.id)
                        continue

                    # Build aggregated digest
                    subject, html_body, text_body = build_aggregated_digest(claimed_emails, user_profile)

                    # Send single digest email
                    if send_email(
                        user_profile["email"],
                        subject,
                        html_body,
                        text_body,
                        "digest_aggregated"  # Generic event type for digest
                    ):
                        # Mark all constituent emails as sent
                        for email in claimed_emails:
                            db.mark_email_sent(email.id)
                        processed_count += len(claimed_emails)
                        emails_sent_count += 1
                        logger.info(
                            "Sent digest to %s (combined %d updates)",
                            user_profile["email"],
                            len(claimed_emails)
                        )
                    else:
                        # Mark all constituent emails as failed
                        for email in claimed_emails:
                            db.mark_email_failed(email.id)
                        logger.warning(
                            "Failed to send digest to %s (%d updates lost)",
                            user_profile["email"],
                            len(claimed_emails)
                        )

                except Exception as e:
                    logger.error("Error processing digest for user %s: %s", user_id, e, exc_info=True)
                    # Mark any claimed emails as failed
                    try:
                        for email in claimed_emails:
                            db.mark_email_failed(email.id)
                    except Exception:
                        logger.error("Failed to mark emails as failed for user %s", user_id, exc_info=True)

            total_events_processed += processed_count
            total_emails_sent += emails_sent_count
            logger.info(
                "Batch %d: Sent %d digest email(s), processed %d pending_emails",
                batch_num,
                emails_sent_count,
                processed_count
            )

            # If we got fewer than BATCH_SIZE, we've processed all pending emails
            if len(pending_emails) < BATCH_SIZE:
                logger.info("Batch %d: Processed final batch (%d pending_emails)", batch_num, len(pending_emails))
                break

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(
            "Hourly digest job completed in %.2f seconds",
            duration
        )
        logger.info(
            "Sent %d digest email(s) combining %d pending_emails across %d batch(es)",
            total_emails_sent,
            total_events_processed,
            batch_num
        )
        logger.info("=" * 80)

    except Exception as e:
        logger.error("Fatal error in hourly digest job: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
