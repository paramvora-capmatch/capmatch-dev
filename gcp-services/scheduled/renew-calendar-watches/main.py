"""
Renew Calendar Watches - Scheduled job

Replaces: supabase/functions/renew-calendar-watches/index.ts

Schedule: Daily at 2 AM UTC (0 2 * * *)

This function renews Google Calendar watch channels before they expire.
Google Calendar watch channels expire after a maximum of 7-30 days, and we
renew them 24 hours before expiry.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, TypedDict
from urllib.parse import urlencode

import requests
from supabase import Client, create_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


class CalendarInList(TypedDict, total=False):
    """Calendar in list."""

    id: str
    name: str
    primary: bool
    selected: bool


class CalendarConnection(TypedDict, total=False):
    """Calendar connection record."""

    id: str
    user_id: str
    provider: str
    access_token: str
    refresh_token: str
    token_expires_at: str
    calendar_list: List[CalendarInList]
    watch_channel_id: str
    watch_resource_id: str
    watch_expiration: str


def ensure_valid_token(connection: CalendarConnection, supabase: Client) -> str:
    """
    Ensure a valid access token (refresh if needed).

    Args:
        connection: Calendar connection record
        supabase: Supabase client

    Returns:
        Valid access token

    Raises:
        Exception: If token refresh fails
    """
    access_token = connection.get("access_token")
    if not access_token:
        raise Exception("No access token available")

    # Check if token is expired or will expire soon (within 5 minutes)
    token_expires_at = connection.get("token_expires_at")
    if token_expires_at:
        expires_at = datetime.fromisoformat(token_expires_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        five_minutes_from_now = now + timedelta(minutes=5)

        if expires_at > five_minutes_from_now:
            # Token is still valid
            return access_token

    # Token is expired or will expire soon, refresh it
    refresh_token = connection.get("refresh_token")
    if not refresh_token:
        raise Exception("No refresh token available")

    logger.info("Refreshing access token...")

    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not google_client_id or not google_client_secret:
        raise Exception("Missing Google OAuth credentials")

    # Refresh token
    response = requests.post(
        "https://oauth2.googleapis.com/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=urlencode(
            {
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        ),
    )

    if not response.ok:
        raise Exception(f"Failed to refresh token: {response.status_code}")

    tokens = response.json()

    # Update the connection with new tokens
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])

    supabase.from_("calendar_connections").update(
        {
            "access_token": tokens["access_token"],
            "token_expires_at": expires_at.isoformat(),
        }
    ).eq("id", connection["id"]).execute()

    logger.info("Access token refreshed successfully")

    return tokens["access_token"]


def stop_calendar_watch(connection: CalendarConnection) -> None:
    """
    Stop watching a calendar.

    Args:
        connection: Calendar connection record
    """
    watch_channel_id = connection.get("watch_channel_id")
    watch_resource_id = connection.get("watch_resource_id")

    if not watch_channel_id or not watch_resource_id:
        logger.info("No active watch to stop")
        return

    try:
        supabase_url = os.getenv("SUPABASE_URL")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(supabase_url, service_role_key)

        access_token = ensure_valid_token(connection, supabase)

        logger.info(f"Stopping watch channel {watch_channel_id}...")

        response = requests.post(
            "https://www.googleapis.com/calendar/v3/channels/stop",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"id": watch_channel_id, "resourceId": watch_resource_id},
        )

        if not response.ok:
            logger.error(f"Failed to stop watch: {response.status_code}")
        else:
            logger.info("Watch stopped successfully")

    except Exception as error:
        logger.error(f"Error stopping watch: {error}")
        # Don't throw - we want to continue with setting up new watch


def setup_calendar_watch(connection: CalendarConnection, supabase: Client) -> None:
    """
    Set up a push notification watch on a calendar.

    Args:
        connection: Calendar connection record
        supabase: Supabase client

    Raises:
        Exception: If watch setup fails
    """
    access_token = ensure_valid_token(connection, supabase)

    # Get the calendar ID
    calendar_list = connection.get("calendar_list", [])
    primary_calendar = next((cal for cal in calendar_list if cal.get("primary")), None)
    selected_calendar = next((cal for cal in calendar_list if cal.get("selected")), None)
    calendar_id = (
        primary_calendar["id"] if primary_calendar else selected_calendar["id"] if selected_calendar else "primary"
    )

    # Generate a unique channel ID
    channel_id = f"capmatch-{connection['id']}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"

    # Webhook URL
    site_url = os.getenv("NEXT_PUBLIC_SITE_URL") or os.getenv("SITE_URL")
    webhook_url = f"{site_url}/api/calendar/webhook"

    logger.info(f"Setting up watch for calendar {calendar_id}...")

    # Set up the watch request (7 days)
    expiration_ms = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp() * 1000)

    response = requests.post(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/watch",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={
            "id": channel_id,
            "type": "web_hook",
            "address": webhook_url,
            "expiration": expiration_ms,
        },
    )

    if not response.ok:
        error_text = response.text
        raise Exception(f"Failed to set up calendar watch: {response.status_code} {error_text}")

    watch_response = response.json()
    expiration_date = datetime.fromtimestamp(int(watch_response["expiration"]) / 1000, tz=timezone.utc)

    logger.info(
        f"Watch set up successfully: channelId={channel_id}, resourceId={watch_response['resourceId']}, expiration={expiration_date}"
    )

    # Update the connection with watch info
    supabase.from_("calendar_connections").update(
        {
            "watch_channel_id": channel_id,
            "watch_resource_id": watch_response["resourceId"],
            "watch_expiration": expiration_date.isoformat(),
        }
    ).eq("id", connection["id"]).execute()


def main():
    """Main entry point for renew-calendar-watches job."""
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 80)
    logger.info("Starting Renew Calendar Watches Job")
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
        # Find connections with expired or soon-to-expire watches (within 24 hours)
        expiration_threshold = datetime.now(timezone.utc) + timedelta(hours=24)

        logger.info("Fetching calendar connections needing watch renewal...")
        response = (
            supabase.from_("calendar_connections")
            .select("*")
            .not_.is_("watch_channel_id", "null")
            .lte("watch_expiration", expiration_threshold.isoformat())
            .execute()
        )

        connections = response.data if response.data else []

        if not connections:
            logger.info("No watches to renew")
            logger.info("=" * 80)
            logger.info("Job completed: 0 watches to renew")
            logger.info("=" * 80)
            return 0

        logger.info(f"Found {len(connections)} watches to renew")

        renewed = 0
        failed = 0
        errors = []

        for connection in connections:
            try:
                connection_id = connection["id"]
                logger.info(f"Renewing watch for connection {connection_id}...")

                if not dry_run:
                    # Stop the old watch first
                    stop_calendar_watch(connection)

                    # Set up a new watch
                    setup_calendar_watch(connection, supabase)

                    logger.info(f"Successfully renewed watch for connection {connection_id}")
                else:
                    logger.info(f"[DRY_RUN] Would renew watch for connection {connection_id}")

                renewed += 1

            except Exception as renew_error:
                failed += 1
                error_msg = f"Failed to renew watch for connection {connection['id']}: {renew_error}"
                logger.error(error_msg)
                errors.append(error_msg)
                # Continue with next connection

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(f"Job completed in {duration:.2f} seconds")
        logger.info(f"Renewed: {renewed}, Failed: {failed}")
        if errors:
            logger.info(f"Errors: {', '.join(errors)}")
        logger.info("=" * 80)

        return 0 if failed == 0 else 1

    except Exception as error:
        logger.error(f"Fatal error in renew-calendar-watches job: {error}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
