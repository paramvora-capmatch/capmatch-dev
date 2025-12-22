"""Chat thread management routes."""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from models.chat import ManageChatThreadRequest, ManageChatThreadResponse
from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/threads", response_model=ManageChatThreadResponse)
async def manage_chat_thread(request: ManageChatThreadRequest, req: Request):
    """
    Manage chat threads - create, add participants, remove participants, or get threads.

    Migrated from: supabase/functions/manage-chat-thread/index.ts

    Supported actions:
    - create: Create a new chat thread with participants
    - add_participant: Add participants to an existing thread
    - remove_participant: Remove participants from a thread
    - get_thread: Get thread(s) for a project

    Args:
        request: Request with action and required parameters
        req: FastAPI request object with authenticated user

    Returns:
        Response with thread data or success message
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Manage chat thread request received",
        extra={
            "request_id": request_id,
            "action": request.action,
            "thread_id": request.thread_id,
            "project_id": request.project_id,
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

        if request.action == "create":
            if not request.project_id:
                raise HTTPException(
                    status_code=400, detail="project_id is required for creating threads"
                )

            # Verify user has access to the project
            logger.info(
                "Verifying project access",
                extra={"request_id": request_id, "project_id": request.project_id},
            )

            project_response = (
                supabase.table("projects")
                .select("id, owner_org_id, assigned_advisor_id")
                .eq("id", request.project_id)
                .single()
                .execute()
            )

            if not project_response.data:
                raise HTTPException(
                    status_code=404, detail="Failed to verify project access"
                )

            project = project_response.data

            # Check if user can access this project (owner or advisor)
            is_owner_response = supabase.rpc(
                "is_org_owner",
                {"p_org_id": project["owner_org_id"], "p_user_id": user_id},
            ).execute()

            is_owner = is_owner_response.data
            is_advisor = project.get("assigned_advisor_id") == user_id

            if not is_owner and not is_advisor:
                logger.warning(
                    "User does not have permission to create thread",
                    extra={
                        "request_id": request_id,
                        "user_id": user_id,
                        "project_id": request.project_id,
                    },
                )
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to create a new channel in this project.",
                )

            # Create the thread
            logger.info(
                "Creating chat thread",
                extra={"request_id": request_id, "project_id": request.project_id},
            )

            thread_response = (
                supabase.table("chat_threads")
                .insert({"project_id": request.project_id, "topic": request.topic})
                .execute()
            )

            if not thread_response.data:
                raise HTTPException(
                    status_code=500, detail="Failed to create thread"
                )

            thread = thread_response.data[0] if isinstance(thread_response.data, list) else thread_response.data

            # Add current user as participant (idempotent)
            # Set last_read_at to epoch so existing messages appear as unread
            logger.info(
                "Adding current user as participant",
                extra={"request_id": request_id, "thread_id": thread["id"]},
            )

            current_user_participant_response = (
                supabase.table("chat_thread_participants")
                .upsert(
                    {
                        "thread_id": thread["id"],
                        "user_id": user_id,
                        "last_read_at": "1970-01-01T00:00:00.000Z",
                    },
                    on_conflict="thread_id,user_id",
                )
                .execute()
            )

            # Upsert succeeds if no exception is raised

            # Add additional participants if provided
            if request.participant_ids and len(request.participant_ids) > 0:
                logger.info(
                    "Adding additional participants",
                    extra={
                        "request_id": request_id,
                        "participant_count": len(request.participant_ids),
                    },
                )

                participant_inserts = [
                    {
                        "thread_id": thread["id"],
                        "user_id": pid,
                        "last_read_at": "1970-01-01T00:00:00.000Z",
                    }
                    for pid in request.participant_ids
                ]

                participants_response = (
                    supabase.table("chat_thread_participants")
                    .upsert(participant_inserts, on_conflict="thread_id,user_id")
                    .execute()
                )

                # Upsert succeeds if no exception is raised, proceed to create events
                # Create domain events for each participant added (excluding the actor)
                # This is necessary because the trigger can't get auth.uid() when using service role
                for pid in request.participant_ids:
                    if pid != user_id and request.project_id:
                        try:
                            supabase.rpc(
                                "insert_chat_thread_participant_added_event",
                                {
                                    "p_actor_id": user_id,
                                    "p_project_id": request.project_id,
                                    "p_thread_id": thread["id"],
                                    "p_added_user_id": pid,
                                    "p_payload": {"thread_topic": request.topic},
                                },
                            ).execute()
                        except Exception as event_error:
                            # Log error but don't fail the operation if event creation fails
                            logger.error(
                                f"Failed to create domain event for participant {pid}",
                                extra={
                                    "request_id": request_id,
                                    "error": str(event_error),
                                },
                            )

            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                "Chat thread created successfully",
                extra={
                    "request_id": request_id,
                    "thread_id": thread["id"],
                    "duration_ms": duration,
                },
            )

            return ManageChatThreadResponse(
                thread_id=thread["id"], message="Thread created successfully"
            )

        elif request.action == "add_participant":
            if not request.thread_id or not request.participant_ids or len(request.participant_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="thread_id and participant_ids are required",
                )

            # Verify user has permission to add participants to this thread
            logger.info(
                "Verifying thread access",
                extra={"request_id": request_id, "thread_id": request.thread_id},
            )

            # Get thread with project info
            thread_response = (
                supabase.table("chat_threads")
                .select("id, project_id, projects!inner(owner_org_id, assigned_advisor_id)")
                .eq("id", request.thread_id)
                .single()
                .execute()
            )

            if not thread_response.data:
                raise HTTPException(
                    status_code=404, detail="Failed to get thread"
                )

            thread = thread_response.data
            project = thread.get("projects")

            if not project:
                raise HTTPException(
                    status_code=404, detail="Project not found for thread"
                )

            is_owner_response = supabase.rpc(
                "is_org_owner",
                {"p_org_id": project["owner_org_id"], "p_user_id": user_id},
            ).execute()

            is_owner = is_owner_response.data
            is_advisor = project.get("assigned_advisor_id") == user_id

            if not is_owner and not is_advisor:
                logger.warning(
                    "User does not have permission to add participants",
                    extra={"request_id": request_id, "user_id": user_id},
                )
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to add participants to this thread",
                )

            # Get thread details for events
            thread_data_response = (
                supabase.table("chat_threads")
                .select("id, topic, project_id")
                .eq("id", request.thread_id)
                .single()
                .execute()
            )

            if not thread_data_response.data:
                raise HTTPException(
                    status_code=404, detail="Failed to get thread details"
                )

            thread_data = thread_data_response.data

            # Add participants
            logger.info(
                "Adding participants to thread",
                extra={
                    "request_id": request_id,
                    "thread_id": request.thread_id,
                    "participant_count": len(request.participant_ids),
                },
            )

            participant_inserts = [
                {
                    "thread_id": request.thread_id,
                    "user_id": pid,
                    "last_read_at": "1970-01-01T00:00:00.000Z",
                }
                for pid in request.participant_ids
            ]

            participants_response = (
                supabase.table("chat_thread_participants")
                .upsert(participant_inserts, on_conflict="thread_id,user_id")
                .execute()
            )

            # Upsert succeeds if no exception is raised

            # Create domain events for each participant added (excluding the actor)
            for pid in request.participant_ids:
                if pid != user_id and thread_data.get("project_id"):
                    try:
                        supabase.rpc(
                            "insert_chat_thread_participant_added_event",
                            {
                                "p_actor_id": user_id,
                                "p_project_id": thread_data["project_id"],
                                "p_thread_id": request.thread_id,
                                "p_added_user_id": pid,
                                "p_payload": {"thread_topic": thread_data.get("topic")},
                            },
                        ).execute()
                    except Exception as event_error:
                        # Log error but don't fail the operation if event creation fails
                        logger.error(
                            f"Failed to create domain event for participant {pid}",
                            extra={
                                "request_id": request_id,
                                "error": str(event_error),
                            },
                        )

            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                "Participants added successfully",
                extra={"request_id": request_id, "duration_ms": duration},
            )

            return ManageChatThreadResponse(message="Participants added successfully")

        elif request.action == "remove_participant":
            if not request.thread_id or not request.participant_ids or len(request.participant_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="thread_id and participant_ids are required",
                )

            # Verify user has permission to remove participants from this thread
            logger.info(
                "Verifying thread access for removal",
                extra={"request_id": request_id, "thread_id": request.thread_id},
            )

            thread_response = (
                supabase.table("chat_threads")
                .select("id, project_id, projects!inner(owner_org_id, assigned_advisor_id)")
                .eq("id", request.thread_id)
                .single()
                .execute()
            )

            if not thread_response.data:
                raise HTTPException(
                    status_code=404, detail="Failed to get thread"
                )

            thread = thread_response.data
            project = thread.get("projects")

            if not project:
                raise HTTPException(
                    status_code=404, detail="Project not found for thread"
                )

            is_owner_response = supabase.rpc(
                "is_org_owner",
                {"p_org_id": project["owner_org_id"], "p_user_id": user_id},
            ).execute()

            is_owner = is_owner_response.data
            is_advisor = project.get("assigned_advisor_id") == user_id

            if not is_owner and not is_advisor:
                logger.warning(
                    "User does not have permission to remove participants",
                    extra={"request_id": request_id, "user_id": user_id},
                )
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to remove participants from this thread",
                )

            # Remove participants
            logger.info(
                "Removing participants from thread",
                extra={
                    "request_id": request_id,
                    "thread_id": request.thread_id,
                    "participant_count": len(request.participant_ids),
                },
            )

            delete_response = (
                supabase.table("chat_thread_participants")
                .delete()
                .eq("thread_id", request.thread_id)
                .in_("user_id", request.participant_ids)
                .execute()
            )

            # Delete succeeds if no exception is raised

            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                "Participants removed successfully",
                extra={"request_id": request_id, "duration_ms": duration},
            )

            return ManageChatThreadResponse(message="Participants removed successfully")

        elif request.action == "get_thread":
            if not request.project_id:
                raise HTTPException(
                    status_code=400, detail="project_id is required for getting threads"
                )

            # Get existing thread(s) for this project
            logger.info(
                "Getting threads for project",
                extra={"request_id": request_id, "project_id": request.project_id},
            )

            threads_response = (
                supabase.table("chat_threads")
                .select("*")
                .eq("project_id", request.project_id)
                .execute()
            )

            if not threads_response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to get thread",
                )

            threads = threads_response.data

            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                "Thread retrieved successfully",
                extra={
                    "request_id": request_id,
                    "thread_count": len(threads) if threads else 0,
                    "duration_ms": duration,
                },
            )

            return ManageChatThreadResponse(
                thread=threads, message="Thread retrieved successfully"
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid action. Supported actions: create, get_thread, add_participant, remove_participant",
            )

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error managing chat thread",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))

