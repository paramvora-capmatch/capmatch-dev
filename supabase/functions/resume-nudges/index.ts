// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import {
  computeNudgeStage,
  isNotStarted,
  resolveResumeFocus,
  clampPercent,
} from "../_shared/resume-nudge-logic.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[resume-nudges] Missing required Supabase environment variables");
}

type RequestBody = {
  dryRun?: boolean;
  nowIso?: string; // for deterministic testing
  // Testing only: override the first stage threshold (default 45). Example: 1 => trigger "t45m" after 1 minute.
  firstStageMinutes?: number;
  // Testing only: override the second stage threshold (default 1440). Example: 2 => trigger "t24h" after 2 minutes.
  secondStageMinutes?: number;
  // Dry-run only: limit the number of preview rows returned (default 25)
  previewLimit?: number;
};

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
  owner_org_id: string;
};

type ResourceRow = {
  project_id: string;
  resource_type: "PROJECT_RESUME" | "BORROWER_RESUME";
  current_version_id: string | null;
};

type ResumeRow = {
  id: string;
  project_id: string;
  completeness_percent: number | null;
  updated_at: string;
};

type OwnerRow = {
  org_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  app_role: string | null;
  full_name: string | null;
};

type WorkspaceActivityRow = {
  project_id: string;
  user_id: string;
  last_visited_at: string | null;
  last_step_id: string | null;
  last_resume_edit_at: string | null;
};

type PreferenceRow = {
  user_id: string;
  scope_type: "global" | "project" | "thread";
  scope_id: string | null;
  event_type: string;
  channel: "in_app" | "email" | "*";
  status: "muted" | "digest" | "immediate";
};

