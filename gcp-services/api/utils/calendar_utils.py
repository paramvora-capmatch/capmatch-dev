"""Calendar utility functions for Google Calendar integration."""

import logging
from datetime import datetime
from typing import Dict, Optional

from config import settings

logger = logging.getLogger(__name__)


async def refresh_access_token(provider: str, refresh_token: str) -> Dict[str, str]:
    """
    Refresh an expired access token using the refresh token.

    Args:
        provider: OAuth provider (currently only 'google' supported)
        refresh_token: Refresh token from calendar connection

    Returns:
        Dict with 'access_token', 'expires_at', and optionally 'refresh_token'

    Raises:
        ValueError: If provider is not supported or credentials not configured
    """
    if provider != "google":
        raise ValueError(f"Unsupported provider for token refresh: {provider}")

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET

    if not client_id or not client_secret:
        raise ValueError("Google OAuth credentials not configured")

    try:
        response = await _fetch_token_refresh(refresh_token, client_id, client_secret)

        # Calculate expiration time (expires_in is in seconds)
        expires_at = datetime.now().replace(microsecond=0)
        expires_at = expires_at.replace(tzinfo=None)  # Make timezone-naive
        expires_at_timestamp = expires_at.timestamp() + response["expires_in"]
        expires_at_iso = datetime.fromtimestamp(expires_at_timestamp).isoformat()

        return {
            "access_token": response["access_token"],
            "expires_at": expires_at_iso,
            # Google may return a new refresh token
            "refresh_token": response.get("refresh_token", refresh_token),
        }
    except Exception as e:
        logger.error("Google token refresh failed", extra={"error": str(e)})
        raise ValueError(f"Google token refresh failed: {str(e)}")


async def _fetch_token_refresh(
    refresh_token: str, client_id: str, client_secret: str
) -> Dict:
    """Internal function to make the token refresh request."""
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
            },
        )

        if not response.is_success:
            error_text = response.text
            logger.error("Google OAuth token refresh failed", extra={"error": error_text})
            raise ValueError(f"Google token refresh failed: {error_text}")

        return response.json()


async def ensure_valid_token(
    connection: Dict, supabase
) -> str:
    """
    Ensure calendar connection has a valid access token, refreshing if needed.

    Args:
        connection: Calendar connection dict with access_token, refresh_token, token_expires_at
        supabase: Supabase client instance

    Returns:
        Valid access token string

    Raises:
        ValueError: If token is expired and no refresh token available
    """
    access_token = connection.get("access_token")
    token_expires_at = connection.get("token_expires_at")

    token_expired = False
    if token_expires_at:
        try:
            # Handle both timezone-aware and timezone-naive ISO strings
            expires_at_str = token_expires_at.replace("Z", "+00:00") if token_expires_at.endswith("Z") else token_expires_at
            expires_at = datetime.fromisoformat(expires_at_str)
            
            # Compare with current time (handle timezone-aware vs naive)
            now = datetime.now(expires_at.tzinfo) if expires_at.tzinfo else datetime.now()
            token_expired = expires_at < now
        except (ValueError, AttributeError, TypeError):
            # If we can't parse the date, assume it's expired to be safe
            token_expired = True

    if token_expired:
        logger.info(
            f"Access token expired for connection {connection.get('id')}, refreshing..."
        )

        refresh_token = connection.get("refresh_token")
        if not refresh_token:
            raise ValueError(
                "Access token expired and no refresh token available"
            )

        refreshed_token = await refresh_access_token(
            connection.get("provider", "google"), refresh_token
        )

        # Update the connection with new token
        update_data = {
            "access_token": refreshed_token["access_token"],
            "token_expires_at": refreshed_token["expires_at"],
            "updated_at": datetime.now().isoformat(),
        }

        # Only update refresh_token if a new one was provided
        if refreshed_token.get("refresh_token") and refreshed_token["refresh_token"] != refresh_token:
            update_data["refresh_token"] = refreshed_token["refresh_token"]

        update_response = (
            supabase.table("calendar_connections")
            .update(update_data)
            .eq("id", connection["id"])
            .execute()
        )

        if update_response.error:
            logger.error(
                "Failed to update refreshed token in database",
                extra={"error": str(update_response.error)},
            )

        access_token = refreshed_token["access_token"]

    return access_token

