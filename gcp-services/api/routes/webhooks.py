"""Webhook routes for external services."""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Set

import httpx
from fastapi import APIRouter, HTTPException, Request

from config import settings
from models.webhooks import DailyWebhookPayload, DailyWebhookResponse
from services.supabase_client import get_supabase_admin
from utils.gemini_utils import generate_meeting_summary, parse_webvtt_to_text

logger = logging.getLogger(__name__)

router = APIRouter()

# Track processed transcript IDs to prevent duplicates
# In production, this should be stored in Redis or database
processed_transcripts: Set[str] = set()


@router.post("/daily", response_model=DailyWebhookResponse)
async def daily_webhook(request: DailyWebhookPayload, req: Request):
    """
    Handle Daily.co webhook events for meetings, transcripts, and recordings.

    Migrated from: supabase/functions/daily-webhook/index.ts

    Supported event types:
    - meeting.started: Auto-start transcription
    - transcript.ready-to-download: Process transcript and generate AI summary (async)
    - recording.ready / recording.upload-complete: Update meeting with recording URL
    - meeting.ended: Mark meeting as completed

    Args:
        request: Daily.co webhook payload
        req: FastAPI request object (no authentication required for webhooks)

    Returns:
        Acknowledgment response
    """
    start_time = datetime.now()
    request_id = str(uuid.uuid4())

    logger.info(
        "Daily.co webhook received",
        extra={
            "request_id": request_id,
            "event_type": request.type,
            "event": request.event,
        },
    )

    try:
        # Handle verification/ping requests (no type or event)
        if not request.type:
            logger.info(
                "Daily.co webhook verification request received",
                extra={"request_id": request_id},
            )
            return DailyWebhookResponse(received=True)

        supabase = get_supabase_admin()
        event_type = request.type
        payload = request.payload or {}

        # Handle meeting.started event - auto-start transcription
        if event_type == "meeting.started":
            room = payload.get("room")

            if not room:
                logger.error(
                    "Missing room name in meeting.started webhook",
                    extra={"request_id": request_id},
                )
                raise HTTPException(status_code=400, detail="Invalid payload")

            logger.info(
                "Meeting started",
                extra={"request_id": request_id, "room": room},
            )

            # Start transcription via Daily.co REST API
            daily_api_key = settings.DAILY_API_KEY
            if not daily_api_key:
                logger.warning(
                    "DAILY_API_KEY not configured, transcription not started",
                    extra={"request_id": request_id},
                )
                return DailyWebhookResponse(received=True)

            try:
                async with httpx.AsyncClient() as client:
                    transcription_response = await client.post(
                        f"https://api.daily.co/v1/rooms/{room}/transcription/start",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {daily_api_key}",
                        },
                    )

                    if transcription_response.is_success:
                        logger.info(
                            "Successfully started transcription",
                            extra={"request_id": request_id, "room": room},
                        )
                    else:
                        error_data = transcription_response.text
                        logger.error(
                            "Failed to start transcription",
                            extra={
                                "request_id": request_id,
                                "error": error_data,
                            },
                        )
            except Exception as error:
                logger.error(
                    "Error starting transcription",
                    extra={"request_id": request_id, "error": str(error)},
                )

            return DailyWebhookResponse(received=True)

        # Handle transcript.ready-to-download event
        if event_type == "transcript.ready-to-download":
            room_name = payload.get("room_name")
            transcript_id = payload.get("id")

            if not room_name or not transcript_id:
                logger.error(
                    "Missing required fields in transcript webhook",
                    extra={"request_id": request_id},
                )
                raise HTTPException(status_code=400, detail="Invalid payload")

            # Check if already processed (deduplication)
            if transcript_id in processed_transcripts:
                logger.info(
                    f"Transcript {transcript_id} already being processed, skipping duplicate",
                    extra={"request_id": request_id},
                )
                return DailyWebhookResponse(received=True, duplicate=True)

            # Mark as processing
            processed_transcripts.add(transcript_id)

            logger.info(
                "Transcript ready",
                extra={
                    "request_id": request_id,
                    "room_name": room_name,
                    "transcript_id": transcript_id,
                },
            )

            # Process async and return immediately to prevent Daily.co retries
            asyncio.create_task(
                _process_transcript_async(
                    supabase, room_name, transcript_id, request_id
                )
            )

            # Return success immediately (< 1 second response time)
            return DailyWebhookResponse(received=True)

        # Handle recording.ready and recording.upload-complete events
        if event_type in ["recording.ready", "recording.upload-complete"]:
            room_name = payload.get("room") or payload.get("room_name")

            if not room_name:
                logger.error(
                    "No room name in recording webhook",
                    extra={"request_id": request_id},
                )
                raise HTTPException(status_code=400, detail="Invalid webhook payload")

            # Find meeting with this room name
            meeting_response = (
                supabase.table("meetings")
                .select("id")
                .ilike("meeting_link", f"%{room_name}%")
                .maybe_single()
                .execute()
            )

            if meeting_response.error or not meeting_response.data:
                logger.warning(
                    f"No meeting found for room: {room_name}",
                    extra={"request_id": request_id},
                )
                # Return 200 to acknowledge webhook even if meeting not found
                return DailyWebhookResponse(received=True)

            meeting_id = meeting_response.data.get("id")
            await _handle_recording_ready(supabase, meeting_id, payload, request_id)

            return DailyWebhookResponse(received=True)

        # Handle meeting.ended event
        if event_type == "meeting.ended":
            room_name = payload.get("room") or payload.get("room_name")

            if not room_name:
                logger.error(
                    "No room name in meeting.ended webhook",
                    extra={"request_id": request_id},
                )
                raise HTTPException(status_code=400, detail="Invalid webhook payload")

            # Find meeting with this room name
            meeting_response = (
                supabase.table("meetings")
                .select("id")
                .ilike("meeting_link", f"%{room_name}%")
                .maybe_single()
                .execute()
            )

            if meeting_response.error or not meeting_response.data:
                logger.warning(
                    f"No meeting found for room: {room_name}",
                    extra={"request_id": request_id},
                )
                return DailyWebhookResponse(received=True)

            meeting_id = meeting_response.data.get("id")
            await _handle_meeting_ended(supabase, meeting_id, request_id)

            return DailyWebhookResponse(received=True)

        # Acknowledge other event types
        logger.info(
            "Acknowledging unknown event type",
            extra={"request_id": request_id, "event_type": event_type},
        )
        return DailyWebhookResponse(received=True)

    except HTTPException:
        raise
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.exception(
            "Error processing Daily.co webhook",
            extra={"request_id": request_id, "duration_ms": duration, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail="Internal error")


async def _process_transcript_async(
    supabase, room_name: str, transcript_id: str, request_id: str
):
    """Async processing function for transcripts - runs in background."""
    try:
        daily_api_key = settings.DAILY_API_KEY
        if not daily_api_key:
            logger.error(
                "DAILY_API_KEY not configured",
                extra={"request_id": request_id},
            )
            processed_transcripts.discard(transcript_id)
            return

        # Fetch transcript details from Daily.co to get full metadata
        async with httpx.AsyncClient() as client:
            transcript_response = await client.get(
                f"https://api.daily.co/v1/transcript/{transcript_id}",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {daily_api_key}",
                },
            )

            if not transcript_response.is_success:
                logger.error(
                    "Failed to fetch transcript details from Daily.co",
                    extra={"request_id": request_id},
                )
                processed_transcripts.discard(transcript_id)
                return

            transcript_data = transcript_response.json()

            logger.info(
                "Transcript details fetched",
                extra={
                    "request_id": request_id,
                    "transcript_id": transcript_data.get("transcriptId"),
                    "status": transcript_data.get("status"),
                },
            )

            # Fetch the transcript download link
            link_response = await client.get(
                f"https://api.daily.co/v1/transcript/{transcript_id}/access-link",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {daily_api_key}",
                },
            )

            transcript_content = None
            if link_response.is_success:
                link_data = link_response.json()

                # Download the actual WebVTT content
                if link_data.get("link"):
                    try:
                        vtt_response = await client.get(link_data["link"])
                        if vtt_response.is_success:
                            transcript_content = vtt_response.text
                            logger.info(
                                "Successfully downloaded transcript content",
                                extra={"request_id": request_id},
                            )
                        else:
                            logger.error(
                                "Failed to download VTT content",
                                extra={
                                    "request_id": request_id,
                                    "status": vtt_response.status_code,
                                },
                            )
                    except Exception as error:
                        logger.error(
                            "Error downloading VTT content",
                            extra={"request_id": request_id, "error": str(error)},
                        )
            else:
                logger.error(
                    "Failed to fetch transcript access link",
                    extra={
                        "request_id": request_id,
                        "status": link_response.status_code,
                    },
                )

            # Generate AI summary if we have transcript content
            summary = None
            if transcript_content:
                logger.info(
                    "Generating AI summary for transcript",
                    extra={"request_id": request_id},
                )
                try:
                    transcript_text = parse_webvtt_to_text(transcript_content)
                    summary = await generate_meeting_summary(transcript_text)
                    if summary:
                        logger.info(
                            "Successfully generated AI summary",
                            extra={"request_id": request_id},
                        )
                    else:
                        logger.warning(
                            "Failed to generate AI summary",
                            extra={"request_id": request_id},
                        )
                except Exception as error:
                    logger.error(
                        "Error generating summary",
                        extra={"request_id": request_id, "error": str(error)},
                    )

            # Save transcript and summary to meetings table
            # Find the meeting by room_name (exact match)
            update_response = (
                supabase.table("meetings")
                .update(
                    {
                        "transcript_text": transcript_content,
                        "summary": json.dumps(summary) if summary else None,
                        "status": "completed",
                    }
                )
                .eq("room_name", room_name)
                .execute()
            )

            # Check if any rows were updated
            if not update_response.data or len(update_response.data) == 0:
                logger.warning(
                    "No meeting found to update with transcript",
                    extra={
                        "request_id": request_id,
                        "room_name": room_name,
                    },
                )
                processed_transcripts.discard(transcript_id)
            else:
                logger.info(
                    "Successfully saved transcript and summary",
                    extra={"request_id": request_id, "room_name": room_name},
                )
                # Remove from processing set on success
                processed_transcripts.discard(transcript_id)

    except Exception as error:
        logger.error(
            "Error in async transcript processing",
            extra={"request_id": request_id, "error": str(error)},
        )
        # Remove from set on error so it can be retried
        processed_transcripts.discard(transcript_id)
        raise


