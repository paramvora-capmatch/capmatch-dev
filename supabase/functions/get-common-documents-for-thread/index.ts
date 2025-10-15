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

    // 1. Get thread details, including project and owner entity
    const { data: thread, error: threadError } = await supabaseAdmin
      .from("chat_threads")
      .select("project_id, projects!inner(owner_entity_id)")
      .eq("id", thread_id)
      .single();
    if (threadError) throw new Error(`Failed to get thread project: ${threadError.message}`);

    const { project_id, projects: { owner_entity_id } } = thread;

    // 2. Get all participants in the thread
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("chat_thread_participants")
      .select("user_id")
      .eq("thread_id", thread_id);
    if (participantsError) throw new Error(`Failed to get thread participants: ${participantsError.message}`);
    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ documents: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const participantIds = participants.map(p => p.user_id);

    // 3. Identify which participants are owners
    const { data: owners, error: ownersError } = await supabaseAdmin
      .from("entity_members")
      .select("user_id")
      .eq("entity_id", owner_entity_id)
      .eq("role", "owner")
      .in("user_id", participantIds);
    if (ownersError) throw new Error(`Failed to get entity owners: ${ownersError.message}`);

    const ownerIds = new Set(owners.map(o => o.user_id));
    const memberIds = participantIds.filter(id => !ownerIds.has(id));

    // 4. Get all documents for the entire project (for owners)
    const { data: allProjectDocs, error: allDocsError } = await supabaseAdmin
      .from("document_permissions") // Assuming this table tracks all possible docs
      .select("document_path")
      .eq("project_id", project_id);
    if (allDocsError) throw new Error(`Failed to get all project documents: ${allDocsError.message}`);
    const allProjectDocPaths = new Set(allProjectDocs.map(d => d.document_path));


    // 5. Build permission sets for each participant
    const permissionSets = [];

    for (const id of participantIds) {
      if (ownerIds.has(id)) {
        // Owners can access all documents
        permissionSets.push(allProjectDocPaths);
      } else {
        // Members' permissions must be checked explicitly
        const { data: memberPerms, error: memberPermsError } = await supabaseAdmin
          .from("document_permissions")
          .select("document_path")
          .eq("project_id", project_id)
          .eq("user_id", id);
        if (memberPermsError) throw new Error(`Failed to get permissions for member ${id}: ${memberPermsError.message}`);
        permissionSets.push(new Set(memberPerms.map(p => p.document_path)));
      }
    }

    // 6. Compute the intersection of all permission sets
    if (permissionSets.length === 0) {
      return new Response(JSON.stringify({ documents: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const commonDocuments = [...permissionSets[0]].filter(docPath => 
      permissionSets.every(set => set.has(docPath))
    );

    return new Response(JSON.stringify({ documents: commonDocuments }), {
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
