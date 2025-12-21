"""Project management routes."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from models.projects import (
    CopyBorrowerProfileRequest,
    CopyBorrowerProfileResponse,
    CreateProjectRequest,
    CreateProjectResponse,
    UpdateProjectRequest,
    UpdateProjectResponse,
)
from services.supabase_client import get_supabase_admin
from utils.project_utils import (
    ensure_storage_folders,
    fetch_most_complete_borrower_resume,
)
from utils.resume_merger import merge_resume_updates

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/update", response_model=UpdateProjectResponse)
async def update_project(request: UpdateProjectRequest, req: Request):
    """
    Update project core fields and/or resume JSONB content.

    Migrated from: supabase/functions/update-project/index.ts

    Args:
        request: Update request with project_id, core_updates, resume_updates
        req: FastAPI request object with authenticated user

    Returns:
        Success response
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Update project request received",
        extra={
            "request_id": request_id,
            "project_id": request.project_id,
            "has_core_updates": request.core_updates is not None,
            "has_resume_updates": request.resume_updates is not None,
        },
    )

    try:
        # Get authenticated user from request state
        if not hasattr(req.state, "user_id") or not req.state.user_id:
            logger.error(
                "Unauthorized - user_id not found in request state",
                extra={"request_id": request_id, "path": req.url.path},
            )
            raise HTTPException(
                status_code=401, detail="Unauthorized - authentication required"
            )

        user_id = req.state.user_id
        supabase = get_supabase_admin()

        # Update core project fields if provided
        if request.core_updates and request.core_updates.model_dump(exclude_none=True):
            core_data = request.core_updates.model_dump(exclude_none=True)
            logger.info(
                "Updating core project fields",
                extra={"request_id": request_id, "fields": list(core_data.keys())},
            )

            supabase.table("projects").update(core_data).eq(
                "id", request.project_id
            ).execute()

        # Update resume JSONB if provided
        if request.resume_updates:
            logger.info(
                "Updating project resume",
                extra={
                    "request_id": request_id,
                    "update_keys": list(request.resume_updates.keys()),
                },
            )

            # Fetch existing resume using pointer logic
            resource_response = (
                supabase.table("resources")
                .select("current_version_id")
                .eq("resource_type", "PROJECT_RESUME")
                .eq("project_id", request.project_id)
                .maybe_single()
                .execute()
            )

            existing = None
            if resource_response.data and resource_response.data.get(
                "current_version_id"
            ):
                # Pointer exists - fetch that version
                resume_response = (
                    supabase.table("project_resumes")
                    .select("id, content")
                    .eq("id", resource_response.data["current_version_id"])
                    .single()
                    .execute()
                )
                existing = resume_response.data
            else:
                # No pointer - fallback to latest by date
                resume_response = (
                    supabase.table("project_resumes")
                    .select("id, content")
                    .eq("project_id", request.project_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .maybe_single()
                    .execute()
                )
                existing = resume_response.data

            existing_content = existing.get("content", {}) if existing else {}

            # Extract metadata from resume_updates if present
            metadata = request.resume_updates.pop("_metadata", None)

            # Merge updates with existing content
            merged_content, locked_fields = merge_resume_updates(
                existing_content, request.resume_updates, metadata
            )

            # Extract completenessPercent if present (stored in column, not content)
            completeness_percent = request.resume_updates.get("completenessPercent")

            # Prepare update payload
            update_payload = {"content": merged_content}

            if locked_fields:
                update_payload["locked_fields"] = locked_fields

            if completeness_percent is not None:
                update_payload["completeness_percent"] = completeness_percent

            # Update or insert
            if existing and existing.get("id"):
                supabase.table("project_resumes").update(update_payload).eq(
                    "id", existing["id"]
                ).execute()
            else:
                insert_payload = {
                    "project_id": request.project_id,
                    **update_payload,
                }
                supabase.table("project_resumes").insert(insert_payload).execute()

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Project updated successfully",
            extra={"request_id": request_id, "duration_ms": duration},
        )

        return UpdateProjectResponse(ok=True)

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error updating project",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", status_code=201, response_model=CreateProjectResponse)
async def create_project(request: CreateProjectRequest, req: Request):
    """
    Create a new project with resume, storage, and permissions.

    Migrated from: supabase/functions/create-project/index.ts

    Args:
        request: Create request with name, owner_org_id, assigned_advisor_id, address
        req: FastAPI request object with authenticated user

    Returns:
        Created project with borrower resume content
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Create project request received",
        extra={
            "request_id": request_id,
            "project_name": request.name,
            "owner_org_id": request.owner_org_id,
            "has_advisor": request.assigned_advisor_id is not None,
            "has_address": request.address is not None,
        },
    )

    try:
        # Get authenticated user from request state
        if not hasattr(req.state, "user_id") or not req.state.user_id:
            logger.error(
                "Unauthorized - user_id not found in request state",
                extra={"request_id": request_id, "path": req.url.path},
            )
            raise HTTPException(
                status_code=401, detail="Unauthorized - authentication required"
            )

        user_id = req.state.user_id
        supabase = get_supabase_admin()

        # Verify user is org owner
        logger.info(
            "Checking org ownership",
            extra={
                "request_id": request_id,
                "org_id": request.owner_org_id,
                "user_id": user_id,
            },
        )

        is_owner_response = supabase.rpc(
            "is_org_owner",
            {"p_org_id": request.owner_org_id, "p_user_id": user_id},
        ).execute()

        if not is_owner_response.data:
            logger.warning(
                "Authorization failed - user is not org owner",
                extra={
                    "request_id": request_id,
                    "user_id": user_id,
                    "org_id": request.owner_org_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="User must be an owner of the org to create a project",
            )

        # Find advisor if not provided
        final_advisor_id = request.assigned_advisor_id
        if not final_advisor_id:
            logger.info(
                "Looking for advisor to auto-assign",
                extra={"request_id": request_id},
            )
            try:
                advisor_org_response = (
                    supabase.table("orgs")
                    .select("id")
                    .eq("entity_type", "advisor")
                    .limit(1)
                    .maybe_single()
                    .execute()
                )

                if advisor_org_response.data:
                    advisor_member_response = (
                        supabase.table("org_members")
                        .select("user_id")
                        .eq("org_id", advisor_org_response.data["id"])
                        .limit(1)
                        .maybe_single()
                        .execute()
                    )

                    if advisor_member_response.data:
                        final_advisor_id = advisor_member_response.data["user_id"]
                        logger.info(
                            "Found advisor for auto-assignment",
                            extra={"request_id": request_id, "advisor_id": final_advisor_id},
                        )
            except Exception as error:
                logger.warning(
                    "Could not find advisor for auto-assignment",
                    extra={"request_id": request_id, "error": str(error)},
                )

        # Build initial resume content
        initial_resume_content = {
            "projectName": {
                "value": request.name,
                "source": {"type": "user_input"},
                "warnings": [],
                "other_values": [],
            }
        }

        if request.address:
            initial_resume_content["propertyAddressStreet"] = {
                "value": request.address.strip(),
                "source": {"type": "user_input"},
                "warnings": [],
                "other_values": [],
            }

        # Step 1: Create project record
        logger.info("Creating project record", extra={"request_id": request_id})
        project_response = (
            supabase.table("projects")
            .insert(
                {
                    "name": request.name,
                    "owner_org_id": request.owner_org_id,
                    "assigned_advisor_id": final_advisor_id,
                }
            )
            .execute()
        )

        project = project_response.data[0] if isinstance(project_response.data, list) else project_response.data
        project_id = project["id"]

        # Cleanup helper
        async def cleanup_project():
            try:
                supabase.table("projects").delete().eq("id", project_id).execute()
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup project: {cleanup_error}")

        try:
            # Phase 1: Parallel independent operations
            logger.info(
                "Phase 1: Creating project resources in parallel",
                extra={"request_id": request_id},
            )

            (
                _resume_result,
                _storage_result,
                _project_resume_resource,
                _project_docs_root_resource,
                borrower_roots_result,
                borrower_resume_fetch_result,
                owner_members_result,
            ) = await asyncio.gather(
                # Create project resume
                asyncio.to_thread(
                    lambda: supabase.table("project_resumes")
                    .insert(
                        {
                            "project_id": project_id,
                            "content": initial_resume_content,
                            "created_by": user_id,
                        }
                    )
                    .execute()
                ),
                # Ensure storage folders
                ensure_storage_folders(supabase, request.owner_org_id, project_id),
                # Create PROJECT_RESUME resource
                asyncio.to_thread(
                    lambda: supabase.table("resources")
                    .insert(
                        {
                            "org_id": request.owner_org_id,
                            "project_id": project_id,
                            "resource_type": "PROJECT_RESUME",
                            "name": f"{request.name} Resume",
                        }
                    )
                    .execute()
                ),
                # Create PROJECT_DOCS_ROOT resource
                asyncio.to_thread(
                    lambda: supabase.table("resources")
                    .insert(
                        {
                            "org_id": request.owner_org_id,
                            "project_id": project_id,
                            "resource_type": "PROJECT_DOCS_ROOT",
                            "name": f"{request.name} Documents",
                        }
                    )
                    .execute()
                ),
                # Ensure borrower root resources
                asyncio.to_thread(
                    lambda: supabase.rpc(
                        "ensure_project_borrower_roots", {"p_project_id": project_id}
                    ).execute()
                ),
                # Fetch most complete borrower resume
                fetch_most_complete_borrower_resume(
                    supabase, request.owner_org_id, project_id
                ),
                # Load org owners
                asyncio.to_thread(
                    lambda: supabase.table("org_members")
                    .select("user_id")
                    .eq("org_id", request.owner_org_id)
                    .eq("role", "owner")
                    .execute()
                ),
            )

            borrower_resume_content = borrower_resume_fetch_result["content"]
            source_resume_project_id = borrower_resume_fetch_result["projectId"]

            # Phase 2: Create borrower resume
            logger.info(
                "Phase 2: Creating borrower resume",
                extra={"request_id": request_id},
            )

            supabase.table("borrower_resumes").insert(
                {
                    "project_id": project_id,
                    "content": borrower_resume_content,
                    "completeness_percent": borrower_resume_fetch_result.get(
                        "completeness_percent", 0
                    ),
                    "locked_fields": borrower_resume_fetch_result.get(
                        "locked_fields", {}
                    ),
                    "created_by": borrower_resume_fetch_result.get("created_by"),
                }
            ).execute()

            # Phase 3: Grant permissions
            logger.info(
                "Phase 3: Granting permissions", extra={"request_id": request_id}
            )

            owner_ids = {user_id}
            for member in owner_members_result.data or []:
                if member.get("user_id"):
                    owner_ids.add(member["user_id"])

            project_access_grants = [
                {
                    "project_id": project_id,
                    "org_id": request.owner_org_id,
                    "user_id": owner_id,
                    "granted_by": user_id,
                }
                for owner_id in owner_ids
            ]

            supabase.table("project_access_grants").upsert(
                project_access_grants, on_conflict="project_id,user_id"
            ).execute()

            # Phase 4: Non-critical operations (fire and forget)
            asyncio.create_task(
                asyncio.to_thread(
                    lambda: create_chat_thread_deferred(
                        supabase, project_id, owner_ids, final_advisor_id
                    )
                )
            )

            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                "Project created successfully",
                extra={
                    "request_id": request_id,
                    "project_id": project_id,
                    "duration_ms": duration,
                },
            )

            return CreateProjectResponse(
                project=project,
                borrowerResumeContent=borrower_resume_content,
                borrowerResumeSourceProjectId=source_resume_project_id,
            )

        except Exception as error:
            await cleanup_project()
            raise

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error creating project",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


def create_chat_thread_deferred(supabase, project_id, owner_ids, advisor_id):
    """Create chat thread in background (non-blocking)."""
    try:
        chat_thread_response = (
            supabase.table("chat_threads")
            .insert({"project_id": project_id, "topic": "General"})
            .execute()
        )

        chat_thread = chat_thread_response.data[0] if isinstance(chat_thread_response.data, list) else chat_thread_response.data

        participant_ids = set(owner_ids)
        if advisor_id:
            participant_ids.add(advisor_id)

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


@router.post("/copy-borrower-profile", response_model=CopyBorrowerProfileResponse)
async def copy_borrower_profile(request: CopyBorrowerProfileRequest, req: Request):
    """
    Copy borrower resume from source project to target project.

    Migrated from: supabase/functions/copy-borrower-profile/index.ts

    Note: Document cloning not yet implemented (requires document_operations.py)

    Args:
        request: Copy request with source_project_id and target_project_id
        req: FastAPI request object with authenticated user

    Returns:
        Success response with copied content
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Copy borrower profile request received",
        extra={
            "request_id": request_id,
            "source_project_id": request.source_project_id,
            "target_project_id": request.target_project_id,
        },
    )

    try:
        if request.source_project_id == request.target_project_id:
            raise HTTPException(
                status_code=400, detail="Source and target projects must be different"
            )

        # Get authenticated user
        if not hasattr(req.state, "user_id") or not req.state.user_id:
            raise HTTPException(
                status_code=401, detail="Unauthorized - authentication required"
            )

        user_id = req.state.user_id
        supabase = get_supabase_admin()

        # Verify permissions on target project
        target_project_response = (
            supabase.table("projects")
            .select("id, owner_org_id")
            .eq("id", request.target_project_id)
            .single()
            .execute()
        )

        target_project = target_project_response.data

        ownership_response = supabase.rpc(
            "is_org_owner",
            {"p_org_id": target_project["owner_org_id"], "p_user_id": user_id},
        ).execute()

        if not ownership_response.data:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to copy borrower profile",
            )

        # Fetch source borrower resume
        source_resume_response = (
            supabase.table("borrower_resumes")
            .select("content")
            .eq("project_id", request.source_project_id)
            .maybe_single()
            .execute()
        )

        source_content = source_resume_response.data.get("content", {}) if source_resume_response.data else {}

        # Update target borrower resume
        target_resume_response = (
            supabase.table("borrower_resumes")
            .select("id")
            .eq("project_id", request.target_project_id)
            .maybe_single()
            .execute()
        )

        if target_resume_response.data:
            # Update existing
            supabase.table("borrower_resumes").update(
                {"content": source_content}
            ).eq("id", target_resume_response.data["id"]).execute()
        else:
            # Insert new
            supabase.table("borrower_resumes").insert(
                {"project_id": request.target_project_id, "content": source_content}
            ).execute()

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Borrower profile copied successfully",
            extra={"request_id": request_id, "duration_ms": duration},
        )

        return CopyBorrowerProfileResponse(
            success=True,
            borrowerResumeContent=source_content,
            sourceProjectId=request.source_project_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error copying borrower profile",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=400, detail=str(e))