const EVENT_TYPE = "resume_incomplete_nudge";
const EMAIL_SUBJECT_BY_STAGE: Record<string, string> = {
  t24h: "Your Offering Memorandum is almost ready",
  t3d: "Finish your resumes to unlock lender-ready materials",
  t7d: "Reminder: complete your project to unlock your OM",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await safeJson<RequestBody>(req);
    const dryRun = body?.dryRun === true;
    const now = body?.nowIso ? new Date(body.nowIso) : new Date();
    const firstStageMinutes =
      typeof body?.firstStageMinutes === "number" ? body.firstStageMinutes : undefined;
    const secondStageMinutes =
      typeof body?.secondStageMinutes === "number" ? body.secondStageMinutes : undefined;
    const previewLimit =
      typeof body?.previewLimit === "number" ? Math.max(1, Math.floor(body.previewLimit)) : 25;

    const result = await runResumeNudges({
      supabaseAdmin,
      now,
      dryRun,
      firstStageMinutes,
      secondStageMinutes,
      previewLimit,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[resume-nudges] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function runResumeNudges({
  supabaseAdmin,
  now,
  dryRun,
  firstStageMinutes,
  secondStageMinutes,
  previewLimit,
}: {
  supabaseAdmin: any;
  now: Date;
  dryRun: boolean;
  firstStageMinutes?: number;
  secondStageMinutes?: number;
  previewLimit: number;
}) {
  // 1) Load projects
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from("projects")
    .select("id, name, created_at, owner_org_id");
  if (projectsError) throw new Error(`projects_fetch_failed:${projectsError.message}`);

  const projectRows = (projects ?? []) as ProjectRow[];
  if (!projectRows.length) {
    return { processedProjects: 0, createdNotifications: 0, sentEmails: 0, dryRun };
  }

  // 2) Fetch resume resource pointers (active versions)
  const projectIds = projectRows.map((p) => p.id);
  const { data: resources, error: resError } = await supabaseAdmin
    .from("resources")
    .select("project_id, resource_type, current_version_id")
    .in("project_id", projectIds)
    .in("resource_type", ["PROJECT_RESUME", "BORROWER_RESUME"]);
  if (resError) throw new Error(`resources_fetch_failed:${resError.message}`);
  const resourceRows = (resources ?? []) as ResourceRow[];

  const projectResumeIds: string[] = [];
  const borrowerResumeIds: string[] = [];
  const resourceByProject = new Map<
    string,
    { projectResumeId: string | null; borrowerResumeId: string | null }
  >();
  for (const r of resourceRows) {
    const entry = resourceByProject.get(r.project_id) ?? {
      projectResumeId: null,
      borrowerResumeId: null,
    };
    if (r.resource_type === "PROJECT_RESUME") entry.projectResumeId = r.current_version_id;
    if (r.resource_type === "BORROWER_RESUME") entry.borrowerResumeId = r.current_version_id;
    resourceByProject.set(r.project_id, entry);
  }
  for (const entry of resourceByProject.values()) {
    if (entry.projectResumeId) projectResumeIds.push(entry.projectResumeId);
    if (entry.borrowerResumeId) borrowerResumeIds.push(entry.borrowerResumeId);
  }

  // 3) Fetch active resume rows by ID
  const projectResumeMap = new Map<string, ResumeRow>();
  const borrowerResumeMap = new Map<string, ResumeRow>();

  if (projectResumeIds.length) {
    const { data, error } = await supabaseAdmin
      .from("project_resumes")
      .select("id, project_id, completeness_percent, updated_at")
      .in("id", projectResumeIds);
    if (error) throw new Error(`project_resumes_fetch_failed:${error.message}`);
    for (const row of (data ?? []) as ResumeRow[]) projectResumeMap.set(row.project_id, row);
  }

  if (borrowerResumeIds.length) {
    const { data, error } = await supabaseAdmin
      .from("borrower_resumes")
      .select("id, project_id, completeness_percent, updated_at")
      .in("id", borrowerResumeIds);
    if (error) throw new Error(`borrower_resumes_fetch_failed:${error.message}`);
    for (const row of (data ?? []) as ResumeRow[]) borrowerResumeMap.set(row.project_id, row);
  }

  // 4) Fetch org owners (borrower users) for all project owner_org_ids
  const orgIds = Array.from(new Set(projectRows.map((p) => p.owner_org_id)));
  const { data: owners, error: ownersError } = await supabaseAdmin
    .from("org_members")
    .select("org_id, user_id")
    .in("org_id", orgIds)
    .eq("role", "owner");
  if (ownersError) throw new Error(`owners_fetch_failed:${ownersError.message}`);
  const ownerRows = (owners ?? []) as OwnerRow[];

  const ownerIds = Array.from(new Set(ownerRows.map((o) => o.user_id)));
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, app_role, full_name")
    .in("id", ownerIds);
  if (profilesError) throw new Error(`profiles_fetch_failed:${profilesError.message}`);
  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p);

  // Preferences (project + global) for these users for our event type.
  const { data: prefs, error: prefsError } = await supabaseAdmin
    .from("user_notification_preferences")
    .select("user_id, scope_type, scope_id, event_type, channel, status")
    .in("user_id", ownerIds)
    .in("scope_type", ["global", "project"]);
  if (prefsError) throw new Error(`prefs_fetch_failed:${prefsError.message}`);
  const prefRows = (prefs ?? []) as PreferenceRow[];

  const prefsByUser = new Map<string, PreferenceRow[]>();
  for (const pref of prefRows) {
    const arr = prefsByUser.get(pref.user_id) ?? [];
    arr.push(pref);
    prefsByUser.set(pref.user_id, arr);
  }

  // Email rate limit: max 3/week per user
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const emailCounts = new Map<string, number>();
  if (ownerIds.length) {
    const { data: recentEmailLogs, error: emailLogError } = await supabaseAdmin
      .from("resume_nudge_log")
      .select("user_id")
      .eq("channel", "email")
      .gte("sent_at", sevenDaysAgo)
      .in("user_id", ownerIds);
    if (emailLogError) throw new Error(`email_log_fetch_failed:${emailLogError.message}`);
    for (const row of (recentEmailLogs ?? []) as { user_id: string }[]) {
      emailCounts.set(row.user_id, (emailCounts.get(row.user_id) ?? 0) + 1);
    }
  }

  // Project -> owners map
  const ownersByOrg = new Map<string, string[]>();
  for (const o of ownerRows) {
    const arr = ownersByOrg.get(o.org_id) ?? [];
    arr.push(o.user_id);
    ownersByOrg.set(o.org_id, arr);
  }

  let createdNotifications = 0;
  let sentEmails = 0;
  let processedProjects = 0;
  const preview: any[] = [];

  // Workspace activity (last_visited_at / last_step_id / last_resume_edit_at)
  const activityByProjectUser = new Map<string, WorkspaceActivityRow>();
  if (ownerIds.length && projectIds.length) {
    const { data: activityRows, error: activityError } = await supabaseAdmin
      .from("project_workspace_activity")
      .select("project_id, user_id, last_visited_at, last_step_id, last_resume_edit_at")
      .in("project_id", projectIds)
      .in("user_id", ownerIds);
    if (activityError) throw new Error(`workspace_activity_fetch_failed:${activityError.message}`);
    for (const row of (activityRows ?? []) as WorkspaceActivityRow[]) {
      activityByProjectUser.set(`${row.project_id}:${row.user_id}`, row);
    }
  }

  for (const project of projectRows) {
    const projectResume = projectResumeMap.get(project.id) ?? null;
    const borrowerResume = borrowerResumeMap.get(project.id) ?? null;

    const projectPercent = clampPercent(projectResume?.completeness_percent ?? 0);
    const borrowerPercent = clampPercent(borrowerResume?.completeness_percent ?? 0);
    const overall = Math.round((projectPercent + borrowerPercent) / 2);

    if (overall >= 100) continue;

    const ownerUserIds = ownersByOrg.get(project.owner_org_id) ?? [];
    if (!ownerUserIds.length) continue;

    const borrowerOwners = ownerUserIds.filter((userId) => {
      const profile = profileMap.get(userId);
      return profile?.app_role === "borrower";
    });
    if (!borrowerOwners.length) continue;

    for (const userId of borrowerOwners) {
      const activity = activityByProjectUser.get(`${project.id}:${userId}`) ?? null;
      const { lastActivityAt, lastStepId } = pickLastActivityForUser(
        now,
        project,
        projectResume,
        borrowerResume,
        activity
      );

      const { stage, minutesInactive } = computeNudgeStage(now, lastActivityAt, {
        firstStageMinutes,
        secondStageMinutes,
      });
      const nextInfo = computeNextNotificationInfo(now, lastActivityAt, {
        firstStageMinutes,
        secondStageMinutes,
      });
      if (!stage) {
        if (dryRun && preview.length < previewLimit) {
          preview.push({
            project_id: project.id,
            project_name: project.name,
            user_id: userId,
            borrower_percent: borrowerPercent,
            project_percent: projectPercent,
            overall_percent: overall,
            last_step_id: lastStepId,
            last_activity_at: lastActivityAt.toISOString(),
            minutes_inactive: minutesInactive,
            eligible_stage_now: null,
            next_stage: nextInfo.nextStage,
            minutes_until_next: nextInfo.minutesUntilNext,
            seconds_until_next: nextInfo.secondsUntilNext,
            will_send_now: false,
            reason: "not_yet_due",
          });
        }
        continue;
      }

      // If user hasn't started anything, don't nag at 45m; start at 24h.
      const hasMeaningfulEdit = Boolean(activity?.last_resume_edit_at);
      if (stage === "t45m" && isNotStarted(borrowerPercent, projectPercent) && !hasMeaningfulEdit) {
        if (dryRun && preview.length < previewLimit) {
          preview.push({
            project_id: project.id,
            project_name: project.name,
            user_id: userId,
            borrower_percent: borrowerPercent,
            project_percent: projectPercent,
            overall_percent: overall,
            last_step_id: lastStepId,
            last_activity_at: lastActivityAt.toISOString(),
            minutes_inactive: minutesInactive,
            eligible_stage_now: stage,
            next_stage: nextInfo.nextStage,
            minutes_until_next: nextInfo.minutesUntilNext,
            seconds_until_next: nextInfo.secondsUntilNext,
            will_send_now: false,
            reason: "not_started_skip_first_stage",
          });
        }
        continue;
      }

      const focus = resolveResumeFocus(lastStepId, borrowerPercent, projectPercent);
      if (focus === "both") continue;

      processedProjects += 1;

      const anchorActivityAtIso = lastActivityAt.toISOString();
      const linkUrl = buildWorkspaceLink(project.id, lastStepId);

      const title = buildTitle({ focus, stage, projectName: project.name });
      const body = buildBody({
        focus,
        stage,
        borrowerPercent,
        projectPercent,
        overallPercent: overall,
        projectName: project.name,
        minutesInactive,
      });

      if (dryRun && preview.length < previewLimit) {
        preview.push({
          project_id: project.id,
          project_name: project.name,
          user_id: userId,
          borrower_percent: borrowerPercent,
          project_percent: projectPercent,
          overall_percent: overall,
          last_step_id: lastStepId,
          focus,
          last_activity_at: lastActivityAt.toISOString(),
          minutes_inactive: minutesInactive,
          eligible_stage_now: stage,
          next_stage: nextInfo.nextStage,
          minutes_until_next: nextInfo.minutesUntilNext,
          seconds_until_next: nextInfo.secondsUntilNext,
          will_send_now: true,
          link_url: linkUrl,
          title,
          body,
        });
      }

      // Create a domain event per user+project+stage+focus session (so event payload matches the recipient)
      const { data: domainEvent, error: eventError } = await supabaseAdmin
        .from("domain_events")
        .insert({
          event_type: EVENT_TYPE,
          actor_id: null,
          project_id: project.id,
          payload: {
            stage,
            focus,
            borrower_percent: borrowerPercent,
            project_percent: projectPercent,
            overall_percent: overall,
            minutes_inactive: minutesInactive,
            anchor_activity_at: anchorActivityAtIso,
            last_step_id: lastStepId ?? null,
          },
          occurred_at: now.toISOString(),
        })
        .select("id")
        .single();
      if (eventError) {
        console.error("[resume-nudges] Failed to create domain event:", eventError);
        continue;
      }

      // In-app notifications (all stages)
      const inAppMuted = isMuted(prefsByUser.get(userId) ?? [], {
        channel: "in_app",
        projectId: project.id,
        eventType: EVENT_TYPE,
      });

      if (!inAppMuted) {
        const canInsert = await canSendLogRow({
          supabaseAdmin,
          projectId: project.id,
          userId,
          channel: "in_app",
          stage,
          focus,
          anchorActivityAtIso,
        });

        if (canInsert) {
          if (!dryRun) {
            const { error: notifError } = await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              event_id: domainEvent.id,
              title,
              body,
              link_url: linkUrl,
              payload: {
                type: "resume_nudge",
                stage,
                focus,
                borrower_percent: borrowerPercent,
                project_percent: projectPercent,
                overall_percent: overall,
                last_step_id: lastStepId ?? null,
              },
              created_at: now.toISOString(),
            });
            if (!notifError) {
              createdNotifications += 1;
            } else {
              console.error("[resume-nudges] Notification insert failed:", notifError);
            }
          }

          if (!dryRun) {
            await insertLogRow({
              supabaseAdmin,
              projectId: project.id,
              userId,
              channel: "in_app",
              stage,
              focus,
              anchorActivityAtIso,
              eventId: domainEvent.id,
              sentAtIso: now.toISOString(),
            });
          }
        }
      }

      // Email nudges (not for t45m)
      if (stage !== "t45m") {
        const emailMuted = isMuted(prefsByUser.get(userId) ?? [], {
          channel: "email",
          projectId: project.id,
          eventType: EVENT_TYPE,
        });
        if (emailMuted) continue;

        // Respect weekly user-level email cap
        const currentCount = emailCounts.get(userId) ?? 0;
        if (currentCount >= 3) continue;

        const canInsert = await canSendLogRow({
          supabaseAdmin,
          projectId: project.id,
          userId,
          channel: "email",
          stage,
          focus,
          anchorActivityAtIso,
        });

        if (!canInsert) continue;

        const profile = profileMap.get(userId);
        const toEmail = profile?.email;
        if (!toEmail) continue;

        const subject = EMAIL_SUBJECT_BY_STAGE[stage] ?? "Complete your resumes";
        const emailHtml = buildEmailHtml({
          projectName: project.name,
          linkUrl,
          focus,
          borrowerPercent,
          projectPercent,
          overallPercent: overall,
        });

        if (!dryRun) {
          const sendResult = await sendEmail({
            to: toEmail,
            subject,
            html: emailHtml,
            text: stripMarkdown(body) + `\n\nContinue: ${linkUrl}`,
          });

          if (sendResult.ok) {
            sentEmails += 1;
            emailCounts.set(userId, currentCount + 1);
          } else {
            // If provider is missing, we still log nothing to avoid "burning" the cadence.
            if (sendResult.provider !== "none") {
              console.error("[resume-nudges] Email send failed:", sendResult);
            }
            continue;
          }

          await insertLogRow({
            supabaseAdmin,
            projectId: project.id,
            userId,
            channel: "email",
            stage,
            focus,
            anchorActivityAtIso,
            eventId: domainEvent.id,
            sentAtIso: now.toISOString(),
          });
        }
      }
    }
  }

  return { processedProjects, createdNotifications, sentEmails, dryRun, preview: dryRun ? preview : undefined };
}

