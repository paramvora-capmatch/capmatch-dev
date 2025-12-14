import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type DomainEventRow = {
  id: number;
  event_type: string;
  actor_id: string | null;
  project_id: string;
  resource_id: string | null;
  thread_id: string | null;
  meeting_id: string | null;
  occurred_at: string;
  payload: Record<string, unknown> | null;
  projects?: { owner_org_id: string | null } | null;
  resources?: { org_id: string | null } | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    "[notify-fan-out] Missing required Supabase environment variables"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Only used for validation, not for RLS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }

    const body = await safeJson(req);
    const eventId = parseEventId(body?.eventId ?? body?.event_id);
    
    if (!eventId) {
      return jsonResponse({ error: "eventId is required" }, 400);
    }

    // Fetch the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("domain_events")
      .select(`
        id,
        event_type,
        actor_id,
        project_id,
        resource_id,
        thread_id,
        meeting_id,
        occurred_at,
        payload,
        projects!domain_events_project_id_fkey(owner_org_id),
        resources:resources!domain_events_resource_id_fkey(org_id)
      `)
      .eq("id", eventId)
      .single<DomainEventRow>();

    if (eventError || !event) {
      console.error("[notify-fan-out] Event lookup failed:", eventError);
      return jsonResponse({ error: "domain_event not found" }, 404);
    }

    // Dispatch based on event type
    if (event.event_type === "document_uploaded") {
      return await handleDocumentUpload(supabaseAdmin, event);
    } else if (event.event_type === "chat_message_sent") {
      return await handleChatMessage(supabaseAdmin, event);
    } else if (event.event_type === "meeting_invited") {
      return await handleMeetingInvitation(supabaseAdmin, event);
    } else if (event.event_type === "meeting_updated") {
      return await handleMeetingUpdate(supabaseAdmin, event);
    } else if (event.event_type === "meeting_reminder") {
      return await handleMeetingReminder(supabaseAdmin, event);
    } else if (event.event_type === "resume_incomplete_nudge") {
      return await handleResumeIncompleteNudge(supabaseAdmin, event);
    } else {
      return jsonResponse({ skipped: true, reason: "unsupported_event_type" });
    }

  } catch (error) {
    console.error("[notify-fan-out] Unexpected error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// =============================================================================
// Handler: Document Uploaded
// =============================================================================

async function handleDocumentUpload(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  const candidateIds = await collectCandidateUserIds(supabaseAdmin, event);
  if (!candidateIds.size) {
    return jsonResponse({ inserted: 0, reason: "no_candidates" });
  }

  const filteredUserIds = await filterByResourceAccess(
    supabaseAdmin,
    candidateIds,
    event.resource_id
  );

  const finalRecipientIds = filteredUserIds.filter(
    (id) => id && id !== event.actor_id
  );

  if (!finalRecipientIds.length) {
    return jsonResponse({ inserted: 0, reason: "no_authorized_recipients" });
  }

  // Filter by preferences
  const notifiedIds: string[] = [];
  for (const userId of finalRecipientIds) {
    const isMuted = await checkUserPreference(supabaseAdmin, userId, {
        scopeType: 'project',
        scopeId: event.project_id,
        eventType: 'document_uploaded',
        channel: 'in_app',
        projectId: event.project_id
    });
    if (!isMuted) {
        notifiedIds.push(userId);
    }
  }

  if (!notifiedIds.length) {
      return jsonResponse({ inserted: 0, reason: "all_muted" });
  }

  // Check for duplicates
  const alreadyNotified = await fetchExistingRecipients(supabaseAdmin, event.id);
  const recipientsToInsert = notifiedIds.filter((id) => !alreadyNotified.has(id));

  if (!recipientsToInsert.length) {
    return jsonResponse({ inserted: 0, reason: "already_notified" });
  }

  // Build notification payload with simple, role-agnostic URLs
  // Frontend will handle role-based routing
  const fileName = (event.payload?.fileName as string | undefined) ?? "A new file";
  const projectName = await getProjectName(supabaseAdmin, event.project_id);
  const basePath = `/project/workspace/${event.project_id}`;
  const linkUrl = event.resource_id 
    ? `${basePath}?resourceId=${event.resource_id}` 
    : basePath;
  
  const rows = recipientsToInsert.map((userId) => ({
    user_id: userId,
    event_id: event.id,
    title: `Document uploaded - ${projectName}`,
    body: `New file **"${fileName}"** was uploaded to **${projectName}**.`,
    link_url: linkUrl,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("notifications")
    .insert(rows);

  if (insertError) {
    console.error("[notify-fan-out] Failed to insert notifications:", insertError);
    return jsonResponse({ error: "notification_insert_failed" }, 500);
  }

  return jsonResponse({ inserted: rows.length });
}

// =============================================================================
// Handler: Chat Message Sent
// =============================================================================

async function handleChatMessage(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  if (!event.thread_id) {
      return jsonResponse({ error: "Missing thread_id for chat event" }, 400);
  }

  const threadInfo = await getThreadInfo(supabaseAdmin, event.thread_id);
  const threadName = threadInfo?.topic?.trim() || "thread";
  const threadLabel = threadName.startsWith("#") ? threadName : `#${threadName}`;
  const projectId = threadInfo?.project_id ?? event.project_id;
  const projectName = await getProjectName(supabaseAdmin, projectId);
  const threadDescriptor = threadLabel;
  const projectDescriptor = projectName || "this project";

  // 1. Get Participants (Candidates)
  const participants = await getThreadParticipants(supabaseAdmin, event.thread_id);
  
  // 2. Get Sender Name (for Friendly UI)
  const senderName = await getProfileName(supabaseAdmin, event.actor_id);
  
  const mentionedUserIds = (event.payload?.mentioned_user_ids as string[]) || [];
  // Use full_content for all notifications - preview generation moved to frontend
  const fullContent = (event.payload?.full_content as string) || "New message";

  const threadPayloadBase = {
    count: 1,
    thread_id: event.thread_id,
    thread_name: threadName,
    project_name: projectName,
    type: "thread_activity",
  };

  let insertedCount = 0;
  let updatedCount = 0;

  for (const participant of participants) {
      // Skip sender
      if (participant.user_id === event.actor_id) continue;
      
      const userId = participant.user_id;

      // 3. Check Access (Security)
      // We assume thread participants have access, but if we had strict RLS on threads, 
      // we'd check here. Since participants table *defines* access, this is redundant but safe.
      
      // 4. Check Preferences (Mute)
      const isMuted = await checkUserPreference(supabaseAdmin, userId, {
          scopeType: 'thread',
          scopeId: event.thread_id!,
          eventType: 'chat_message',
          channel: 'in_app',
          projectId,
      });
      
      if (isMuted) continue;

      // 5. Generate simple, role-agnostic URL - frontend will handle role-based routing
      const basePath = `/project/workspace/${projectId}`;
      const linkUrl = `${basePath}?tab=chat&thread=${event.thread_id}`;

      // 6. Determine Notification Type
      const isMentioned = mentionedUserIds.includes(userId);
      
      if (isMentioned) {
          // MENTIONS: Always create a new, distinct notification
          // Use full_content to ensure all mentions are complete and renderable
          const { error } = await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              event_id: event.id,
              title: `${senderName} mentioned you in ${threadLabel} - ${projectName}`,
              body: fullContent,
              link_url: linkUrl,
              payload: { ...threadPayloadBase, type: "mention" },
          });
          if (!error) insertedCount++;
      } else {
          // GENERAL: Aggregate if possible
          const { data: existingNotif } = await supabaseAdmin
              .from("notifications")
              .select("id, payload")
              .eq("user_id", userId)
              .is("read_at", null)
              .eq("payload->>thread_id", event.thread_id)
              .eq("payload->>type", "thread_activity")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

          if (existingNotif?.id) {
              const { error } = await supabaseAdmin.rpc('increment_notification_count', {
                  p_notification_id: existingNotif.id
              });
                  
              if (error) {
                  console.error("[notify-fan-out] Failed to increment notification:", error);
              } else {
                  updatedCount++;
              }
          } else {
              const { error } = await supabaseAdmin.from("notifications").insert({
                  user_id: userId,
                  event_id: event.id,
                  title: `New messages in ${projectDescriptor}`,
                  body: `1 new message in **${threadDescriptor}**`,
                  link_url: linkUrl,
                  payload: threadPayloadBase
              });
              if (!error) insertedCount++;
          }
      }
  }

  return jsonResponse({ inserted: insertedCount, updated: updatedCount });
}

// =============================================================================
// Handler: Meeting Invitation
// =============================================================================

async function handleMeetingInvitation(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  console.log("[notify-fan-out] Processing meeting invitation event:", {
    eventId: event.id,
    meetingId: event.meeting_id,
    payload: event.payload
  });
  
  // Extract invited user from payload
  const invitedUserId = event.payload?.invited_user_id as string | undefined;
  
  if (!invitedUserId || !event.meeting_id) {
    console.error("[notify-fan-out] Missing invited_user_id or meeting_id", {
      invitedUserId,
      meetingId: event.meeting_id,
      payload: event.payload
    });
    return jsonResponse({ inserted: 0, reason: "missing_required_data" });
  }

  // Check if notification already exists for this event
  const alreadyNotified = await fetchExistingRecipients(supabaseAdmin, event.id);
  if (alreadyNotified.has(invitedUserId)) {
    return jsonResponse({ inserted: 0, reason: "already_notified" });
  }

  // Check user preferences
  const isMuted = await checkUserPreference(supabaseAdmin, invitedUserId, {
    scopeType: event.project_id ? 'project' : 'global',
    scopeId: event.project_id || '',
    eventType: 'meeting_invited',
    channel: 'in_app',
    projectId: event.project_id || '',
  });

  if (isMuted) {
    return jsonResponse({ inserted: 0, reason: "user_muted" });
  }

  // Fetch organizer name
  const organizerName = await getProfileName(supabaseAdmin, event.actor_id);
  
  // Extract meeting details from payload
  const meetingTitle = (event.payload?.meeting_title as string) || "a meeting";
  const startTime = event.payload?.start_time as string;
  const meetingLink = event.payload?.meeting_link as string | undefined;

  // Fetch project name if applicable
  const projectName = event.project_id 
    ? await getProjectName(supabaseAdmin, event.project_id)
    : null;

  // Build notification title and body
  const title = projectName
    ? `${organizerName} invited you to a meeting - ${projectName}`
    : `${organizerName} invited you to a meeting`;
  
  let body = `**${meetingTitle}**`;
  if (startTime) {
    body += `\n{{meeting_time}}`;
  }

  // Generate link URL - always point to meetings tab in workspace/dashboard
  const linkUrl = event.project_id 
    ? `/project/workspace/${event.project_id}?tab=meetings`
    : `/dashboard?tab=meetings`;

  // Insert notification
  const { error: insertError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: invitedUserId,
      event_id: event.id,
      title,
      body,
      link_url: linkUrl,
      payload: {
        type: "meeting_invitation",
        meeting_id: event.meeting_id,
        meeting_title: meetingTitle,
        start_time: startTime,
        organizer_id: event.actor_id,
        organizer_name: organizerName,
        project_id: event.project_id,
        project_name: projectName,
      },
    });

  if (insertError) {
    console.error("[notify-fan-out] Failed to insert meeting notification:", insertError);
    return jsonResponse({ error: "notification_insert_failed" }, 500);
  }

  return jsonResponse({ inserted: 1 });
}

// =============================================================================
// Handler: Meeting Update
// =============================================================================

async function handleMeetingUpdate(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  console.log("[notify-fan-out] Processing meeting update event:", {
    eventId: event.id,
    meetingId: event.meeting_id,
    payload: event.payload
  });

  if (!event.meeting_id) {
    console.error("[notify-fan-out] Missing meeting_id");
    return jsonResponse({ inserted: 0, reason: "missing_meeting_id" });
  }

  // Fetch all participants except the organizer
  const { data: participants, error: partError } = await supabaseAdmin
    .from('meeting_participants')
    .select('user_id')
    .eq('meeting_id', event.meeting_id)
    .neq('user_id', event.actor_id);

  if (partError || !participants || participants.length === 0) {
    console.log("[notify-fan-out] No participants to notify");
    return jsonResponse({ inserted: 0, reason: "no_participants" });
  }

  // Fetch organizer name
  const organizerName = await getProfileName(supabaseAdmin, event.actor_id);
  
  // Extract meeting details from payload
  const meetingTitle = (event.payload?.meeting_title as string) || "a meeting";
  const startTime = event.payload?.start_time as string;
  const changes = event.payload?.changes as Record<string, unknown> || {};
  const meetingLink = event.payload?.meeting_link as string | undefined;

  // Fetch project name if applicable
  const projectName = event.project_id 
    ? await getProjectName(supabaseAdmin, event.project_id)
    : null;

  // Build notification title and body
  const title = projectName
    ? `${organizerName} updated a meeting - ${projectName}`
    : `${organizerName} updated a meeting`;
  
  let body = `**${meetingTitle}**`;
  if (startTime) {
    body += `\nNew time: {{meeting_time}}`;
  }
  
  // Add change details
  if (changes.timeChanged) {
    body += `\n Time has been changed`;
  }
  if (changes.participantsChanged) {
    body += `\n Participants updated`;
  }

  // Generate link URL - always point to meetings tab in workspace/dashboard
  const linkUrl = event.project_id 
    ? `/project/workspace/${event.project_id}?tab=meetings`
    : `/dashboard?tab=meetings`;

  let insertedCount = 0;

  // Create notifications for all participants
  for (const participant of participants) {
    // Check if already notified for this event
    const alreadyNotified = await fetchExistingRecipients(supabaseAdmin, event.id);
    if (alreadyNotified.has(participant.user_id)) {
      continue;
    }

    // Check user preferences
    const isMuted = await checkUserPreference(supabaseAdmin, participant.user_id, {
      scopeType: event.project_id ? 'project' : 'global',
      scopeId: event.project_id || '',
      eventType: 'meeting_updated',
      channel: 'in_app',
      projectId: event.project_id || '',
    });

    if (isMuted) {
      continue;
    }

    // Insert notification
    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: participant.user_id,
        event_id: event.id,
        title,
        body,
        link_url: linkUrl,
        payload: {
          type: "meeting_update",
          meeting_id: event.meeting_id,
          meeting_title: meetingTitle,
          start_time: startTime,
          organizer_id: event.actor_id,
          organizer_name: organizerName,
          project_id: event.project_id,
          project_name: projectName,
          changes,
        },
      });

    if (!insertError) {
      insertedCount++;
    } else {
      console.error("[notify-fan-out] Failed to insert notification:", insertError);
    }
  }

  return jsonResponse({ inserted: insertedCount });
}

