// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { thread_id } = await req.json();
    if (!thread_id) throw new Error("thread_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: documents, error: commonDocsError } = await supabaseAdmin.rpc(
      "get_common_file_resources_for_thread",
      { p_thread_id: thread_id }
    );

    if (commonDocsError) {
      throw new Error(`Failed to retrieve common documents: ${commonDocsError.message}`);
    }

    return new Response(JSON.stringify({ documents: documents ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[get-common-documents-for-thread] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
