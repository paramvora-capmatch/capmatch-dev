// supabase/functions/get-thread-participants/index.ts
//
// ⚠️ DEPRECATED: This function is no longer used and should not be called.
//
// The chat system now uses direct queries to `chat_thread_participants` with
// updated RLS policies that allow users to see all participants in threads
// where they are also participants. See migration:
// `20260121000000_update_chat_thread_participants_rls.sql`
//
// Instead of using this edge function, query `chat_thread_participants` directly:
//   const { data } = await supabase
//     .from('chat_thread_participants')
//     .select('thread_id, user_id, created_at')
//     .eq('thread_id', threadId);
//
// Profile data should be enriched using the `get-user-data` edge function
// if needed, as the `profiles` table RLS remains restrictive.
//
// Original purpose (for reference):
// Secure edge function to fetch all participants for a chat thread,
// bypassing RLS with the service role key while still enforcing
// authorization checks (must be project owner, assigned advisor, or
// an existing participant on the thread).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const { thread_id } = await req.json();
    if (!thread_id || typeof thread_id !== "string") {
      throw new Error("thread_id is required");
    }

    // Client scoped to the current user (for auth)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Admin client with service role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    // Load thread + project info
    const { data: thread, error: threadError } = await supabaseAdmin
      .from("chat_threads")
      .select("id, project_id, projects!inner(owner_org_id, assigned_advisor_id)")
      .eq("id", thread_id)
      .single();

    if (threadError || !thread) {
      throw new Error(
        `Failed to load thread ${thread_id}: ${threadError?.message ?? "not found"}`,
      );
    }

    const project = thread.projects as {
      owner_org_id: string;
      assigned_advisor_id: string | null;
    };

    // Check if user is an org owner of the project owner org
    const { data: isOwnerResult, error: isOwnerError } = await supabaseAdmin.rpc(
      "is_org_owner",
      {
        p_org_id: project.owner_org_id,
        p_user_id: user.id,
      },
    );

    if (isOwnerError) {
      throw new Error(
        `Failed to verify org owner permissions: ${isOwnerError.message}`,
      );
    }

    const isOwner = !!isOwnerResult;
    const isAdvisor = project.assigned_advisor_id === user.id;

    // Also allow existing participants on the thread
    const { data: existingParticipant, error: participantError } =
      await supabaseAdmin
        .from("chat_thread_participants")
        .select("user_id")
        .eq("thread_id", thread_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (participantError) {
      throw new Error(
        `Failed to verify participant permissions: ${participantError.message}`,
      );
    }

    const isParticipant = !!existingParticipant;

    if (!isOwner && !isAdvisor && !isParticipant) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message:
            "You do not have permission to view participants for this thread",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    // Fetch all participants for the thread (RLS bypassed)
    const { data: participants, error: participantsError } =
      await supabaseAdmin
        .from("chat_thread_participants")
        .select("thread_id, user_id, created_at")
        .eq("thread_id", thread_id);

    if (participantsError) {
      throw new Error(
        `Failed to load participants: ${participantsError.message}`,
      );
    }

    return new Response(JSON.stringify({ participants: participants ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[get-thread-participants] Error:", error?.message ?? error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error?.message ?? "Unexpected error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});