// =============================================================================
// Handler: Meeting Reminder
// =============================================================================

async function handleMeetingReminder(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  console.log("[notify-fan-out] Processing meeting reminder event:", {
    eventId: event.id,
    meetingId: event.meeting_id,
    payload: event.payload
  });

  if (!event.meeting_id) {
    console.error("[notify-fan-out] Missing meeting_id");
    return jsonResponse({ inserted: 0, reason: "missing_meeting_id" });
  }

  const userId = event.payload?.user_id as string | undefined;
  
  if (!userId) {
    console.error("[notify-fan-out] Missing user_id in payload");
    return jsonResponse({ inserted: 0, reason: "missing_user_id" });
  }

  // Check if already notified for this event
  const alreadyNotified = await fetchExistingRecipients(supabaseAdmin, event.id);
  if (alreadyNotified.has(userId)) {
    return jsonResponse({ inserted: 0, reason: "already_notified" });
  }

  // Check user preferences
  const isMuted = await checkUserPreference(supabaseAdmin, userId, {
    scopeType: event.project_id ? 'project' : 'global',
    scopeId: event.project_id || '',
    eventType: 'meeting_reminder',
    channel: 'in_app',
    projectId: event.project_id || '',
  });

  if (isMuted) {
    return jsonResponse({ inserted: 0, reason: "user_muted" });
  }

  // Extract meeting details from payload
  const meetingTitle = (event.payload?.meeting_title as string) || "a meeting";
  const startTime = event.payload?.start_time as string;
  const meetingLink = event.payload?.meeting_link as string | undefined;
  const reminderMinutes = event.payload?.reminder_minutes as number || 30;
  
  // Format the start time for display (UTC, users will interpret in their timezone)
  let timeDisplay = "";
  if (startTime) {
    const date = new Date(startTime);
    timeDisplay = date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Fetch project name if applicable
  const projectName = event.project_id 
    ? await getProjectName(supabaseAdmin, event.project_id)
    : null;

  // Build notification title and body
  const title = `Reminder: Meeting in ${reminderMinutes} minutes`;
  
  let body = `**${meetingTitle}**`;
  if (timeDisplay) {
    body += `\nStarts at ${timeDisplay}`;
  }
  if (projectName) {
    body += `\n${projectName}`;
  }

  // Generate link URL - always point to meetings tab
  const linkUrl = event.project_id 
    ? `/project/workspace/${event.project_id}?tab=meetings`
    : `/dashboard?tab=meetings`;

  // Insert notification
  const { error: insertError } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      event_id: event.id,
      title,
      body,
      link_url: linkUrl,
      payload: {
        type: "meeting_reminder",
        meeting_id: event.meeting_id,
        meeting_title: meetingTitle,
        start_time: startTime,
        meeting_link: meetingLink,
        project_id: event.project_id,
        project_name: projectName,
        reminder_minutes: reminderMinutes,
      },
    });

  if (insertError) {
    console.error("[notify-fan-out] Failed to insert meeting reminder notification:", insertError);
    return jsonResponse({ error: "notification_insert_failed" }, 500);
  }

  return jsonResponse({ inserted: 1 });
}

