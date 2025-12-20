"""Email body builders for email-notifications service."""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import Config
from database import DomainEvent, PendingEmail

logger = logging.getLogger(__name__)

CTA_URL = "https://capmatch.com/dashboard"
MANAGE_PREFS_URL = "https://capmatch.com/settings/notifications"


@dataclass
class UserContext:
    user_id: str
    email: str
    full_name: Optional[str]


def _get_first_name(full_name: Optional[str]) -> str:
    """Extract first name from full_name, or return empty string."""
    if not full_name:
        return ""
    # Split by space and take first part
    parts = full_name.strip().split()
    return parts[0] if parts else ""


def _template_candidates() -> list[Path]:
    """Return possible template locations, ordered by preference."""
    candidates: list[Path] = []

    configured_path = Path(Config.DIGEST_TEMPLATE_PATH).expanduser()
    if not configured_path.is_absolute():
        # Interpret relative paths as relative to the application root (/app in Docker, or service dir locally)
        app_root = Path(__file__).resolve().parent
        configured_path = (app_root / configured_path).resolve()
    candidates.append(configured_path)

    # In Docker: /app/packages/email-templates/dist/digest-template.html
    docker_path = Path("/app/packages/email-templates/dist/digest-template.html")
    if docker_path not in candidates:
        candidates.append(docker_path)

    # Actual location: relative to service directory (email-templates, not packages/email-templates)
    service_dir_actual = Path(__file__).resolve().parent / "email-templates" / "dist" / "digest-template.html"
    if service_dir_actual not in candidates:
        candidates.append(service_dir_actual)

    # Fallback: look for template relative to repo root (for local dev)
    repo_root_fallback = Path(__file__).resolve().parent.parent.parent / "packages" / "email-templates" / "dist" / "digest-template.html"
    if repo_root_fallback not in candidates:
        candidates.append(repo_root_fallback)

    # Another fallback: relative to current service directory (old path)
    service_dir_fallback = Path(__file__).resolve().parent / "packages" / "email-templates" / "dist" / "digest-template.html"
    if service_dir_fallback not in candidates:
        candidates.append(service_dir_fallback)

    return candidates


def _load_template_html() -> tuple[str, Optional[Path]]:
    """Load the digest template HTML from the first available candidate path."""
    for candidate in _template_candidates():
        try:
            if not candidate.exists():
                logger.debug("Digest template not found at %s", candidate)
                continue
            html = candidate.read_text(encoding="utf-8")
            if not html or not html.strip():
                logger.warning("Digest template at %s is empty", candidate)
                continue
            logger.info("Loaded digest template from %s (%d bytes)", candidate, len(html))
            return html, candidate
        except FileNotFoundError:
            logger.debug("Digest template not found at %s", candidate)
        except Exception:
            logger.exception("Failed reading digest template at %s", candidate)
    logger.warning("No digest template found in any candidate location. Emails will use fallback HTML.")
    return "", None


TEMPLATE_HTML, TEMPLATE_PATH = _load_template_html()


def message_icon() -> str:
    return '<span aria-hidden="true" style="font-size:18px;line-height:1;">✉️</span>'


def document_icon() -> str:
    return '<span aria-hidden="true" style="font-size:18px;line-height:1;">📄</span>'


def render_project_card(project_name: str, event_types: Dict[str, List[DomainEvent]], user_id: str) -> str:
    """Render a project card with events for the template."""
    rows = []
    
    if "chat_message_sent" in event_types:
        messages = event_types["chat_message_sent"]
        count = len(messages)
        rows.append(
            f'<p style="display:flex;align-items:center;gap:10px;font-weight:500;color:#1F2937;margin:6px 0;"><span>{message_icon()}</span><span><strong>{count}</strong> new message(s)</span></p>'
        )

    if "document_uploaded" in event_types:
        docs = event_types["document_uploaded"]
        count = len(docs)
        # List document names if available
        doc_names = [d.payload.get("fileName") or "New document" for d in docs[:5]]  # Limit to 5
        if len(docs) > 5:
            doc_names.append(f"... and {len(docs) - 5} more")
        doc_list = ", ".join(doc_names)
        rows.append(
            f'<p style="display:flex;align-items:center;gap:10px;font-weight:500;color:#1F2937;margin:6px 0;"><span>{document_icon()}</span><span><strong>{count}</strong> new document(s): {doc_list}</span></p>'
        )

    if not rows:
        rows.append(
            '<p style="color:#94A3B8;font-size:14px;margin:6px 0;">No activity in this window.</p>'
        )

    return (
        '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
        f'<p style="font-size:18px;color:#3B82F6;margin:0 0 12px 0;font-weight:600;">{project_name}</p>'
        + "".join(rows)
        + "</div>"
    )


