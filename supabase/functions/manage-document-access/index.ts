import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      action, // 'grant' or 'revoke'
      project_id, 
      document_paths, // array of strings
      target_user_id, // for internal permissions
      target_lender_entity_id // for external lender permissions
    } = await req.json();

    if (!action || !project_id || !document_paths || (!target_user_id && !target_lender_entity_id)) {
      throw new Error("action, project_id, document_paths, and a target (user or lender) are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to manage permissions for this project
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "").auth.getUser(jwt);
    if (!user) throw new Error("Authentication failed");

    const { data: canEdit, error: checkError } = await supabaseAdmin.rpc('can_edit_project', {
      p_project_id: project_id,
      p_user_id: user.id
    });
    if (checkError || !canEdit) {
      throw new Error("User must be an owner or advisor for the project to manage permissions.");
    }

    // Determine which table we are working with
    const isInternal = !!target_user_id;
    const tableName = isInternal ? "document_permissions" : "lender_document_access";
    
    if (action === 'grant') {
      const recordsToInsert = document_paths.map(path => ({
        project_id,
        document_path: path,
        ...(isInternal 
          ? { user_id: target_user_id } 
          : { lender_entity_id: target_lender_entity_id, granted_by: user.id })
      }));
      
      const { error } = await supabaseAdmin.from(tableName).upsert(recordsToInsert);
      if (error) throw new Error(`Failed to grant permissions: ${error.message}`);
    
    } else if (action === 'revoke') {
      const queryBuilder = supabaseAdmin.from(tableName).delete().eq('project_id', project_id).in('document_path', document_paths);
      if (isInternal) {
        queryBuilder.eq('user_id', target_user_id);
      } else {
        queryBuilder.eq('lender_entity_id', target_lender_entity_id);
      }

      const { error } = await queryBuilder;
      if (error) throw new Error(`Failed to revoke permissions: ${error.message}`);

    } else {
      throw new Error("Invalid action. Must be 'grant' or 'revoke'.");
    }

    return new Response(JSON.stringify({ success: true, action: `${action} successful` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[manage-document-access] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
