"""Resend-backed email sending for email-notifications service."""

from __future__ import annotations

import logging
import time
from typing import Optional

from config import Config

try:
    import resend  # type: ignore[import-not-found]
    from resend import exceptions as resend_exceptions  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover
    resend = None  # type: ignore
    resend_exceptions = None  # type: ignore


logger = logging.getLogger(__name__)

MAX_RETRIES = 3
REQUESTS_PER_SECOND = 2
THROTTLE_DELAY = 1 / REQUESTS_PER_SECOND


def _ensure_resend_api_key() -> None:
    if resend is None:
        raise ImportError(
            "The 'resend' package is not installed. Install dependencies via `uv sync`."
        )
    if not Config.RESEND_API_KEY:
        raise ValueError("RESEND_API_KEY is required to send emails via Resend.")
    if resend.api_key != Config.RESEND_API_KEY:  # type: ignore[union-attr]
        resend.api_key = Config.RESEND_API_KEY  # type: ignore[union-attr]


def _determine_recipient(user_email: str) -> str:
    """Return the email address Resend should target for this run."""
    if Config.RESEND_FORCE_TO_EMAIL:
        return Config.RESEND_FORCE_TO_EMAIL
    if Config.RESEND_TEST_MODE:
        if Config.RESEND_TEST_RECIPIENT:
            return Config.RESEND_TEST_RECIPIENT
        logger.warning(
            "RESEND_TEST_MODE is enabled but RESEND_TEST_RECIPIENT is unset; "
            "defaulting to the user's email (%s).",
            user_email,
        )
    return user_email


def send_email(
    user_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    email_type: str,
) -> bool:
    """
    Send an email via Resend API (or log-only in DRY_RUN mode).

    Returns True if successfully handled (sent or logged), False otherwise.
    """
    to_address = _determine_recipient(user_email)

    logger.info("=" * 80)
    logger.info("EMAIL-NOTIFICATIONS - Original recipient: %s", user_email)
    logger.info("EMAIL-NOTIFICATIONS - Actual send-to: %s", to_address)
    logger.info("Subject: %s", subject)
    logger.info("-" * 80)
    logger.info("HTML Body:\n%s", html_body)
    logger.info("-" * 80)
    logger.info("Text Body:\n%s", text_body)
    logger.info("=" * 80)

    if Config.DRY_RUN:
        logger.info(
            "EMAIL_NOTIFICATIONS_DRY_RUN=true -> not sending email to Resend; "
            "this is a log-only dry run."
        )
        return True

    try:
        _ensure_resend_api_key()
        accepted = _send_with_throttle_retry(
            {
                "from": Config.EMAIL_FROM,
                "to": [to_address],
                "subject": subject,
                "html": html_body,
                "text": text_body,
                "tags": [
                    {"name": "email_type", "value": email_type},
                ],
            }
        )
        return accepted
    except resend_exceptions.ResendError as err:  # type: ignore[union-attr]
        logger.error("Resend API error sending to %s: %s", to_address, err)
        return False
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error sending email to %s: %s", to_address, exc)
        return False


def _send_with_throttle_retry(params: dict) -> bool:
    """Call Resend with simple rate-limit handling."""
    for attempt in range(1, MAX_RETRIES + 1):
        if attempt > 1:
            sleep_for = THROTTLE_DELAY * attempt
            logger.info("Throttling before retry %d (sleep %.2fs)", attempt, sleep_for)
            time.sleep(sleep_for)
        else:
            time.sleep(THROTTLE_DELAY)

        try:
            response = resend.Emails.send(params)  # type: ignore[union-attr]
            message_id = response.get("id")
            logger.info("Resend send complete (id=%s)", message_id)
            return message_id is not None
        except resend_exceptions.ResendError as err:  # type: ignore[union-attr]
            error_str = str(err).lower()
            if "rate" in error_str or "429" in error_str or "limit" in error_str:
                logger.warning(
                    "Resend rate limit hit (attempt %d/%d): %s",
                    attempt,
                    MAX_RETRIES,
                    err,
                )
                if attempt == MAX_RETRIES:
                    raise
            else:
                raise
    return False





