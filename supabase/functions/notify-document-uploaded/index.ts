"use strict";

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
  payload: Record<string, unknown> | null;
  projects?: { owner_org_id: string | null } | null;
  resources?: { org_id: string | null } | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    "[notify-document-uploaded] Missing required Supabase environment variables"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) {
      return jsonResponse({ error: "Invalid Authorization header" }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(jwt);

    if (userError || !user) {
      console.error("[notify-document-uploaded] Auth error:", userError);
      return jsonResponse({ error: "User authentication failed" }, 401);
    }

    const body = await safeJson(req);
    const eventId = parseEventId(body?.eventId ?? body?.event_id);
    if (!eventId) {
      return jsonResponse({ error: "eventId is required" }, 400);
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("domain_events")
      .select(
        `
        id,
        event_type,
        actor_id,
        project_id,
        resource_id,
        payload,
        projects!domain_events_project_id_fkey(owner_org_id),
        resources:resources!domain_events_resource_id_fkey(org_id)
      `
      )
      .eq("id", eventId)
      .single<DomainEventRow>();

    if (eventError || !event) {
      console.error("[notify-document-uploaded] Event lookup failed:", eventError);
      return jsonResponse({ error: "domain_event not found" }, 404);
    }

    if (event.event_type !== "document_uploaded") {
      return jsonResponse({ skipped: true, reason: "unsupported_event_type" });
    }

    if (event.actor_id && event.actor_id !== user.id) {
      return jsonResponse({ error: "Actor mismatch for domain_event" }, 403);
    }

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

    const alreadyNotified = await fetchExistingRecipients(
      supabaseAdmin,
      event.id
    );

    const recipientsToInsert = finalRecipientIds.filter(
      (id) => !alreadyNotified.has(id)
    );

    if (!recipientsToInsert.length) {
      return jsonResponse({ inserted: 0, reason: "already_notified" });
    }

    const notificationPayload = buildNotificationPayload(event);
    const rows = recipientsToInsert.map((userId) => ({
      user_id: userId,
      event_id: event.id,
      ...notificationPayload,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(rows);

    if (insertError) {
      console.error(
        "[notify-document-uploaded] Failed to insert notifications:",
        insertError
      );
      return jsonResponse({ error: "notification_insert_failed" }, 500);
    }

    return jsonResponse({ inserted: rows.length });
  } catch (error) {
    console.error("[notify-document-uploaded] Unexpected error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

async function safeJson(req: Request) {
  try {
    if (req.bodyUsed) return {};
    return await req.json();
  } catch {
    return {};
  }
}

function parseEventId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function collectCandidateUserIds(
  supabaseAdmin: SupabaseClient,
  event: DomainEventRow
) {
  const ids = new Set<string>();

  const { data: grantRows, error: grantsError } = await supabaseAdmin
    .from("project_access_grants")
    .select("user_id")
    .eq("project_id", event.project_id);

  if (grantsError) {
    console.error("[notify-document-uploaded] project_access_grants error:", grantsError);
    throw new Error("Failed to load project access grants");
  }

  (grantRows ?? []).forEach((row: { user_id: string | null }) => {
    if (row.user_id) ids.add(row.user_id);
  });

  const orgId =
    event.resources?.org_id ??
    event.projects?.owner_org_id ??
    null;

  if (orgId) {
    const { data: ownerRows, error: ownersError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("role", "owner");

    if (ownersError) {
      console.error("[notify-document-uploaded] org_members error:", ownersError);
      throw new Error("Failed to load org owners");
    }

    (ownerRows ?? []).forEach((row: { user_id: string | null }) => {
      if (row.user_id) ids.add(row.user_id);
    });
  }

  return ids;
}

async function filterByResourceAccess(
  supabaseAdmin: SupabaseClient,
  candidateIds: Set<string>,
  resourceId: string | null
) {
  if (!resourceId) {
    return Array.from(candidateIds);
  }

  const results: string[] = [];

  await Promise.all(
    Array.from(candidateIds).map(async (userId) => {
      const { data, error } = await supabaseAdmin.rpc("can_view", {
        p_user_id: userId,
        p_resource_id: resourceId,
      });

      if (error) {
        console.error("[notify-document-uploaded] can_view error:", error);
        return;
      }

      if (data === true) {
        results.push(userId);
      }
    })
  );

  return results;
}

async function fetchExistingRecipients(
  supabaseAdmin: SupabaseClient,
  eventId: number
) {
  const existing = new Set<string>();
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("user_id")
    .eq("event_id", eventId);

  if (error) {
    console.error("[notify-document-uploaded] existing notifications error:", error);
    return existing;
  }

  (data ?? []).forEach((row: { user_id: string | null }) => {
    if (row.user_id) existing.add(row.user_id);
  });

  return existing;
}

function buildNotificationPayload(event: DomainEventRow) {
  const fileName =
    (event.payload?.fileName as string | undefined) ??
    "A new file";

  const humanTitle = "Document uploaded";
  const humanBody = `New file "${fileName}" was uploaded to this project.`;

  const linkUrl = event.resource_id
    ? `/project/workspace/${event.project_id}?resourceId=${event.resource_id}`
    : `/project/workspace/${event.project_id}`;

  return {
    title: humanTitle,
    body: humanBody,
    link_url: linkUrl,
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