def build_preview_text(events: List[DomainEvent]) -> str:
    """Build preview text for email clients."""
    total_events = len(events)
    projects = {e.project_id for e in events if e.project_id}
    return f"{total_events} update(s) across {len(projects)} project(s)"


def build_hourly_digest(
    user: UserContext,
    events: List[DomainEvent],
    project_names: Dict[str, str],
    thread_names: Dict[str, str],
    window_start: datetime,
    window_end: datetime,
) -> Tuple[str, str]:
    """
    Build HTML and text bodies for an hourly digest email using the template.

    Sections:
      - Documents added
      - Channel / thread messages
    """
    if not events:
        return "", ""

    # Group events by project and type
    by_project: Dict[str, Dict[str, List[DomainEvent]]] = defaultdict(lambda: defaultdict(list))
    
    for event in events:
        project_id = event.project_id
        # For messages, try to get project_id from thread if not directly on event
        if event.event_type == "chat_message_sent" and not project_id and event.thread_id:
            # We'll need to look this up, but for now use a fallback
            project_id = "general"  # Will be handled as "General" project
        
        if project_id:
            if event.event_type == "document_uploaded":
                by_project[project_id]["document_uploaded"].append(event)
            elif event.event_type == "chat_message_sent":
                by_project[project_id]["chat_message_sent"].append(event)

    first_name = _get_first_name(user.full_name)
    user_name = first_name if first_name else "there"
    
    # Format time window nicely (e.g., "December 16, 2025, 2:00 PM - 3:00 PM")
    time_str = f"{window_start.strftime('%B %d, %Y, %I:%M %p')} - {window_end.strftime('%I:%M %p')}"

    # Build HTML using template
    if TEMPLATE_HTML:
        html_sections = []
        for project_id, event_types in by_project.items():
            if project_id == "general":
                project_name = "General"
            else:
                project_name = project_names.get(project_id, "A project")
            html_sections.append(render_project_card(project_name, event_types, user.user_id))

        # Build preview text (keep it short to avoid expand button issues)
        preview_text = f"{len(events)} update(s) across {len(by_project)} project(s)"
        
        # Replace preview text and remove the entire preview div to prevent expand button
        # Some email clients (like Gmail) show data-skip-in-text divs as collapsible "expand content" sections
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        
        # Remove the preview text div entirely to prevent expand button in Gmail and other clients
        # The preview text div has data-skip-in-text="true" which some clients render as collapsible
        html_body = re.sub(
            r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*',
            '',
            html_body,
            flags=re.DOTALL
        )
        
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", time_str)  # Use time window instead of date
            .replace("Daily Digest", "Hourly Activity Summary")  # Change title
            .replace("here's what happened on", "here's what happened from")  # Adjust text for time window
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", "\n".join(html_sections) if html_sections else '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;"><p style="color:#94A3B8;font-size:14px;margin:6px 0;">No new activity in this window.</p></div>')
        )
    else:
        logger.warning("Template not found, falling back to simple HTML")
        # Fallback to simple HTML if template not found
        html_body = f"<h1>Your CapMatch Hourly Activity Summary</h1><p>Hi {user_name},</p><p>Time window: {time_str}</p>"

    # Build text body
    text_lines: List[str] = []
    text_lines.append("Your CapMatch Hourly Activity Summary")
    text_lines.append("")
    text_lines.append(f"Hi {user_name}, here's what happened from {time_str}")
    text_lines.append("")

    for project_id, event_types in by_project.items():
        if project_id == "general":
            project_name = "General"
        else:
            project_name = project_names.get(project_id, "A project")
        text_lines.append(f"{project_name}")
        text_lines.append("-" * len(project_name))

        if "chat_message_sent" in event_types:
            count = len(event_types["chat_message_sent"])
            text_lines.append(f"- {count} new message(s)")

        if "document_uploaded" in event_types:
            docs = event_types["document_uploaded"]
            count = len(docs)
            text_lines.append(f"- {count} new document(s)")
            for doc in docs[:5]:  # List first 5
                file_name = doc.payload.get("fileName") or "New document"
                text_lines.append(f"  • {file_name}")
            if len(docs) > 5:
                text_lines.append(f"  ... and {len(docs) - 5} more")

        text_lines.append("")

    text_lines.append(f"Open CapMatch: {CTA_URL}")
    text_lines.append(f"Manage preferences: {MANAGE_PREFS_URL}")

    text_body = "\n".join(text_lines)

    return html_body, text_body


