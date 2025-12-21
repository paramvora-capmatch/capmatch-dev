"""Authentication routes."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from models.auth import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    ValidateInviteRequest,
    ValidateInviteResponse,
)
from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/validate-invite", response_model=ValidateInviteResponse)
async def validate_invite(
    request: ValidateInviteRequest, req: Request
) -> ValidateInviteResponse:
    """
    Validate an invite token.

    Checks if the token exists, is still pending, and hasn't expired.
    Returns organization and inviter information for display.

    Migrated from: supabase/functions/validate-invite/index.ts

    Args:
        request: Validation request with token
        req: FastAPI request object

    Returns:
        ValidateInviteResponse with validation result and metadata
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Validate invite request received",
        extra={
            "request_id": request_id,
            "has_token": bool(request.token),
            "token_preview": request.token[:8] + "..." if request.token else None,
        },
    )

    try:
        # Validate token format
        if not request.token or not isinstance(request.token, str):
            logger.error(
                "Invalid token format",
                extra={"request_id": request_id},
            )
            return ValidateInviteResponse(valid=False)

        supabase = get_supabase_admin()

        # Step 1: Fetch invite by token
        logger.info(
            "Looking up invite by token",
            extra={"request_id": request_id},
        )

        invite_response = (
            supabase.table("invites")
            .select("id, org_id, invited_by, invited_email, status, expires_at")
            .eq("token", request.token)
            .maybe_single()
            .execute()
        )

        invite = invite_response.data

        if not invite:
            logger.warning(
                "Invite not found",
                extra={"request_id": request_id},
            )
            return ValidateInviteResponse(valid=False)

        logger.info(
            "Invite found",
            extra={
                "request_id": request_id,
                "invite_id": invite["id"],
                "status": invite["status"],
                "expires_at": invite.get("expires_at"),
                "org_id": invite["org_id"],
            },
        )

        # Step 2: Validate status and expiry
        is_pending = invite["status"] == "pending"
        not_expired = (
            not invite.get("expires_at")
            or datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            > datetime.now(timezone.utc)
        )

        logger.info(
            "Validating invite",
            extra={
                "request_id": request_id,
                "is_pending": is_pending,
                "not_expired": not_expired,
                "expires_at": invite.get("expires_at"),
            },
        )

        # Invite is valid if it's pending AND not expired
        if not (is_pending and not_expired):
            logger.warning(
                "Invite validation failed",
                extra={
                    "request_id": request_id,
                    "is_pending": is_pending,
                    "not_expired": not_expired,
                    "status": invite["status"],
                },
            )
            return ValidateInviteResponse(valid=False)

        # Step 3: Fetch org name
        logger.info(
            "Fetching org name",
            extra={"request_id": request_id, "org_id": invite["org_id"]},
        )

        org_response = (
            supabase.table("orgs")
            .select("name")
            .eq("id", invite["org_id"])
            .maybe_single()
            .execute()
        )

        org = org_response.data
        org_name = org.get("name") if org else None

        logger.info(
            "Org found" if org else "Org not found",
            extra={"request_id": request_id, "org_name": org_name},
        )

        # Step 4: Fetch inviter profile
        logger.info(
            "Fetching inviter profile",
            extra={"request_id": request_id, "user_id": invite["invited_by"]},
        )

        inviter_response = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", invite["invited_by"])
            .maybe_single()
            .execute()
        )

        inviter = inviter_response.data
        inviter_name = inviter.get("full_name") if inviter else None

        logger.info(
            "Inviter found" if inviter else "Inviter not found",
            extra={"request_id": request_id, "inviter_name": inviter_name},
        )

        # Calculate duration
        duration = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            "Validation successful",
            extra={
                "request_id": request_id,
                "valid": True,
                "org_name": org_name,
                "inviter_name": inviter_name,
                "duration_ms": duration,
            },
        )

        return ValidateInviteResponse(
            valid=True,
            orgName=org_name,
            inviterName=inviter_name,
            email=invite.get("invited_email"),
        )

    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Validation error",
            extra={
                "request_id": request_id,
                "duration_ms": duration,
                "error": str(e),
            },
        )
        return ValidateInviteResponse(valid=False)


