import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[project-completion-reminders] Missing required Supabase environment variables"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await sendCompletionReminders(supabaseAdmin);

    return new Response(
      JSON.stringify({ success: true, message: "Reminders processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[project-completion-reminders] Error:", error);
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

async function sendCompletionReminders(supabaseAdmin: any) {
  const intervals = [
    { days: 1, message: "Getting started is the hardest part!" },
    { days: 3, message: "Keep up the momentum!" },
    { days: 5, message: "Almost there!" },
    { days: 7, message: "⚠️ Complete your project soon!" },
  ];

  let totalNotificationsCreated = 0;

  for (const { days, message } of intervals) {
    const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const tolerance = 12 * 60 * 60 * 1000; // 12 hour window
    const startRange = new Date(targetDate.getTime() - tolerance);
    const endRange = new Date(targetDate.getTime() + tolerance);

    console.log(
      `[project-completion-reminders] Checking projects for ${days} day reminder (${startRange.toISOString()} to ${endRange.toISOString()})`
    );

    // Find projects created in this timeframe
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from("projects")
      .select("id, name, created_at, owner_org_id")
      .gte("created_at", startRange.toISOString())
      .lte("created_at", endRange.toISOString());

    if (projectsError) {
      console.error(
        `[project-completion-reminders] Error fetching projects for ${days} day reminder:`,
        projectsError
      );
      continue;
    }

    if (!projects || projects.length === 0) {
      console.log(
        `[project-completion-reminders] No projects found for ${days} day reminder`
      );
      continue;
    }

    console.log(
      `[project-completion-reminders] Found ${projects.length} projects for ${days} day reminder`
    );

    // Get all project IDs
    const projectIds = projects.map((p) => p.id);

    // Batch query project resumes
    const { data: projectResumes, error: projectResumesError } =
      await supabaseAdmin
        .from("project_resumes")
        .select("project_id, content")
        .in("project_id", projectIds);

    if (projectResumesError) {
      console.error(
        `[project-completion-reminders] Error fetching project resumes:`,
        projectResumesError
      );
    }

    // Batch query borrower resumes
    const { data: borrowerResumes, error: borrowerResumesError } =
      await supabaseAdmin
        .from("borrower_resumes")
        .select("project_id, content")
        .in("project_id", projectIds);

    if (borrowerResumesError) {
      console.error(
        `[project-completion-reminders] Error fetching borrower resumes:`,
        borrowerResumesError
      );
    }

    // Create maps for quick lookup
    const projectResumeMap = new Map(
      (projectResumes || []).map((pr) => [pr.project_id, pr.content])
    );
    const borrowerResumeMap = new Map(
      (borrowerResumes || []).map((br) => [br.project_id, br.content])
    );

    for (const project of projects) {
      // Get resume content from maps
      const projectResumeContent = (projectResumeMap.get(project.id) ||
        {}) as Record<string, unknown>;
      const borrowerResumeContent = (borrowerResumeMap.get(project.id) ||
        {}) as Record<string, unknown>;

      const projectProgress =
        (projectResumeContent.completenessPercent as number | undefined) ?? 0;
      const borrowerProgress =
        (borrowerResumeContent.completenessPercent as number | undefined) ?? 0;
      const overallProgress = Math.round(
        (projectProgress + borrowerProgress) / 2
      );

      console.log(
        `[project-completion-reminders] Project ${project.name} progress: project=${projectProgress}%, borrower=${borrowerProgress}%, overall=${overallProgress}%`
      );

      // Only send reminder if project is incomplete
      if (overallProgress < 100) {
        // Get all current org owners for this project
        const { data: owners, error: ownersError } = await supabaseAdmin
          .from("org_members")
          .select("user_id")
          .eq("org_id", project.owner_org_id)
          .eq("role", "owner");

        if (ownersError) {
          console.error(
            `[project-completion-reminders] Error fetching owners for project ${project.id}:`,
            ownersError
          );
          continue;
        }

        if (!owners || owners.length === 0) {
          console.warn(
            `[project-completion-reminders] No owners found for project ${project.id}`
          );
          continue;
        }

        // Create a domain event for this reminder
        const { data: domainEvent, error: eventError } = await supabaseAdmin
          .from("domain_events")
          .insert({
            event_type: "project_completion_reminder",
            actor_id: null, // System-generated, no actor
            project_id: project.id,
            payload: {
              reminder_day: days,
              completion_percent: overallProgress,
              project_progress: projectProgress,
              borrower_progress: borrowerProgress,
              message: message,
            },
            occurred_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (eventError) {
          console.error(
            `[project-completion-reminders] Error creating domain event for project ${project.id}:`,
            eventError
          );
          continue;
        }

        // Create notifications for all owners
        const notifications = owners.map((owner: { user_id: string }) => ({
          user_id: owner.user_id,
          event_id: domainEvent.id,
          title: `Complete Your Project (Day ${days})`,
          body: `${message} **${project.name}** is **${overallProgress}%** complete.`,
          link_url: `/project/workspace/${project.id}`,
          created_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabaseAdmin
          .from("notifications")
          .insert(notifications);

        if (insertError) {
          console.error(
            `[project-completion-reminders] Error inserting notifications for project ${project.id}:`,
            insertError
          );
        } else {
          totalNotificationsCreated += notifications.length;
          console.log(
            `[project-completion-reminders] Created domain event ${domainEvent.id} and ${notifications.length} notifications for project ${project.name} (${overallProgress}% complete)`
          );
        }
      } else {
        console.log(
          `[project-completion-reminders] Skipping project ${project.name} - already complete (${overallProgress}%)`
        );
      }
    }
  }

  console.log(
    `[project-completion-reminders] Completed. Created ${totalNotificationsCreated} total notifications.`
  );
}