// =============================================================================
// Handler: Resume Incomplete Nudge
// =============================================================================

async function handleResumeIncompleteNudge(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  console.log("[notify-fan-out] Processing resume incomplete nudge event:", {
    eventId: event.id,
    projectId: event.project_id,
    payload: event.payload
  });

  if (!event.project_id) {
    console.error("[notify-fan-out] Missing project_id");
    return jsonResponse({ inserted: 0, reason: "missing_project_id" });
  }

  const payload = event.payload as any;
  const resumeType = payload?.resume_type as "project" | "borrower" | undefined;
  const completionPercent = payload?.completion_percent as number | undefined;
  const nudgeTier = payload?.nudge_tier as number | undefined;
  const userId = payload?.user_id as string | undefined;

  if (!resumeType || completionPercent === undefined || !nudgeTier || !userId) {
    console.error("[notify-fan-out] Missing required payload fields");
    return jsonResponse({ inserted: 0, reason: "missing_payload_fields" });
  }

  // Get project name and owner info
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("owner_org_id")
    .eq("id", event.project_id)
    .single();

  if (projectError || !project) {
    console.error("[notify-fan-out] Error fetching project:", projectError);
    return jsonResponse({ inserted: 0, reason: "project_not_found" });
  }

  // Get project name
  const projectName = await getProjectName(supabaseAdmin, event.project_id);

  // Get all org owners for this project
  const { data: owners, error: ownersError } = await supabaseAdmin
    .from("org_members")
    .select("user_id")
    .eq("org_id", project.owner_org_id)
    .eq("role", "owner");

  if (ownersError || !owners || owners.length === 0) {
    console.error("[notify-fan-out] Error fetching owners:", ownersError);
    return jsonResponse({ inserted: 0, reason: "no_owners_found" });
  }

  // Notify all project owners (not just the user who edited)
  // We'll create notifications for each owner

  // Build notification title and body based on tier
  const resumeTypeLabel = resumeType === "project" ? "Project" : "Borrower";
  const title = `Complete your ${resumeTypeLabel} Resume`;
  
  let body = `Your ${resumeType.toLowerCase()} resume for **${projectName}** is **${completionPercent}%** complete. Finish it to generate your OM!`;

  // Generate link URL
  const linkUrl = `/project/workspace/${event.project_id}`;

  let insertedCount = 0;

  // Create notifications for all project owners
  for (const owner of owners) {
    const ownerUserId = owner.user_id;

    // Check if notification already exists for this owner/event
    const { data: existingNotif } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingNotif) {
      continue; // Skip if already notified for this event
    }

    // Also check if a notification with same tier already exists for this owner
    const { data: existingTierNotif } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("payload->>type", "resume_incomplete_nudge")
      .eq("payload->>resume_type", resumeType)
      .eq("payload->>nudge_tier", nudgeTier.toString())
      .eq("payload->>project_id", event.project_id)
      .maybeSingle();

    if (existingTierNotif) {
      continue; // Skip if tier already sent to this owner
    }

    // Insert notification for this owner
    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: ownerUserId,
        event_id: event.id,
        title,
        body,
        link_url: linkUrl,
        payload: {
          type: "resume_incomplete_nudge",
          resume_type: resumeType,
          completion_percent: completionPercent,
          nudge_tier: nudgeTier,
          project_id: event.project_id,
          project_name: projectName,
        },
      });

    if (insertError) {
      console.error(`[notify-fan-out] Failed to insert notification for owner ${ownerUserId}:`, insertError);
    } else {
      insertedCount++;
    }
  }

  console.log(`[notify-fan-out] Created ${insertedCount} resume nudge notification(s) for project owners, tier ${nudgeTier}`);
  return jsonResponse({ inserted: insertedCount });
}