function computeNextNotificationInfo(
  now: Date,
  lastActivityAt: Date,
  opts: { firstStageMinutes?: number; secondStageMinutes?: number }
): {
  nextStage: string | null;
  minutesUntilNext: number | null;
  secondsUntilNext: number | null;
} {
  const msInactive = now.getTime() - lastActivityAt.getTime();
  const minutesInactive = Math.floor(msInactive / (60 * 1000));
  const firstStageMinutes =
    typeof opts.firstStageMinutes === "number" && Number.isFinite(opts.firstStageMinutes)
      ? Math.max(1, Math.floor(opts.firstStageMinutes))
      : 45;
  const secondStageMinutesRaw =
    typeof opts.secondStageMinutes === "number" && Number.isFinite(opts.secondStageMinutes)
      ? Math.max(1, Math.floor(opts.secondStageMinutes))
      : 24 * 60;
  const secondStageMinutes = Math.max(secondStageMinutesRaw, firstStageMinutes + 1);

  const thresholds = [
    { stage: "t45m", minutes: firstStageMinutes },
    { stage: "t24h", minutes: secondStageMinutes },
    { stage: "t3d", minutes: 3 * 24 * 60 },
    { stage: "t7d", minutes: 7 * 24 * 60 },
  ];

  // Next stage is the first threshold strictly greater than current inactivity.
  const next = thresholds.find((t) => minutesInactive < t.minutes) ?? null;
  if (!next) return { nextStage: null, minutesUntilNext: null, secondsUntilNext: null };

  const nextAtMs = lastActivityAt.getTime() + next.minutes * 60 * 1000;
  const secondsUntilNext = Math.max(0, Math.ceil((nextAtMs - now.getTime()) / 1000));
  return {
    nextStage: next.stage,
    minutesUntilNext: Math.max(0, next.minutes - minutesInactive),
    secondsUntilNext,
  };
}

