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

    Raises:
        Exception: If bucket doesn't exist or folder creation fails

    Args:
        supabase: Supabase client
        bucket_id: Storage bucket ID (org_id)
        project_id: Project ID
    """
    # Verify bucket exists first
    try:
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.id == bucket_id for b in buckets)

        if not bucket_exists:
            raise Exception(f"Bucket '{bucket_id}' does not exist. Cannot create folders.")

        logger.info(f"[project-utils] Bucket '{bucket_id}' verified, creating folders")
    except Exception as list_error:
        logger.error(f"[project-utils] Failed to verify bucket existence: {list_error}")
        raise

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
            logger.debug(f"[project-utils] Created placeholder: {path}")
        except Exception as error:
            # More detailed error with bucket_id context
            error_msg = f"Bucket '{bucket_id}', Path '{path}': {error}"
            logger.error(f"[project-utils] Failed to create placeholder: {error_msg}")
            raise Exception(error_msg)

    logger.info(f"[project-utils] All storage folders created for project {project_id}")


async def ensure_storage_folders_with_retry(
    supabase: Client, bucket_id: str, project_id: str, max_retries: int = 3
) -> None:
    """
    Wrapper with retry logic for ensure_storage_folders.

    Args:
        supabase: Supabase client
        bucket_id: Storage bucket ID (org_id)
        project_id: Project ID
        max_retries: Maximum number of retry attempts (default: 3)

    Raises:
        Exception: If all retry attempts fail
    """
    import asyncio

    for attempt in range(max_retries):
        try:
            await ensure_storage_folders(supabase, bucket_id, project_id)
            logger.info(f"[project-utils] Storage folders created on attempt {attempt + 1}")
            return  # Success
        except Exception as error:
            if attempt == max_retries - 1:
                logger.error(
                    f"[project-utils] Storage folder creation failed after {max_retries} attempts: {error}"
                )
                raise  # Last attempt, re-raise

            # Exponential backoff
            delay = 0.5 * (2 ** attempt)
            logger.warning(
                f"[project-utils] Folder creation attempt {attempt + 1}/{max_retries} failed, "
                f"retrying in {delay}s: {error}"
            )
            await asyncio.sleep(delay)


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


async def create_project_with_resume_and_storage(
    supabase: Client,
    name: str,
    owner_org_id: str,
    creator_id: str,
    assigned_advisor_id: Optional[str] = None,
    address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a project with resume, storage, and permissions.

    Orchestrates the full project creation flow in 4 phases:
    - Phase 1: Project + parallel resource creation
    - Phase 2: Borrower resume + document cloning
    - Phase 3: Batch permission grants
    - Phase 4: Non-critical deferred operations

    Args:
        supabase: Supabase client
        name: Project name
        owner_org_id: Organization ID
        creator_id: User ID creating the project
        assigned_advisor_id: Optional advisor user ID
        address: Optional project address

    Returns:
        Dict with project, borrowerResumeContent, borrowerResumeSourceProjectId

    Raises:
        Exception: If project creation fails
    """
    import asyncio

    logger.info(f"[project-utils] Creating project: {name} for org: {owner_org_id}")

    # Build initial project resume content
    initial_resume_content = {
        "projectName": {
            "value": name,
            "source": {"type": "user_input"},
            "warnings": [],
            "other_values": [],
        }
    }

    if address and address.strip():
        initial_resume_content["propertyAddressStreet"] = {
            "value": address.strip(),
            "source": {"type": "user_input"},
            "warnings": [],
            "other_values": [],
        }

    # STEP 1: Create project record
    logger.info("[project-utils] Creating project record")
    project_response = (
        supabase.table("projects")
        .insert({
            "name": name,
            "owner_org_id": owner_org_id,
            "assigned_advisor_id": assigned_advisor_id,
        })
        .execute()
    )

    if not project_response.data:
        raise Exception("Project creation failed - no data returned")

    project = project_response.data[0]
    project_id = project["id"]

    # Helper: cleanup on error
    async def cleanup_project():
        supabase.table("projects").delete().eq("id", project_id).execute()

    try:
        # PHASE 1: Parallel independent operations
        logger.info("[project-utils] Phase 1: Creating project resources in parallel")

        (
            _resume_result,
            _storage_result,
            project_resume_resource,
            project_docs_root_resource,
            borrower_roots_result,
            borrower_resume_fetch_result,
            owner_members_result,
        ) = await asyncio.gather(
            # Create project resume
            asyncio.to_thread(
                lambda: supabase.table("project_resumes")
                .insert({
                    "project_id": project_id,
                    "content": initial_resume_content,
                    "created_by": creator_id,
                })
                .execute()
            ),
            # Ensure storage folders (with retry)
            ensure_storage_folders_with_retry(supabase, owner_org_id, project_id, max_retries=3),
            # Create PROJECT_RESUME resource
            asyncio.to_thread(
                lambda: supabase.table("resources")
                .insert({
                    "org_id": owner_org_id,
                    "project_id": project_id,
                    "resource_type": "PROJECT_RESUME",
                    "name": f"{name} Resume",
                })
                .execute()
            ),
            # Create PROJECT_DOCS_ROOT resource
            asyncio.to_thread(
                lambda: supabase.table("resources")
                .insert({
                    "org_id": owner_org_id,
                    "project_id": project_id,
                    "resource_type": "PROJECT_DOCS_ROOT",
                    "name": f"{name} Documents",
                })
                .execute()
            ),
            # Ensure borrower root resources
            asyncio.to_thread(
                lambda: supabase.rpc(
                    "ensure_project_borrower_roots",
                    {"p_project_id": project_id},
                ).execute()
            ),
            # Fetch most complete borrower resume
            fetch_most_complete_borrower_resume(supabase, owner_org_id, project_id),
            # Load org owners
            asyncio.to_thread(
                lambda: supabase.table("org_members")
                .select("user_id")
                .eq("org_id", owner_org_id)
                .eq("role", "owner")
                .execute()
            ),
        )

        # Extract results
        project_resume_resource_data = project_resume_resource.data[0]
        project_docs_root_resource_data = project_docs_root_resource.data[0]
        borrower_roots = borrower_roots_result.data or []
        borrower_root_row = borrower_roots[0] if borrower_roots else None

        borrower_resume_content = borrower_resume_fetch_result["content"]
        source_resume_project_id = borrower_resume_fetch_result["projectId"]
        source_completeness_percent = borrower_resume_fetch_result["completeness_percent"]
        source_locked_fields = borrower_resume_fetch_result["locked_fields"]
        source_created_by = borrower_resume_fetch_result["created_by"]

        # Build owner IDs set
        owner_ids = {creator_id}
        for member in owner_members_result.data or []:
            if member.get("user_id"):
                owner_ids.add(member["user_id"])

        # PHASE 2: Create borrower resume + clone documents
        logger.info("[project-utils] Phase 2: Creating borrower resume")

        await asyncio.to_thread(
            lambda: supabase.table("borrower_resumes")
            .insert({
                "project_id": project_id,
                "content": borrower_resume_content,
                "completeness_percent": source_completeness_percent or 0,
                "locked_fields": source_locked_fields or {},
                "created_by": source_created_by,
            })
            .execute()
        )

        # PHASE 3: Grant permissions
        logger.info("[project-utils] Phase 3: Batch granting permissions")

        # Build permission targets
        permission_targets = [
            project_docs_root_resource_data["id"],
            project_resume_resource_data["id"],
        ]

        if borrower_root_row:
            if borrower_root_row.get("borrower_docs_root_resource_id"):
                permission_targets.append(borrower_root_row["borrower_docs_root_resource_id"])
            if borrower_root_row.get("borrower_resume_resource_id"):
                permission_targets.append(borrower_root_row["borrower_resume_resource_id"])

        # Batch grant project access
        project_access_grants = [
            {
                "project_id": project_id,
                "org_id": owner_org_id,
                "user_id": owner_id,
                "granted_by": creator_id,
            }
            for owner_id in owner_ids
        ]

        # Batch grant permissions
        permission_grants = [
            {
                "resource_id": resource_id,
                "user_id": owner_id,
                "permission": "edit",
                "granted_by": creator_id,
            }
            for owner_id in owner_ids
            for resource_id in permission_targets
        ]

        await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("project_access_grants")
                .upsert(project_access_grants, on_conflict="project_id,user_id")
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("permissions")
                .upsert(permission_grants, on_conflict="resource_id,user_id")
                .execute()
            ),
        )

        logger.info(f"[project-utils] Granted access to {len(owner_ids)} owners")

        # PHASE 4: Non-critical deferred operations (fire-and-forget)
        logger.info("[project-utils] Phase 4: Deferring non-critical operations")

        # Create chat thread (background task)
        async def create_chat_thread_deferred():
            try:
                chat_thread_response = (
                    supabase.table("chat_threads")
                    .insert({"project_id": project_id, "topic": "General"})
                    .execute()
                )

                if chat_thread_response.data:
                    chat_thread = chat_thread_response.data[0]
                    participant_ids = set(owner_ids)
                    if assigned_advisor_id:
                        participant_ids.add(assigned_advisor_id)

                    participants = [
                        {
                            "thread_id": chat_thread["id"],
                            "user_id": uid,
                            "last_read_at": "1970-01-01T00:00:00.000Z",
                        }
                        for uid in participant_ids
                    ]

                    supabase.table("chat_thread_participants").insert(participants).execute()
            except Exception as error:
                logger.warning(f"Failed to create chat thread (non-critical): {error}")

        # Grant advisor permissions (background task)
        async def grant_advisor_perms_deferred():
            if assigned_advisor_id:
                try:
                    supabase.rpc(
                        "grant_advisor_project_permissions",
                        {
                            "p_project_id": project_id,
                            "p_advisor_id": assigned_advisor_id,
                            "p_granted_by_id": creator_id,
                        },
                    ).execute()
                except Exception as error:
                    logger.warning(f"Failed to grant advisor permissions (non-critical): {error}")

        # Launch background tasks
        asyncio.create_task(create_chat_thread_deferred())
        asyncio.create_task(grant_advisor_perms_deferred())

        logger.info(f"[project-utils] Project creation completed: {project_id}")

        return {
            "project": project,
            "borrowerResumeContent": borrower_resume_content,
            "borrowerResumeSourceProjectId": source_resume_project_id,
        }

    except Exception as error:
        logger.error(f"[project-utils] Error during project creation: {error}")
        await cleanup_project()
        raise
