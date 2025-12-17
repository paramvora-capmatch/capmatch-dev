import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// 3 hours in milliseconds
const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[unread-thread-nudges] Missing required Supabase environment variables"
  );
}

type RequestBody = {
  dryRun?: boolean;
  nowIso?: string; // For deterministic testing
  thresholdMinutes?: number; // Override threshold for testing (default: 180 = 3h)
};

type StaleThreadRow = {
  thread_id: string;
  project_id: string;
  topic: string | null;
  user_id: string;
  last_read_at: string;
  latest_message_at: string;
  latest_sender_id: string;
  unread_count: number;
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
    const thresholdMs =
      typeof body?.thresholdMinutes === "number"
        ? body.thresholdMinutes * 60 * 1000
        : STALE_THRESHOLD_MS;

    const result = await processUnreadThreadNudges({
      supabaseAdmin,
      now,
      dryRun,
      thresholdMs,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[unread-thread-nudges] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processUnreadThreadNudges({
  supabaseAdmin,
  now,
  dryRun,
  thresholdMs,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  now: Date;
  dryRun: boolean;
  thresholdMs: number;
}): Promise<{
  processed: number;
  eventsCreated: number;
  dryRun: boolean;
  preview?: unknown[];
}> {
  console.log(
    `[unread-thread-nudges] Starting processing. dryRun=${dryRun}, threshold=${thresholdMs / 60000}min`
  );

  const thresholdTime = new Date(now.getTime() - thresholdMs);

  // Query for threads with stale unread messages
  // Using a raw SQL query via RPC would be more efficient, but we'll use multiple queries
  // to stay compatible with the Supabase client patterns used elsewhere

  // Step 1: Get all threads with their latest message
  const { data: threads, error: threadsError } = await supabaseAdmin
    .from("chat_threads")
    .select("id, project_id, topic");

  if (threadsError) {
    throw new Error(`Failed to fetch threads: ${threadsError.message}`);
  }

  if (!threads || threads.length === 0) {
    console.log("[unread-thread-nudges] No threads found");
    return { processed: 0, eventsCreated: 0, dryRun };
  }

  const staleUnreadList: StaleThreadRow[] = [];

  // Step 2: For each thread, check if there are stale unread messages
  for (const thread of threads) {
    // Get the latest message in this thread
    const { data: latestMessages, error: msgError } = await supabaseAdmin
      .from("project_messages")
      .select("created_at, user_id")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (msgError) {
      console.error(
        `[unread-thread-nudges] Error fetching messages for thread ${thread.id}:`,
        msgError
      );
      continue;
    }

    if (!latestMessages || latestMessages.length === 0) {
      continue; // No messages in thread
    }

    const latestMessage = latestMessages[0];
    const latestMessageAt = new Date(latestMessage.created_at);

    // Check if the latest message is older than threshold
    if (latestMessageAt >= thresholdTime) {
      continue; // Message is not stale yet
    }

    // Get all participants in this thread
    const { data: participants, error: partError } = await supabaseAdmin
      .from("chat_thread_participants")
      .select("user_id, last_read_at")
      .eq("thread_id", thread.id);

    if (partError) {
      console.error(
        `[unread-thread-nudges] Error fetching participants for thread ${thread.id}:`,
        partError
      );
      continue;
    }

    if (!participants || participants.length === 0) {
      continue;
    }

    // Check each participant (except the message sender)
    for (const participant of participants) {
      // Skip the sender
      if (participant.user_id === latestMessage.user_id) {
        continue;
      }

      const lastReadAt = new Date(participant.last_read_at);

      // Check if this participant has unread messages (hasn't read since latest message)
      if (lastReadAt >= latestMessageAt) {
        continue; // They've already read it
      }

      // Count unread messages for this participant
      const { count: unreadCount, error: countError } = await supabaseAdmin
        .from("project_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .gt("created_at", participant.last_read_at);

      if (countError) {
        console.error(
          `[unread-thread-nudges] Error counting unread messages:`,
          countError
        );
        continue;
      }

      // This participant has unread stale messages
      staleUnreadList.push({
        thread_id: thread.id,
        project_id: thread.project_id,
        topic: thread.topic,
        user_id: participant.user_id,
        last_read_at: participant.last_read_at,
        latest_message_at: latestMessage.created_at,
        latest_sender_id: latestMessage.user_id,
        unread_count: unreadCount ?? 1,
      });
    }
  }

  console.log(
    `[unread-thread-nudges] Found ${staleUnreadList.length} stale unread thread/user combinations`
  );

  if (staleUnreadList.length === 0) {
    return { processed: 0, eventsCreated: 0, dryRun };
  }

  let eventsCreated = 0;
  const preview: unknown[] = [];

  // Step 3: Process each stale unread entry
  for (const entry of staleUnreadList) {
    // Check dedupe log - has this user already been notified for this thread with this latest message?
    // This allows new nudges when new messages arrive after the last nudge
    const { data: existingLog, error: logError } = await supabaseAdmin
      .from("unread_thread_stale_log")
      .select("id")
      .eq("thread_id", entry.thread_id)
      .eq("user_id", entry.user_id)
      .eq("latest_message_at", entry.latest_message_at)
      .limit(1);

    if (logError) {
      console.error(
        `[unread-thread-nudges] Error checking dedupe log:`,
        logError
      );
      continue;
    }

    if (existingLog && existingLog.length > 0) {
      // Already notified for this latest message batch
      continue;
    }

    // Check user preferences (mute check)
    const isMuted = await checkUserPreference(supabaseAdmin, entry.user_id, {
      scopeType: "thread",
      scopeId: entry.thread_id,
      eventType: "thread_unread_stale",
      channel: "in_app",
      projectId: entry.project_id,
    });

    if (isMuted) {
      console.log(
        `[unread-thread-nudges] User ${entry.user_id} has muted notifications for thread ${entry.thread_id}`
      );
      continue;
    }

    // Get project name for the notification
    const projectName = await getProjectName(supabaseAdmin, entry.project_id);
    const threadLabel = entry.topic?.trim() 
      ? (entry.topic.startsWith("#") ? entry.topic : `#${entry.topic}`)
      : "#general";

    if (dryRun) {
      preview.push({
        thread_id: entry.thread_id,
        project_id: entry.project_id,
        project_name: projectName,
        thread_label: threadLabel,
        user_id: entry.user_id,
        last_read_at: entry.last_read_at,
        latest_message_at: entry.latest_message_at,
        latest_sender_id: entry.latest_sender_id,
        unread_count: entry.unread_count,
        would_notify: true,
      });
      continue;
    }

    // Create domain event
    const { data: domainEvent, error: eventError } = await supabaseAdmin
      .from("domain_events")
      .insert({
        event_type: "thread_unread_stale",
        actor_id: null, // System-generated
        project_id: entry.project_id,
        thread_id: entry.thread_id,
        payload: {
          user_id: entry.user_id,
          thread_topic: entry.topic,
          latest_message_at: entry.latest_message_at,
          latest_sender_id: entry.latest_sender_id,
          anchor_last_read_at: entry.last_read_at,
          unread_count: entry.unread_count,
        },
        occurred_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (eventError) {
      console.error(
        `[unread-thread-nudges] Error creating domain event:`,
        eventError
      );
      continue;
    }

    console.log(
      `[unread-thread-nudges] Created domain event ${domainEvent.id} for user ${entry.user_id} in thread ${entry.thread_id}`
    );

    // Insert into dedupe log (keyed by latest_message_at so new messages trigger new nudges)
    const { error: insertLogError } = await supabaseAdmin
      .from("unread_thread_stale_log")
      .insert({
        thread_id: entry.thread_id,
        user_id: entry.user_id,
        latest_message_at: entry.latest_message_at,
        event_id: domainEvent.id,
        sent_at: now.toISOString(),
      });

    if (insertLogError) {
      // Unique constraint violation is expected on race - log and continue
      console.warn(
        `[unread-thread-nudges] Error inserting into dedupe log (may be duplicate):`,
        insertLogError
      );
    }

    // Trigger notify-fan-out
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
          `[unread-thread-nudges] Error triggering fan-out: ${response.status} ${errorText}`
        );
      }
    } catch (err) {
      console.error(
        `[unread-thread-nudges] Exception triggering fan-out:`,
        err
      );
    }

    eventsCreated++;
  }

  console.log(
    `[unread-thread-nudges] Completed. Created ${eventsCreated} domain events.`
  );

  return {
    processed: staleUnreadList.length,
    eventsCreated,
    dryRun,
    preview: dryRun ? preview : undefined,
  };
}

// =============================================================================
// Helpers
// =============================================================================

async function checkUserPreference(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  ctx: {
    scopeType: string;
    scopeId: string;
    eventType: string;
    channel: string;
    projectId: string;
  }
): Promise<boolean> {
  // Returns TRUE if muted
  const { data: prefs } = await supabaseAdmin
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (!prefs || !prefs.length) return false;

  const relevant = prefs.filter(
    (p: { event_type: string; channel: string }) =>
      (p.event_type === ctx.eventType || p.event_type === "*") &&
      (p.channel === ctx.channel || p.channel === "*")
  );

  // Check Thread scope
  const threadPref = relevant.find(
    (p: { scope_type: string; scope_id: string }) =>
      p.scope_type === "thread" && p.scope_id === ctx.scopeId
  );
  if (threadPref) return (threadPref as { status: string }).status === "muted";

  // Check Project scope
  const projectPref = relevant.find(
    (p: { scope_type: string; scope_id: string }) =>
      p.scope_type === "project" && p.scope_id === ctx.projectId
  );
  if (projectPref) return (projectPref as { status: string }).status === "muted";

  // Check Global scope
  const globalPref = relevant.find(
    (p: { scope_type: string }) => p.scope_type === "global"
  );
  if (globalPref) return (globalPref as { status: string }).status === "muted";

  return false;
}

async function getProjectName(
  supabaseAdmin: ReturnType<typeof createClient>,
  projectId: string
): Promise<string> {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();
  return data?.name || "Project";
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

