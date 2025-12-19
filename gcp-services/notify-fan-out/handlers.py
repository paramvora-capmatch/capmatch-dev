"""
Event handlers for notify-fan-out service.

Each handler processes a specific domain event type and creates notifications/emails.
Ported from supabase/functions/notify-fan-out/index.ts

NOTE: This is a starter implementation with key handlers. Remaining handlers
should follow the same pattern: check permissions → create notifications → queue emails.
"""

import logging
from typing import Tuple, List, Dict, Any, Optional
from database import Database, DomainEvent
from helpers import collect_candidate_user_ids, filter_by_resource_access
from config import Config

logger = logging.getLogger(__name__)

# Type alias for handler return value
HandlerResult = Tuple[int, int]  # (inserted_count, emails_queued)


# =============================================================================
# Handler: Document Uploaded
# =============================================================================


def handle_document_uploaded(db: Database, event: DomainEvent) -> HandlerResult:
    """
    Handle document_uploaded event.

    Creates in-app notifications for project members and queues aggregated emails.
    """
    logger.info("Processing document_uploaded event %d", event.id)

    # Gather candidate user IDs
    candidate_ids = collect_candidate_user_ids(db, event)
    if not candidate_ids:
        logger.debug("No candidates found for event %d", event.id)
        return (0, 0)

    # Filter by resource access
    filtered_user_ids = filter_by_resource_access(
        db, candidate_ids, event.resource_id
    )

    # Exclude actor
    final_recipient_ids = [uid for uid in filtered_user_ids if uid != event.actor_id]

    if not final_recipient_ids:
        logger.debug("No authorized recipients for event %d", event.id)
        return (0, 0)

    # Filter by user preferences
    notified_ids: List[str] = []
    for user_id in final_recipient_ids:
        is_muted = db.check_user_preference(
            user_id=user_id,
            scope_type="project",
            scope_id=event.project_id or "",
            event_type="document_uploaded",
            channel="in_app",
            project_id=event.project_id or "",
        )
        if not is_muted:
            notified_ids.append(user_id)

    if not notified_ids:
        logger.debug("All users muted for event %d", event.id)
        return (0, 0)

    # Check for duplicates
    already_notified = db.fetch_existing_recipients(event.id)
    recipients_to_insert = [uid for uid in notified_ids if uid not in already_notified]

    if not recipients_to_insert:
        logger.debug("All recipients already notified for event %d", event.id)
        return (0, 0)

    # Build notification content
    file_name = event.payload.get("fileName", "A new file")
    project_name = db.get_project_name(event.project_id)
    base_path = f"/project/workspace/{event.project_id}"
    link_url = (
        f"{base_path}?resourceId={event.resource_id}"
        if event.resource_id
        else base_path
    )

    # Create notifications
    inserted_count = 0
    for user_id in recipients_to_insert:
        success = db.create_notification(
            user_id=user_id,
            event_id=event.id,
            title=f"Document uploaded - {project_name}",
            body=f'New file **"{file_name}"** was uploaded to **{project_name}**.',
            link_url=link_url,
        )
        if success:
            inserted_count += 1

    # Queue emails
    uploader_name = db.get_profile_name(event.actor_id)
    emails_queued = 0
    for user_id in recipients_to_insert:
        success = db.queue_email(
            user_id=user_id,
            event_id=event.id,
            event_type="document_uploaded",
            delivery_type="aggregated",
            project_id=event.project_id,
            project_name=project_name,
            subject=f"New document uploaded to {project_name}",
            body_data={
                "file_name": file_name,
                "project_name": project_name,
                "uploader_name": uploader_name,
                "resource_id": event.resource_id,
                "link_url": link_url,
            },
        )
        if success:
            emails_queued += 1

    logger.info(
        "Event %d: created %d notifications, queued %d emails",
        event.id,
        inserted_count,
        emails_queued,
    )
    return (inserted_count, emails_queued)


# =============================================================================
# Handler: Chat Message Sent
# =============================================================================