async def _handle_recording_ready(
    supabase, meeting_id: str, payload: Dict, request_id: str
):
    """Handler for recording ready events."""
    recording = payload.get("recording")

    if not recording:
        logger.error(
            "No recording data in payload",
            extra={"request_id": request_id},
        )
        return

    recording_url = recording.get("download_link") or recording.get("share_token")

    if not recording_url:
        logger.error(
            "No recording URL in payload",
            extra={"request_id": request_id},
        )
        return

    logger.info(
        f"Updating meeting {meeting_id} with recording URL",
        extra={"request_id": request_id},
    )

    update_response = (
        supabase.table("meetings")
        .update(
            {
                "recording_url": recording_url,
                "status": "completed",
            }
        )
        .eq("id", meeting_id)
        .execute()
    )

    if update_response.error:
        logger.error(
            "Failed to update meeting with recording",
            extra={
                "request_id": request_id,
                "error": str(update_response.error),
            },
        )
    else:
        logger.info(
            "Successfully updated meeting with recording URL",
            extra={"request_id": request_id},
        )


async def _handle_meeting_ended(supabase, meeting_id: str, request_id: str):
    """Handler for meeting ended events."""
    logger.info(
        f"Meeting {meeting_id} has ended",
        extra={"request_id": request_id},
    )

    update_response = (
        supabase.table("meetings")
        .update({"status": "completed"})
        .eq("id", meeting_id)
        .execute()
    )

    if update_response.error:
        logger.error(
            "Failed to update meeting status",
            extra={
                "request_id": request_id,
                "error": str(update_response.error),
            },
        )
    else:
        logger.info(
            "Successfully marked meeting as completed",
            extra={"request_id": request_id},
        )

