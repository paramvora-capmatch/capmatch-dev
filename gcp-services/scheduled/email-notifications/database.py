"""Database access layer for email-notifications service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

import logging
from supabase import Client, create_client
from supabase.client import ClientOptions

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class DomainEvent:
    id: int
    event_type: str
    actor_id: Optional[str]
    project_id: Optional[str]
    resource_id: Optional[str]
    thread_id: Optional[str]
    meeting_id: Optional[str]
    occurred_at: str
    payload: Dict[str, Any]


@dataclass
class PendingEmail:
    """Represents an email in the pending_emails queue."""
    id: int
    user_id: str
    event_id: int
    event_type: str
    delivery_type: str  # 'immediate' | 'aggregated'
    project_id: Optional[str]
    project_name: Optional[str]
    subject: str
    body_data: Dict[str, Any]
    status: str  # 'pending' | 'processing' | 'sent' | 'failed'
    created_at: str
    processed_at: Optional[str]


class Database:
    """Thin wrapper around Supabase client for this service."""

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
    # Helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _make_event(row: Dict[str, Any]) -> DomainEvent:
        return DomainEvent(
            id=row["id"],
            event_type=row["event_type"],
            actor_id=row.get("actor_id"),
            project_id=row.get("project_id"),
            resource_id=row.get("resource_id"),
            thread_id=row.get("thread_id"),
            meeting_id=row.get("meeting_id"),
            occurred_at=row["occurred_at"],
            payload=row.get("payload") or {},
        )

    @staticmethod
    def _make_pending_email(row: Dict[str, Any]) -> PendingEmail:
        return PendingEmail(
            id=row["id"],
            user_id=row["user_id"],
            event_id=row["event_id"],
            event_type=row["event_type"],
            delivery_type=row["delivery_type"],
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            subject=row["subject"],
            body_data=row.get("body_data") or {},
            status=row["status"],
            created_at=row["created_at"],
            processed_at=row.get("processed_at"),
        )

    # -------------------------------------------------------------------------
    # Hourly events
    # -------------------------------------------------------------------------

    def get_hourly_events(
        self,
        window_start: datetime,
        window_end: datetime,
        limit: int = 500,
    ) -> List[DomainEvent]:
        """
        DEPRECATED: Use get_pending_aggregated_emails instead.
        Return unprocessed hourly events in the given time window.

        Hourly events include:
        - document_uploaded
        - chat_message_sent
        """
        try:
            # Fetch domain_events in window that are not yet processed for kind='hourly'
            # We'll use a NOT EXISTS subquery via RPC or client-side filter.
            # For now, do client-side filter for simplicity.
            response = (
                self.client.table("domain_events")
                .select(
                    "id, event_type, actor_id, project_id, resource_id, "
                    "thread_id, meeting_id, occurred_at, payload"
                )
                .gte("occurred_at", window_start.isoformat())
                .lt("occurred_at", window_end.isoformat())
                .in_("event_type", ["document_uploaded", "chat_message_sent"])
                .order("occurred_at", desc=False)
                .limit(limit)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []

            if not rows:
                return []

            # Filter out already processed events for kind='hourly'
            event_ids = [row["id"] for row in rows]
            processed = self._get_processed_event_ids(event_ids, kind="hourly")
            unprocessed_rows = [row for row in rows if row["id"] not in processed]

            return [self._make_event(row) for row in unprocessed_rows]
        except Exception as e:  # pragma: no cover - defensive logging
            logger.error("Failed to fetch hourly events: %s", e, exc_info=True)
            return []

    # -------------------------------------------------------------------------
    # Instant events
    # -------------------------------------------------------------------------

    def get_instant_events(
        self,
        since: datetime,
        limit: int = 500,
    ) -> List[DomainEvent]:
        """
        DEPRECATED: Use get_pending_immediate_emails instead.
        Return unprocessed instant events since a given timestamp.

        Instant events include:
        - resume_incomplete_nudge
        - invite_accepted
        - project_member_added
        """
        try:
            response = (
                self.client.table("domain_events")
                .select(
                    "id, event_type, actor_id, project_id, resource_id, "
                    "thread_id, meeting_id, occurred_at, payload"
                )
                .gte("occurred_at", since.isoformat())
                .in_(
                    "event_type",
                    [
                        "resume_incomplete_nudge",
                        "invite_accepted",
                        "project_member_added",
                    ],
                )
                .order("occurred_at", desc=False)
                .limit(limit)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            if not rows:
                return []

            event_ids = [row["id"] for row in rows]
            processed = self._get_processed_event_ids(event_ids, kind="instant")
            unprocessed_rows = [row for row in rows if row["id"] not in processed]

            return [self._make_event(row) for row in unprocessed_rows]
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch instant events: %s", e, exc_info=True)
            return []

    # -------------------------------------------------------------------------
    # Pending Emails (NEW)
    # -------------------------------------------------------------------------

    def get_pending_immediate_emails(self, limit: int = 500) -> List[PendingEmail]:
        """
        Fetch pending emails with delivery_type='immediate' and status='pending'.
        Orders by created_at ASC (FIFO).
        """
        try:
            response = (
                self.client.table("pending_emails")
                .select("*")
                .eq("delivery_type", "immediate")
                .eq("status", "pending")
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [self._make_pending_email(row) for row in rows]
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch pending immediate emails: %s", e, exc_info=True)
            return []

    def get_pending_aggregated_emails(self, limit: int = 500) -> List[PendingEmail]:
        """
        Fetch pending emails with delivery_type='aggregated' and status='pending'.
        Orders by created_at ASC (FIFO).
        """
        try:
            response = (
                self.client.table("pending_emails")
                .select("*")
                .eq("delivery_type", "aggregated")
                .eq("status", "pending")
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [self._make_pending_email(row) for row in rows]
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch pending aggregated emails: %s", e, exc_info=True)
            return []

    def mark_email_processing(self, email_id: int) -> bool:
        """
        Atomically update status from 'pending' -> 'processing'.
        Returns True if successful (prevents race conditions).
        Uses WHERE clause: WHERE id = {email_id} AND status = 'pending'
        """
        try:
            response = (
                self.client.table("pending_emails")
                .update({"status": "processing"})
                .eq("id", email_id)
                .eq("status", "pending")  # Atomic condition
                .execute()
            )
            # Check if any rows were updated
            return len(response.data or []) > 0
        except Exception as e:  # pragma: no cover
            logger.error("Failed to mark email %d as processing: %s", email_id, e, exc_info=True)
            return False

    def mark_email_sent(self, email_id: int) -> None:
        """Update status to 'sent' and set processed_at timestamp."""
        try:
            self.client.table("pending_emails").update({
                "status": "sent",
                "processed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", email_id).execute()
        except Exception as e:  # pragma: no cover
            logger.error("Failed to mark email %d as sent: %s", email_id, e, exc_info=True)

    def mark_email_failed(self, email_id: int) -> None:
        """Update status to 'failed' and set processed_at timestamp."""
        try:
            self.client.table("pending_emails").update({
                "status": "failed",
                "processed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", email_id).execute()
        except Exception as e:  # pragma: no cover
            logger.error("Failed to mark email %d as failed: %s", email_id, e, exc_info=True)

    def update_email_status(
        self,
        email_id: int,
        status: str,
        processed_at: Optional[datetime] = None
    ) -> None:
        """
        Generic method to update email status.

        Args:
            email_id: ID of the pending_email
            status: New status ('pending', 'processing', 'sent', 'failed')
            processed_at: Optional timestamp (defaults to now() if provided as None and status is sent/failed)
        """
        try:
            update_data = {"status": status}
            if processed_at is not None:
                update_data["processed_at"] = processed_at.isoformat()
            elif status in ("sent", "failed"):
                update_data["processed_at"] = datetime.now(timezone.utc).isoformat()

            self.client.table("pending_emails").update(update_data).eq("id", email_id).execute()
        except Exception as e:  # pragma: no cover
            logger.error(
                "Failed to update email %d status to %s: %s", email_id, status, e, exc_info=True
            )

    # -------------------------------------------------------------------------
    # Processed tracking (DEPRECATED - for backward compatibility)
    # -------------------------------------------------------------------------

    def _get_processed_event_ids(
        self, event_ids: Sequence[int], kind: str
    ) -> List[int]:
        """
        DEPRECATED: Use pending_emails status instead.
        Return event_ids that are already processed for given kind.
        """
        if not event_ids:
            return []
        try:
            response = (
                self.client.table("email_notifications_processed")
                .select("event_id")
                .eq("kind", kind)
                .in_("event_id", event_ids)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [row["event_id"] for row in rows if row.get("event_id") is not None]
        except Exception as e:  # pragma: no cover
            logger.error(
                "Failed to fetch processed event ids for kind=%s: %s", kind, e, exc_info=True
            )
            return []

    def mark_events_processed(
        self,
        events: Sequence[DomainEvent],
        kind: str,
    ) -> None:
        """
        DEPRECATED: Use update_email_status instead.
        Mark events as processed for a given kind.
        """
        if not events:
            return
        records = [
            {"event_id": event.id, "kind": kind, "processed_at": "now()"}
            for event in events
        ]
        try:
            self.client.table("email_notifications_processed").upsert(
                records, on_conflict="event_id,kind"
            ).execute()
        except Exception as e:  # pragma: no cover
            logger.error(
                "Failed to mark events processed for kind=%s: %s", kind, e, exc_info=True
            )

    # -------------------------------------------------------------------------
    # Metadata helpers (profiles, projects, threads)
    # -------------------------------------------------------------------------

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = (
                self.client.table("profiles")
                .select("id, email, full_name")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            return response.data
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch profile %s: %s", user_id, e, exc_info=True)
            return None

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = (
                self.client.table("projects")
                .select("id, name, owner_org_id")
                .eq("id", project_id)
                .maybe_single()
                .execute()
            )
            return response.data
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch project %s: %s", project_id, e, exc_info=True)
            return None

    def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = (
                self.client.table("chat_threads")
                .select("id, topic, project_id")
                .eq("id", thread_id)
                .maybe_single()
                .execute()
            )
            return response.data
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch thread %s: %s", thread_id, e, exc_info=True)
            return None

    def get_project_owners(self, project_id: str) -> List[str]:
        """
        Return user IDs of project owners.

        Uses projects.owner_org_id -> org_members (role='owner').
        """
        project = self.get_project(project_id)
        if not project or not project.get("owner_org_id"):
            return []
        org_id = project["owner_org_id"]
        try:
            response = (
                self.client.table("org_members")
                .select("user_id")
                .eq("org_id", org_id)
                .eq("role", "owner")
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [row["user_id"] for row in rows if row.get("user_id")]
        except Exception as e:  # pragma: no cover
            logger.error("Failed to fetch project owners for org %s: %s", org_id, e, exc_info=True)
            return []

    def get_thread_participants(self, thread_id: str) -> List[str]:
        """Return user IDs of participants in a thread."""
        try:
            response = (
                self.client.table("chat_thread_participants")
                .select("user_id")
                .eq("thread_id", thread_id)
                .execute()
            )
            rows: List[Dict[str, Any]] = response.data or []
            return [row["user_id"] for row in rows if row.get("user_id")]
        except Exception as e:  # pragma: no cover
            logger.error(
                "Failed to fetch thread participants for thread %s: %s",
                thread_id,
                e,
                exc_info=True,
            )
            return []





