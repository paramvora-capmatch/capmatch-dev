import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[resume-incomplete-nudges] Missing required Supabase environment variables"
  );
}

// Nudge intervals in milliseconds: 45m, 1d, 3d, 1w
const NUDGE_INTERVALS = [
  45 * 60 * 1000, // 45 minutes
  24 * 60 * 60 * 1000, // 1 day
  3 * 24 * 60 * 60 * 1000, // 3 days
  7 * 24 * 60 * 60 * 1000, // 1 week
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await sendResumeNudges(supabaseAdmin);

    return new Response(
      JSON.stringify({ success: true, message: "Resume nudges processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[resume-incomplete-nudges] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function sendResumeNudges(supabaseAdmin: any) {
  console.log("[resume-incomplete-nudges] Starting resume nudge processing");

  // Query project_workspace_activity for users with edit history
  const { data: activities, error: activitiesError } = await supabaseAdmin
    .from("project_workspace_activity")
    .select(
      "user_id, project_id, last_project_resume_edit_at, last_borrower_resume_edit_at"
    )
    .or(
      "last_project_resume_edit_at.not.is.null,last_borrower_resume_edit_at.not.is.null"
    );

  if (activitiesError) {
    console.error(
      "[resume-incomplete-nudges] Error fetching workspace activities:",
      activitiesError
    );
    return;
  }

  if (!activities || activities.length === 0) {
    console.log("[resume-incomplete-nudges] No workspace activities found");
    return;
  }

  console.log(
    `[resume-incomplete-nudges] Found ${activities.length} workspace activities to check`
  );

  let totalEventsCreated = 0;
  const now = Date.now();

  // Process each activity
  for (const activity of activities) {
    const { user_id, project_id, last_project_resume_edit_at, last_borrower_resume_edit_at } = activity;

    // Check if user is a project owner before processing any resumes
    // This avoids duplicate logs and unnecessary processing
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("owner_org_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      console.error(
        `[resume-incomplete-nudges] Error fetching project ${project_id}:`,
        projectError
      );
      continue; // Skip this activity
    }

    const { data: owners, error: ownersError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", project.owner_org_id)
      .eq("role", "owner");

    if (ownersError || !owners || owners.length === 0) {
      console.error(
        `[resume-incomplete-nudges] Error fetching owners for project ${project_id}:`,
        ownersError
      );
      continue; // Skip this activity
    }

    const ownerUserIds = owners.map((o: any) => o.user_id);

    // Only process if the editor is an owner
    if (!ownerUserIds.includes(user_id)) {
      console.log(
        `[resume-incomplete-nudges] Skipping nudges - user ${user_id} is not a project owner for project ${project_id}`
      );
      continue; // Skip both project and borrower resume processing
    }

    // Process Project Resume
    if (last_project_resume_edit_at) {
      const editTime = new Date(last_project_resume_edit_at).getTime();
      const timeSinceEdit = now - editTime;

      // Check if resume is incomplete - use current version if available
      let completenessPercent: number | undefined;
      
      // Try to get current version from resources table
      const { data: resource } = await supabaseAdmin
        .from("resources")
        .select("current_version_id")
        .eq("project_id", project_id)
        .eq("resource_type", "PROJECT_RESUME")
        .maybeSingle();

      if (resource?.current_version_id) {
        const { data: projectResume } = await supabaseAdmin
          .from("project_resumes")
          .select("completeness_percent")
          .eq("id", resource.current_version_id)
          .maybeSingle();
        // Ensure completeness is a number
        completenessPercent = projectResume?.completeness_percent != null 
          ? Number(projectResume.completeness_percent) 
          : undefined;
      } else {
        // Fallback to latest resume
        const { data: projectResume } = await supabaseAdmin
          .from("project_resumes")
          .select("completeness_percent")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        // Ensure completeness is a number
        completenessPercent = projectResume?.completeness_percent != null 
          ? Number(projectResume.completeness_percent) 
          : undefined;
      }

      // Skip if resume is complete (100%) or completeness is undefined
      if (completenessPercent === undefined) {
        console.log(
          `[resume-incomplete-nudges] Skipping project resume nudge for project ${project_id} - completeness not found`
        );
      } else if (completenessPercent >= 100) {
        console.log(
          `[resume-incomplete-nudges] Skipping project resume nudge for project ${project_id} - already complete (${completenessPercent}%)`
        );
      } else if (completenessPercent < 100) {
        const result = await processResumeNudge(
          supabaseAdmin,
          project_id,
          user_id,
          "project",
          timeSinceEdit,
          completenessPercent,
          new Date(last_project_resume_edit_at)
        );

        if (result) {
          totalEventsCreated++;
        }
      }
    }

    // Process Borrower Resume
    if (last_borrower_resume_edit_at) {
      const editTime = new Date(last_borrower_resume_edit_at).getTime();
      const timeSinceEdit = now - editTime;

      // Check if resume is incomplete - use current version if available
      let borrowerCompletenessPercent: number | undefined;
      
      // Try to get current version from resources table
      const { data: borrowerResource } = await supabaseAdmin
        .from("resources")
        .select("current_version_id")
        .eq("project_id", project_id)
        .eq("resource_type", "BORROWER_RESUME")
        .maybeSingle();

      if (borrowerResource?.current_version_id) {
        const { data: borrowerResume } = await supabaseAdmin
          .from("borrower_resumes")
          .select("completeness_percent")
          .eq("id", borrowerResource.current_version_id)
          .maybeSingle();
        // Ensure completeness is a number
        borrowerCompletenessPercent = borrowerResume?.completeness_percent != null 
          ? Number(borrowerResume.completeness_percent) 
          : undefined;
      } else {
        // Fallback to latest resume
        const { data: borrowerResume } = await supabaseAdmin
          .from("borrower_resumes")
          .select("completeness_percent")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        // Ensure completeness is a number
        borrowerCompletenessPercent = borrowerResume?.completeness_percent != null 
          ? Number(borrowerResume.completeness_percent) 
          : undefined;
      }

      // Skip if resume is complete (100%) or completeness is undefined
      if (borrowerCompletenessPercent === undefined) {
        console.log(
          `[resume-incomplete-nudges] Skipping borrower resume nudge for project ${project_id} - completeness not found`
        );
      } else if (borrowerCompletenessPercent >= 100) {
        console.log(
          `[resume-incomplete-nudges] Skipping borrower resume nudge for project ${project_id} - already complete (${borrowerCompletenessPercent}%)`
        );
      } else if (borrowerCompletenessPercent < 100) {
        const result = await processResumeNudge(
          supabaseAdmin,
          project_id,
          user_id,
          "borrower",
          timeSinceEdit,
          borrowerCompletenessPercent,
          new Date(last_borrower_resume_edit_at)
        );

        if (result) {
          totalEventsCreated++;
        }
      }
    }
  }

  console.log(
    `[resume-incomplete-nudges] Completed. Created ${totalEventsCreated} domain events.`
  );
}

async function processResumeNudge(
  supabaseAdmin: any,
  projectId: string,
  userId: string,
  resumeType: "project" | "borrower",
  timeSinceEdit: number,
  completenessPercent: number,
  lastEditTime: Date
): Promise<boolean> {
  // Determine which nudge tier should be sent
  let nudgeTier: number | null = null;

  for (let i = 0; i < NUDGE_INTERVALS.length; i++) {
    const interval = NUDGE_INTERVALS[i];
    const nextInterval = i < NUDGE_INTERVALS.length - 1 
      ? NUDGE_INTERVALS[i + 1] 
      : Infinity;

    if (timeSinceEdit >= interval && timeSinceEdit < nextInterval) {
      nudgeTier = i + 1; // Tier 1, 2, 3, or 4
      break;
    }
  }

  // If time since edit is less than first interval (45m), don't send nudge yet
  if (!nudgeTier) {
    return false;
  }

  // Note: Ownership check is done upfront in sendResumeNudges before calling this function
  // We only notify the specific owner who edited
  const ownerToNotify = userId;

  // Check for existing nudges for this specific owner
  const { data: allOwnerNudges, error: nudgesError } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, created_at, payload")
    .eq("user_id", ownerToNotify)
    .eq("payload->>type", "resume_incomplete_nudge");

  if (nudgesError) {
    console.error(
      `[resume-incomplete-nudges] Error checking existing nudges:`,
      nudgesError
    );
    return false;
  }

  // Filter to only nudges for this project and resume type
  const existingNudges = (allOwnerNudges || []).filter((nudge) => {
    const payload = nudge.payload as any;
    return (
      payload?.project_id === projectId &&
      payload?.resume_type === resumeType
    );
  });

  // Tier Reset Logic: If user edited after any existing nudge, delete those nudges
  if (existingNudges && existingNudges.length > 0) {
    const nudgeIdsToDelete: number[] = [];

    for (const nudge of existingNudges) {
      const nudgeCreatedAt = new Date(nudge.created_at).getTime();
      if (lastEditTime.getTime() > nudgeCreatedAt) {
        nudgeIdsToDelete.push(nudge.id);
      }
    }

    if (nudgeIdsToDelete.length > 0) {
      console.log(
        `[resume-incomplete-nudges] Resetting tier for ${resumeType} resume - deleting ${nudgeIdsToDelete.length} old nudges`
      );
      const { error: deleteError } = await supabaseAdmin
        .from("notifications")
        .delete()
        .in("id", nudgeIdsToDelete);

      if (deleteError) {
        console.error(
          `[resume-incomplete-nudges] Error deleting old nudges:`,
          deleteError
        );
      }
    }
  }

  // Check if nudge for this tier already sent to any owner
  const existingTierNudge = existingNudges?.find((nudge) => {
    const payload = nudge.payload as any;
    return payload?.nudge_tier === nudgeTier;
  });

  if (existingTierNudge) {
    console.log(
      `[resume-incomplete-nudges] Tier ${nudgeTier} nudge already sent for ${resumeType} resume in project ${projectId}`
    );
    return false;
  }

  // Format time since edit for logging
  const hoursSinceEdit = Math.floor(timeSinceEdit / (60 * 60 * 1000));
  const minutesSinceEdit = Math.floor((timeSinceEdit % (60 * 60 * 1000)) / (60 * 1000));
  const timeSinceEditStr = hoursSinceEdit > 0 
    ? `${hoursSinceEdit}h ${minutesSinceEdit}m`
    : `${minutesSinceEdit}m`;

  // Log reason for creating domain event
  console.log(
    `[resume-incomplete-nudges] Creating domain event for ${resumeType} resume nudge:\n` +
    `  Reason: Resume is ${completenessPercent}% complete and hasn't been edited in ${timeSinceEditStr} (Tier ${nudgeTier})\n` +
    `  Project ID: ${projectId}\n` +
    `  Owner who edited: ${userId} (will be notified)\n` +
    `  Last edit time: ${lastEditTime.toISOString()}`
  );

  // Create domain event
  const { data: domainEvent, error: eventError } = await supabaseAdmin
    .from("domain_events")
    .insert({
      event_type: "resume_incomplete_nudge",
      actor_id: null, // System-generated
      project_id: projectId,
      payload: {
        resume_type: resumeType,
        completion_percent: completenessPercent,
        nudge_tier: nudgeTier,
        user_id: userId,
      },
      occurred_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (eventError) {
    console.error(
      `[resume-incomplete-nudges] Error creating domain event:`,
      eventError
    );
    return false;
  }

  console.log(
    `[resume-incomplete-nudges] Created domain event ${domainEvent.id} for ${resumeType} resume (tier ${nudgeTier}, ${completenessPercent}% complete)`
  );

  // Trigger notification fan-out (fire and forget)
  // Use HTTP request to invoke the notify-fan-out function
  try {
    const functionUrl = `${SUPABASE_URL}/functions/v1/notify-fan-out`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ eventId: domainEvent.id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[resume-incomplete-nudges] Error triggering fan-out: ${response.status} ${errorText}`
      );
    }
  } catch (err) {
    console.error(
      `[resume-incomplete-nudges] Exception triggering fan-out:`,
      err
    );
  }

  return true;
}