function pickLastActivityForUser(
  now: Date,
  project: ProjectRow,
  projectResume: ResumeRow | null,
  borrowerResume: ResumeRow | null,
  activity: WorkspaceActivityRow | null
) {
  const candidates: Date[] = [new Date(project.created_at)];
  if (projectResume?.updated_at) candidates.push(new Date(projectResume.updated_at));
  if (borrowerResume?.updated_at) candidates.push(new Date(borrowerResume.updated_at));
  if (activity?.last_visited_at) candidates.push(new Date(activity.last_visited_at));
  if (activity?.last_resume_edit_at) candidates.push(new Date(activity.last_resume_edit_at));
  // If parsing fails for any reason, default to now so we don't spam.
  const valid = candidates.filter((d) => Number.isFinite(d.getTime()));
  if (!valid.length) {
    return {
      lastActivityAt: now,
      lastStepId: activity?.last_step_id ?? null,
    };
  }
  return {
    lastActivityAt: new Date(Math.max(...valid.map((d) => d.getTime()))),
    lastStepId: activity?.last_step_id ?? null,
  };
}

function buildWorkspaceLink(projectId: string, lastStepId: string | null) {
  const base = `/project/workspace/${projectId}`;
  if (!lastStepId) return base;
  return `${base}?step=${encodeURIComponent(lastStepId)}`;
}

