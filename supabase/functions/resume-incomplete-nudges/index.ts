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
  1 * 60 * 1000, // 1 day
  3 * 24 * 60 * 60 * 1000, // 3 days
  5 * 24 * 60 * 60 * 1000, // 5 days
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

  // Query all projects with their resumes and workspace activity
  // This catches both users who HAVE edited and users who HAVEN'T even started
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from("projects")
    .select(`
      id,
      name,
      owner_org_id,
      created_at,
      project_workspace_activity (
        user_id,
        last_project_resume_edit_at,
        last_borrower_resume_edit_at
      )
    `);

  if (projectsError) {
    console.error(
      "[resume-incomplete-nudges] Error fetching projects:",
      projectsError
    );
    return;
  }

  if (!projects || projects.length === 0) {
    console.log("[resume-incomplete-nudges] No projects found");
    return;
  }

  console.log(
    `[resume-incomplete-nudges] Found ${projects.length} projects to check`
  );

  let totalEventsCreated = 0;
  let totalSkipped = 0;
  const now = Date.now();

  // Process each project
  for (const project of projects) {
    const { id: project_id, name: project_name, owner_org_id, created_at: project_created_at, project_workspace_activity } = project;

    // Get project owners
    const { data: orgMembers, error: ownersError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", owner_org_id)
      .eq("role", "owner");

    if (ownersError || !orgMembers || orgMembers.length === 0) {
      console.log(
        `[resume-incomplete-nudges] Skipped project "${project_name}" (${project_id}): No owners found (org_id: ${owner_org_id})`
      );
      totalSkipped++;
      continue;
    }

    // Get profiles for all owners
    const ownerUserIds = orgMembers.map((m: any) => m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ownerUserIds);

    // Create a map of user_id -> profile for easy lookup
    const profileMap = new Map<string, any>(
      (profiles || []).map((p: any) => [p.id, p])
    );

    // For each owner, check if they need nudges
    for (const member of orgMembers) {
      const user_id = member.user_id;
      const profile = profileMap.get(user_id) as any;
      const user_name = profile?.full_name || profile?.email || user_id;

      // Find workspace activity for this owner (if it exists)
      const activity = (project_workspace_activity || []).find(
        (a: any) => a.user_id === user_id
      );

      const last_project_resume_edit_at = activity?.last_project_resume_edit_at;
      const last_borrower_resume_edit_at = activity?.last_borrower_resume_edit_at;

      // Process Project Resume
      // If user never edited, use project creation time as the "inactivity" start
      const projectResumeReferenceTime = last_project_resume_edit_at
        ? new Date(last_project_resume_edit_at)
        : new Date(project_created_at);

      const timeSinceProjectResumeActivity = now - projectResumeReferenceTime.getTime();

      // Check if project resume is incomplete
      let projectCompletenessPercent: number | undefined;

      // Try to get current version from resources table
      const { data: projectResource } = await supabaseAdmin
        .from("resources")
        .select("current_version_id")
        .eq("project_id", project_id)
        .eq("resource_type", "PROJECT_RESUME")
        .maybeSingle();

      if (projectResource?.current_version_id) {
        const { data: projectResume } = await supabaseAdmin
          .from("project_resumes")
          .select("completeness_percent")
          .eq("id", projectResource.current_version_id)
          .maybeSingle();
        projectCompletenessPercent = projectResume?.completeness_percent;
      } else {
        // Fallback to latest resume
        const { data: projectResume } = await supabaseAdmin
          .from("project_resumes")
          .select("completeness_percent")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        projectCompletenessPercent = projectResume?.completeness_percent;
      }

      // Process project resume nudge if incomplete (or doesn't exist - 0% complete)
      const effectiveProjectCompleteness = projectCompletenessPercent ?? 0;

      if (effectiveProjectCompleteness < 100) {
        const result = await processResumeNudge(
          supabaseAdmin,
          project_id,
          user_id,
          "project",
          timeSinceProjectResumeActivity,
          effectiveProjectCompleteness,
          projectResumeReferenceTime,
          project_name,
          user_name
        );

        if (result.created) {
          totalEventsCreated++;
        } else {
          totalSkipped++;
          console.log(
            `[resume-incomplete-nudges] Skipped project resume for "${user_name}" in project "${project_name}": ${result.reason}`
          );
        }
      } else {
        totalSkipped++;
        console.log(
          `[resume-incomplete-nudges] Skipped project resume for "${user_name}" in project "${project_name}": Resume is ${effectiveProjectCompleteness}% complete`
        );
      }

      // Process Borrower Resume
      // If user never edited borrower resume, use project creation time as reference
      const borrowerResumeReferenceTime = last_borrower_resume_edit_at
        ? new Date(last_borrower_resume_edit_at)
        : new Date(project_created_at);

      const timeSinceBorrowerResumeActivity = now - borrowerResumeReferenceTime.getTime();

      // Check if borrower resume is incomplete
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

      // Process borrower resume nudge if incomplete (or doesn't exist - 0% complete)
      const effectiveBorrowerCompleteness = borrowerCompletenessPercent ?? 0;

      if (effectiveBorrowerCompleteness < 100) {
        const result = await processResumeNudge(
          supabaseAdmin,
          project_id,
          user_id,
          "borrower",
          timeSinceBorrowerResumeActivity,
          effectiveBorrowerCompleteness,
          borrowerResumeReferenceTime,
          project_name,
          user_name
        );

        if (result.created) {
          totalEventsCreated++;
        } else {
          totalSkipped++;
          console.log(
            `[resume-incomplete-nudges] Skipped borrower resume for "${user_name}" in project "${project_name}": ${result.reason}`
          );
        }
      } else {
        totalSkipped++;
        console.log(
          `[resume-incomplete-nudges] Skipped borrower resume for "${user_name}" in project "${project_name}": Resume is ${effectiveBorrowerCompleteness}% complete`
        );
      }
    }
  }

  console.log(
    `[resume-incomplete-nudges] Completed. Created ${totalEventsCreated} domain events, skipped ${totalSkipped} resume checks.`
  );
}