def handle_chat_message(db: Database, event: DomainEvent) -> HandlerResult:
    """
    Handle chat_message_sent event.

    Creates in-app notifications for thread participants.
    Mentions get distinct notifications, regular messages can aggregate.
    """
    logger.info("Processing chat_message_sent event %d", event.id)

    if not event.thread_id:
        logger.error("Missing thread_id for chat event %d", event.id)
        return (0, 0)

    # Get thread info
    thread_info = db.get_thread_info(event.thread_id)
    thread_name = thread_info.topic if thread_info else "thread"
    thread_label = thread_name if thread_name.startswith("#") else f"#{thread_name}"
    project_id = (thread_info.project_id if thread_info else None) or event.project_id
    project_name = db.get_project_name(project_id)

    # Get participants
    participants = db.get_thread_participants(event.thread_id)
    if not participants:
        logger.debug("No participants found for thread %s", event.thread_id)
        return (0, 0)

    # Get sender name
    sender_name = db.get_profile_name(event.actor_id)

    # Extract payload data
    mentioned_user_ids = event.payload.get("mentioned_user_ids", [])
    full_content = event.payload.get("full_content", "New message")

    thread_payload_base = {
        "count": 1,
        "thread_id": event.thread_id,
        "thread_name": thread_name,
        "project_name": project_name,
        "type": "thread_activity",
    }

    inserted_count = 0
    updated_count = 0

    for participant in participants:
        # Skip sender
        if participant.user_id == event.actor_id:
            continue

        user_id = participant.user_id

        # Check preferences (mute)
        is_muted = db.check_user_preference(
            user_id=user_id,
            scope_type="thread",
            scope_id=event.thread_id,
            event_type="chat_message",
            channel="in_app",
            project_id=project_id or "",
        )
        if is_muted:
            continue

        # Generate link URL
        base_path = f"/project/workspace/{project_id}"
        link_url = f"{base_path}?tab=chat&thread={event.thread_id}"

        # Determine notification type
        is_mentioned = user_id in mentioned_user_ids

        if is_mentioned:
            # MENTIONS: Always create new notification
            success = db.create_notification(
                user_id=user_id,
                event_id=event.id,
                title=f"{sender_name} mentioned you in {thread_label} - {project_name}",
                body=full_content,
                link_url=link_url,
                payload={**thread_payload_base, "type": "mention"},
            )
            if success:
                inserted_count += 1
        else:
            # GENERAL: Try to aggregate
            try:
                # Find existing unread notification for this thread
                # Note: Supabase Python client doesn't support JSONB operators in .eq(),
                # so we fetch unread notifications and filter in Python
                response = (
                    db.client.table("notifications")
                    .select("id, payload")
                    .eq("user_id", user_id)
                    .is_("read_at", "null")
                    .order("created_at", desc=True)
                    .limit(50)  # Fetch more to filter by payload
                    .execute()
                )

                # Filter by payload JSONB fields in Python
                matching_notification = None
                if response and response.data:
                    for notification in response.data:
                        payload = notification.get("payload") or {}
                        if (
                            payload.get("thread_id") == event.thread_id
                            and payload.get("type") == "thread_activity"
                        ):
                            matching_notification = notification
                            break

                if matching_notification and matching_notification.get("id"):
                    # Increment existing notification
                    success = db.increment_notification_count(matching_notification["id"])
                    if success:
                        updated_count += 1
                else:
                    # Create new notification
                    success = db.create_notification(
                        user_id=user_id,
                        event_id=event.id,
                        title=f"New messages in {project_name or 'this project'}",
                        body=f"1 new message in **{thread_label}**",
                        link_url=link_url,
                        payload=thread_payload_base,
                    )
                    if success:
                        inserted_count += 1
            except Exception as e:
                logger.error(
                    "Failed to process notification for user %s: %s",
                    user_id,
                    e,
                    exc_info=True,
                )

    logger.info(
        "Event %d: created %d notifications, updated %d",
        event.id,
        inserted_count,
        updated_count,
    )
    return (inserted_count, 0)  # Chat messages don't queue emails directly


# =============================================================================
# Handler: Thread Unread Stale
# =============================================================================