function buildTitle({
  focus,
  stage,
  projectName,
}: {
  focus: string;
  stage: string;
  projectName: string;
}) {
  const prefix = focus === "borrower" ? "Complete your Borrower Resume" : "Complete your Project Resume";
  if (stage === "t45m") return `${prefix} to unlock your OM`;
  return `${prefix} - ${projectName}`;
}

function buildBody({
  focus,
  stage,
  borrowerPercent,
  projectPercent,
  overallPercent,
  projectName,
  minutesInactive,
}: {
  focus: string;
  stage: string;
  borrowerPercent: number;
  projectPercent: number;
  overallPercent: number;
  projectName: string;
  minutesInactive: number;
}) {
  const focusLabel = focus === "borrower" ? "Borrower Resume" : "Project Resume";
  const base = `**${projectName}** is **${overallPercent}%** ready for your Offering Memorandum.`;
  const progressFooter =
    `Current Progress -\n` +
    `Borrower Resume: ${borrowerPercent}%\n` +
    `Project Resume: ${projectPercent}%`;
  if (stage === "t45m") {
    return `${base} It looks like you paused ${minutesInactive} minutes ago. Finish your **${focusLabel}** to unlock a lender-ready OM.\n\n${progressFooter}`;
  }
  return `${base} Finish your **${focusLabel}** to unlock a lender-ready OM.\n\n${progressFooter}`;
}

