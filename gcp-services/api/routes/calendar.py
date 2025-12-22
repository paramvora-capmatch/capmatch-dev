"""Calendar management routes."""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

from models.calendar import (
    UpdateCalendarResponseRequest,
    UpdateCalendarResponseResponse,
)
from services.supabase_client import get_supabase_admin
from utils.calendar_utils import ensure_valid_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/update-response", response_model=UpdateCalendarResponseResponse)
async def update_calendar_response(
    request: UpdateCalendarResponseRequest, req: Request
):
    """
    Update meeting participant response status and sync to Google Calendar.

    Migrated from: supabase/functions/update-calendar-response/index.ts

    Args:
        request: Update request with meeting_id, user_id, and status
        req: FastAPI request object with authenticated user

    Returns:
        Success message with sync status
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Update calendar response request received",
        extra={
            "request_id": request_id,
            "meeting_id": request.meeting_id,
            "user_id": request.user_id,
            "status": request.status,
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

        authenticated_user_id = req.state.user_id

        # Enforce ownership: User can only update their own status
        if authenticated_user_id != request.user_id:
            logger.warning(
                "User attempted to update another user's status",
                extra={
                    "request_id": request_id,
                    "authenticated_user_id": authenticated_user_id,
                    "requested_user_id": request.user_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You can only update your own status",
            )

        supabase = get_supabase_admin()

        # Map status to Google Calendar format
        google_status = request.status
        if request.status == "pending":
            google_status = "needsAction"

        # Update meeting_participants table in Supabase
        logger.info(
            "Updating meeting_participants table",
            extra={"request_id": request_id, "meeting_id": request.meeting_id},
        )

        update_response = (
            supabase.table("meeting_participants")
            .update(
                {
                    "response_status": request.status,
                    "responded_at": datetime.now().isoformat(),
                }
            )
            .eq("meeting_id", request.meeting_id)
            .eq("user_id", request.user_id)
            .execute()
        )

        # Update succeeds if no exception is raised

        # Get meeting details
        logger.info(
            "Fetching meeting details",
            extra={"request_id": request_id, "meeting_id": request.meeting_id},
        )

        meeting_response = (
            supabase.table("meetings")
            .select("calendar_event_ids")
            .eq("id", request.meeting_id)
            .single()
            .execute()
        )

        if not meeting_response.data:
            logger.error(
                "Meeting not found",
                extra={"request_id": request_id},
            )
            raise HTTPException(status_code=404, detail="Meeting not found")

        meeting = meeting_response.data

        # Get user email
        logger.info(
            "Fetching user email",
            extra={"request_id": request_id, "user_id": request.user_id},
        )

        user_response = (
            supabase.table("profiles")
            .select("email")
            .eq("id", request.user_id)
            .single()
            .execute()
        )

        if not user_response.data:
            logger.error(
                "User not found",
                extra={"request_id": request_id},
            )
            raise HTTPException(status_code=404, detail="User not found")

        user_email = user_response.data.get("email")

        # Get user's calendar connection
        logger.info(
            "Fetching calendar connection",
            extra={"request_id": request_id, "user_id": request.user_id},
        )

        connections_response = (
            supabase.table("calendar_connections")
            .select("*")
            .eq("user_id", request.user_id)
            .eq("provider", "google")
            .execute()
        )

        # Query succeeds if no exception is raised

        connections = connections_response.data or []
        connection = connections[0] if connections else None

        # If no connection, we can't sync to Google Calendar
        if not connection:
            logger.info(
                "No calendar connection found, skipping Google Calendar sync",
                extra={"request_id": request_id},
            )
            return UpdateCalendarResponseResponse(
                message="Updated local status only (no calendar connection)"
            )

        # Sync to Google Calendar
        logger.info(
            "Syncing to Google Calendar",
            extra={
                "request_id": request_id,
                "status": request.status,
                "user_email": user_email,
            },
        )

        access_token = await ensure_valid_token(connection, supabase)

        # calendar_event_ids is JSONB, so it might be an array or null
        calendar_event_ids = meeting.get("calendar_event_ids") or []
        if not isinstance(calendar_event_ids, list):
            # Handle legacy single event ID (string or object)
            calendar_event_ids = [calendar_event_ids] if calendar_event_ids else []

        success_count = 0

        async with httpx.AsyncClient() as client:
            for event_obj in calendar_event_ids:
                # Handle both string IDs (legacy) and object IDs
                event_id = event_obj if isinstance(event_obj, str) else event_obj.get("eventId") if isinstance(event_obj, dict) else None

                if not event_id:
                    logger.warning(
                        "Skipping invalid event ID object",
                        extra={"request_id": request_id, "event_obj": event_obj},
                    )
                    continue

                try:
                    # Fetch event to get current attendees
                    # We use 'primary' calendar because we are using the user's token
                    get_response = await client.get(
                        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                        headers={"Authorization": f"Bearer {access_token}"},
                    )

                    if not get_response.is_success:
                        logger.error(
                            f"Failed to fetch event {event_id}",
                            extra={
                                "request_id": request_id,
                                "status": get_response.status_code,
                                "status_text": get_response.text,
                            },
                        )
                        continue

                    event = get_response.json()

                    if not event.get("attendees"):
                        logger.info(
                            f"No attendees in event {event_id}",
                            extra={"request_id": request_id},
                        )
                        continue

                    # Update attendee status
                    found_user = False
                    updated_attendees = []
                    for attendee in event["attendees"]:
                        if attendee.get("email") == user_email:
                            found_user = True
                            updated_attendees.append(
                                {**attendee, "responseStatus": google_status}
                            )
                        else:
                            updated_attendees.append(attendee)

                    if not found_user:
                        logger.info(
                            f"User {user_email} not found in attendees list for event {event_id}",
                            extra={"request_id": request_id},
                        )
                        continue

                    # Patch event
                    patch_response = await client.patch(
                        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/json",
                        },
                        json={"attendees": updated_attendees},
                    )

                    if not patch_response.is_success:
                        error_text = patch_response.text
                        logger.error(
                            f"Failed to patch event {event_id}",
                            extra={"request_id": request_id, "error": error_text},
                        )
                    else:
                        logger.info(
                            f"Successfully updated event {event_id} status to {google_status}",
                            extra={"request_id": request_id},
                        )
                        success_count += 1

                except Exception as err:
                    logger.error(
                        f"Error processing event {event_id}",
                        extra={"request_id": request_id, "error": str(err)},
                    )

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Calendar response update completed",
            extra={
                "request_id": request_id,
                "success_count": success_count,
                "duration_ms": duration,
            },
        )

        return UpdateCalendarResponseResponse(
            message=f"Sync completed. Updated {success_count} events."
        )

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error updating calendar response",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))