def handle_thread_unread_stale(db: Database, event: DomainEvent) -> HandlerResult:
    """
    Handle thread_unread_stale event.

    IMPORTANT: This handler does NOT create in-app notifications.
    It only queues aggregated emails to nudge users about unread messages.
    """
    logger.info("Processing thread_unread_stale event %d", event.id)

    # Extract user_id from payload
    user_id = event.payload.get("user_id")
    if not user_id or not event.thread_id:
        logger.error(
            "Missing user_id or thread_id for thread_unread_stale event %d", event.id
        )
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if user_id in already_notified:
        logger.debug("User %s already notified for event %d", user_id, event.id)
        return (0, 0)

    # Get thread info
    thread_info = db.get_thread_info(event.thread_id)
    thread_topic = event.payload.get("thread_topic") or (
        thread_info.topic if thread_info else "general"
    )
    thread_label = thread_topic if thread_topic.startswith("#") else f"#{thread_topic}"

    # Get unread count
    unread_count = event.payload.get("unread_count", 1)

    # Get project name
    project_name = db.get_project_name(event.project_id) if event.project_id else "your project"

    # Build email content (no in-app notification)
    message_word = "message" if unread_count == 1 else "messages"
    link_url = (
        f"/project/workspace/{event.project_id}?tab=chat&thread={event.thread_id}"
        if event.project_id
        else "/dashboard"
    )

    # Queue aggregated email only
    success = db.queue_email(
        user_id=user_id,
        event_id=event.id,
        event_type="thread_unread_stale",
        delivery_type="aggregated",
        project_id=event.project_id,
        project_name=project_name,
        subject=f"{unread_count} unread {message_word} in {thread_label}",
        body_data={
            "thread_id": event.thread_id,
            "thread_topic": thread_topic,
            "unread_count": unread_count,
            "project_name": project_name,
            "link_url": link_url,
        },
    )

    emails_queued = 1 if success else 0
    logger.info(
        "Event %d: queued %d emails (no in-app notification)", event.id, emails_queued
    )
    return (0, emails_queued)  # 0 notifications, only email


# =============================================================================
# Handler: Meeting Invited
# =============================================================================