function buildEmailHtml({
  projectName,
  linkUrl,
  focus,
  borrowerPercent,
  projectPercent,
  overallPercent,
}: {
  projectName: string;
  linkUrl: string;
  focus: string;
  borrowerPercent: number;
  projectPercent: number;
  overallPercent: number;
}) {
  const focusLabel = focus === "borrower" ? "Borrower Resume" : "Project Resume";
  const safeLink = escapeHtml(linkUrl);
  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.4;">
      <h2 style="margin:0 0 8px 0;">Finish your resumes to unlock your Offering Memorandum</h2>
      <p style="margin:0 0 12px 0;"><b>${escapeHtml(projectName)}</b> is <b>${overallPercent}%</b> ready.</p>
      <p style="margin:0 0 12px 0;">Next up: <b>${escapeHtml(focusLabel)}</b></p>
      <ul style="margin:0 0 16px 20px; padding:0;">
        <li>Borrower Resume: <b>${borrowerPercent}%</b></li>
        <li>Project Resume: <b>${projectPercent}%</b></li>
      </ul>
      <a href="${safeLink}" style="display:inline-block; padding:10px 14px; background:#2563eb; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
        Continue in CapMatch
      </a>
      <p style="margin:16px 0 0 0; font-size:12px; color:#6b7280;">
        If this wasn’t you, you can ignore this message.
      </p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripMarkdown(md: string) {
  // very small helper: remove **bold** and newlines for a passable text fallback
  return md.replaceAll("**", "").replaceAll("\n\n", "\n");
}

function isMuted(
  prefs: PreferenceRow[],
  input: { channel: "in_app" | "email"; projectId: string; eventType: string }
) {
  // A preference row mutes if:
  // - status === muted
  // - channel matches (or '*')
  // - and scope matches global(*) OR project(*) for that project
  // - and event_type matches specific OR '*'
  const candidates = prefs.filter((p) => p.status === "muted");
  const matches = (p: PreferenceRow) => {
    const channelOk = p.channel === input.channel || p.channel === "*";
    const eventOk = p.event_type === "*" || p.event_type === input.eventType;
    const scopeOk =
      (p.scope_type === "global" && (p.scope_id === null || p.scope_id === undefined)) ||
      (p.scope_type === "project" && p.scope_id === input.projectId);
    return channelOk && eventOk && scopeOk;
  };
  return candidates.some(matches);
}

async function canSendLogRow({
  supabaseAdmin,
  projectId,
  userId,
  channel,
  stage,
  focus,
  anchorActivityAtIso,
}: {
  supabaseAdmin: any;
  projectId: string;
  userId: string;
  channel: "in_app" | "email";
  stage: string;
  focus: string;
  anchorActivityAtIso: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("resume_nudge_log")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("stage", stage)
    .eq("resume_focus", focus)
    .eq("anchor_activity_at", anchorActivityAtIso)
    .limit(1);
  if (error) {
    console.error("[resume-nudges] canSendLogRow lookup failed:", error);
    // Fail closed: don't send if we can't dedupe safely.
    return false;
  }
  return !data || data.length === 0;
}

async function insertLogRow({
  supabaseAdmin,
  projectId,
  userId,
  channel,
  stage,
  focus,
  anchorActivityAtIso,
  eventId,
  sentAtIso,
}: {
  supabaseAdmin: any;
  projectId: string;
  userId: string;
  channel: "in_app" | "email";
  stage: string;
  focus: string;
  anchorActivityAtIso: string;
  eventId: number;
  sentAtIso: string;
}) {
  const { error } = await supabaseAdmin.from("resume_nudge_log").insert({
    project_id: projectId,
    user_id: userId,
    channel,
    stage,
    resume_focus: focus,
    anchor_activity_at: anchorActivityAtIso,
    event_id: eventId,
    sent_at: sentAtIso,
  });
  if (error) {
    // Unique conflicts are expected on race; log and continue.
    console.warn("[resume-nudges] insertLogRow failed:", error);
  }
}

async function safeJson<T>(req: Request): Promise<T | null> {
  const raw = await req.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


