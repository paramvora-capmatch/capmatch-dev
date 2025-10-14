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
    
    if (!thread_id) {
      throw new Error("thread_id is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get all participants in the thread
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("chat_thread_participants")
      .select("user_id")
      .eq("thread_id", thread_id);

    if (participantsError) {
      throw new Error(`Failed to get thread participants: ${participantsError.message}`);
    }

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ documents: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const participantIds = participants.map(p => p.user_id);

    // 2. Get the project_id for this thread
    const { data: thread, error: threadError } = await supabaseAdmin
      .from("chat_threads")
      .select("project_id")
      .eq("id", thread_id)
      .single();

    if (threadError) {
      throw new Error(`Failed to get thread project: ${threadError.message}`);
    }

    // 3. Get all document permissions for this project and these participants
    const { data: permissions, error: permissionsError } = await supabaseAdmin
      .from("document_permissions")
      .select("document_path")
      .eq("project_id", thread.project_id)
      .in("user_id", participantIds);

    if (permissionsError) {
      throw new Error(`Failed to get document permissions: ${permissionsError.message}`);
    }

    // 4. Find documents that ALL participants can access
    const documentCounts = {};
    const totalParticipants = participantIds.length;

    permissions?.forEach(perm => {
      const path = perm.document_path;
      documentCounts[path] = (documentCounts[path] || 0) + 1;
    });

    // Only include documents that all participants can access
    const commonDocuments = Object.keys(documentCounts).filter(
      path => documentCounts[path] === totalParticipants
    );

    console.log(`[get-common-documents] Found ${commonDocuments.length} documents accessible to all ${totalParticipants} participants`);

    return new Response(JSON.stringify({ 
      documents: commonDocuments,
      participant_count: totalParticipants,
      total_permissions: permissions?.length || 0
    }), {
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