def handle_meeting_invited(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle meeting_invited event."""
    logger.info("Processing meeting_invited event %d", event.id)

    invited_user_id = event.payload.get("invited_user_id")
    if not invited_user_id or not event.meeting_id:
        logger.error(
            "Missing invited_user_id or meeting_id for event %d", event.id
        )
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if invited_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=invited_user_id,
        scope_type="project" if event.project_id else "global",
        scope_id=event.project_id or "",
        event_type="meeting_invited",
        channel="in_app",
        project_id=event.project_id or "",
    )
    if is_muted:
        return (0, 0)

    # Get organizer name and meeting details
    organizer_name = db.get_profile_name(event.actor_id)
    meeting_title = event.payload.get("meeting_title", "a meeting")
    start_time = event.payload.get("start_time")
    project_name = db.get_project_name(event.project_id) if event.project_id else None

    # Build notification
    title = (
        f"{organizer_name} invited you to a meeting - {project_name}"
        if project_name
        else f"{organizer_name} invited you to a meeting"
    )
    body = f"**{meeting_title}**"
    if start_time:
        body += "\n{{meeting_time}}"

    link_url = (
        f"/project/workspace/{event.project_id}?tab=meetings"
        if event.project_id
        else "/dashboard?tab=meetings"
    )

    success = db.create_notification(
        user_id=invited_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "meeting_invitation",
            "meeting_id": event.meeting_id,
            "meeting_title": meeting_title,
            "start_time": start_time,
            "organizer_id": event.actor_id,
            "organizer_name": organizer_name,
            "project_id": event.project_id,
            "project_name": project_name,
        },
    )

    inserted = 1 if success else 0
    logger.info("Event %d: created %d notifications", event.id, inserted)
    return (inserted, 0)


# =============================================================================
# Handler: Meeting Updated
# =============================================================================


def handle_meeting_updated(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle meeting_updated event."""
    logger.info("Processing meeting_updated event %d", event.id)

    if not event.meeting_id:
        logger.error("Missing meeting_id for event %d", event.id)
        return (0, 0)

    # Get participants (exclude organizer)
    try:
        response = (
            db.client.table("meeting_participants")
            .select("user_id")
            .eq("meeting_id", event.meeting_id)
            .neq("user_id", event.actor_id)
            .execute()
        )
        participants = response.data or []
    except Exception as e:
        logger.error("Failed to fetch meeting participants: %s", e, exc_info=True)
        return (0, 0)

    if not participants:
        return (0, 0)

    # Get meeting details
    organizer_name = db.get_profile_name(event.actor_id)
    meeting_title = event.payload.get("meeting_title", "a meeting")
    start_time = event.payload.get("start_time")
    changes = event.payload.get("changes", {})
    project_name = db.get_project_name(event.project_id) if event.project_id else None

    # Build notification
    title = (
        f"{organizer_name} updated a meeting - {project_name}"
        if project_name
        else f"{organizer_name} updated a meeting"
    )
    body = f"**{meeting_title}**"
    if start_time:
        body += "\nNew time: {{meeting_time}}"
    if changes.get("timeChanged"):
        body += "\n Time has been changed"
    if changes.get("participantsChanged"):
        body += "\n Participants updated"

    link_url = (
        f"/project/workspace/{event.project_id}?tab=meetings"
        if event.project_id
        else "/dashboard?tab=meetings"
    )

    already_notified = db.fetch_existing_recipients(event.id)
    inserted_count = 0

    for participant in participants:
        user_id = participant["user_id"]
        if user_id in already_notified:
            continue

        is_muted = db.check_user_preference(
            user_id=user_id,
            scope_type="project" if event.project_id else "global",
            scope_id=event.project_id or "",
            event_type="meeting_updated",
            channel="in_app",
            project_id=event.project_id or "",
        )
        if is_muted:
            continue

        success = db.create_notification(
            user_id=user_id,
            event_id=event.id,
            title=title,
            body=body,
            link_url=link_url,
            payload={
                "type": "meeting_update",
                "meeting_id": event.meeting_id,
                "meeting_title": meeting_title,
                "start_time": start_time,
                "organizer_id": event.actor_id,
                "organizer_name": organizer_name,
                "project_id": event.project_id,
                "project_name": project_name,
                "changes": changes,
            },
        )
        if success:
            inserted_count += 1

    logger.info("Event %d: created %d notifications", event.id, inserted_count)
    return (inserted_count, 0)


# =============================================================================
# Handler: Meeting Reminder
# =============================================================================


def handle_meeting_reminder(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle meeting_reminder event."""
    logger.info("Processing meeting_reminder event %d", event.id)

    if not event.meeting_id:
        logger.error("Missing meeting_id for event %d", event.id)
        return (0, 0)

    user_id = event.payload.get("user_id")
    if not user_id:
        logger.error("Missing user_id in payload for event %d", event.id)
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=user_id,
        scope_type="project" if event.project_id else "global",
        scope_id=event.project_id or "",
        event_type="meeting_reminder",
        channel="in_app",
        project_id=event.project_id or "",
    )
    if is_muted:
        return (0, 0)

    # Get meeting details
    meeting_title = event.payload.get("meeting_title", "a meeting")
    start_time = event.payload.get("start_time")
    meeting_link = event.payload.get("meeting_link")
    reminder_minutes = event.payload.get("reminder_minutes", 30)
    project_name = db.get_project_name(event.project_id) if event.project_id else None

    # Build notification
    title = f"Reminder: Meeting in {reminder_minutes} minutes"
    body = f"**{meeting_title}**"
    if start_time:
        # Format time display
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            time_display = dt.strftime("%I:%M %p")
            body += f"\nStarts at {time_display}"
        except:
            pass
    if project_name:
        body += f"\n{project_name}"

    link_url = (
        f"/project/workspace/{event.project_id}?tab=meetings"
        if event.project_id
        else "/dashboard?tab=meetings"
    )

    success = db.create_notification(
        user_id=user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "meeting_reminder",
            "meeting_id": event.meeting_id,
            "meeting_title": meeting_title,
            "start_time": start_time,
            "meeting_link": meeting_link,
            "project_id": event.project_id,
            "project_name": project_name,
            "reminder_minutes": reminder_minutes,
        },
    )

    inserted = 1 if success else 0
    logger.info("Event %d: created %d notifications", event.id, inserted)
    return (inserted, 0)


# =============================================================================
# Handler: Resume Incomplete Nudge
# =============================================================================


def handle_resume_incomplete_nudge(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle resume_incomplete_nudge event."""
    logger.info("Processing resume_incomplete_nudge event %d", event.id)

    if not event.project_id:
        logger.error("Missing project_id for event %d", event.id)
        return (0, 0)

    # Extract payload fields
    resume_type = event.payload.get("resume_type")  # "project" or "borrower"
    completion_percent = event.payload.get("completion_percent")
    nudge_tier = event.payload.get("nudge_tier")
    user_id = event.payload.get("user_id")

    if not all([resume_type, completion_percent is not None, nudge_tier, user_id]):
        logger.error("Missing required payload fields for event %d", event.id)
        return (0, 0)

    # Get project and verify user is owner
    try:
        response = (
            db.client.table("projects")
            .select("owner_org_id")
            .eq("id", event.project_id)
            .single()
            .execute()
        )
        project = response.data
    except Exception as e:
        logger.error("Failed to fetch project: %s", e, exc_info=True)
        return (0, 0)

    if not project:
        return (0, 0)

    project_name = db.get_project_name(event.project_id)

    # Verify user is org owner
    try:
        response = (
            db.client.table("org_members")
            .select("user_id")
            .eq("org_id", project["owner_org_id"])
            .eq("role", "owner")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not response.data:
            logger.debug("User %s is not project owner", user_id)
            return (0, 0)
    except Exception as e:
        logger.error("Failed to check owner status: %s", e, exc_info=True)
        return (0, 0)

    # Check for duplicate notifications
    already_notified = db.fetch_existing_recipients(event.id)
    if user_id in already_notified:
        return (0, 0)

    # Check for existing tier notification
    # Note: Supabase Python client doesn't support JSONB operators in .eq(),
    # so we fetch notifications and filter in Python
    try:
        response = (
            db.client.table("notifications")
            .select("id, payload")
            .eq("user_id", user_id)
            .limit(100)  # Fetch more to filter by payload
            .execute()
        )
        if response and response.data:
            for notification in response.data:
                payload = notification.get("payload") or {}
                if (
                    payload.get("type") == "resume_incomplete_nudge"
                    and payload.get("resume_type") == resume_type
                    and str(payload.get("nudge_tier")) == str(nudge_tier)
                    and payload.get("project_id") == event.project_id
                ):
                    logger.debug("Tier %d nudge already sent to user %s", nudge_tier, user_id)
                    return (0, 0)
    except Exception as e:
        logger.debug("Error checking tier notification: %s", e)

    # Build notification
    resume_type_label = "Project" if resume_type == "project" else "Borrower"
    title = f"Complete your {resume_type_label} Resume"
    body = f"Your {resume_type_label} resume for **{project_name}** is **{completion_percent}%** complete. Finish it to generate your OM!"
    link_url = f"/project/workspace/{event.project_id}"

    success = db.create_notification(
        user_id=user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "resume_incomplete_nudge",
            "resume_type": resume_type,
            "completion_percent": completion_percent,
            "nudge_tier": nudge_tier,
            "project_id": event.project_id,
            "project_name": project_name,
        },
    )

    # Queue immediate email
    email_success = db.queue_email(
        user_id=user_id,
        event_id=event.id,
        event_type="resume_incomplete_nudge",
        delivery_type="immediate",
        project_id=event.project_id,
        project_name=project_name,
        subject=f"Complete your {resume_type_label} Resume - {project_name}",
        body_data={
            "resume_type": resume_type,
            "resume_type_label": resume_type_label,
            "completion_percent": completion_percent,
            "nudge_tier": nudge_tier,
            "project_name": project_name,
            "link_url": link_url,
        },
    )

    inserted = 1 if success else 0
    emails_queued = 1 if email_success else 0
    logger.info(
        "Event %d: created %d notifications, queued %d emails",
        event.id,
        inserted,
        emails_queued,
    )
    return (inserted, emails_queued)


# =============================================================================
# Handler: Invite Accepted
# =============================================================================


def handle_invite_accepted(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle invite_accepted event."""
    logger.info("Processing invite_accepted event %d", event.id)

    org_id = event.org_id or event.payload.get("org_id")
    if not org_id:
        logger.error("Missing org_id for event %d", event.id)
        return (0, 0)

    # Extract payload data
    new_member_id = event.actor_id or event.payload.get("new_member_id")
    new_member_name = event.payload.get("new_member_name", "A new member")
    new_member_email = event.payload.get("new_member_email")
    org_name = event.payload.get("org_name", "your organization")

    if not new_member_id:
        logger.error("Missing new_member_id for event %d", event.id)
        return (0, 0)

    # Get org owners
    try:
        response = (
            db.client.table("org_members")
            .select("user_id")
            .eq("org_id", org_id)
            .eq("role", "owner")
            .execute()
        )
        org_owners = response.data or []
    except Exception as e:
        logger.error("Failed to fetch org owners: %s", e, exc_info=True)
        return (0, 0)

    if not org_owners:
        return (0, 0)

    # Exclude new member from recipients
    recipient_ids = [
        o["user_id"] for o in org_owners if o["user_id"] != new_member_id
    ]
    if not recipient_ids:
        return (0, 0)

    # Filter by already notified
    already_notified = db.fetch_existing_recipients(event.id)
    recipients_to_notify = [uid for uid in recipient_ids if uid not in already_notified]

    if not recipients_to_notify:
        return (0, 0)

    # Build notification
    title = f"New team member joined - {org_name}"
    body = f"**{new_member_name}** has joined **{org_name}**"
    link_url = "/team"

    inserted_count = 0
    emails_queued = 0

    for user_id in recipients_to_notify:
        is_muted = db.check_user_preference(
            user_id=user_id,
            scope_type="global",
            scope_id="",
            event_type="invite_accepted",
            channel="in_app",
            project_id="",
        )
        if is_muted:
            continue

        success = db.create_notification(
            user_id=user_id,
            event_id=event.id,
            title=title,
            body=body,
            link_url=link_url,
            payload={
                "type": "invite_accepted",
                "org_id": org_id,
                "org_name": org_name,
                "new_member_id": new_member_id,
                "new_member_name": new_member_name,
                "new_member_email": new_member_email,
            },
        )
        if success:
            inserted_count += 1

        # Queue immediate email
        email_success = db.queue_email(
            user_id=user_id,
            event_id=event.id,
            event_type="invite_accepted",
            delivery_type="immediate",
            project_id=None,
            project_name=None,
            subject=f"{new_member_name} has joined {org_name}",
            body_data={
                "org_id": org_id,
                "org_name": org_name,
                "new_member_id": new_member_id,
                "new_member_name": new_member_name,
                "new_member_email": new_member_email,
                "link_url": link_url,
            },
        )
        if email_success:
            emails_queued += 1

    logger.info(
        "Event %d: created %d notifications, queued %d emails",
        event.id,
        inserted_count,
        emails_queued,
    )
    return (inserted_count, emails_queued)


# =============================================================================
# Handler: Project Access Granted
# =============================================================================


def handle_project_access_granted(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle project_access_granted event."""
    logger.info("Processing project_access_granted event %d", event.id)

    affected_user_id = event.payload.get("affected_user_id")
    project_id = event.project_id or event.payload.get("project_id")
    project_name = event.payload.get("project_name", "a project")
    new_permission = event.payload.get("new_permission", "view")

    if not affected_user_id:
        logger.error("Missing affected_user_id for event %d", event.id)
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if affected_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=affected_user_id,
        scope_type="project",
        scope_id=project_id or "",
        event_type="project_access_granted",
        channel="in_app",
        project_id=project_id or "",
    )
    if is_muted:
        return (0, 0)

    # Build notification
    title = f"You've been added to {project_name}"
    body = f"You now have **{new_permission}** access to **{project_name}**"
    link_url = f"/project/workspace/{project_id}"

    success = db.create_notification(
        user_id=affected_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "project_access_granted",
            "project_id": project_id,
            "project_name": project_name,
            "new_permission": new_permission,
        },
    )

    # Queue immediate email
    email_success = db.queue_email(
        user_id=affected_user_id,
        event_id=event.id,
        event_type="project_access_granted",
        delivery_type="immediate",
        project_id=project_id,
        project_name=project_name,
        subject=f"You've been added to {project_name}",
        body_data={
            "project_id": project_id,
            "project_name": project_name,
            "new_permission": new_permission,
            "link_url": link_url,
        },
    )

    inserted = 1 if success else 0
    emails_queued = 1 if email_success else 0
    logger.info(
        "Event %d: created %d notifications, queued %d emails",
        event.id,
        inserted,
        emails_queued,
    )
    return (inserted, emails_queued)


# =============================================================================
# Handler: Project Access Changed
# =============================================================================


def handle_project_access_changed(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle project_access_changed event."""
    logger.info("Processing project_access_changed event %d", event.id)

    affected_user_id = event.payload.get("affected_user_id")
    project_id = event.project_id or event.payload.get("project_id")
    project_name = event.payload.get("project_name", "a project")
    old_permission = event.payload.get("old_permission", "view")
    new_permission = event.payload.get("new_permission", "view")

    if not affected_user_id:
        logger.error("Missing affected_user_id for event %d", event.id)
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if affected_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=affected_user_id,
        scope_type="project",
        scope_id=project_id or "",
        event_type="project_access_changed",
        channel="in_app",
        project_id=project_id or "",
    )
    if is_muted:
        return (0, 0)

    # Build notification
    title = f"Your access to {project_name} has changed"
    body = f"Your access changed from **{old_permission}** to **{new_permission}**"
    link_url = f"/project/workspace/{project_id}"

    success = db.create_notification(
        user_id=affected_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "project_access_changed",
            "project_id": project_id,
            "project_name": project_name,
            "old_permission": old_permission,
            "new_permission": new_permission,
        },
    )

    # Queue email only for view -> edit upgrades
    emails_queued = 0
    if old_permission == "view" and new_permission == "edit":
        email_success = db.queue_email(
            user_id=affected_user_id,
            event_id=event.id,
            event_type="project_access_changed",
            delivery_type="immediate",
            project_id=project_id,
            project_name=project_name,
            subject=f"Your access to {project_name} has been upgraded",
            body_data={
                "project_id": project_id,
                "project_name": project_name,
                "old_permission": old_permission,
                "new_permission": new_permission,
                "link_url": link_url,
            },
        )
        if email_success:
            emails_queued = 1

    inserted = 1 if success else 0
    logger.info(
        "Event %d: created %d notifications, queued %d emails",
        event.id,
        inserted,
        emails_queued,
    )
    return (inserted, emails_queued)


# =============================================================================
# Handler: Project Access Revoked
# =============================================================================


def handle_project_access_revoked(db: Database, event: DomainEvent) -> HandlerResult:
    """Handle project_access_revoked event."""
    logger.info("Processing project_access_revoked event %d", event.id)

    affected_user_id = event.payload.get("affected_user_id")
    project_id = event.project_id or event.payload.get("project_id")
    project_name = event.payload.get("project_name", "a project")

    if not affected_user_id:
        logger.error("Missing affected_user_id for event %d", event.id)
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if affected_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=affected_user_id,
        scope_type="global",
        scope_id="",
        event_type="project_access_revoked",
        channel="in_app",
        project_id="",
    )
    if is_muted:
        return (0, 0)

    # Build notification - link to dashboard since they lost access
    title = f"Access removed - {project_name}"
    body = f"Your access to **{project_name}** has been removed"
    link_url = "/dashboard"

    success = db.create_notification(
        user_id=affected_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "project_access_revoked",
            "project_id": project_id,
            "project_name": project_name,
        },
    )

    inserted = 1 if success else 0
    logger.info("Event %d: created %d notifications", event.id, inserted)
    return (inserted, 0)


# =============================================================================
# Handler: Document Permission Granted
# =============================================================================


def handle_document_permission_granted(
    db: Database, event: DomainEvent
) -> HandlerResult:
    """Handle document_permission_granted event."""
    logger.info("Processing document_permission_granted event %d", event.id)

    affected_user_id = event.payload.get("affected_user_id")
    project_id = event.project_id or event.payload.get("project_id")
    project_name = event.payload.get("project_name", "a project")
    resource_id = event.resource_id or event.payload.get("resource_id")
    resource_name = event.payload.get("resource_name", "a document")
    new_permission = event.payload.get("new_permission", "view")

    if not affected_user_id or not resource_id or not project_id:
        logger.error("Missing required fields for event %d", event.id)
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if affected_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=affected_user_id,
        scope_type="project",
        scope_id=project_id,
        event_type="document_permission_granted",
        channel="in_app",
        project_id=project_id,
    )
    if is_muted:
        return (0, 0)

    # Build notification
    title = f"Document access granted - {project_name}"
    body = f'You now have **{new_permission}** access to **"{resource_name}"** in **{project_name}**'
    link_url = f"/project/workspace/{project_id}?resourceId={resource_id}"

    success = db.create_notification(
        user_id=affected_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "document_permission_granted",
            "project_id": project_id,
            "project_name": project_name,
            "resource_id": resource_id,
            "resource_name": resource_name,
            "new_permission": new_permission,
        },
    )

    inserted = 1 if success else 0
    logger.info("Event %d: created %d notifications", event.id, inserted)
    return (inserted, 0)


# =============================================================================
# Handler: Document Permission Changed
# =============================================================================


def handle_document_permission_changed(
    db: Database, event: DomainEvent
) -> HandlerResult:
    """Handle document_permission_changed event (view -> edit upgrades only)."""
    logger.info("Processing document_permission_changed event %d", event.id)

    affected_user_id = event.payload.get("affected_user_id")
    project_id = event.project_id or event.payload.get("project_id")
    project_name = event.payload.get("project_name", "a project")
    resource_id = event.resource_id or event.payload.get("resource_id")
    resource_name = event.payload.get("resource_name", "a document")
    old_permission = event.payload.get("old_permission", "view")
    new_permission = event.payload.get("new_permission", "view")

    if not affected_user_id or not resource_id or not project_id:
        logger.error("Missing required fields for event %d", event.id)
        return (0, 0)

    # Only notify for view -> edit upgrades
    if old_permission != "view" or new_permission != "edit":
        logger.debug(
            "Skipping notification - not a view->edit upgrade (%s -> %s)",
            old_permission,
            new_permission,
        )
        return (0, 0)

    # Check if already notified
    already_notified = db.fetch_existing_recipients(event.id)
    if affected_user_id in already_notified:
        return (0, 0)

    # Check preferences
    is_muted = db.check_user_preference(
        user_id=affected_user_id,
        scope_type="project",
        scope_id=project_id,
        event_type="document_permission_changed",
        channel="in_app",
        project_id=project_id,
    )
    if is_muted:
        return (0, 0)

    # Build notification
    title = f"Document access upgraded - {project_name}"
    body = f'Your access to **"{resource_name}"** has been upgraded from **view** to **edit** in **{project_name}**'
    link_url = f"/project/workspace/{project_id}?resourceId={resource_id}"

    success = db.create_notification(
        user_id=affected_user_id,
        event_id=event.id,
        title=title,
        body=body,
        link_url=link_url,
        payload={
            "type": "document_permission_changed",
            "project_id": project_id,
            "project_name": project_name,
            "resource_id": resource_id,
            "resource_name": resource_name,
            "old_permission": old_permission,
            "new_permission": new_permission,
        },
    )

    inserted = 1 if success else 0
    logger.info("Event %d: created %d notifications", event.id, inserted)
    return (inserted, 0)