@router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(
    request: AcceptInviteRequest, req: Request
) -> AcceptInviteResponse:
    """
    Accept an invite and create a new user account.

    Validates the invite token, creates the user account, profile, org membership,
    and applies project permissions. This endpoint does not require authentication
    since it's for new users who don't have accounts yet.

    Migrated from: supabase/functions/accept-invite/index.ts

    Args:
        request: Accept invite request with token, password, and full_name
        req: FastAPI request object

    Returns:
        AcceptInviteResponse with status
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Accept invite request received",
        extra={
            "request_id": request_id,
            "has_token": bool(request.token),
            "token_preview": request.token[:8] + "..." if request.token else None,
            "has_password": bool(request.password),
            "has_full_name": bool(request.full_name),
            "accept": request.accept,
        },
    )

    try:
        # Validate request
        if not request.token:
            logger.error("Missing token", extra={"request_id": request_id})
            raise HTTPException(status_code=400, detail="Missing token")

        if request.accept is not True:
            logger.error(
                "Invalid accept value",
                extra={"request_id": request_id, "accept": request.accept},
            )
            raise HTTPException(
                status_code=400, detail="Invalid request"
            )

        if not request.password or len(request.password) < 8:
            logger.error(
                "Invalid password",
                extra={
                    "request_id": request_id,
                    "password_length": len(request.password) if request.password else 0,
                },
            )
            raise HTTPException(
                status_code=400,
                detail="Password required (min 8 chars)",
            )

        if not request.full_name or not request.full_name.strip():
            logger.error(
                "Invalid full_name",
                extra={"request_id": request_id, "has_full_name": bool(request.full_name)},
            )
            raise HTTPException(
                status_code=400, detail="Full name required"
            )

        supabase = get_supabase_admin()

        # Look up invite by token and validate
        logger.info("Looking up invite by token", extra={"request_id": request_id})

        invite_response = (
            supabase.table("invites")
            .select("*, org:orgs!invites_org_id_fkey(*)")
            .eq("token", request.token)
            .eq("status", "pending")
            .maybe_single()
            .execute()
        )

        invite = invite_response.data

        if not invite:
            logger.warning("Invite not found or not pending", extra={"request_id": request_id})
            raise HTTPException(
                status_code=400, detail="Invalid or expired invite"
            )

        # Validate expiry
        expires_at = invite.get("expires_at")
        if expires_at:
            try:
                expire_time = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expire_time <= datetime.now(timezone.utc):
                    logger.warning("Invite expired", extra={"request_id": request_id, "expires_at": expires_at})
                    raise HTTPException(
                        status_code=400, detail="Invalid or expired invite"
                    )
            except (ValueError, AttributeError) as e:
                logger.warning("Error parsing expires_at", extra={"request_id": request_id, "error": str(e)})
                # Continue if we can't parse - let the invite through

        logger.info(
            "Invite found",
            extra={
                "request_id": request_id,
                "invite_id": invite["id"],
                "org_id": invite["org_id"],
                "invited_email": invite.get("invited_email"),
                "role": invite.get("role"),
            },
        )

        # Check if email already exists
        if not invite.get("invited_email"):
            logger.error("Invalid invite - no email", extra={"request_id": request_id})
            raise HTTPException(
                status_code=400, detail="Invalid invite - no email"
            )

        logger.info(
            "Checking if email already exists",
            extra={"request_id": request_id, "email": invite["invited_email"]},
        )

        existing_profile_response = (
            supabase.table("profiles")
            .select("id")
            .eq("email", invite["invited_email"])
            .maybe_single()
            .execute()
        )

        if existing_profile_response and existing_profile_response.data:
            logger.warning(
                "Email already registered",
                extra={
                    "request_id": request_id,
                    "email": invite["invited_email"],
                    "user_id": existing_profile_response.data["id"],
                },
            )
            raise HTTPException(
                status_code=409,
                detail="Email already registered",
            )

        logger.info(
            "Email available", extra={"request_id": request_id, "email": invite["invited_email"]}
        )

        # Create auth user account
        logger.info(
            "Creating auth user account",
            extra={"request_id": request_id, "email": invite["invited_email"]},
        )

        try:
            new_user_response = supabase.auth.admin.create_user(
                {
                    "email": invite["invited_email"],
                    "password": request.password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": request.full_name},
                }
            )

            if not new_user_response.user:
                raise Exception("User creation returned no user")

            user_id = new_user_response.user.id

        except Exception as create_error:
            error_msg = str(create_error)
            logger.error(
                "Failed to create auth user",
                extra={"request_id": request_id, "error": error_msg},
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user account: {error_msg}",
            )

        logger.info(
            "Auth user created successfully",
            extra={"request_id": request_id, "user_id": user_id},
        )

        # Create user profile
        logger.info("Creating user profile", extra={"request_id": request_id, "user_id": user_id})

        profile_response = (
            supabase.table("profiles")
            .insert(
                {
                    "id": user_id,
                    "full_name": request.full_name,
                    "email": invite["invited_email"],
                    "app_role": "borrower",
                }
            )
            .execute()
        )

        if profile_response.data is None:
            # Cleanup: delete auth user if profile creation fails
            logger.error(
                "Failed to create profile, cleaning up auth user",
                extra={"request_id": request_id, "user_id": user_id},
            )
            try:
                supabase.auth.admin.delete_user(user_id)
            except Exception as cleanup_error:
                logger.error(
                    "Failed to cleanup auth user",
                    extra={"request_id": request_id, "error": str(cleanup_error)},
                )
            raise HTTPException(
                status_code=500, detail="Failed to create user profile"
            )

        logger.info(
            "User profile created successfully",
            extra={"request_id": request_id, "user_id": user_id},
        )

        # Handle cancellation
        if not request.accept:
            logger.info("Invite declined, marking as cancelled", extra={"request_id": request_id})
            supabase.table("invites").update({"status": "cancelled"}).eq("id", invite["id"]).execute()
            return AcceptInviteResponse(status="cancelled")

        # Create org membership
        logger.info(
            "Creating org membership",
            extra={
                "request_id": request_id,
                "org_id": invite["org_id"],
                "user_id": user_id,
                "role": invite.get("role"),
            },
        )

        member_response = (
            supabase.table("org_members")
            .insert(
                {
                    "org_id": invite["org_id"],
                    "user_id": user_id,
                    "role": invite.get("role"),
                }
            )
            .execute()
        )

        if member_response.data is None:
            logger.error(
                "Failed to create org membership",
                extra={"request_id": request_id, "user_id": user_id},
            )
            raise HTTPException(
                status_code=400, detail="Failed to create org membership"
            )

        logger.info(
            "Org membership created successfully",
            extra={"request_id": request_id, "user_id": user_id},
        )

        # Set active_org_id
        logger.info(
            "Setting active_org_id",
            extra={"request_id": request_id, "user_id": user_id, "org_id": invite["org_id"]},
        )

        update_profile_response = (
            supabase.table("profiles")
            .update({"active_org_id": invite["org_id"]})
            .eq("id", user_id)
            .execute()
        )

        if update_profile_response.data is None:
            # Non-critical failure, just log it
            logger.warning(
                "Failed to set active_org_id",
                extra={"request_id": request_id, "user_id": user_id},
            )
        else:
            logger.info(
                "Active org set successfully",
                extra={"request_id": request_id, "user_id": user_id},
            )

        # Apply project grants
        project_grants = invite.get("project_grants") or []
        logger.info(
            "Processing project grants",
            extra={"request_id": request_id, "project_grants_count": len(project_grants)},
        )

        if isinstance(project_grants, list) and len(project_grants) > 0:
            for grant in project_grants:
                project_id = grant.get("projectId")
                if not project_id:
                    continue

                logger.info(
                    "Processing grant for project",
                    extra={
                        "request_id": request_id,
                        "project_id": project_id,
                        "permissions_count": len(grant.get("permissions", [])),
                        "has_file_overrides": bool(grant.get("fileOverrides")),
                        "file_overrides_count": len(grant.get("fileOverrides", [])),
                        "has_exclusions": bool(grant.get("exclusions")),
                        "exclusions_count": len(grant.get("exclusions", [])),
                    },
                )

                # 1) Grant root permissions via RPC helper
                if grant.get("permissions") and isinstance(grant["permissions"], list):
                    try:
                        logger.info(
                            "Granting root permissions for project",
                            extra={"request_id": request_id, "project_id": project_id},
                        )
                        rpc_response = supabase.rpc(
                            "grant_project_access",
                            {
                                "p_project_id": project_id,
                                "p_user_id": user_id,
                                "p_granted_by_id": invite["invited_by"],
                                "p_permissions": grant["permissions"],
                            },
                        ).execute()

                        # Check for duplicate key error (already granted) - this is OK
                        if hasattr(rpc_response, "error") and rpc_response.error:
                            error_msg = str(rpc_response.error)
                            is_duplicate = "23505" in error_msg or "duplicate key" in error_msg.lower()
                            if is_duplicate:
                                logger.info(
                                    "Project access already granted - continuing",
                                    extra={"request_id": request_id, "project_id": project_id},
                                )
                            else:
                                logger.error(
                                    "Error granting root permissions",
                                    extra={
                                        "request_id": request_id,
                                        "project_id": project_id,
                                        "error": error_msg,
                                    },
                                )
                        else:
                            logger.info(
                                "Successfully granted access to project",
                                extra={"request_id": request_id, "project_id": project_id},
                            )
                    except Exception as rpc_error:
                        error_msg = str(rpc_error)
                        is_duplicate = "23505" in error_msg or "duplicate key" in error_msg.lower()
                        if is_duplicate:
                            logger.info(
                                "Project access already granted - continuing",
                                extra={"request_id": request_id, "project_id": project_id},
                            )
                        else:
                            logger.error(
                                "RPC grant_project_access failed",
                                extra={
                                    "request_id": request_id,
                                    "project_id": project_id,
                                    "error": error_msg,
                                },
                            )

                # 2) Apply per-doc overrides (none/view/edit) and back-compat exclusions
                file_overrides = grant.get("fileOverrides")
                exclusions = grant.get("exclusions")

                if file_overrides and isinstance(file_overrides, list) and len(file_overrides) > 0:
                    logger.info(
                        "Applying file overrides for project",
                        extra={
                            "request_id": request_id,
                            "project_id": project_id,
                            "count": len(file_overrides),
                        },
                    )

                    rows = [
                        {
                            "resource_id": o["resource_id"],
                            "user_id": user_id,
                            "permission": o["permission"],
                            "granted_by": invite["invited_by"],
                        }
                        for o in file_overrides
                        if o.get("permission") in ["none", "view", "edit"]
                    ]

                    if rows:
                        override_response = (
                            supabase.table("permissions")
                            .upsert(rows, on_conflict="resource_id,user_id")
                            .execute()
                        )

                        if override_response.data is None:
                            logger.error(
                                "Failed to apply file overrides",
                                extra={"request_id": request_id, "project_id": project_id},
                            )
                        else:
                            none_count = sum(1 for r in rows if r["permission"] == "none")
                            other_count = len(rows) - none_count
                            logger.info(
                                "File overrides applied successfully",
                                extra={
                                    "request_id": request_id,
                                    "project_id": project_id,
                                    "view_edit_count": other_count,
                                    "none_count": none_count,
                                },
                            )

                elif exclusions and isinstance(exclusions, list) and len(exclusions) > 0:
                    logger.info(
                        "Applying exclusions for project",
                        extra={
                            "request_id": request_id,
                            "project_id": project_id,
                            "count": len(exclusions),
                        },
                    )

                    exclusion_rows = [
                        {
                            "resource_id": resource_id,
                            "user_id": user_id,
                            "permission": "none",
                            "granted_by": invite["invited_by"],
                        }
                        for resource_id in exclusions
                    ]

                    exclusion_response = (
                        supabase.table("permissions")
                        .upsert(exclusion_rows, on_conflict="resource_id,user_id")
                        .execute()
                    )

                    if exclusion_response.data is None:
                        logger.error(
                            "Failed to apply exclusions",
                            extra={"request_id": request_id, "project_id": project_id},
                        )
                    else:
                        logger.info(
                            "Exclusions applied successfully",
                            extra={"request_id": request_id, "project_id": project_id},
                        )

                # 3) Ensure the user is a participant in the General chat thread for this project
                logger.info(
                    "Adding user to General chat thread for project",
                    extra={"request_id": request_id, "project_id": project_id},
                )

                thread_response = (
                    supabase.table("chat_threads")
                    .select("id")
                    .eq("project_id", project_id)
                    .eq("topic", "General")
                    .maybe_single()
                    .execute()
                )

                if thread_response.data:
                    thread_id = thread_response.data["id"]
                    participant_response = (
                        supabase.table("chat_thread_participants")
                        .upsert(
                            {
                                "thread_id": thread_id,
                                "user_id": user_id,
                                "last_read_at": "1970-01-01T00:00:00.000Z",
                            },
                            on_conflict="thread_id,user_id",
                        )
                        .execute()
                    )

                    if participant_response.data:
                        logger.info(
                            "Successfully added user to General chat thread",
                            extra={
                                "request_id": request_id,
                                "user_id": user_id,
                                "thread_id": thread_id,
                                "project_id": project_id,
                            },
                        )
                    else:
                        logger.error(
                            "Failed to add user to General chat thread",
                            extra={"request_id": request_id, "project_id": project_id},
                        )
                else:
                    logger.warning(
                        "No General chat thread found for project",
                        extra={"request_id": request_id, "project_id": project_id},
                    )

        # Create document-level permission events
        logger.info(
            "Creating document-level permission events",
            extra={"request_id": request_id},
        )

        doc_domain_event_ids = []

        if project_grants and len(project_grants) > 0:
            # Get org name for events
            org_response = (
                supabase.table("orgs")
                .select("name")
                .eq("id", invite["org_id"])
                .maybe_single()
                .execute()
            )
            org_name = org_response.data.get("name") if org_response.data else "your organization"

            # Get project names
            project_ids = [g.get("projectId") for g in project_grants if g.get("projectId")]
            projects_response = (
                supabase.table("projects")
                .select("id, name")
                .in_("id", project_ids)
                .execute()
            )
            project_name_map = {
                p["id"]: p["name"] for p in (projects_response.data or [])
            }

            # Get all FILE resources for these projects
            files_response = (
                supabase.table("resources")
                .select("id, project_id, name, parent_id, resource_type")
                .in_("project_id", project_ids)
                .eq("resource_type", "FILE")
                .execute()
            )

            all_file_resources = files_response.data or []

            if all_file_resources:
                file_resource_ids = [r["id"] for r in all_file_resources]

                # Get explicit document permissions
                explicit_perms_response = (
                    supabase.table("permissions")
                    .select("resource_id, permission")
                    .eq("user_id", user_id)
                    .in_("resource_id", file_resource_ids)
                    .execute()
                )

                explicit_perms_map = {}
                if explicit_perms_response.data:
                    for perm in explicit_perms_response.data:
                        level = perm["permission"] if perm["permission"] in ["edit", "view", "none"] else "view"
                        explicit_perms_map[perm["resource_id"]] = level

                # Get project root permissions for inheritance
                root_resources_response = (
                    supabase.table("resources")
                    .select("id, project_id, resource_type")
                    .in_("project_id", project_ids)
                    .in_("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"])
                    .execute()
                )

                root_perms_map = {}
                if root_resources_response.data:
                    root_resource_ids = [r["id"] for r in root_resources_response.data]
                    root_perms_response = (
                        supabase.table("permissions")
                        .select("resource_id, permission")
                        .eq("user_id", user_id)
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
                                level = perm["permission"] if perm["permission"] in ["edit", "view", "none"] else "view"
                                root_perms_map[key] = level

                # Build resource-to-root map for inheritance
                all_resources_response = (
                    supabase.table("resources")
                    .select("id, project_id, parent_id, resource_type")
                    .in_("project_id", project_ids)
                    .execute()
                )

                all_resources = all_resources_response.data or []
                resource_to_root_map = {}

                def find_root_for_resource(resource_id):
                    resource = next((r for r in all_resources if r["id"] == resource_id), None)
                    if not resource:
                        return None

                    current = resource
                    visited = set()

                    while current.get("parent_id") and current["id"] not in visited:
                        visited.add(current["id"])
                        parent = next(
                            (r for r in all_resources if r["id"] == current["parent_id"]), None
                        )
                        if not parent:
                            break

                        if parent["resource_type"] in ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"]:
                            return {
                                "project_id": current["project_id"],
                                "root_type": parent["resource_type"],
                            }

                        current = parent

                    return None

                for file_res in all_file_resources:
                    root_info = find_root_for_resource(file_res["id"])
                    if root_info:
                        resource_to_root_map[file_res["id"]] = root_info

                # Build afterDocPerms with effective permissions
                after_doc_perms = []

                for file_res in all_file_resources:
                    explicit_perm = explicit_perms_map.get(file_res["id"])

                    if explicit_perm:
                        # Has explicit permission (including 'none')
                        if explicit_perm != "none":
                            # Only include non-'none' permissions
                            after_doc_perms.append(
                                {
                                    "resource_id": file_res["id"],
                                    "project_id": file_res["project_id"],
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
                            if inherited_perm and inherited_perm != "none":
                                after_doc_perms.append(
                                    {
                                        "resource_id": file_res["id"],
                                        "project_id": file_res["project_id"],
                                        "permission_level": inherited_perm,
                                        "resource_name": file_res.get("name"),
                                    }
                                )

                # Create document_permission_granted events for all documents
                for doc_perm in after_doc_perms:
                    if not doc_perm["project_id"]:
                        continue

                    project_name = project_name_map.get(doc_perm["project_id"], "a project")

                    event_response = (
                        supabase.table("domain_events")
                        .insert(
                            {
                                "event_type": "document_permission_granted",
                                "actor_id": invite["invited_by"],
                                "project_id": doc_perm["project_id"],
                                "org_id": invite["org_id"],
                                "resource_id": doc_perm["resource_id"],
                                "payload": {
                                    "affected_user_id": user_id,
                                    "project_id": doc_perm["project_id"],
                                    "project_name": project_name,
                                    "resource_id": doc_perm["resource_id"],
                                    "resource_name": doc_perm["resource_name"],
                                    "old_permission": None,  # No previous access (new user)
                                    "new_permission": doc_perm["permission_level"],
                                    "changed_by_id": invite["invited_by"],
                                    "org_id": invite["org_id"],
                                    "org_name": org_name,
                                },
                            }
                        )
                        .execute()
                    )

                    if event_response and event_response.data:
                        event_list = event_response.data
                        if event_list and len(event_list) > 0:
                            event_id = event_list[0].get("id")
                            if event_id:
                                doc_domain_event_ids.append(event_id)
                                logger.info(
                                    "Created document_permission_granted event",
                                    extra={
                                        "request_id": request_id,
                                        "event_id": event_id,
                                        "resource_id": doc_perm["resource_id"],
                                    },
                                )
                    else:
                        logger.error(
                            "Failed to create document_permission_granted event",
                            extra={"request_id": request_id, "resource_id": doc_perm["resource_id"]},
                        )

                logger.info(
                    "Created document permission events",
                    extra={
                        "request_id": request_id,
                        "event_count": len(doc_domain_event_ids),
                    },
                )

        # Mark invite accepted
        logger.info("Marking invite as accepted", extra={"request_id": request_id, "invite_id": invite["id"]})

        update_invite_response = (
            supabase.table("invites")
            .update({"status": "accepted", "accepted_at": datetime.now().isoformat()})
            .eq("id", invite["id"])
            .execute()
        )

        if update_invite_response.data is None:
            logger.error(
                "Failed to mark invite as accepted",
                extra={"request_id": request_id, "invite_id": invite["id"]},
            )
        else:
            logger.info(
                "Invite marked as accepted successfully",
                extra={"request_id": request_id, "invite_id": invite["id"]},
            )

        # Create domain event for invite_accepted
        logger.info("Creating invite_accepted domain event", extra={"request_id": request_id})

        project_grant_ids = [
            g.get("projectId") for g in project_grants if g.get("projectId")
        ]

        org_data = invite.get("org") or {}
        org_name_for_event = org_data.get("name") if isinstance(org_data, dict) else None

        domain_event_response = (
            supabase.table("domain_events")
            .insert(
                {
                    "event_type": "invite_accepted",
                    "actor_id": user_id,
                    "org_id": invite["org_id"],
                    "project_id": None,  # Org-level event
                    "payload": {
                        "new_member_id": user_id,
                        "new_member_name": request.full_name,
                        "new_member_email": invite["invited_email"],
                        "invited_by": invite["invited_by"],
                        "org_id": invite["org_id"],
                        "org_name": org_name_for_event,
                        "project_grant_ids": project_grant_ids,
                    },
                }
            )
            .execute()
        )

        if domain_event_response and domain_event_response.data:
            event_list = domain_event_response.data
            if event_list and len(event_list) > 0:
                logger.info(
                    "Domain event created",
                    extra={
                        "request_id": request_id,
                        "event_id": event_list[0].get("id"),
                    },
                )
        else:
            # Log but don't fail - the invite acceptance is complete
            logger.error(
                "Failed to create domain event",
                extra={"request_id": request_id},
            )

        duration = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            "Invite acceptance completed successfully",
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "org_id": invite["org_id"],
                "role": invite.get("role"),
                "duration_ms": duration,
            },
        )

        return AcceptInviteResponse(status="accepted")

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error accepting invite",
            extra={
                "request_id": request_id,
                "duration_ms": duration,
                "error": str(e),
            },
        )
        raise HTTPException(status_code=500, detail=str(e))