// =============================================================================
// Helpers
// =============================================================================

async function checkUserPreference(
    supabaseAdmin: SupabaseClient, 
    userId: string, 
    ctx: { scopeType: string, scopeId: string, eventType: string, channel: string, projectId: string }
): Promise<boolean> {
    // Checks for 'muted' status in hierarchy: Thread -> Project -> Global
    // Returns TRUE if muted.
    
    // Simplified Query:
    const { data: prefs } = await supabaseAdmin
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", userId);
        
    if (!prefs || !prefs.length) return false; // Default: Not muted
    
    // Logic: Find most specific matching preference
    // Hierarchy: Thread > Project > Global
    
    const relevant = prefs.filter(p => 
        (p.event_type === ctx.eventType || p.event_type === '*') &&
        (p.channel === ctx.channel || p.channel === '*')
    );
    
    // Check Thread
    const threadPref = relevant.find(p => p.scope_type === 'thread' && p.scope_id === ctx.scopeId);
    if (threadPref) return threadPref.status === 'muted';
    
    // Check Project
    const projectPref = relevant.find(p => p.scope_type === 'project' && p.scope_id === ctx.projectId);
    if (projectPref) return projectPref.status === 'muted';
    
    // Check Global
    const globalPref = relevant.find(p => p.scope_type === 'global');
    if (globalPref) return globalPref.status === 'muted';
    
    return false;
}

