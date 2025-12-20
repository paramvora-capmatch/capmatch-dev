"""
Resume Incomplete Nudges - Scheduled job

Replaces: supabase/functions/resume-incomplete-nudges/index.ts

Schedule: Every 6 hours (0 */6 * * *)

This job finds incomplete project and borrower resumes and creates domain events
to nudge project owners. Uses a 4-tier nudging system (1d, 3d, 5d, 7d intervals)
with tier reset logic when users edit their resumes.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, TypedDict

from supabase import Client, create_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# Nudge intervals in milliseconds: 1d, 3d, 5d, 7d
NUDGE_INTERVALS = [
    1  * 1000,  # 1 day
    3 * 24 * 60 * 60 * 1000,  # 3 days
    5 * 24 * 60 * 60 * 1000,  # 5 days
    7 * 24 * 60 * 60 * 1000,  # 1 week
]


class NudgeResult(TypedDict):
    """Result of processing a resume nudge."""

    created: bool
    reason: Optional[str]


def get_nudge_tier(time_since_edit_ms: int) -> Optional[int]:
    """
    Determine which nudge tier should be sent based on time since last edit.

    Args:
        time_since_edit_ms: Time since last edit in milliseconds

    Returns:
        Nudge tier (1-4) or None if too early
    """
    for i, interval in enumerate(NUDGE_INTERVALS):
        next_interval = NUDGE_INTERVALS[i + 1] if i < len(NUDGE_INTERVALS) - 1 else float("inf")

        if time_since_edit_ms >= interval and time_since_edit_ms < next_interval:
            return i + 1  # Tier 1, 2, 3, or 4

    return None


def process_resume_nudge(
    supabase: Client,
    project_id: str,
    user_id: str,
    resume_type: str,
    time_since_edit_ms: int,
    completeness_percent: float,
    last_edit_time: datetime,
    project_name: str,
    user_name: str,
) -> NudgeResult:
    """
    Process a single resume nudge.

    Args:
        supabase: Supabase client
        project_id: Project ID
        user_id: User ID
        resume_type: "project" or "borrower"
        time_since_edit_ms: Time since last edit in milliseconds
        completeness_percent: Completion percentage (0-100)
        last_edit_time: Last edit timestamp
        project_name: Project name for logging
        user_name: User name for logging

    Returns:
        NudgeResult with created status and reason
    """
    # Determine which nudge tier should be sent
    nudge_tier = get_nudge_tier(time_since_edit_ms)

    # If time since edit is less than first interval, don't send nudge yet
    if not nudge_tier:
        minutes_since_edit = time_since_edit_ms // (60 * 1000)
        return {
            "created": False,
            "reason": f"Time since edit ({minutes_since_edit} minutes) is less than the first nudge interval (1 day)",
        }

    # Get project owners
    project_response = supabase.from_("projects").select("owner_org_id").eq("id", project_id).single().execute()

    if not project_response.data:
        return {"created": False, "reason": "Failed to fetch project"}

    project = project_response.data

    # Get owners
    owners_response = (
        supabase.from_("org_members").select("user_id").eq("org_id", project["owner_org_id"]).eq("role", "owner").execute()
    )

    owners = owners_response.data if owners_response.data else []

    if not owners:
        return {"created": False, "reason": "No project owners found"}

    # Check for existing nudges for this specific user
    all_nudges_response = (
        supabase.from_("notifications")
        .select("id, user_id, created_at, payload")
        .eq("user_id", user_id)
        .eq("payload->>type", "resume_incomplete_nudge")
        .execute()
    )

    all_owner_nudges = all_nudges_response.data if all_nudges_response.data else []

    # Filter to only nudges for this project and resume type
    existing_nudges = [
        nudge
        for nudge in all_owner_nudges
        if nudge.get("payload", {}).get("project_id") == project_id
        and nudge.get("payload", {}).get("resume_type") == resume_type
    ]

    # Tier Reset Logic: If user edited after any existing nudge, delete those nudges
    if existing_nudges:
        nudge_ids_to_delete = []

        for nudge in existing_nudges:
            nudge_created_at = datetime.fromisoformat(nudge["created_at"].replace("Z", "+00:00"))
            if last_edit_time > nudge_created_at:
                nudge_ids_to_delete.append(nudge["id"])

        if nudge_ids_to_delete:
            logger.info(
                f"Resetting tier for {resume_type} resume in '{project_name}' for '{user_name}' - deleting {len(nudge_ids_to_delete)} old nudges"
            )
            supabase.from_("notifications").delete().in_("id", nudge_ids_to_delete).execute()

    # Check if nudge for this tier already sent
    existing_tier_nudge = next(
        (nudge for nudge in existing_nudges if nudge.get("payload", {}).get("nudge_tier") == nudge_tier), None
    )

    if existing_tier_nudge:
        nudge_created_at = existing_tier_nudge["created_at"]
        logger.info(f"Tier {nudge_tier} nudge already sent for {resume_type} resume in '{project_name}' for '{user_name}'")
        return {"created": False, "reason": f"Tier {nudge_tier} nudge already sent at {nudge_created_at}"}

    # Create domain event
    event_response = (
        supabase.from_("domain_events")
        .insert(
            {
                "event_type": "resume_incomplete_nudge",
                "actor_id": None,  # System-generated
                "project_id": project_id,
                "payload": {
                    "resume_type": resume_type,
                    "completion_percent": completeness_percent,
                    "nudge_tier": nudge_tier,
                    "user_id": user_id,
                },
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .select("id")
        .single()
        .execute()
    )

    if not event_response.data:
        logger.error("Error creating domain event")
        return {"created": False, "reason": "Failed to create domain event"}

    domain_event = event_response.data

    logger.info(
        f"Created domain event {domain_event['id']} for {resume_type} resume in '{project_name}' for '{user_name}' (tier {nudge_tier}, {completeness_percent}% complete)"
    )

    # Note: Domain event created. The GCP notify-fan-out service will automatically
    # poll and process this event within 0-60 seconds (avg 30s).

    return {"created": True, "reason": f"Created tier {nudge_tier} nudge for {completeness_percent}% complete resume"}


def send_resume_nudges(supabase: Client, now: datetime) -> Dict[str, Any]:
    """
    Send resume nudges for incomplete project and borrower resumes.

    Args:
        supabase: Supabase client
        now: Current time

    Returns:
        Summary of nudges sent
    """
    logger.info("Starting resume nudge processing")

    # Query all projects with their resumes and workspace activity
    projects_response = supabase.from_("projects").select(
        "id, name, owner_org_id, created_at, project_workspace_activity(user_id, last_project_resume_edit_at, last_borrower_resume_edit_at)"
    ).execute()

    projects = projects_response.data if projects_response.data else []

    if not projects:
        logger.info("No projects found")
        return {"processed": 0, "eventsCreated": 0, "skipped": 0}

    logger.info(f"Found {len(projects)} projects to check")

    total_events_created = 0
    total_skipped = 0
    now_ms = int(now.timestamp() * 1000)

    # Process each project
    for project in projects:
        project_id = project["id"]
        project_name = project["name"]
        owner_org_id = project["owner_org_id"]
        project_created_at = project["created_at"]
        project_workspace_activity = project.get("project_workspace_activity", [])

        # Get project owners
        org_members_response = (
            supabase.from_("org_members").select("user_id").eq("org_id", owner_org_id).eq("role", "owner").execute()
        )

        org_members = org_members_response.data if org_members_response.data else []

        if not org_members:
            logger.info(f"Skipped project '{project_name}' ({project_id}): No owners found (org_id: {owner_org_id})")
            total_skipped += 1
            continue

        # Get profiles for all owners
        owner_user_ids = [m["user_id"] for m in org_members]
        profiles_response = supabase.from_("profiles").select("id, full_name, email").in_("id", owner_user_ids).execute()

        profiles = profiles_response.data if profiles_response.data else []

        # Create a map of user_id -> profile for easy lookup
        profile_map = {p["id"]: p for p in profiles}

        # For each owner, check if they need nudges
        for member in org_members:
            user_id = member["user_id"]
            profile = profile_map.get(user_id)
            user_name = profile.get("full_name") or profile.get("email") or user_id if profile else user_id

            # Find workspace activity for this owner (if it exists)
            activity = next((a for a in project_workspace_activity if a["user_id"] == user_id), None)

            last_project_resume_edit_at = activity.get("last_project_resume_edit_at") if activity else None
            last_borrower_resume_edit_at = activity.get("last_borrower_resume_edit_at") if activity else None

            # Process Project Resume
            # If user never edited, use project creation time as the "inactivity" start
            project_resume_reference_time = (
                datetime.fromisoformat(last_project_resume_edit_at.replace("Z", "+00:00"))
                if last_project_resume_edit_at
                else datetime.fromisoformat(project_created_at.replace("Z", "+00:00"))
            )

            time_since_project_resume_activity = now_ms - int(project_resume_reference_time.timestamp() * 1000)

            # Check if project resume is incomplete
            project_completeness_percent = None

            # Try to get current version from resources table
            project_resource_response = (
                supabase.from_("resources")
                .select("current_version_id")
                .eq("project_id", project_id)
                .eq("resource_type", "PROJECT_RESUME")
                .maybe_single()
                .execute()
            )

            project_resource = project_resource_response.data

            if project_resource and project_resource.get("current_version_id"):
                project_resume_response = (
                    supabase.from_("project_resumes")
                    .select("completeness_percent")
                    .eq("id", project_resource["current_version_id"])
                    .maybe_single()
                    .execute()
                )
                project_resume = project_resume_response.data
                if project_resume:
                    project_completeness_percent = project_resume.get("completeness_percent")
            else:
                # Fallback to latest resume
                project_resume_response = (
                    supabase.from_("project_resumes")
                    .select("completeness_percent")
                    .eq("project_id", project_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .maybe_single()
                    .execute()
                )
                project_resume = project_resume_response.data
                if project_resume:
                    project_completeness_percent = project_resume.get("completeness_percent")

            # Process project resume nudge if incomplete (or doesn't exist - 0% complete)
            effective_project_completeness = project_completeness_percent if project_completeness_percent is not None else 0

            if effective_project_completeness < 100:
                result = process_resume_nudge(
                    supabase,
                    project_id,
                    user_id,
                    "project",
                    time_since_project_resume_activity,
                    effective_project_completeness,
                    project_resume_reference_time,
                    project_name,
                    user_name,
                )

                if result["created"]:
                    total_events_created += 1
                else:
                    total_skipped += 1
                    logger.info(
                        f"Skipped project resume for '{user_name}' in project '{project_name}': {result.get('reason')}"
                    )
            else:
                total_skipped += 1
                logger.info(
                    f"Skipped project resume for '{user_name}' in project '{project_name}': Resume is {effective_project_completeness}% complete"
                )

            # Process Borrower Resume
            # If user never edited borrower resume, use project creation time as reference
            borrower_resume_reference_time = (
                datetime.fromisoformat(last_borrower_resume_edit_at.replace("Z", "+00:00"))
                if last_borrower_resume_edit_at
                else datetime.fromisoformat(project_created_at.replace("Z", "+00:00"))
            )

            time_since_borrower_resume_activity = now_ms - int(borrower_resume_reference_time.timestamp() * 1000)

            # Check if borrower resume is incomplete
            borrower_completeness_percent = None

            # Try to get current version from resources table
            borrower_resource_response = (
                supabase.from_("resources")
                .select("current_version_id")
                .eq("project_id", project_id)
                .eq("resource_type", "BORROWER_RESUME")
                .maybe_single()
                .execute()
            )

            borrower_resource = borrower_resource_response.data

            if borrower_resource and borrower_resource.get("current_version_id"):
                borrower_resume_response = (
                    supabase.from_("borrower_resumes")
                    .select("completeness_percent")
                    .eq("id", borrower_resource["current_version_id"])
                    .maybe_single()
                    .execute()
                )
                borrower_resume = borrower_resume_response.data
                if borrower_resume:
                    completeness = borrower_resume.get("completeness_percent")
                    # Ensure completeness is a number
                    borrower_completeness_percent = float(completeness) if completeness is not None else None
            else:
                # Fallback to latest resume
                borrower_resume_response = (
                    supabase.from_("borrower_resumes")
                    .select("completeness_percent")
                    .eq("project_id", project_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .maybe_single()
                    .execute()
                )
                borrower_resume = borrower_resume_response.data
                if borrower_resume:
                    completeness = borrower_resume.get("completeness_percent")
                    # Ensure completeness is a number
                    borrower_completeness_percent = float(completeness) if completeness is not None else None

            # Process borrower resume nudge if incomplete (or doesn't exist - 0% complete)
            effective_borrower_completeness = (
                borrower_completeness_percent if borrower_completeness_percent is not None else 0
            )

            if effective_borrower_completeness < 100:
                result = process_resume_nudge(
                    supabase,
                    project_id,
                    user_id,
                    "borrower",
                    time_since_borrower_resume_activity,
                    effective_borrower_completeness,
                    borrower_resume_reference_time,
                    project_name,
                    user_name,
                )

                if result["created"]:
                    total_events_created += 1
                else:
                    total_skipped += 1
                    logger.info(
                        f"Skipped borrower resume for '{user_name}' in project '{project_name}': {result.get('reason')}"
                    )
            else:
                total_skipped += 1
                logger.info(
                    f"Skipped borrower resume for '{user_name}' in project '{project_name}': Resume is {effective_borrower_completeness}% complete"
                )

    logger.info(f"Completed. Created {total_events_created} domain events, skipped {total_skipped} resume checks.")

    return {"processed": len(projects), "eventsCreated": total_events_created, "skipped": total_skipped}


def main():
    """Main entry point for resume-incomplete-nudges job."""
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 80)
    logger.info("Starting Resume Incomplete Nudges Job")
    logger.info(f"Started at: {start_time.isoformat()}")
    logger.info("=" * 80)

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        logger.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return 1

    # Create Supabase admin client
    supabase: Client = create_client(supabase_url, service_role_key)

    try:
        result = send_resume_nudges(supabase, start_time)

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info("=" * 80)
        logger.info(f"Job completed in {duration:.2f} seconds")
        logger.info(
            f"Processed: {result['processed']}, Events Created: {result['eventsCreated']}, Skipped: {result['skipped']}"
        )
        logger.info("=" * 80)

        return 0

    except Exception as error:
        logger.error(f"Fatal error in resume-incomplete-nudges job: {error}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
