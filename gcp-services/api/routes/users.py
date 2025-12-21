"""User management routes."""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from models.auth import InviteUserRequest, InviteUserResponse, RemoveUserRequest, RemoveUserResponse
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
