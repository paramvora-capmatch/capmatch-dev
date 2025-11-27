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

  const notificationPayload = buildDocumentPayload(event);
  const rows = recipientsToInsert.map((userId) => ({
    user_id: userId,
    event_id: event.id,
    ...notificationPayload,
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

      // 5. Determine Notification Type
      const isMentioned = mentionedUserIds.includes(userId);
      
      if (isMentioned) {
          // MENTIONS: Always create a new, distinct notification
          // Use full_content to ensure all mentions are complete and renderable
          const { error } = await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              event_id: event.id,
              title: `${senderName} mentioned you in ${threadLabel} - ${projectName}`,
              body: fullContent,
              link_url: `/project/workspace/${projectId}?tab=chat&thread=${event.thread_id}`,
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
                  link_url: `/project/workspace/${projectId}?tab=chat&thread=${event.thread_id}`,
                  payload: threadPayloadBase
              });
              if (!error) insertedCount++;
          }
      }
  }

  return jsonResponse({ inserted: insertedCount, updated: updatedCount });
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

function buildDocumentPayload(event: DomainEventRow) {
  const fileName = (event.payload?.fileName as string | undefined) ?? "A new file";
  const linkUrl = event.resource_id ? `/project/workspace/${event.project_id}?resourceId=${event.resource_id}` : `/project/workspace/${event.project_id}`;
  return {
    title: "Document uploaded",
    body: `New file "${fileName}" was uploaded to this project.`,
    link_url: linkUrl,
  };
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