def build_instant_email(
    event: DomainEvent,
    recipient: UserContext,
    project_name: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Build HTML/text + subject for an instant email based on event type using the template.

    Returns (subject, html_body, text_body).
    """
    etype = event.event_type
    first_name = _get_first_name(recipient.full_name)
    user_name = first_name if first_name else "there"

    # Build content based on event type
    if etype == "resume_incomplete_nudge":
        resume_type = event.payload.get("resume_type") or "project"
        completion = event.payload.get("completion_percent") or 0
        resume_label = "Project" if resume_type == "project" else "Borrower"
        project_label = project_name or "your project"

        subject = f"Complete your {resume_label} resume for {project_label}"
        message_html = (
            f"<p>Your {resume_label} resume for <strong>{project_label}</strong> is "
            f"<strong>{completion}%</strong> complete. Finish it to generate your OM!</p>"
        )
        message_text = (
            f"Your {resume_label} resume for {project_label} is {completion}% complete. "
            "Finish it to generate your OM!"
        )

    elif etype == "invite_accepted":
        new_user_email = event.payload.get("user_email") or "A user"
        subject = f"{new_user_email} just joined your CapMatch org"
        message_html = (
            f"<p><strong>{new_user_email}</strong> has accepted their invite and joined your org.</p>"
        )
        message_text = f"{new_user_email} has accepted their invite and joined your org."

    elif etype == "project_member_added":
        project_label = project_name or "your project"
        subject = f"You've been added to {project_label} on CapMatch"
        message_html = (
            f"<p>You've been added as a member to <strong>{project_label}</strong> on CapMatch.</p>"
        )
        message_text = f"You've been added as a member to {project_label} on CapMatch."

    elif etype == "chat_thread_participant_added":
        thread_topic = event.payload.get("thread_topic") or "a thread"
        thread_name = thread_topic if thread_topic.startswith("#") else f"#{thread_topic}"
        actor_name = event.payload.get("actor_name") or "Someone"
        project_label = project_name or None
        
        if project_label:
            subject = f"You've been added to {thread_name} - {project_label}"
            message_html = (
                f"<p><strong>{actor_name}</strong> added you to <strong>{thread_name}</strong> in "
                f"<strong>{project_label}</strong>.</p>"
            )
            message_text = f"{actor_name} added you to {thread_name} in {project_label}."
        else:
            subject = f"You've been added to {thread_name}"
            message_html = (
                f"<p><strong>{actor_name}</strong> added you to <strong>{thread_name}</strong>.</p>"
            )
            message_text = f"{actor_name} added you to {thread_name}."

    else:
        # Fallback generic email
        subject = "CapMatch Notification"
        message_html = f"<p>You have a new notification: {etype}</p>"
        message_text = f"You have a new notification: {etype}"

    # Build HTML using template
    if TEMPLATE_HTML:
        # Create a simple content card for instant emails
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )

        # Build preview text
        preview_text = message_text[:100]  # First 100 chars for preview

        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        
        # Remove the preview text div to prevent expand button
        html_body = re.sub(
            r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*',
            '',
            html_body,
            flags=re.DOTALL
        )
        
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")  # Not needed for instant emails
            .replace("Daily Digest", "CapMatch Notification")  # Change title
            .replace("Important activity across your projects.", "You have a new notification.")  # Change subtitle
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        
        # Update hero section to show simple greeting without date
        # Match: "Hey <span>USER_NAME</span>, here's what happened on <strong>DATE</strong>."
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        logger.warning("Template not found, falling back to simple HTML")
        html_body = f"<h1>CapMatch Notification</h1><p>Hi {user_name},</p>{message_html}"

    # Build text body
    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}\nManage preferences: {MANAGE_PREFS_URL}"

    return subject, html_body, text_body


# =============================================================================
# NEW: Rendering from pending_emails body_data
# =============================================================================

def render_email_from_body_data(
    pending_email: PendingEmail,
    user_profile: Optional[Dict[str, Any]] = None
) -> Tuple[str, str]:
    """
    Render email HTML and text from pending_email.body_data.

    Args:
        pending_email: PendingEmail with subject and body_data
        user_profile: Optional user profile (for personalization)

    Returns:
        (html_body, text_body)
    """
    body_data = pending_email.body_data
    event_type = pending_email.event_type
    delivery_type = pending_email.delivery_type

    # Extract common fields
    first_name = _get_first_name(user_profile.get("full_name")) if user_profile else ""

    if delivery_type == "immediate":
        return _render_immediate_email(event_type, body_data, first_name)
    elif delivery_type == "aggregated":
        return _render_aggregated_email(event_type, body_data, first_name)
    else:
        raise ValueError(f"Unknown delivery_type: {delivery_type}")


def _render_immediate_email(event_type: str, body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """Render instant notification emails (resume_incomplete_nudge, invite_accepted, etc.)"""

    if event_type == "resume_incomplete_nudge":
        return _render_resume_nudge(body_data, first_name)
    elif event_type == "invite_accepted":
        return _render_invite_accepted(body_data, first_name)
    elif event_type == "project_access_granted":
        return _render_project_access_granted(body_data, first_name)
    elif event_type == "project_access_changed":
        return _render_project_access_changed(body_data, first_name)
    elif event_type == "chat_thread_participant_added":
        return _render_chat_thread_participant_added(body_data, first_name)
    else:
        logger.warning(f"Unknown immediate event_type: {event_type}")
        return _render_generic_email(body_data, first_name)


def _render_aggregated_email(event_type: str, body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """Render aggregated digest emails (document_uploaded, thread_unread_stale)"""

    if event_type == "document_uploaded":
        return _render_document_uploaded(body_data, first_name)
    elif event_type == "thread_unread_stale":
        return _render_thread_unread_stale(body_data, first_name)
    else:
        logger.warning(f"Unknown aggregated event_type: {event_type}")
        return _render_generic_email(body_data, first_name)


def _render_resume_nudge(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render resume_incomplete_nudge email.

    Expected body_data:
    {
        "resume_type": "project" | "borrower",
        "resume_type_label": "Project" | "Borrower",
        "completion_percent": 45,
        "nudge_tier": 1,
        "project_name": "Downtown Office Tower",
        "link_url": "/project/workspace/{project_id}"
    }
    """
    resume_label = body_data.get("resume_type_label", "Project")
    completion = body_data.get("completion_percent", 0)
    project_name = body_data.get("project_name", "your project")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p>Your {resume_label} resume for <strong>{project_name}</strong> is "
        f"<strong>{completion}%</strong> complete. Finish it to generate your OM!</p>"
    )
    message_text = (
        f"Your {resume_label} resume for {project_name} is {completion}% complete. "
        f"Finish it to generate your OM!"
    )

    # Build HTML using template
    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(
            r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*',
            '',
            html_body,
            flags=re.DOTALL
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting in a table structure (matching template layout)
        greeting_html = f'''<table
                              align="center"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="margin:0 0 24px 0">
                              <tbody>
                                <tr>
                                  <td style="text-align:center;">
                                    <p style="font-size:17px;line-height:26px;color:#111827;margin:0;font-weight:400;">
                                      Hi <span style="color:#111827;font-weight:600">{user_name}</span>,
                                    </p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>'''
        
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "CapMatch Notification")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", f"{CTA_URL}{link_url}")
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", greeting_html + '\n' + content_card)
        )
    else:
        html_body = f"<h1>CapMatch Notification</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}{link_url}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_invite_accepted(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render invite_accepted email.

    Expected body_data:
    {
        "org_id": "{org_id}",
        "org_name": "Acme Capital",
        "new_member_id": "{user_id}",
        "new_member_name": "Jane Doe",
        "new_member_email": "jane@example.com",
        "link_url": "/team"
    }
    """
    new_member_name = body_data.get("new_member_name", body_data.get("new_member_email", "A user"))
    org_name = body_data.get("org_name", "your organization")
    link_url = body_data.get("link_url", "/team")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p><strong>{new_member_name}</strong> has accepted their invite and joined "
        f"<strong>{org_name}</strong>.</p>"
    )
    message_text = (
        f"{new_member_name} has accepted their invite and joined {org_name}."
    )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "New Team Member")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", f"{CTA_URL}{link_url}")
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>New Team Member</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}{link_url}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_project_access_granted(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render project_access_granted email.

    Expected body_data:
    {
        "project_id": "{project_id}",
        "project_name": "Downtown Office Tower",
        "new_permission": "edit",
        "link_url": "/project/workspace/{project_id}"
    }
    """
    project_name = body_data.get("project_name", "a project")
    permission = body_data.get("new_permission", "access")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p>You've been granted <strong>{permission}</strong> access to "
        f"<strong>{project_name}</strong>.</p>"
    )
    message_text = (
        f"You've been granted {permission} access to {project_name}."
    )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "Project Access Granted")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", f"{CTA_URL}{link_url}")
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>Project Access Granted</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_project_access_changed(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render project_access_changed email (view→edit upgrades).

    Expected body_data:
    {
        "project_id": "{project_id}",
        "project_name": "Downtown Office Tower",
        "old_permission": "view",
        "new_permission": "edit",
        "link_url": "/project/workspace/{project_id}"
    }
    """
    project_name = body_data.get("project_name", "a project")
    old_perm = body_data.get("old_permission", "view")
    new_perm = body_data.get("new_permission", "edit")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p>Your access to <strong>{project_name}</strong> has been upgraded from "
        f"<strong>{old_perm}</strong> to <strong>{new_perm}</strong>.</p>"
    )
    message_text = (
        f"Your access to {project_name} has been upgraded from {old_perm} to {new_perm}."
    )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "Project Access Updated")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", f"{CTA_URL}{link_url}")
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>Project Access Updated</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}{link_url}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_chat_thread_participant_added(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render chat_thread_participant_added email.

    Expected body_data:
    {
        "thread_id": "{thread_id}",
        "thread_name": "General",
        "thread_label": "#General",
        "actor_id": "{actor_id}",
        "actor_name": "John Smith",
        "project_id": "{project_id}",
        "project_name": "Downtown Office Tower",
        "link_url": "/project/workspace/{project_id}?threadId={thread_id}"
    }
    """
    thread_label = body_data.get("thread_label", body_data.get("thread_name", "a thread"))
    actor_name = body_data.get("actor_name", "Someone")
    project_name = body_data.get("project_name")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    if project_name:
        message_html = (
            f"<p><strong>{actor_name}</strong> added you to <strong>{thread_label}</strong> in "
            f"<strong>{project_name}</strong>.</p>"
        )
        message_text = (
            f"{actor_name} added you to {thread_label} in {project_name}."
        )
    else:
        message_html = (
            f"<p><strong>{actor_name}</strong> added you to <strong>{thread_label}</strong>.</p>"
        )
        message_text = (
            f"{actor_name} added you to {thread_label}."
        )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "Added to Chat Thread")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", f"{CTA_URL}{link_url}")
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>Added to Chat Thread</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}{link_url}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_document_uploaded(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render document_uploaded email.

    Expected body_data:
    {
        "file_name": "financial_statements.pdf",
        "project_name": "Downtown Office Tower",
        "uploader_name": "John Smith",
        "resource_id": "{resource_id}",
        "link_url": "/project/workspace/{project_id}?resourceId={resource_id}"
    }
    """
    file_name = body_data.get("file_name", "a document")
    project_name = body_data.get("project_name", "a project")
    uploader_name = body_data.get("uploader_name", "Someone")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p><strong>{uploader_name}</strong> uploaded <strong>{file_name}</strong> to "
        f"<strong>{project_name}</strong>.</p>"
        f'<p><a href="{CTA_URL}{link_url}" style="color:#3B82F6;text-decoration:underline;">View document →</a></p>'
    )
    message_text = (
        f"{uploader_name} uploaded {file_name} to {project_name}.\n\n"
        f"View document: {CTA_URL}{link_url}"
    )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'<p style="font-size:18px;color:#3B82F6;margin:0 0 12px 0;font-weight:600;">{project_name}</p>'
            f'<p style="display:flex;align-items:center;gap:10px;font-weight:500;color:#1F2937;margin:6px 0;">'
            f'<span>{document_icon()}</span><span>New document: {file_name}</span></p>'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "New Document")
            .replace("Important activity across your projects.", "A new document has been uploaded.")
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>New Document</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_thread_unread_stale(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """
    Render thread_unread_stale email.

    Expected body_data:
    {
        "thread_id": "{thread_id}",
        "thread_topic": "Project Discussion",
        "unread_count": 5,
        "project_name": "Downtown Office Tower",
        "link_url": "/project/workspace/{project_id}?thread={thread_id}"
    }
    """
    thread_topic = body_data.get("thread_topic", "a thread")
    unread_count = body_data.get("unread_count", 0)
    project_name = body_data.get("project_name", "a project")
    link_url = body_data.get("link_url", "/dashboard")
    user_name = first_name if first_name else "there"

    message_html = (
        f"<p>You have <strong>{unread_count} unread message(s)</strong> in "
        f"<strong>{thread_topic}</strong> on <strong>{project_name}</strong>.</p>"
        f'<p><a href="{CTA_URL}{link_url}" style="color:#3B82F6;text-decoration:underline;">View messages →</a></p>'
    )
    message_text = (
        f"You have {unread_count} unread message(s) in {thread_topic} on {project_name}.\n\n"
        f"View messages: {CTA_URL}{link_url}"
    )

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'<p style="font-size:18px;color:#3B82F6;margin:0 0 12px 0;font-weight:600;">{project_name}</p>'
            f'<p style="display:flex;align-items:center;gap:10px;font-weight:500;color:#1F2937;margin:6px 0;">'
            f'<span>{message_icon()}</span><span>{unread_count} unread message(s) in {thread_topic}</span></p>'
            '</div>'
        )
        preview_text = message_text[:100]
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "Unread Messages")
            .replace("Important activity across your projects.", "You have unread messages.")
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>Unread Messages</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


def _render_generic_email(body_data: Dict[str, Any], first_name: str) -> Tuple[str, str]:
    """Fallback generic email renderer."""
    user_name = first_name if first_name else "there"
    message_html = "<p>You have a new notification from CapMatch.</p>"
    message_text = "You have a new notification from CapMatch."

    if TEMPLATE_HTML:
        content_card = (
            '<div style="background:#F8FAFF;border-radius:20px;border:1px solid #BFDBFE;padding:24px;margin-bottom:16px;">'
            f'{message_html}'
            '</div>'
        )
        preview_text = message_text
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        html_body = re.sub(r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*', '', html_body, flags=re.DOTALL)
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", "")
            .replace("Daily Digest", "CapMatch Notification")
            .replace("Important activity across your projects.", "You have a new notification.")
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", content_card)
        )
        # Remove the entire hero box (light blue background) for instant emails
        # Match the hero table and all its nested content
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        # Add simple greeting before the content sections (where PROJECT_SECTIONS will be inserted)
        greeting_html = f'<p style="font-size:17px;line-height:26px;color:#111827;margin:0 0 24px 0;text-align:center;">Hi <span style="color:#111827;font-weight:600">{user_name}</span>,</p>'
        # Insert greeting before the PROJECT_SECTIONS placeholder
        html_body = html_body.replace('<!--PROJECT_SECTIONS-->', greeting_html + '\n<!--PROJECT_SECTIONS-->')
    else:
        html_body = f"<h1>CapMatch Notification</h1><p>Hi {user_name},</p>{message_html}"

    text_body = f"Hi {user_name},\n\n{message_text}\n\nOpen CapMatch: {CTA_URL}\nManage preferences: {MANAGE_PREFS_URL}"
    return html_body, text_body


# =============================================================================
# Digest Aggregation Functions
# =============================================================================

def build_aggregated_digest(
    pending_emails: List[PendingEmail],
    user_profile: Dict[str, Any]
) -> Tuple[str, str, str]:
    """
    Build a single digest email from multiple pending_emails for one user using the template.

    Groups by project_id, then event_type within each project.
    Returns (subject, html_body, text_body)

    Args:
        pending_emails: List of PendingEmail objects for same user
        user_profile: User profile with full_name, email

    Returns:
        (subject, html_body, text_body)
    """
    if not pending_emails:
        raise ValueError("Cannot build digest from empty list")

    first_name = _get_first_name(user_profile.get("full_name", ""))
    user_name = first_name if first_name else "there"

    # Group by project_id
    by_project: Dict[Optional[str], List[PendingEmail]] = {}
    for email in pending_emails:
        project_id = email.project_id
        if project_id not in by_project:
            by_project[project_id] = []
        by_project[project_id].append(email)

    # Build project cards using template style
    project_cards = []
    for project_id, project_emails in by_project.items():
        project_name = project_emails[0].project_name or "Unknown Project"

        # Group by event_type within project
        by_event: Dict[str, List[PendingEmail]] = {}
        for email in project_emails:
            event_type = email.event_type
            if event_type not in by_event:
                by_event[event_type] = []
            by_event[event_type].append(email)

        # Build sections for this project with proper spacing
        sections = []
        
        for event_type, event_emails in by_event.items():
            if event_type == "document_uploaded":
                count = len(event_emails)
                # Build document list with bullet points
                doc_items = []
                for email in event_emails[:10]:  # Show up to 10 documents
                    doc_name = email.body_data.get("file_name", "New document")
                    uploader_name = email.body_data.get("uploader_name", "Someone")
                    doc_items.append(
                        f'<li style="margin:8px 0;color:#1F2937;line-height:1.5;"><strong>{doc_name}</strong> uploaded by {uploader_name}</li>'
                    )
                if len(event_emails) > 10:
                    doc_items.append(
                        f'<li style="margin:8px 0;color:#6B7280;font-style:italic;">... and {len(event_emails) - 10} more</li>'
                    )
                
                sections.append(f'''
                    <div style="margin-bottom:20px;">
                        <h3 style="color:#3B82F6;font-size:16px;font-weight:600;margin:0 0 12px 0;">New Documents</h3>
                        <ul style="margin:0;padding-left:20px;list-style:none;">
                            {''.join(doc_items)}
                        </ul>
                    </div>
                ''')
                
            elif event_type == "thread_unread_stale":
                total_unread = sum(e.body_data.get("unread_count", 1) for e in event_emails)
                # Build thread list with bullet points
                thread_items = []
                for email in event_emails[:10]:  # Show up to 10 threads
                    thread_topic = email.body_data.get("thread_topic", "Discussion")
                    unread_count = email.body_data.get("unread_count", 1)
                    thread_items.append(
                        f'<li style="margin:8px 0;color:#1F2937;line-height:1.5;"><strong>{thread_topic}</strong> ({unread_count} unread)</li>'
                    )
                if len(event_emails) > 10:
                    thread_items.append(
                        f'<li style="margin:8px 0;color:#6B7280;font-style:italic;">... and {len(event_emails) - 10} more</li>'
                    )
                
                sections.append(f'''
                    <div style="margin-bottom:20px;">
                        <h3 style="color:#3B82F6;font-size:16px;font-weight:600;margin:0 0 12px 0;">Unread Messages ({total_unread} total)</h3>
                        <ul style="margin:0;padding-left:20px;list-style:none;">
                            {''.join(thread_items)}
                        </ul>
                    </div>
                ''')

        if not sections:
            sections.append(
                '<div style="margin-bottom:20px;"><p style="color:#94A3B8;font-size:14px;margin:0;">No activity in this project.</p></div>'
            )

        # Build project card with proper spacing (light blue background)
        project_card = (
            '<div style="background:#F8FAFF;border:1px solid #BFDBFE;border-radius:8px;padding:20px;margin-bottom:20px;">'
            f'<h2 style="font-size:18px;font-weight:600;color:#111827;margin:0 0 16px 0;">{project_name}</h2>'
            + "".join(sections)
            + "</div>"
        )
        project_cards.append(project_card)

    # Determine subject line
    total_updates = len(pending_emails)
    if total_updates == 1:
        subject = pending_emails[0].subject
    else:
        subject = f"Your CapMatch Updates ({total_updates} new updates)"

    # Build HTML using template
    if TEMPLATE_HTML:
        # Get current date for the digest
        from datetime import datetime
        digest_date = datetime.now().strftime("%B %d, %Y")
        
        # Build preview text
        preview_text = f"{total_updates} update(s) across {len(by_project)} project(s)"
        
        html_body = TEMPLATE_HTML.replace("{{PREVIEW_TEXT}}", preview_text)
        
        # Remove the preview text div to prevent expand button
        html_body = re.sub(
            r'<div[^>]*data-skip-in-text="true"[^>]*>.*?</div>\s*',
            '',
            html_body,
            flags=re.DOTALL
        )
        
        # Remove the entire hero box (light blue background) for aggregated emails
        hero_table_pattern = r'<table[^>]*class="hero"[^>]*>.*?</table>\s*'
        html_body = re.sub(hero_table_pattern, '', html_body, flags=re.DOTALL)
        
        html_body = (
            html_body.replace("{{USER_NAME}}", user_name)
            .replace("{{DIGEST_DATE}}", digest_date)
            .replace("Daily Digest", "Your CapMatch Updates")
            .replace("Important activity across your projects.", f"Hey {user_name}, here's what you missed:")
            .replace("{{CTA_URL}}", CTA_URL)
            .replace("{{MANAGE_PREFS_URL}}", MANAGE_PREFS_URL)
            .replace("<!--PROJECT_SECTIONS-->", "\n".join(project_cards) if project_cards else '<div style="background:#F8FAFF;border:1px solid #BFDBFE;border-radius:8px;padding:20px;margin-bottom:20px;"><p style="color:#94A3B8;font-size:14px;margin:0;">No new activity.</p></div>')
        )
    else:
        logger.warning("Template not found, falling back to simple HTML")
        # Fallback to simple HTML if template not found
        html_body = f"<h1>Your CapMatch Updates</h1><p>Hi {user_name},</p><p>Here's a summary of your recent CapMatch activity:</p>"
        html_body += "\n".join(project_cards)

    # Build plain text version
    text_lines: List[str] = []
    text_lines.append("Your CapMatch Updates")
    text_lines.append("")
    text_lines.append(f"Hey {user_name}, here's what you missed:")
    text_lines.append("")

    for project_id, project_emails in by_project.items():
        project_name = project_emails[0].project_name or "Unknown Project"
        text_lines.append(f"{project_name}")
        text_lines.append("-" * len(project_name))

        # Group by event type for text
        by_event: Dict[str, List[PendingEmail]] = {}
        for email in project_emails:
            event_type = email.event_type
            if event_type not in by_event:
                by_event[event_type] = []
            by_event[event_type].append(email)

        for event_type, event_emails in by_event.items():
            if event_type == "document_uploaded":
                count = len(event_emails)
                text_lines.append(f"- {count} new document(s)")
                for email in event_emails[:5]:
                    doc_name = email.body_data.get("file_name", "New document")
                    text_lines.append(f"  • {doc_name}")
                if len(event_emails) > 5:
                    text_lines.append(f"  ... and {len(event_emails) - 5} more")
            elif event_type == "thread_unread_stale":
                total_unread = sum(e.body_data.get("unread_count", 1) for e in event_emails)
                text_lines.append(f"- {total_unread} unread message(s)")
                for email in event_emails[:3]:
                    thread_topic = email.body_data.get("thread_topic", "Discussion")
                    unread_count = email.body_data.get("unread_count", 1)
                    text_lines.append(f"  • {thread_topic} ({unread_count})")
                if len(event_emails) > 3:
                    text_lines.append(f"  ... and {len(event_emails) - 3} more")

        text_lines.append("")

    text_lines.append(f"Open CapMatch: {CTA_URL}")
    text_lines.append(f"Manage preferences: {MANAGE_PREFS_URL}")

    text_body = "\n".join(text_lines)

    return (subject, html_body, text_body)


def _render_document_uploads_digest(emails: List[PendingEmail]) -> str:
    """Render multiple document uploads for same project."""
    doc_items = []
    for email in emails:
        body_data = email.body_data
        doc_name = body_data.get("file_name", body_data.get("document_name", "Unknown Document"))
        uploaded_by = body_data.get("uploader_name", body_data.get("uploaded_by_name", "Someone"))
        doc_items.append(f"<li><strong>{doc_name}</strong> uploaded by {uploaded_by}</li>")

    return f"""
    <div style="margin-bottom: 15px;">
        <h3 style="color: #2563eb; font-size: 16px; margin: 0 0 10px 0;">New Documents</h3>
        <ul style="margin: 0; padding-left: 20px;">
            {''.join(doc_items)}
        </ul>
    </div>
    """


def _render_unread_messages_digest(emails: List[PendingEmail]) -> str:
    """Render multiple unread message notifications for same project."""
    total_unread = sum(email.body_data.get("unread_count", 1) for email in emails)
    threads = []
    for email in emails:
        body_data = email.body_data
        thread_topic = body_data.get("thread_topic", "Discussion")
        unread_count = body_data.get("unread_count", 1)
        threads.append(f"<li><strong>{thread_topic}</strong> ({unread_count} unread)</li>")

    return f"""
    <div style="margin-bottom: 15px;">
        <h3 style="color: #2563eb; font-size: 16px; margin: 0 0 10px 0;">Unread Messages ({total_unread} total)</h3>
        <ul style="margin: 0; padding-left: 20px;">
            {''.join(threads)}
        </ul>
    </div>
    """



