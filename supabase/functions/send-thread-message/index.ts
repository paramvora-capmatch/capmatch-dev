// @ts-nocheck
// =============================================================================
// DEPRECATED: This edge function is no longer used.
// =============================================================================
// The chat message sending logic has been moved to direct RPC calls from the
// frontend (see src/stores/useChatStore.ts sendMessage function).
//
// This provides better performance by:
// - Eliminating edge function cold start latency (50-200ms)
// - Reducing network hops (1 instead of 2-3)
// - Simplifying the architecture
//
// The RPC function 'insert_thread_message' is called directly from the client,
// which still maintains security through SECURITY DEFINER and internal validation.
//
// This file is kept for reference but can be removed in a future cleanup.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const mentionRegex = /@\[[^\]]+\]\(doc:([^)]+)\)/g;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { thread_id, content, reply_to } = await req.json();

    if (!thread_id) throw new Error("thread_id is required");
    if (!content || typeof content !== "string" || !content.trim()) {
      throw new Error("content is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const resourceIds = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const resourceId = match[1];
      if (resourceId) {
        resourceIds.add(resourceId);
      }
    }

    const resourceIdArray = Array.from(resourceIds);

    // Note: Validation is handled by insert_thread_message function
    // which calls validate_docs_for_thread internally and returns DOC_ACCESS_DENIED if needed
    const { data: messageId, error: insertError } = await supabaseAdmin.rpc(
      "insert_thread_message",
      {
        p_thread_id: thread_id,
        p_user_id: user.id,
        p_content: content.trim(),
        p_resource_ids: resourceIdArray,
        p_reply_to: reply_to ?? null,
      }
    );

    if (insertError) {
      if (insertError.message?.includes("DOC_ACCESS_DENIED")) {
        // When DOC_ACCESS_DENIED is detected, fetch full validation details
        // to return complete blocked information to the frontend
        const { data: validation } = await supabaseAdmin.rpc(
          "validate_docs_for_thread",
          {
            p_thread_id: thread_id,
            p_resource_ids: resourceIdArray,
          }
        );

        const blocked = (validation || []).filter(
          (row: any) => row.missing_user_ids && row.missing_user_ids.length > 0
        );

        return new Response(
          JSON.stringify({
            status: "blocked",
            code: "DOC_ACCESS_DENIED",
            message:
              "Some participants do not have access to the referenced documents",
            blocked,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      throw new Error(`Failed to send message: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        message_id: messageId ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-thread-message] Error:", error.message ?? error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Failed to send message" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

