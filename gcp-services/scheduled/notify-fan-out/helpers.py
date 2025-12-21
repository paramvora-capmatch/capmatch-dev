"""
Helper functions for notify-fan-out service.

These functions are ported from supabase/functions/notify-fan-out/index.ts
"""

import logging
from typing import List, Set, Optional
from database import Database, DomainEvent

logger = logging.getLogger(__name__)


def collect_candidate_user_ids(db: Database, event: DomainEvent) -> Set[str]:
    """
    Collect all potential notification recipients for a document/project event.

    Gathers:
    1. Users with project_access_grants for the project
    2. Org owners (from project's owner_org_id or resource's org_id)

    Args:
        db: Database instance
        event: Domain event with project_id and/or resource_id

    Returns:
        Set of user IDs who are candidates for notification
    """
    ids: Set[str] = set()

    # Get users with explicit project access grants
    if event.project_id:
        try:
            response = (
                db.client.table("project_access_grants")
                .select("user_id")
                .eq("project_id", event.project_id)
                .execute()
            )
            for row in response.data or []:
                if row.get("user_id"):
                    ids.add(row["user_id"])
        except Exception as e:
            logger.error(
                "Failed to fetch project access grants: %s", e, exc_info=True
            )

    # Get org owners
    org_id = None

    # Try to get org_id from resource
    if event.resource_id:
        try:
            response = (
                db.client.table("resources")
                .select("org_id")
                .eq("id", event.resource_id)
                .single()
                .execute()
            )
            if response.data:
                org_id = response.data.get("org_id")
        except Exception as e:
            logger.debug("Failed to fetch resource org_id: %s", e)

    # Try to get org_id from project if not found from resource
    if not org_id and event.project_id:
        try:
            response = (
                db.client.table("projects")
                .select("owner_org_id")
                .eq("id", event.project_id)
                .single()
                .execute()
            )
            if response.data:
                org_id = response.data.get("owner_org_id")
        except Exception as e:
            logger.debug("Failed to fetch project owner_org_id: %s", e)

    # Get org owners
    if org_id:
        try:
            response = (
                db.client.table("org_members")
                .select("user_id")
                .eq("org_id", org_id)
                .eq("role", "owner")
                .execute()
            )
            for row in response.data or []:
                if row.get("user_id"):
                    ids.add(row["user_id"])
        except Exception as e:
            logger.error("Failed to fetch org owners: %s", e, exc_info=True)

    return ids


def filter_by_resource_access(
    db: Database, candidate_ids: Set[str], resource_id: Optional[str]
) -> List[str]:
    """
    Filter candidates by checking resource-level permissions.

    Calls can_view RPC for each candidate to verify access.

    Args:
        db: Database instance
        candidate_ids: Set of user IDs to check
        resource_id: Resource ID to check access for

    Returns:
        List of user IDs with view access to the resource
    """
    if not resource_id:
        return list(candidate_ids)

    results: List[str] = []

    for user_id in candidate_ids:
        try:
            response = db.client.rpc(
                "can_view", {"p_user_id": user_id, "p_resource_id": resource_id}
            ).execute()

            if response.data is True:
                results.append(user_id)
        except Exception as e:
            logger.debug(
                "Failed to check access for user %s on resource %s: %s",
                user_id,
                resource_id,
                e,
            )

    return results
