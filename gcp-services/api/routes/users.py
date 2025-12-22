"""User management routes."""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from models.auth import (
    InviteUserRequest,
    InviteUserResponse,
    OnboardBorrowerRequest,
    OnboardBorrowerResponse,
    RemoveUserRequest,
    RemoveUserResponse,
)
from models.users import (
    UpdateMemberPermissionsRequest,
    UpdateMemberPermissionsResponse,
)
from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/invite", status_code=201)
async def invite_user(request: InviteUserRequest, req: Request):
    """
    Invite a user to an organization.

    Validates that:
    - Calling user is an org owner
    - Invited email doesn't already exist
    - project_grants and org_grants are properly structured

    Migrated from: supabase/functions/invite-user/index.ts

    Args:
        request: Invite request with email, org_id, role, and grants
        req: FastAPI request object with authenticated user

    Returns:
        Invite record with token and expiry
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Invite user request received",
        extra={
            "request_id": request_id,
            "org_id": request.org_id,
            "invited_email": request.email,
            "role": request.role,
            "has_project_grants": bool(request.project_grants),
            "has_org_grants": bool(request.org_grants),
        },
    )

    try:
        # Get authenticated user from request state
        if not hasattr(req.state, 'user_id') or not req.state.user_id:
            logger.error(
                "Unauthorized - user_id not found in request state",
                extra={"request_id": request_id, "path": req.url.path},
            )
            raise HTTPException(
                status_code=401, detail="Unauthorized - authentication required"
            )

        user_id = req.state.user_id

        supabase = get_supabase_admin()

        # Verify the user has permission to create an invite for this org
        logger.info(
            "Checking org ownership",
            extra={"request_id": request_id, "org_id": request.org_id, "user_id": user_id},
        )

        is_owner_response = supabase.rpc(
            "is_org_owner", {"p_org_id": request.org_id, "p_user_id": user_id}
        ).execute()

        is_owner = is_owner_response.data

        if not is_owner:
            logger.warning(
                "Authorization failed - user is not org owner",
                extra={"request_id": request_id, "user_id": user_id, "org_id": request.org_id},
            )
            raise HTTPException(
                status_code=403, detail="User must be an owner of the org to create an invite"
            )

        logger.info(
            "User confirmed as owner",
            extra={"request_id": request_id, "user_id": user_id},
        )

        # Block invites to existing users
        logger.info(
            "Checking if email already exists",
            extra={"request_id": request_id, "email": request.email},
        )

        try:
            existing_profile_response = (
                supabase.table("profiles")
                .select("id")
                .eq("email", request.email)
                .maybe_single()
                .execute()
            )
        except Exception as profile_check_error:
            logger.error(
                "Error checking if email exists",
                extra={
                    "request_id": request_id,
                    "email": request.email,
                    "error": str(profile_check_error),
                    "error_type": type(profile_check_error).__name__,
                },
            )
            # If we can't check, log warning but continue
            # The invite creation will fail later if email already exists
            logger.warning(
                "Could not verify email availability, proceeding with invite",
                extra={"request_id": request_id, "email": request.email},
            )
            existing_profile_response = None

        # Check if email exists (handle both None response and response with data)
        if existing_profile_response is not None and hasattr(existing_profile_response, 'data') and existing_profile_response.data:
            logger.warning(
                "Invite blocked - email already registered",
                extra={
                    "request_id": request_id,
                    "email": request.email,
                    "user_id": existing_profile_response.data["id"],
                },
            )
            return JSONResponse(
                status_code=409,
                content={
                    "error": "Email already registered to another user.",
                    "code": "email_already_registered",
                },
            )

        logger.info(
            "Email available for invite",
            extra={"request_id": request_id, "email": request.email},
        )

        # Create the invite record
        logger.info("Creating invite record", extra={"request_id": request_id})

        invite_data = {
            "org_id": request.org_id,
            "invited_by": user_id,
            "invited_email": request.email,
            "role": request.role,
            "project_grants": request.project_grants if request.project_grants else None,
            "org_grants": request.org_grants if request.org_grants else None,
        }

        try:
            # Insert invite - Supabase Python client returns data in response.data
            invite_response = (
                supabase.table("invites").insert(invite_data).execute()
            )

            if not invite_response or not invite_response.data:
                logger.error(
                    "Invite creation returned no data",
                    extra={"request_id": request_id, "response": str(invite_response)},
                )
                raise HTTPException(
                    status_code=500, detail="Invite creation failed - no data returned"
                )

            # Response.data is a list, get the first item
            invite_list = invite_response.data
            if not invite_list or len(invite_list) == 0:
                logger.error(
                    "Invite creation returned empty list",
                    extra={"request_id": request_id},
                )
                raise HTTPException(
                    status_code=500, detail="Invite creation failed - empty response"
                )

            invite = invite_list[0]

        except HTTPException:
            raise
        except Exception as invite_error:
            error_msg = str(invite_error)
            error_type = type(invite_error).__name__
            
            logger.error(
                "Error creating invite",
                extra={
                    "request_id": request_id,
                    "error": error_msg,
                    "error_type": error_type,
                    "invite_data_keys": list(invite_data.keys()),
                },
                exc_info=True,  # Include full traceback
            )

            # Check for unique constraint violation
            if "23505" in error_msg or "duplicate key" in error_msg.lower():
                logger.info(
                    "Unique constraint violation - checking for existing pending invite",
                    extra={"request_id": request_id},
                )

                existing_invite_response = (
                    supabase.table("invites")
                    .select("id")
                    .eq("org_id", request.org_id)
                    .eq("invited_email", request.email)
                    .eq("status", "pending")
                    .maybe_single()
                    .execute()
                )

                if existing_invite_response.data:
                    logger.warning(
                        "Duplicate invite detected",
                        extra={
                            "request_id": request_id,
                            "invite_id": existing_invite_response.data["id"],
                        },
                    )
                    raise HTTPException(
                        status_code=409,
                        detail="An active invite for this email already exists for this org.",
                    )

                logger.error(
                    "Unique constraint violation but no pending invite found",
                    extra={"request_id": request_id},
                )
                raise HTTPException(
                    status_code=500,
                    detail=f"Invite creation failed. Please check for existing users or invites. Details: {error_msg}",
                )

            raise HTTPException(status_code=500, detail=f"Invite creation failed: {error_msg}")

        duration = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            "Invite created successfully",
            extra={
                "request_id": request_id,
                "invite_id": invite["id"],
                "token": invite["token"],
                "expires_at": invite["expires_at"],
                "duration_ms": duration,
            },
        )

        return {"invite": invite}

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error inviting user",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove", response_model=RemoveUserResponse)
async def remove_user(request: RemoveUserRequest, req: Request) -> RemoveUserResponse:
    """
    Remove a user from an organization and delete from auth.

    Validates that:
    - Calling user is an org owner
    - Cannot remove the last owner

    Migrated from: supabase/functions/remove-user/index.ts

    Args:
        request: Remove request with user_id and org_id
        req: FastAPI request object with authenticated user

    Returns:
        Success response
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Remove user request received",
        extra={
            "request_id": request_id,
            "org_id": request.org_id,
            "user_id_to_remove": request.user_id,
        },
    )

    try:
        # Get authenticated user from request state
        if not hasattr(req.state, 'user_id') or not req.state.user_id:
            logger.error(
                "Unauthorized - user_id not found in request state",
                extra={"request_id": request_id, "path": req.url.path},
            )
            raise HTTPException(
                status_code=401, detail="Unauthorized - authentication required"
            )

        calling_user_id = req.state.user_id

        logger.info(
            "Calling user authenticated",
            extra={"request_id": request_id, "calling_user_id": calling_user_id},
        )

        supabase = get_supabase_admin()

        # Verify the calling user is an owner of the organization
        logger.info(
            "Verifying calling user is owner",
            extra={"request_id": request_id, "org_id": request.org_id},
        )

        member_response = (
            supabase.table("org_members")
            .select("role")
            .eq("org_id", request.org_id)
            .eq("user_id", calling_user_id)
            .single()
            .execute()
        )

        member = member_response.data

        if not member or member.get("role") != "owner":
            logger.warning(
                "Authorization failed - calling user is not an owner",
                extra={
                    "request_id": request_id,
                    "calling_user_id": calling_user_id,
                    "role": member.get("role") if member else None,
                },
            )
            raise HTTPException(
                status_code=403, detail="Only an organization owner can remove a user"
            )

        logger.info(
            "Calling user confirmed as owner",
            extra={"request_id": request_id, "calling_user_id": calling_user_id},
        )

        # Prevent the last owner from being removed
        logger.info(
            "Checking target user membership",
            extra={"request_id": request_id, "user_id_to_remove": request.user_id},
        )

        member_to_remove_response = (
            supabase.table("org_members")
            .select("role")
            .eq("user_id", request.user_id)
            .eq("org_id", request.org_id)
            .single()
            .execute()
        )

        member_to_remove = member_to_remove_response.data

        logger.info(
            "Target user role",
            extra={"request_id": request_id, "role": member_to_remove.get("role")},
        )

        if member_to_remove.get("role") == "owner":
            logger.info(
                "Target user is an owner - checking owner count",
                extra={"request_id": request_id},
            )

            owner_count_response = (
                supabase.table("org_members")
                .select("*", count="exact")
                .eq("org_id", request.org_id)
                .eq("role", "owner")
                .execute()
            )

            owner_count = owner_count_response.count

            logger.info(
                "Owner count",
                extra={"request_id": request_id, "count": owner_count},
            )

            if owner_count is not None and owner_count <= 1:
                logger.warning(
                    "Cannot remove last owner - blocking operation",
                    extra={"request_id": request_id},
                )
                raise HTTPException(
                    status_code=400, detail="Cannot remove the last owner of the organization"
                )

        # Delete the user from the auth schema
        logger.info(
            "Deleting user from auth schema",
            extra={"request_id": request_id, "user_id": request.user_id},
        )

        delete_response = supabase.auth.admin.delete_user(request.user_id)

        duration = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            "User removed successfully",
            extra={
                "request_id": request_id,
                "removed_user_id": request.user_id,
                "org_id": request.org_id,
                "removed_by": calling_user_id,
                "duration_ms": duration,
            },
        )

        return RemoveUserResponse(success=True, message="User removed successfully")

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error removing user",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboard-borrower", status_code=201, response_model=OnboardBorrowerResponse)
async def onboard_borrower(request: OnboardBorrowerRequest, req: Request):
    """
    Onboard a new borrower user or reuse existing user.

    Creates auth user, profile, borrower org, storage bucket, and default project.
    Supports both new user creation and existing user onboarding.

    Migrated from: supabase/functions/onboard-borrower/index.ts

    Args:
        request: Onboard request with email, password, full_name, and optional existing_user/user_id
        req: FastAPI request object (no authentication required for onboarding)

    Returns:
        Created or existing user object
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())
    new_user = None

    logger.info(
        "Onboard borrower request received",
        extra={
            "request_id": request_id,
            "email": request.email,
            "existing_user": request.existing_user,
        },
    )

    try:
        supabase = get_supabase_admin()

        # Step 1: Create or reuse the user in Supabase Auth
        if request.existing_user:
            logger.info(
                "Using existing auth user for onboarding",
                extra={"request_id": request_id},
            )

            if not request.user_id or not request.email:
                raise HTTPException(
                    status_code=400,
                    detail="existing_user requires user_id and email",
                )

            # Fetch the user to validate existence
            try:
                existing_user_response = supabase.auth.admin.get_user_by_id(
                    request.user_id
                )
                if not existing_user_response or not existing_user_response.user:
                    raise HTTPException(
                        status_code=404, detail="Existing user not found"
                    )
                new_user = existing_user_response.user
                logger.info(
                    "Using existing user",
                    extra={"request_id": request_id, "user_id": new_user.id},
                )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    "Existing user lookup failed",
                    extra={"request_id": request_id, "error": str(e)},
                )
                raise HTTPException(
                    status_code=404,
                    detail=f"Existing user lookup failed: {str(e)}",
                )
        else:
            logger.info(
                "Creating user in Supabase Auth",
                extra={"request_id": request_id},
            )

            if not request.password or len(request.password) < 8:
                raise HTTPException(
                    status_code=400,
                    detail="Password required (min 8 chars) for new users",
                )

            try:
                auth_data = supabase.auth.admin.create_user(
                    {
                        "email": request.email,
                        "password": request.password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": request.full_name},
                    }
                )

                if not auth_data or not auth_data.user:
                    raise HTTPException(
                        status_code=500, detail="User creation failed - no user returned"
                    )

                new_user = auth_data.user
                logger.info(
                    "User created successfully",
                    extra={"request_id": request_id, "user_id": new_user.id},
                )
            except HTTPException:
                raise
            except Exception as auth_error:
                logger.error(
                    "Auth Error",
                    extra={"request_id": request_id, "error": str(auth_error)},
                )
                raise HTTPException(
                    status_code=500, detail=f"Auth Error: {str(auth_error)}"
                )

        # Determine app role based on email
        app_role = "advisor" if request.email.endswith("@advisor.com") else "borrower"
        logger.info(
            "Determined app_role",
            extra={"request_id": request_id, "app_role": app_role},
        )

        # Only perform borrower-specific onboarding if the user is a borrower
        if app_role == "borrower":
            logger.info(
                "Starting borrower-specific onboarding",
                extra={"request_id": request_id},
            )

            # Helper function to find advisor (can run independently)
            async def find_advisor():
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

                        if advisor_member_response.data and advisor_member_response.data.get("user_id"):
                            advisor_id = advisor_member_response.data["user_id"]
                            logger.info(
                                "Found advisor for auto-assignment",
                                extra={
                                    "request_id": request_id,
                                    "advisor_id": advisor_id,
                                },
                            )
                            return advisor_id
                    return None
                except Exception as error:
                    logger.warning(
                        "Could not find advisor for auto-assignment",
                        extra={"request_id": request_id, "error": str(error)},
                    )
                    return None

            import asyncio

            # Phase 1: Parallelize profile creation, org creation, and advisor lookup
            logger.info(
                "Phase 1: Creating profile, org, and finding advisor in parallel",
                extra={"request_id": request_id},
            )

            profile_task = asyncio.to_thread(
                lambda: supabase.table("profiles")
                .upsert(
                    {
                        "id": new_user.id,
                        "full_name": request.full_name,
                        "email": request.email,
                        "app_role": app_role,
                    },
                    on_conflict="id",
                )
                .execute()
            )

            org_response = (
                supabase.table("orgs")
                .insert(
                    {
                        "name": f"{request.full_name}'s Organization",
                        "entity_type": "borrower",
                    }
                )
                .execute()
            )

            if not org_response.data:
                logger.error(
                    "Org Error",
                    extra={
                        "request_id": request_id,
                    },
                )
                raise HTTPException(status_code=500, detail="Org creation failed")

            org_data = org_response.data[0] if isinstance(org_response.data, list) else org_response.data

            advisor_id_task = find_advisor()

            # Wait for profile and advisor lookup
            profile_result = await profile_task
            advisor_id = await advisor_id_task

            logger.info(
                "Phase 1 completed",
                extra={
                    "request_id": request_id,
                    "org_id": org_data["id"],
                    "has_advisor": advisor_id is not None,
                },
            )

            # Phase 2: Parallelize storage bucket and org member creation
            logger.info(
                "Phase 2: Creating storage bucket and org member in parallel",
                extra={"request_id": request_id},
            )

            # Create storage bucket
            try:
                bucket_response = supabase.storage.create_bucket(
                    id=org_data["id"],
                    name=org_data["id"],
                    options={
                        "public": False,
                        "file_size_limit": 50 * 1024 * 1024,  # 50MB
                        "allowed_mime_types": [
                            "application/pdf",
                            "image/jpeg",
                            "image/png",
                            "image/gif",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "text/plain",
                            "application/zip",
                            "text/plain;charset=UTF-8",
                        ],
                    },
                )

                # Verify bucket was created by listing it
                buckets = supabase.storage.list_buckets()
                bucket_exists = any(b.id == org_data["id"] for b in buckets)

                if not bucket_exists:
                    raise Exception(f"Bucket {org_data['id']} not found after creation")

                logger.info(
                    "Storage bucket verified",
                    extra={"request_id": request_id, "bucket_id": org_data["id"]},
                )

            except Exception as bucket_error:
                error_msg = str(bucket_error)
                # Only ignore if already exists
                if "already exists" in error_msg.lower():
                    logger.info(
                        "Bucket already exists",
                        extra={"request_id": request_id, "bucket_id": org_data["id"]},
                    )
                else:
                    # Fail fast - bucket creation is critical
                    logger.error(
                        "Bucket creation failed",
                        extra={"request_id": request_id, "error": error_msg},
                    )
                    raise HTTPException(
                        status_code=500,
                        detail=f"Storage bucket creation failed: {error_msg}",
                    )

            # Create org membership
            member_response = (
                supabase.table("org_members")
                .insert(
                    {
                        "org_id": org_data["id"],
                        "user_id": new_user.id,
                        "role": "owner",
                    }
                )
                .execute()
            )

            if not member_response.data:
                logger.error(
                    "Membership Error",
                    extra={
                        "request_id": request_id,
                    },
                )
                raise HTTPException(status_code=500, detail="Membership creation failed")

            logger.info(
                "User made owner of org successfully",
                extra={"request_id": request_id},
            )

            # Step 5: Create a default project for the org
            logger.info(
                "Step 5: Creating default project",
                extra={"request_id": request_id},
            )

            try:
                from utils.project_utils import create_project_with_resume_and_storage

                result = await create_project_with_resume_and_storage(
                    supabase=supabase,
                    name="My First Project",
                    owner_org_id=org_data["id"],
                    creator_id=new_user.id,
                    assigned_advisor_id=advisor_id,
                    address=None,  # No address for default project
                )

                project_data = result["project"]
                project_id = project_data["id"]

                logger.info(
                    "Default project created successfully",
                    extra={
                        "request_id": request_id,
                        "project_id": project_id,
                    },
                )

            except Exception as project_error:
                logger.error(
                    "Error creating default project",
                    extra={
                        "request_id": request_id,
                        "error": str(project_error),
                    },
                )
                # Don't fail onboarding if project creation fails - log and continue
                # This allows the user to create projects later

            # Step 6: Update profile with the active org
            # Update synchronously to ensure it's complete before returning
            await asyncio.to_thread(
                lambda: supabase.table("profiles")
                .update({"active_org_id": org_data["id"]})
                .eq("id", new_user.id)
                .execute()
            )

            logger.info(
                "Profile active_org_id updated successfully",
                extra={
                    "request_id": request_id,
                    "user_id": new_user.id,
                    "org_id": org_data["id"],
                },
            )

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Onboarding completed successfully",
            extra={
                "request_id": request_id,
                "user_id": new_user.id,
                "duration_ms": duration,
            },
        )

        # Convert user to dict format for response
        user_dict = {
            "id": new_user.id,
            "email": new_user.email,
        }
        if hasattr(new_user, "user_metadata"):
            user_dict["user_metadata"] = new_user.user_metadata

        return OnboardBorrowerResponse(user=user_dict)

    except HTTPException:
        # Rollback: Delete auth user if we created one
        if new_user and not request.existing_user:
            logger.info(
                "Attempting to roll back and delete auth user",
                extra={"request_id": request_id, "user_id": new_user.id},
            )
            try:
                supabase = get_supabase_admin()
                supabase.auth.admin.delete_user(new_user.id)
                logger.info(
                    "Successfully rolled back user",
                    extra={"request_id": request_id, "user_id": new_user.id},
                )
            except Exception as rollback_error:
                logger.error(
                    "Rollback failed",
                    extra={
                        "request_id": request_id,
                        "error": str(rollback_error),
                    },
                )
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error onboarding borrower",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )

        # Rollback: Delete auth user if we created one
        if new_user and not request.existing_user:
            logger.info(
                "Attempting to roll back and delete auth user",
                extra={"request_id": request_id, "user_id": new_user.id},
            )
            try:
                supabase = get_supabase_admin()
                supabase.auth.admin.delete_user(new_user.id)
                logger.info(
                    "Successfully rolled back user",
                    extra={"request_id": request_id, "user_id": new_user.id},
                )
            except Exception as rollback_error:
                logger.error(
                    "Rollback failed",
                    extra={
                        "request_id": request_id,
                        "error": str(rollback_error),
                    },
                )

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-member-permissions", response_model=UpdateMemberPermissionsResponse)
async def update_member_permissions(request: UpdateMemberPermissionsRequest, req: Request):
    """
    Update member permissions for a user in an organization.

    Removes all existing permissions and applies new project grants.
    Supports project-level permissions and file-level overrides.
    Creates domain events for permission changes (grants and upgrades only).

    Migrated from: supabase/functions/update-member-permissions/index.ts

    Args:
        request: Request with org_id, user_id, and project_grants
        req: FastAPI request object with authenticated user

    Returns:
        Success response
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Update member permissions request received",
        extra={
            "request_id": request_id,
            "org_id": request.org_id,
            "user_id": request.user_id,
            "project_grants_count": len(request.project_grants) if request.project_grants else 0,
        },
    )

    try:
        # Get authenticated user from request state
        if not hasattr(req.state, "user_id") or not req.state.user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        calling_user_id = req.state.user_id
        supabase = get_supabase_admin()

        # Validate request
        if not request.org_id or not request.user_id:
            raise HTTPException(status_code=400, detail="org_id and user_id are required")

        if request.project_grants:
            for grant in request.project_grants:
                if not grant.projectId or not grant.permissions:
                    raise HTTPException(
                        status_code=400,
                        detail="Each grant in project_grants must have a projectId and a permissions array",
                    )

        # Verify the user has permission to update permissions for this org
        is_owner_response = supabase.rpc(
            "is_org_owner", {"p_org_id": request.org_id, "p_user_id": calling_user_id}
        ).execute()

        is_owner = is_owner_response.data if is_owner_response.data is not None else False

        if not is_owner:
            logger.warning(
                "User is not an owner of the org",
                extra={"request_id": request_id, "user_id": calling_user_id, "org_id": request.org_id},
            )
            raise HTTPException(
                status_code=403,
                detail="User must be an owner of the org to update member permissions",
            )

        # Verify the target user is a member of this org
        member_check_response = (
            supabase.table("org_members")
            .select("role")
            .eq("org_id", request.org_id)
            .eq("user_id", request.user_id)
            .maybe_single()
            .execute()
        )

        if not member_check_response.data:
            raise HTTPException(
                status_code=404, detail="Target user is not a member of this organization"
            )

        # =========================================================================
        # BEFORE STATE: Capture existing project access + document permissions
        # =========================================================================
        logger.info(
            "Capturing BEFORE state of project and document access",
            extra={"request_id": request_id},
        )

        # Get all org projects with their names for later use
        org_projects_with_names_response = (
            supabase.table("projects")
            .select("id, name")
            .eq("owner_org_id", request.org_id)
            .execute()
        )

        project_name_map = {}
        org_project_ids = []
        if org_projects_with_names_response.data:
            for p in org_projects_with_names_response.data:
                project_name_map[p["id"]] = p.get("name", "Unknown Project")
                org_project_ids.append(p["id"])

        # ---- BEFORE: project-level snapshot -----------------
        before_grants = []

        if org_project_ids:
            existing_grants_response = (
                supabase.table("project_access_grants")
                .select("project_id")
                .eq("user_id", request.user_id)
                .in_("project_id", org_project_ids)
                .execute()
            )

            if existing_grants_response.data:
                for grant in existing_grants_response.data:
                    # Find the PROJECT_DOCS_ROOT resource for this project
                    docs_root_response = (
                        supabase.table("resources")
                        .select("id")
                        .eq("project_id", grant["project_id"])
                        .eq("resource_type", "PROJECT_DOCS_ROOT")
                        .maybe_single()
                        .execute()
                    )

                    permission_level = "view"  # Default to view
                    if docs_root_response.data:
                        perm_response = (
                            supabase.table("permissions")
                            .select("permission")
                            .eq("resource_id", docs_root_response.data["id"])
                            .eq("user_id", request.user_id)
                            .maybe_single()
                            .execute()
                        )

                        if perm_response.data and perm_response.data.get("permission") == "edit":
                            permission_level = "edit"

                    before_grants.append(
                        {"project_id": grant["project_id"], "permission_level": permission_level}
                    )

        logger.info(
            "BEFORE project-level state captured",
            extra={"request_id": request_id, "projects_with_access": len(before_grants)},
        )

        # ---- BEFORE: document-level snapshot (with inheritance) ----------------
        before_doc_perms = []

        if org_project_ids:
            # Get all FILE resources for these projects
            all_file_resources_response = (
                supabase.table("resources")
                .select("id, project_id, name, parent_id, resource_type")
                .in_("project_id", org_project_ids)
                .eq("resource_type", "FILE")
                .execute()
            )

            if all_file_resources_response.data and len(all_file_resources_response.data) > 0:
                file_resource_ids = [r["id"] for r in all_file_resources_response.data]

                # Get explicit document permissions
                explicit_perms_response = (
                    supabase.table("permissions")
                    .select("resource_id, permission")
                    .eq("user_id", request.user_id)
                    .in_("resource_id", file_resource_ids)
                    .execute()
                )

                explicit_perms_map = {}
                if explicit_perms_response.data:
                    for perm in explicit_perms_response.data:
                        level = perm.get("permission", "view")
                        if level not in ("edit", "view", "none"):
                            level = "view"
                        explicit_perms_map[perm["resource_id"]] = level

                # Get project root permissions (PROJECT_DOCS_ROOT and BORROWER_DOCS_ROOT) for inheritance
                root_resources_response = (
                    supabase.table("resources")
                    .select("id, project_id, resource_type")
                    .in_("project_id", org_project_ids)
                    .in_("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"])
                    .execute()
                )

                root_perms_map = {}  # key: f"{project_id}:{resource_type}", value: permission
                if root_resources_response.data:
                    root_resource_ids = [r["id"] for r in root_resources_response.data]
                    root_perms_response = (
                        supabase.table("permissions")
                        .select("resource_id, permission")
                        .eq("user_id", request.user_id)
                        .in_("resource_id", root_resource_ids)
                        .execute()
                    )

                    if root_perms_response.data:
                        for perm in root_perms_response.data:
                            root_res = next(
                                (r for r in root_resources_response.data if r["id"] == perm["resource_id"]),
                                None,
                            )
                            if root_res:
                                key = f"{root_res['project_id']}:{root_res['resource_type']}"
                                level = perm.get("permission", "view")
                                if level not in ("edit", "view"):
                                    level = "view"
                                root_perms_map[key] = level

                # Build a map of resource_id -> root info for inheritance lookup
                # Get all resources (not just files) to build the parent chain
                all_resources_response = (
                    supabase.table("resources")
                    .select("id, project_id, parent_id, resource_type")
                    .in_("project_id", org_project_ids)
                    .execute()
                )

                resource_to_root_map = {}

                def find_root_for_resource(resource_id):
                    """Find root for a resource by traversing parent chain."""
                    resource = next(
                        (r for r in all_resources_response.data if r["id"] == resource_id),
                        None,
                    )
                    if not resource:
                        return None

                    current = resource
                    visited = set()

                    while current.get("parent_id") and current["id"] not in visited:
                        visited.add(current["id"])
                        parent = next(
                            (r for r in all_resources_response.data if r["id"] == current["parent_id"]),
                            None,
                        )
                        if not parent:
                            break

                        # Check if this is a docs root
                        if parent["resource_type"] in ("PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"):
                            return {
                                "project_id": current["project_id"],
                                "root_type": parent["resource_type"],
                            }

                        # Continue traversing past BORROWER_RESUME and PROJECT_RESUME
                        current = parent

                    return None

                for file_res in all_file_resources_response.data:
                    root_info = find_root_for_resource(file_res["id"])
                    if root_info:
                        resource_to_root_map[file_res["id"]] = root_info

                # Now build beforeDocPerms with effective permissions (explicit or inherited)
                for file_res in all_file_resources_response.data:
                    explicit_perm = explicit_perms_map.get(file_res["id"])

                    if explicit_perm:
                        # Has explicit permission
                        before_doc_perms.append(
                            {
                                "resource_id": file_res["id"],
                                "project_id": file_res.get("project_id"),
                                "permission_level": explicit_perm,
                                "resource_name": file_res.get("name"),
                            }
                        )
                    else:
                        # No explicit permission - inherit from root
                        root_info = resource_to_root_map.get(file_res["id"])
                        if root_info:
                            root_key = f"{root_info['project_id']}:{root_info['root_type']}"
                            inherited_perm = root_perms_map.get(root_key)
                            if inherited_perm:
                                before_doc_perms.append(
                                    {
                                        "resource_id": file_res["id"],
                                        "project_id": file_res.get("project_id"),
                                        "permission_level": inherited_perm,
                                        "resource_name": file_res.get("name"),
                                    }
                                )

        logger.info(
            "BEFORE document-level state captured",
            extra={"request_id": request_id, "docs_with_access": len(before_doc_perms)},
        )

        # Step 1: Remove all existing permissions for this user in this org
        logger.info(
            "Removing existing permissions",
            extra={"request_id": request_id, "user_id": request.user_id, "org_id": request.org_id},
        )

        # Get all resources belonging to this org
        org_resources_response = (
            supabase.table("resources")
            .select("id")
            .eq("org_id", request.org_id)
            .execute()
        )

        if org_resources_response.data and len(org_resources_response.data) > 0:
            org_resource_ids = [r["id"] for r in org_resources_response.data]
            supabase.table("permissions").delete().eq("user_id", request.user_id).in_(
                "resource_id", org_resource_ids
            ).execute()

        # Get all projects in this org and remove permissions
        org_projects_response = (
            supabase.table("projects")
            .select("id")
            .eq("owner_org_id", request.org_id)
            .execute()
        )

        if org_projects_response.data and len(org_projects_response.data) > 0:
            project_ids = [p["id"] for p in org_projects_response.data]

            # Remove from project_access_grants
            supabase.table("project_access_grants").delete().eq("user_id", request.user_id).in_(
                "project_id", project_ids
            ).execute()

            # Get project resources and remove permissions
            project_resources_response = (
                supabase.table("resources")
                .select("id")
                .in_("project_id", project_ids)
                .execute()
            )

            if project_resources_response.data and len(project_resources_response.data) > 0:
                project_resource_ids = [r["id"] for r in project_resources_response.data]
                supabase.table("permissions").delete().eq("user_id", request.user_id).in_(
                    "resource_id", project_resource_ids
                ).execute()

        # Step 2: Apply new project grants
        logger.info(
            "Applying new project grants",
            extra={
                "request_id": request_id,
                "project_grants_count": len(request.project_grants) if request.project_grants else 0,
            },
        )

        project_grants_arr = request.project_grants or []
        for grant in project_grants_arr:
            logger.info(
                "Processing project grant",
                extra={
                    "request_id": request_id,
                    "project_id": grant.projectId,
                    "permissions_count": len(grant.permissions),
                },
            )

            # 1) Grant root permissions via RPC helper
            if grant.projectId and grant.permissions:
                try:
                    # Convert permissions to the format expected by grant_project_access
                    permission_payload = [
                        {"resource_type": p.resource_type, "permission": p.permission}
                        for p in grant.permissions
                    ]

                    supabase.rpc(
                        "grant_project_access",
                        {
                            "p_project_id": grant.projectId,
                            "p_user_id": request.user_id,
                            "p_granted_by_id": calling_user_id,
                            "p_permissions": permission_payload,
                        },
                    ).execute()
                except Exception as rpc_error:
                    logger.error(
                        "Error granting root permissions",
                        extra={
                            "request_id": request_id,
                            "project_id": grant.projectId,
                            "error": str(rpc_error),
                        },
                    )

            # 2) Apply per-doc overrides (none/view/edit) and back-compat exclusions
            if grant.fileOverrides and len(grant.fileOverrides) > 0:
                rows = [
                    {
                        "resource_id": o.resource_id,
                        "user_id": request.user_id,
                        "permission": o.permission,
                        "granted_by": calling_user_id,
                    }
                    for o in grant.fileOverrides
                    if o.permission in ("none", "view", "edit")
                ]

                if rows:
                    supabase.table("permissions").upsert(
                        rows, on_conflict="resource_id,user_id"
                    ).execute()

            elif grant.exclusions and len(grant.exclusions) > 0:
                # Legacy: exclusions map to permission 'none'
                rows = [
                    {
                        "resource_id": resource_id,
                        "user_id": request.user_id,
                        "permission": "none",
                        "granted_by": calling_user_id,
                    }
                    for resource_id in grant.exclusions
                ]
                supabase.table("permissions").upsert(
                    rows, on_conflict="resource_id,user_id"
                ).execute()

            # 3) Ensure the user is a participant in existing chat threads for this project
            if grant.projectId:
                threads_response = (
                    supabase.table("chat_threads")
                    .select("id")
                    .eq("project_id", grant.projectId)
                    .execute()
                )

                if threads_response.data and len(threads_response.data) > 0:
                    participant_rows = [
                        {"thread_id": t["id"], "user_id": request.user_id}
                        for t in threads_response.data
                    ]
                    supabase.table("chat_thread_participants").upsert(
                        participant_rows, on_conflict="thread_id,user_id"
                    ).execute()

        # =========================================================================
        # AFTER STATE: Compare with before and create domain events for changes
        # =========================================================================
        logger.info(
            "Comparing BEFORE vs AFTER states",
            extra={"request_id": request_id},
        )

        # ---------------- Project-level AFTER state -----------------
        # Build AFTER state from the new project_grants
        after_grants = []
        for g in project_grants_arr:
            # Determine permission level - if any permission is 'edit', they have edit access
            has_edit = any(p.permission == "edit" for p in g.permissions)
            after_grants.append(
                {
                    "project_id": g.projectId,
                    "permission_level": "edit" if has_edit else "view",
                }
            )

        before_project_map = {g["project_id"]: g["permission_level"] for g in before_grants}
        after_project_map = {g["project_id"]: g["permission_level"] for g in after_grants}

        # Detect changes
        access_granted = []
        access_changed = []
        access_revoked = []

        # Check for new grants and changes
        for project_id, new_level in after_project_map.items():
            old_level = before_project_map.get(project_id)
            if not old_level:
                # New access granted
                access_granted.append({"project_id": project_id, "new_permission": new_level})
            elif old_level != new_level:
                # Permission level changed
                access_changed.append(
                    {
                        "project_id": project_id,
                        "old_permission": old_level,
                        "new_permission": new_level,
                    }
                )

        # Check for revoked access
        for project_id, old_level in before_project_map.items():
            if project_id not in after_project_map:
                access_revoked.append({"project_id": project_id, "old_permission": old_level})

        logger.info(
            "Project access changes detected",
            extra={
                "request_id": request_id,
                "granted": len(access_granted),
                "changed": len(access_changed),
                "revoked": len(access_revoked),
            },
        )

        # ---------------- Document-level AFTER state + diff (with inheritance) ---
        after_doc_perms = []

        if org_project_ids:
            # Get all FILE resources for these projects (same as BEFORE state)
            all_file_resources_after_response = (
                supabase.table("resources")
                .select("id, project_id, name, parent_id, resource_type")
                .in_("project_id", org_project_ids)
                .eq("resource_type", "FILE")
                .execute()
            )

            if (
                all_file_resources_after_response.data
                and len(all_file_resources_after_response.data) > 0
            ):
                file_resource_ids_after = [r["id"] for r in all_file_resources_after_response.data]

                # Get explicit document permissions
                explicit_perms_after_response = (
                    supabase.table("permissions")
                    .select("resource_id, permission")
                    .eq("user_id", request.user_id)
                    .in_("resource_id", file_resource_ids_after)
                    .execute()
                )

                explicit_perms_after_map = {}
                if explicit_perms_after_response.data:
                    for perm in explicit_perms_after_response.data:
                        level = perm.get("permission", "view")
                        if level not in ("edit", "view", "none"):
                            level = "view"
                        explicit_perms_after_map[perm["resource_id"]] = level

                # Get project root permissions (PROJECT_DOCS_ROOT and BORROWER_DOCS_ROOT) for inheritance
                root_resources_after_response = (
                    supabase.table("resources")
                    .select("id, project_id, resource_type")
                    .in_("project_id", org_project_ids)
                    .in_("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"])
                    .execute()
                )

                root_perms_after_map = {}
                if root_resources_after_response.data:
                    root_resource_ids_after = [r["id"] for r in root_resources_after_response.data]
                    root_perms_after_response = (
                        supabase.table("permissions")
                        .select("resource_id, permission")
                        .eq("user_id", request.user_id)
                        .in_("resource_id", root_resource_ids_after)
                        .execute()
                    )

                    if root_perms_after_response.data:
                        for perm in root_perms_after_response.data:
                            root_res = next(
                                (
                                    r
                                    for r in root_resources_after_response.data
                                    if r["id"] == perm["resource_id"]
                                ),
                                None,
                            )
                            if root_res:
                                key = f"{root_res['project_id']}:{root_res['resource_type']}"
                                level = perm.get("permission", "view")
                                if level not in ("edit", "view"):
                                    level = "view"
                                root_perms_after_map[key] = level

                # Build resource-to-root map (reuse same logic as BEFORE)
                all_resources_after_response = (
                    supabase.table("resources")
                    .select("id, project_id, parent_id, resource_type")
                    .in_("project_id", org_project_ids)
                    .execute()
                )

                resource_to_root_after_map = {}

                def find_root_for_resource_after(resource_id):
                    """Find root for a resource by traversing parent chain."""
                    resource = next(
                        (r for r in all_resources_after_response.data if r["id"] == resource_id),
                        None,
                    )
                    if not resource:
                        return None

                    current = resource
                    visited = set()

                    while current.get("parent_id") and current["id"] not in visited:
                        visited.add(current["id"])
                        parent = next(
                            (
                                r
                                for r in all_resources_after_response.data
                                if r["id"] == current["parent_id"]
                            ),
                            None,
                        )
                        if not parent:
                            break

                        if parent["resource_type"] in ("PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"):
                            return {
                                "project_id": current["project_id"],
                                "root_type": parent["resource_type"],
                            }

                        current = parent

                    return None

                for file_res in all_file_resources_after_response.data:
                    root_info = find_root_for_resource_after(file_res["id"])
                    if root_info:
                        resource_to_root_after_map[file_res["id"]] = root_info

                # Now build afterDocPerms with effective permissions (explicit or inherited)
                for file_res in all_file_resources_after_response.data:
                    explicit_perm = explicit_perms_after_map.get(file_res["id"])

                    if explicit_perm:
                        # Has explicit permission (including 'none' which blocks inheritance)
                        after_doc_perms.append(
                            {
                                "resource_id": file_res["id"],
                                "project_id": file_res.get("project_id"),
                                "permission_level": explicit_perm,
                                "resource_name": file_res.get("name"),
                            }
                        )
                    else:
                        # No explicit permission - inherit from root
                        root_info = resource_to_root_after_map.get(file_res["id"])
                        if root_info:
                            root_key = f"{root_info['project_id']}:{root_info['root_type']}"
                            inherited_perm = root_perms_after_map.get(root_key)
                            if inherited_perm:
                                after_doc_perms.append(
                                    {
                                        "resource_id": file_res["id"],
                                        "project_id": file_res.get("project_id"),
                                        "permission_level": inherited_perm,
                                        "resource_name": file_res.get("name"),
                                    }
                                )

        logger.info(
            "AFTER document-level state captured",
            extra={"request_id": request_id, "docs_with_access": len(after_doc_perms)},
        )

        # Build maps for comparison
        before_doc_map = {
            d["resource_id"]: {
                "project_id": d["project_id"],
                "permission_level": d["permission_level"],
                "resource_name": d["resource_name"],
            }
            for d in before_doc_perms
        }

        after_doc_map = {
            d["resource_id"]: {
                "project_id": d["project_id"],
                "permission_level": d["permission_level"],
                "resource_name": d["resource_name"],
            }
            for d in after_doc_perms
        }

        doc_granted = []
        doc_changed = []
        doc_revoked = []

        # Grants and changes
        for resource_id, after_val in after_doc_map.items():
            before_val = before_doc_map.get(resource_id)
            new_level = after_val["permission_level"]
            project_id = after_val["project_id"]
            resource_name = after_val["resource_name"]

            if not before_val:
                # No previous access
                if new_level == "none":
                    # Setting to 'none' when there was no access before - no event needed
                    continue
                # Now has view/edit access
                doc_granted.append(
                    {
                        "resource_id": resource_id,
                        "project_id": project_id,
                        "old_permission": None,
                        "new_permission": new_level,
                        "resource_name": resource_name,
                    }
                )
            elif before_val["permission_level"] != new_level:
                # Permission level changed
                if new_level == "none":
                    # Changed to 'none' - treat as revoked
                    doc_revoked.append(
                        {
                            "resource_id": resource_id,
                            "project_id": project_id,
                            "old_permission": before_val["permission_level"],
                            "new_permission": None,
                            "resource_name": resource_name,
                        }
                    )
                elif before_val["permission_level"] == "none":
                    # Changed from 'none' to view/edit - treat as granted (gaining access)
                    doc_granted.append(
                        {
                            "resource_id": resource_id,
                            "project_id": project_id,
                            "old_permission": None,  # 'none' means no previous access
                            "new_permission": new_level,
                            "resource_name": resource_name,
                        }
                    )
                else:
                    # Changed between view/edit
                    doc_changed.append(
                        {
                            "resource_id": resource_id,
                            "project_id": project_id,
                            "old_permission": before_val["permission_level"],
                            "new_permission": new_level,
                            "resource_name": resource_name,
                        }
                    )

        # Revokes (documents that were in BEFORE but not in AFTER at all)
        for resource_id, before_val in before_doc_map.items():
            if resource_id not in after_doc_map:
                doc_revoked.append(
                    {
                        "resource_id": resource_id,
                        "project_id": before_val["project_id"],
                        "old_permission": before_val["permission_level"],
                        "new_permission": None,
                        "resource_name": before_val["resource_name"],
                    }
                )

        logger.info(
            "Document access changes detected",
            extra={
                "request_id": request_id,
                "granted": len(doc_granted),
                "changed": len(doc_changed),
                "revoked": len(doc_revoked),
                "granted_sample": doc_granted[:3] if doc_granted else [],
                "changed_sample": doc_changed[:3] if doc_changed else [],
            },
        )

        # Create domain events for each change
        domain_event_ids = []

        # Get org name for notifications
        org_data_response = (
            supabase.table("orgs").select("name").eq("id", request.org_id).single().execute()
        )
        org_name = org_data_response.data.get("name", "your organization") if org_data_response.data else "your organization"

        # Events for project access granted
        for grant in access_granted:
            project_name = project_name_map.get(grant["project_id"], "a project")
            event_response = (
                supabase.table("domain_events")
                .insert(
                    {
                        "event_type": "project_access_granted",
                        "actor_id": calling_user_id,
                        "project_id": grant["project_id"],
                        "org_id": request.org_id,
                        "payload": {
                            "affected_user_id": request.user_id,
                            "project_id": grant["project_id"],
                            "project_name": project_name,
                            "new_permission": grant["new_permission"],
                            "changed_by_id": calling_user_id,
                            "org_id": request.org_id,
                            "org_name": org_name,
                        },
                    }
                )
                .execute()
            )

            if event_response.data and len(event_response.data) > 0:
                domain_event_ids.append(event_response.data[0]["id"])

        # Events for project access changed (only for upgrades: view -> edit, not downgrades)
        for change in access_changed:
            # Only create events for upgrades (view -> edit), skip downgrades (edit -> view)
            if change["old_permission"] != "view" or change["new_permission"] != "edit":
                logger.info(
                    "Skipping project_access_changed event - downgrade",
                    extra={
                        "request_id": request_id,
                        "project_id": change["project_id"],
                        "old": change["old_permission"],
                        "new": change["new_permission"],
                    },
                )
                continue

            project_name = project_name_map.get(change["project_id"], "a project")
            event_response = (
                supabase.table("domain_events")
                .insert(
                    {
                        "event_type": "project_access_changed",
                        "actor_id": calling_user_id,
                        "project_id": change["project_id"],
                        "org_id": request.org_id,
                        "payload": {
                            "affected_user_id": request.user_id,
                            "project_id": change["project_id"],
                            "project_name": project_name,
                            "old_permission": change["old_permission"],
                            "new_permission": change["new_permission"],
                            "changed_by_id": calling_user_id,
                            "org_id": request.org_id,
                            "org_name": org_name,
                        },
                    }
                )
                .execute()
            )

            if event_response.data and len(event_response.data) > 0:
                domain_event_ids.append(event_response.data[0]["id"])

        # Events for access revoked - SKIPPED: No notifications should be sent when access is revoked
        if access_revoked:
            logger.info(
                "Skipping project access revoked events - notifications not sent for revocation",
                extra={"request_id": request_id, "revoked_count": len(access_revoked)},
            )

        # Document-level events: granted
        for grant in doc_granted:
            if not grant["project_id"]:
                logger.warning(
                    "Skipping doc_granted event - no project_id",
                    extra={"request_id": request_id, "grant": grant},
                )
                continue

            project_name = project_name_map.get(grant["project_id"], "a project")

            logger.debug(
                "Creating document_permission_granted event",
                extra={
                    "request_id": request_id,
                    "resource_id": grant["resource_id"],
                    "project_id": grant["project_id"],
                    "old_permission": grant["old_permission"],
                    "new_permission": grant["new_permission"],
                },
            )

            try:
                event_response = (
                    supabase.table("domain_events")
                    .insert(
                        {
                            "event_type": "document_permission_granted",
                            "actor_id": calling_user_id,
                            "project_id": grant["project_id"],
                            "org_id": request.org_id,
                            "resource_id": grant["resource_id"],
                            "payload": {
                                "affected_user_id": request.user_id,
                                "project_id": grant["project_id"],
                                "project_name": project_name,
                                "resource_id": grant["resource_id"],
                                "resource_name": grant["resource_name"],
                                "old_permission": grant["old_permission"],
                                "new_permission": grant["new_permission"],
                                "changed_by_id": calling_user_id,
                                "org_id": request.org_id,
                                "org_name": org_name,
                            },
                        }
                    )
                    .execute()
                )

                if event_response.data and len(event_response.data) > 0:
                    domain_event_ids.append(event_response.data[0]["id"])
                    logger.debug(
                        "Successfully created document_permission_granted event",
                        extra={"request_id": request_id, "event_id": event_response.data[0]["id"]},
                    )
                else:
                    logger.warning(
                        "document_permission_granted event created but no data returned",
                        extra={"request_id": request_id, "resource_id": grant["resource_id"]},
                    )
            except Exception as e:
                logger.error(
                    "Failed to create document_permission_granted event",
                    extra={
                        "request_id": request_id,
                        "resource_id": grant["resource_id"],
                        "error": str(e),
                    },
                    exc_info=True,
                )

        # Document-level events: changed (only for upgrades: view -> edit, not downgrades)
        for change in doc_changed:
            if not change["project_id"]:
                logger.warning(
                    "Skipping doc_changed event - no project_id",
                    extra={"request_id": request_id, "change": change},
                )
                continue

            # Only create events for upgrades (view -> edit), skip downgrades (edit -> view)
            if change["old_permission"] != "view" or change["new_permission"] != "edit":
                logger.info(
                    "Skipping document_permission_changed event - not an upgrade",
                    extra={
                        "request_id": request_id,
                        "resource_id": change["resource_id"],
                        "old": change["old_permission"],
                        "new": change["new_permission"],
                    },
                )
                continue

            project_name = project_name_map.get(change["project_id"], "a project")

            logger.debug(
                "Creating document_permission_changed event",
                extra={
                    "request_id": request_id,
                    "resource_id": change["resource_id"],
                    "project_id": change["project_id"],
                    "old_permission": change["old_permission"],
                    "new_permission": change["new_permission"],
                },
            )

            try:
                event_response = (
                    supabase.table("domain_events")
                    .insert(
                        {
                            "event_type": "document_permission_changed",
                            "actor_id": calling_user_id,
                            "project_id": change["project_id"],
                            "org_id": request.org_id,
                            "resource_id": change["resource_id"],
                            "payload": {
                                "affected_user_id": request.user_id,
                                "project_id": change["project_id"],
                                "project_name": project_name,
                                "resource_id": change["resource_id"],
                                "resource_name": change["resource_name"],
                                "old_permission": change["old_permission"],
                                "new_permission": change["new_permission"],
                                "changed_by_id": calling_user_id,
                                "org_id": request.org_id,
                                "org_name": org_name,
                            },
                        }
                    )
                    .execute()
                )

                if event_response.data and len(event_response.data) > 0:
                    domain_event_ids.append(event_response.data[0]["id"])
                    logger.debug(
                        "Successfully created document_permission_changed event",
                        extra={"request_id": request_id, "event_id": event_response.data[0]["id"]},
                    )
                else:
                    logger.warning(
                        "document_permission_changed event created but no data returned",
                        extra={"request_id": request_id, "resource_id": change["resource_id"]},
                    )
            except Exception as e:
                logger.error(
                    "Failed to create document_permission_changed event",
                    extra={
                        "request_id": request_id,
                        "resource_id": change["resource_id"],
                        "error": str(e),
                    },
                    exc_info=True,
                )

        # Document-level events: revoked - SKIPPED
        if doc_revoked:
            logger.info(
                "Skipping document permission revoked events - notifications not sent for revocation",
                extra={"request_id": request_id, "revoked_count": len(doc_revoked)},
            )

        logger.info(
            "Created domain events",
            extra={"request_id": request_id, "events_created": len(domain_event_ids)},
        )

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Permissions update completed successfully",
            extra={
                "request_id": request_id,
                "user_id": request.user_id,
                "org_id": request.org_id,
                "events_created": len(domain_event_ids),
                "duration_ms": duration,
            },
        )

        return UpdateMemberPermissionsResponse(success=True, message="Permissions updated successfully")

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error updating member permissions",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


