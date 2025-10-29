// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { resource_id, thread_id, missing_user_ids } = await req.json();

    if (!resource_id) throw new Error("resource_id is required");
    if (!thread_id) throw new Error("thread_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .select("id, name, org_id, project_id")
      .eq("id", resource_id)
      .single();

    if (resourceError || !resource) {
      throw new Error(
        `Failed to load resource details: ${resourceError?.message ?? "not found"}`
      );
    }

    const { data: thread, error: threadError } = await supabaseAdmin
      .from("chat_threads")
      .select("id, topic, project_id")
      .eq("id", thread_id)
      .single();

    if (threadError || !thread) {
      throw new Error(
        `Failed to load thread details: ${threadError?.message ?? "not found"}`
      );
    }

    const { data: owners, error: ownerError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", resource.org_id)
      .eq("role", "owner");

    if (ownerError) {
      throw new Error(`Failed to load owners: ${ownerError.message}`);
    }

    if (!owners || owners.length === 0) {
      return new Response(
        JSON.stringify({ message: "No owners found to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const missingUserIdsArray = Array.isArray(missing_user_ids)
      ? missing_user_ids
      : [];

    let missingUsersDetail = "";
    if (missingUserIdsArray.length > 0) {
      const { data: missingProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", missingUserIdsArray);

      if (missingProfiles && missingProfiles.length > 0) {
        const summary = missingProfiles
          .map((p) => `${p.full_name ?? p.email ?? p.id}`)
          .join(", ");
        missingUsersDetail = ` for ${summary}`;
      }
    }

    const content =
      `${requesterProfile?.full_name ?? requesterProfile?.email ?? "A participant"}` +
      ` requested that you grant access to "${resource.name}"` +
      `${missingUsersDetail} in the chat "${thread.topic ?? "General"}".`;

    const linkUrl = `/projects/${thread.project_id}/chat/${thread.id}`;

    const notifications = owners.map((owner) => ({
      user_id: owner.user_id,
      content,
      link_url: linkUrl,
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        throw new Error(
          `Failed to create notifications: ${notificationError.message}`
        );
      }
    }

    return new Response(
      JSON.stringify({ message: "Request sent" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[request-document-access] Error:", error.message ?? error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Failed to request access" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

