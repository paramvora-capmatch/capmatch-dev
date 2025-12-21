"""Database access layer for notify-fan-out service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import logging
from supabase import Client, create_client
from supabase.client import ClientOptions

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class DomainEvent:
    """Represents a domain event from the domain_events table."""

    id: int
    event_type: str
    actor_id: Optional[str]
    project_id: Optional[str]
    org_id: Optional[str]
    resource_id: Optional[str]
    thread_id: Optional[str]
    meeting_id: Optional[str]
    occurred_at: str
    payload: Dict[str, Any]


@dataclass
class ChatParticipant:
    """Represents a chat thread participant."""

    user_id: str
    thread_id: str


@dataclass
class ThreadInfo:
    """Represents chat thread information."""

    id: str
    topic: str
    project_id: Optional[str]


class Database:
    """Thin wrapper around Supabase client for notify-fan-out service."""

    def __init__(self) -> None:
        self.client: Client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY,
            options=ClientOptions(
                postgrest_client_timeout=30,
                storage_client_timeout=30,
            ),
        )

    # -------------------------------------------------------------------------
    # Event Processing Queries
    # -------------------------------------------------------------------------

    def get_pending_events(self, limit: int = 500) -> List[DomainEvent]:
        """
        Poll for unprocessed domain events.

        Query pattern: LEFT JOIN to find events not in notification_processing
        or events that failed and need retry.

        Args:
            limit: Maximum number of events to fetch

        Returns:
            List of unprocessed DomainEvent objects
        """
        try:
            # Use RPC function for complex LEFT JOIN query
            response = self.client.rpc(
                "get_pending_notification_events", {"p_limit": limit}
            ).execute()

            rows: List[Dict[str, Any]] = response.data or []
            return [self._make_event(row) for row in rows]
        except Exception as e:
            logger.error("Failed to fetch pending events: %s", e, exc_info=True)
            return []

    def mark_event_processing(self, event_id: int) -> bool:
        """
        Atomically claim an event for processing.

        Uses INSERT ... ON CONFLICT to prevent race conditions.
        Only claims if status is 'pending' or NULL.

        Args:
            event_id: The event ID to claim

        Returns:
            True if successfully claimed, False if already claimed
        """
        try:
            response = (
                self.client.table("notification_processing")
                .insert(
                    {
                        "event_id": event_id,
                        "processing_status": "processing",
                        "claimed_at": datetime.now(timezone.utc).isoformat(),
                    },
                    upsert=False,  # Fail if exists
                )
                .execute()
            )
            return len(response.data) > 0
        except Exception as e:
            # Conflict means already claimed
            if "duplicate key" in str(e).lower():
                logger.debug("Event %d already claimed", event_id)
                return False

            logger.error(
                "Failed to mark event %d as processing: %s", event_id, e, exc_info=True
            )
            return False

    def mark_event_completed(self, event_id: int) -> None:
        """Mark an event as successfully completed."""
        try:
            self.client.table("notification_processing").update(
                {
                    "processing_status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("event_id", event_id).execute()
        except Exception as e:
            logger.error(
                "Failed to mark event %d as completed: %s", event_id, e, exc_info=True
            )

    def mark_event_failed(self, event_id: int, error_message: str = "") -> None:
        """Mark an event as failed with error details."""
        try:
            self.client.table("notification_processing").update(
                {
                    "processing_status": "failed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": error_message[:1000],  # Truncate long errors
                    "retry_count": self.client.rpc("increment", {"x": 1}),
                }
            ).eq("event_id", event_id).execute()
        except Exception as e:
            logger.error(
                "Failed to mark event %d as failed: %s", event_id, e, exc_info=True
            )

    # -------------------------------------------------------------------------
    # Notification Operations
    # -------------------------------------------------------------------------

    def create_notification(
        self,
        user_id: str,
        event_id: int,
        title: str,
        body: str,
        link_url: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Create an in-app notification.

        Args:
            user_id: Recipient user ID
            event_id: Source domain event ID
            title: Notification title
            body: Notification body (supports Markdown)
            link_url: Navigation link
            payload: Optional JSONB payload

        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.table("notifications").insert(
                {
                    "user_id": user_id,
                    "event_id": event_id,
                    "title": title,
                    "body": body,
                    "link_url": link_url,
                    "payload": payload or {},
                }
            ).execute()
            return True
        except Exception as e:
            logger.error(
                "Failed to create notification for user %s: %s", user_id, e, exc_info=True
            )
            return False

    def queue_email(
        self,
        user_id: str,
        event_id: int,
        event_type: str,
        delivery_type: str,
        subject: str,
        body_data: Dict[str, Any],
        project_id: Optional[str] = None,
        project_name: Optional[str] = None,
    ) -> bool:
        """
        Queue an email for sending by email-notifications service.

        Uses upsert to prevent duplicates (UNIQUE constraint on event_id, user_id).

        Args:
            user_id: Recipient user ID
            event_id: Source domain event ID
            event_type: Event type (for routing)
            delivery_type: 'immediate' or 'aggregated'
            subject: Email subject
            body_data: Structured data for template rendering
            project_id: Optional project ID
            project_name: Optional project name

        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.table("pending_emails").upsert(
                {
                    "user_id": user_id,
                    "event_id": event_id,
                    "event_type": event_type,
                    "delivery_type": delivery_type,
                    "project_id": project_id,
                    "project_name": project_name,
                    "subject": subject,
                    "body_data": body_data,
                    "status": "pending",
                },
                on_conflict="event_id,user_id",
            ).execute()
            return True
        except Exception as e:
            logger.error(
                "Failed to queue email for user %s: %s", user_id, e, exc_info=True
            )
            return False

    def increment_notification_count(self, notification_id: int) -> bool:
        """
        Increment the count field in a notification's payload (for aggregation).

        Args:
            notification_id: The notification ID to update

        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.rpc(
                "increment_notification_count", {"p_notification_id": notification_id}
            ).execute()
            return True
        except Exception as e:
            logger.error(
                "Failed to increment notification %d: %s",
                notification_id,
                e,
                exc_info=True,
            )
            return False

    # -------------------------------------------------------------------------
    # Helper Queries
    # -------------------------------------------------------------------------

    def get_thread_participants(self, thread_id: str) -> List[ChatParticipant]:
        """Fetch all participants in a chat thread."""
        try:
            response = (
                self.client.table("chat_thread_participants")
                .select("user_id, thread_id")
                .eq("thread_id", thread_id)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [
                ChatParticipant(user_id=row["user_id"], thread_id=row["thread_id"])
                for row in rows
            ]
        except Exception as e:
            logger.error(
                "Failed to fetch participants for thread %s: %s",
                thread_id,
                e,
                exc_info=True,
            )
            return []

    def get_thread_info(self, thread_id: str) -> Optional[ThreadInfo]:
        """Fetch thread information."""
        try:
            response = (
                self.client.table("chat_threads")
                .select("id, topic, project_id")
                .eq("id", thread_id)
                .single()
                .execute()
            )
            if response.data:
                return ThreadInfo(
                    id=response.data["id"],
                    topic=response.data["topic"],
                    project_id=response.data.get("project_id"),
                )
            return None
        except Exception as e:
            logger.error(
                "Failed to fetch thread info for %s: %s", thread_id, e, exc_info=True
            )
            return None

    def get_project_name(self, project_id: Optional[str]) -> str:
        """Fetch project name by ID."""
        if not project_id:
            return "Project"

        try:
            response = (
                self.client.table("projects")
                .select("name")
                .eq("id", project_id)
                .single()
                .execute()
            )
            return response.data.get("name") if response.data else "Project"
        except Exception as e:
            logger.debug("Failed to fetch project name for %s: %s", project_id, e)
            return "Project"

    def get_profile_name(self, user_id: Optional[str]) -> str:
        """Fetch user's display name by ID."""
        if not user_id:
            return "Someone"

        try:
            response = (
                self.client.table("profiles")
                .select("full_name, email")
                .eq("id", user_id)
                .single()
                .execute()
            )
            if response.data:
                return response.data.get("full_name") or response.data.get("email") or "Someone"
            return "Someone"
        except Exception as e:
            logger.debug("Failed to fetch profile name for %s: %s", user_id, e)
            return "Someone"

    def check_user_preference(
        self,
        user_id: str,
        scope_type: str,
        scope_id: str,
        event_type: str,
        channel: str,
        project_id: str,
    ) -> bool:
        """
        Check if user has muted this notification type.

        Hierarchical check: Thread > Project > Global

        Args:
            user_id: User to check
            scope_type: 'thread', 'project', or 'global'
            scope_id: Scope ID (thread_id, project_id, or empty)
            event_type: Event type
            channel: 'in_app' or 'email'
            project_id: Project ID for project-level fallback

        Returns:
            True if muted, False if not muted
        """
        try:
            response = (
                self.client.table("user_notification_preferences")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            prefs = response.data or []
            if not prefs:
                return False  # Not muted by default

            # Filter relevant preferences
            relevant = [
                p
                for p in prefs
                if (p["event_type"] == event_type or p["event_type"] == "*")
                and (p["channel"] == channel or p["channel"] == "*")
            ]

            # Check thread-level (highest priority)
            thread_pref = next(
                (
                    p
                    for p in relevant
                    if p["scope_type"] == "thread" and p["scope_id"] == scope_id
                ),
                None,
            )
            if thread_pref:
                return thread_pref["status"] == "muted"

            # Check project-level
            project_pref = next(
                (
                    p
                    for p in relevant
                    if p["scope_type"] == "project" and p["scope_id"] == project_id
                ),
                None,
            )
            if project_pref:
                return project_pref["status"] == "muted"

            # Check global
            global_pref = next(
                (p for p in relevant if p["scope_type"] == "global"), None
            )
            if global_pref:
                return global_pref["status"] == "muted"

            return False  # Not muted
        except Exception as e:
            logger.error(
                "Failed to check preferences for user %s: %s", user_id, e, exc_info=True
            )
            return False  # Fail open (don't mute on error)

    def fetch_existing_recipients(self, event_id: int) -> Set[str]:
        """Fetch user IDs already notified for this event (deduplication)."""
        try:
            response = (
                self.client.table("notifications")
                .select("user_id")
                .eq("event_id", event_id)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return {row["user_id"] for row in rows if row.get("user_id")}
        except Exception as e:
            logger.error(
                "Failed to fetch existing recipients for event %d: %s",
                event_id,
                e,
                exc_info=True,
            )
            return set()

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _make_event(row: Dict[str, Any]) -> DomainEvent:
        """Convert database row to DomainEvent dataclass."""
        return DomainEvent(
            id=row["id"],
            event_type=row["event_type"],
            actor_id=row.get("actor_id"),
            project_id=row.get("project_id"),
            org_id=row.get("org_id"),
            resource_id=row.get("resource_id"),
            thread_id=row.get("thread_id"),
            meeting_id=row.get("meeting_id"),
            occurred_at=row["occurred_at"],
            payload=row.get("payload") or {},
        )