interface NudgeResult {
  created: boolean;
  reason?: string;
}

async function processResumeNudge(
  supabaseAdmin: any,
  projectId: string,
  userId: string,
  resumeType: "project" | "borrower",
  timeSinceEdit: number,
  completenessPercent: number,
  lastEditTime: Date,
  projectName: string,
  userName: string
): Promise<NudgeResult> {
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
    const minutesSinceEdit = Math.floor(timeSinceEdit / (60 * 1000));
    return {
      created: false,
      reason: `Time since edit (${minutesSinceEdit} minutes) is less than the first nudge interval (45 minutes)`,
    };
  }

  // Get project owners - we notify them, not the editor
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("owner_org_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error(
      `[resume-incomplete-nudges] Error fetching project:`,
      projectError
    );
    return {
      created: false,
      reason: `Failed to fetch project: ${projectError?.message || "Project not found"}`,
    };
  }

  const { data: owners, error: ownersError } = await supabaseAdmin
    .from("org_members")
    .select("user_id")
    .eq("org_id", project.owner_org_id)
    .eq("role", "owner");

  if (ownersError || !owners || owners.length === 0) {
    console.error(
      `[resume-incomplete-nudges] Error fetching owners:`,
      ownersError
    );
    return {
      created: false,
      reason: `Failed to fetch project owners: ${ownersError?.message || "No owners found"}`,
    };
  }

  const ownerUserIds = owners.map((o: any) => o.user_id);

  // Check for existing nudges for this specific user
  const { data: allOwnerNudges, error: nudgesError } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, created_at, payload")
    .eq("user_id", userId)
    .eq("payload->>type", "resume_incomplete_nudge");

  if (nudgesError) {
    console.error(
      `[resume-incomplete-nudges] Error checking existing nudges:`,
      nudgesError
    );
    return {
      created: false,
      reason: `Failed to check existing nudges: ${nudgesError.message}`,
    };
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
        `[resume-incomplete-nudges] Resetting tier for ${resumeType} resume in "${projectName}" for "${userName}" - deleting ${nudgeIdsToDelete.length} old nudges`
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
    const nudgeCreatedAt = new Date(existingTierNudge.created_at).toISOString();
    console.log(
      `[resume-incomplete-nudges] Tier ${nudgeTier} nudge already sent for ${resumeType} resume in "${projectName}" for "${userName}"`
    );
    return {
      created: false,
      reason: `Tier ${nudgeTier} nudge already sent at ${nudgeCreatedAt}`,
    };
  }

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
    return {
      created: false,
      reason: `Failed to create domain event: ${eventError.message}`,
    };
  }

  console.log(
    `[resume-incomplete-nudges] Created domain event ${domainEvent.id} for ${resumeType} resume in "${projectName}" for "${userName}" (tier ${nudgeTier}, ${completenessPercent}% complete)`
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

  return {
    created: true,
    reason: `Created tier ${nudgeTier} nudge for ${completenessPercent}% complete resume`,
  };
}