async function getThreadParticipants(supabaseAdmin: SupabaseClient, threadId: string) {
    const { data, error } = await supabaseAdmin
        .from("chat_thread_participants")
        .select("user_id")
        .eq("thread_id", threadId);
    
    if (error) {
        console.error("Error fetching participants", error);
        return [];
    }
    return data ?? [];
}

async function getProfileName(supabaseAdmin: SupabaseClient, userId: string | null) {
    if (!userId) return "Someone";
    const { data } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", userId).single();
    return data?.full_name || data?.email || "Someone";
}

async function getProjectName(supabaseAdmin: SupabaseClient, projectId: string) {
    const { data } = await supabaseAdmin.from("projects").select("name").eq("id", projectId).single();
    return data?.name || "Project";
}

async function getThreadInfo(supabaseAdmin: SupabaseClient, threadId: string) {
    const { data, error } = await supabaseAdmin
        .from("chat_threads")
        .select("id, topic, project_id")
        .eq("id", threadId)
        .single();

    if (error) {
        console.error("[notify-fan-out] Failed to fetch thread info:", error);
        return null;
    }

    return data;
}

// --- Existing Helpers (Document) ---

async function collectCandidateUserIds(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  const ids = new Set<string>();
  const { data: grantRows } = await supabaseAdmin.from("project_access_grants").select("user_id").eq("project_id", event.project_id);
  (grantRows ?? []).forEach((row: { user_id: string | null }) => { if (row.user_id) ids.add(row.user_id); });

  const orgId = event.resources?.org_id ?? event.projects?.owner_org_id ?? null;
  if (orgId) {
    const { data: ownerRows } = await supabaseAdmin.from("org_members").select("user_id").eq("org_id", orgId).eq("role", "owner");
    (ownerRows ?? []).forEach((row: { user_id: string | null }) => { if (row.user_id) ids.add(row.user_id); });
  }
  return ids;
}

async function filterByResourceAccess(
  supabaseAdmin: SupabaseClient,
  candidateIds: Set<string>,
  resourceId: string | null
) {
  if (!resourceId) return Array.from(candidateIds);
  const results: string[] = [];
  await Promise.all(
    Array.from(candidateIds).map(async (userId) => {
      const { data } = await supabaseAdmin.rpc("can_view", { p_user_id: userId, p_resource_id: resourceId });
      if (data === true) results.push(userId);
    })
  );
  return results;
}

async function fetchExistingRecipients(
  supabaseAdmin: SupabaseClient,
  eventId: number
) {
  const existing = new Set<string>();
  const { data } = await supabaseAdmin.from("notifications").select("user_id").eq("event_id", eventId);
  (data ?? []).forEach((row: { user_id: string | null }) => { if (row.user_id) existing.add(row.user_id); });
  return existing;
}

async function safeJson(req: Request) {
  try { if (req.bodyUsed) return {}; return await req.json(); } catch { return {}; }
}

function parseEventId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
  return null;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

