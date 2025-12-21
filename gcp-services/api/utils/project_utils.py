"""
Project utility functions migrated from TypeScript.

This module provides shared utilities for project creation, borrower resume handling,
and document cloning operations.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from supabase import Client

logger = logging.getLogger(__name__)

# Storage subdirectory constants
BORROWER_DOCS_SUBDIR = "borrower-docs"
PROJECT_DOCS_SUBDIR = "project-docs"
SITE_IMAGES_SUBDIR = "site-images"
ARCHITECTURAL_DIAGRAMS_SUBDIR = "architectural-diagrams"
PLACEHOLDER_FILENAME = ".keep"


# ============================================================================
# Helper Functions
# ============================================================================

def parse_completeness_percent(value: Any) -> int:
    """
    Parse completeness percentage from various formats.

    Args:
        value: Value to parse (number, string, or other)

    Returns:
        Integer percentage (0-100)
    """
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value == value:  # Check for NaN
            return int(value)
    if isinstance(value, str):
        try:
            parsed = float(value)
            if parsed == parsed:  # Check for NaN
                return int(parsed)
        except (ValueError, TypeError):
            pass
    return 0


def has_meaningful_borrower_content(content: Optional[Dict[str, Any]]) -> bool:
    """
    Check if borrower resume content has meaningful data.

    Args:
        content: Borrower resume content dictionary

    Returns:
        True if content has meaningful non-ignored fields
    """
    if not content:
        return False

    ignored_keys = {
        "completenessPercent",
        "createdAt",
        "updatedAt",
        "masterProfileId",
        "lastSyncedAt",
        "customFields",
    }

    for key, value in content.items():
        if key in ignored_keys:
            continue

        if isinstance(value, list):
            if len(value) > 0:
                return True
        elif value is None:
            continue
        elif isinstance(value, str):
            if value.strip():
                return True
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
        elif isinstance(value, bool):
            return True
        elif isinstance(value, dict):
            if len(value) > 0:
                return True

    return False


def build_storage_path(
    project_id: str,
    resource_id: str,
    version_number: int,
    file_name: str,
    context: str,  # "borrower" or "project"
    user_id: Optional[str] = None,
) -> str:
    """
    Build storage path for document version.

    Args:
        project_id: Project ID
        resource_id: Resource ID
        version_number: Version number
        file_name: Original file name
        context: "borrower" or "project"
        user_id: Optional user ID for versioning

    Returns:
        Full storage path string
    """
    safe_name = file_name.replace("\\", "")
    base = BORROWER_DOCS_SUBDIR if context == "borrower" else PROJECT_DOCS_SUBDIR
    user_suffix = f"_user{user_id}" if user_id else ""
    return f"{project_id}/{base}/{resource_id}/v{version_number}{user_suffix}_{safe_name}"


async def ensure_storage_folders(
    supabase: Client, bucket_id: str, project_id: str
) -> None:
    """
    Create placeholder files in storage to ensure folders exist.

    Args:
        supabase: Supabase client
        bucket_id: Storage bucket ID (org_id)
        project_id: Project ID
    """
    placeholder_content = b"keep"
    paths = [
        f"{project_id}/{PROJECT_DOCS_SUBDIR}/{PLACEHOLDER_FILENAME}",
        f"{project_id}/{BORROWER_DOCS_SUBDIR}/{PLACEHOLDER_FILENAME}",
        f"{project_id}/{SITE_IMAGES_SUBDIR}/{PLACEHOLDER_FILENAME}",
        f"{project_id}/{ARCHITECTURAL_DIAGRAMS_SUBDIR}/{PLACEHOLDER_FILENAME}",
    ]

    for path in paths:
        try:
            supabase.storage.from_(bucket_id).upload(
                path, placeholder_content, {"upsert": "true"}
            )
        except Exception as error:
            logger.error(
                f"[project-utils] Failed to create placeholder {path}: {error}"
            )
            raise


async def fetch_most_complete_borrower_resume(
    supabase: Client, owner_org_id: str, exclude_project_id: str
) -> Dict[str, Any]:
    """
    Find the most complete borrower resume from same org to copy.

    Args:
        supabase: Supabase client
        owner_org_id: Organization ID
        exclude_project_id: Project ID to exclude (current project)

    Returns:
        Dictionary with content, projectId, completeness_percent, locked_fields, created_by
    """
    try:
        response = (
            supabase.table("borrower_resumes")
            .select(
                """
                project_id, content, completeness_percent, locked_fields, created_by, updated_at,
                projects!inner(id, owner_org_id, updated_at)
            """
            )
            .eq("projects.owner_org_id", owner_org_id)
            .neq("project_id", exclude_project_id)
            .execute()
        )

        if not response.data:
            return {
                "content": {},
                "projectId": None,
                "completeness_percent": None,
                "locked_fields": None,
                "created_by": None,
            }

        # Build candidate list with scores
        candidates = []
        for row in response.data:
            content = row.get("content") or {}
            completeness = row.get("completeness_percent") or parse_completeness_percent(
                content.get("completenessPercent", 0)
            )
            locked_fields = row.get("locked_fields") or {}
            updated_at = row.get("updated_at") or row.get("projects", {}).get(
                "updated_at", "1970-01-01T00:00:00"
            )

            try:
                from datetime import datetime

                timestamp = datetime.fromisoformat(
                    updated_at.replace("Z", "+00:00")
                ).timestamp()
            except Exception:
                timestamp = 0

            candidates.append(
                {
                    "projectId": row.get("project_id"),
                    "content": content,
                    "completeness": completeness,
                    "lockedFields": locked_fields,
                    "created_by": row.get("created_by"),
                    "updatedAt": timestamp,
                    "hasMeaningfulContent": has_meaningful_borrower_content(content),
                }
            )

        if not candidates:
            return {
                "content": {},
                "projectId": None,
                "completeness_percent": None,
                "locked_fields": None,
                "created_by": None,
            }

        # Sort by completeness (desc), then updated timestamp (desc)
        candidates.sort(
            key=lambda c: (c["completeness"], c["updatedAt"]), reverse=True
        )

        # Find first candidate with meaningful content
        filled_candidate = None
        for candidate in candidates:
            if candidate["completeness"] > 0 and candidate["hasMeaningfulContent"]:
                filled_candidate = candidate
                break

        # Fallback to first candidate with meaningful content
        if not filled_candidate:
            for candidate in candidates:
                if candidate["hasMeaningfulContent"]:
                    filled_candidate = candidate
                    break

        # Last fallback: most complete
        selected = filled_candidate or candidates[0]

        return {
            "content": selected["content"],
            "projectId": selected["projectId"],
            "completeness_percent": selected["completeness"],
            "locked_fields": selected["lockedFields"],
            "created_by": selected.get("created_by"),
        }

    except Exception as error:
        logger.error(
            f"[project-utils] Error fetching borrower resumes for duplication: {error}"
        )
        return {
            "content": {},
            "projectId": None,
            "completeness_percent": None,
            "locked_fields": None,
            "created_by": None,
        }


def is_descendant(
    resources_by_id: Dict[str, Dict[str, Any]],
    resource: Dict[str, Any],
    root_id: str,
) -> bool:
    """
    Check if a resource is a descendant of a root resource.

    Args:
        resources_by_id: Map of resource ID to resource record
        resource: Resource to check
        root_id: Root resource ID

    Returns:
        True if resource is a descendant of root
    """
    current_parent = resource.get("parent_id")
    while current_parent:
        if current_parent == root_id:
            return True
        parent = resources_by_id.get(current_parent)
        if not parent:
            return False
        current_parent = parent.get("parent_id")
    return False
