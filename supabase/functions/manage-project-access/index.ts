import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ManageProjectAccessRequest {
  project_id: string;
  action: 'grant' | 'revoke';
  user_ids: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { project_id, action, user_ids }: ManageProjectAccessRequest = await req.json();
    
    if (!project_id || !action || !user_ids || !Array.isArray(user_ids)) {
      throw new Error("project_id, action, and user_ids array are required");
    }

    if (!['grant', 'revoke'].includes(action)) {
      throw new Error("action must be 'grant' or 'revoke'");
    }

    // presence-only model; no access_level validation required

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to manage project access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    if (userError) throw new Error("Authentication failed");

    // Verify user can edit the project (must be owner or advisor)
    const { data: canEdit, error: editCheckError } = await supabaseAdmin.rpc('can_edit_project', {
      p_project_id: project_id,
      p_user_id: user.id
    });
    if (editCheckError || !canEdit) {
      throw new Error("User must be an owner or advisor of the project to manage access.");
    }

    // Get project details to verify it exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, owner_entity_id")
      .eq("id", project_id)
      .single();
    
    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Verify all user_ids are members of the project's entity
    const { data: entityMembers, error: membersError } = await supabaseAdmin
      .from("entity_members")
      .select("user_id, role")
      .eq("entity_id", project.owner_entity_id)
      .in("user_id", user_ids);
    
    if (membersError) {
      throw new Error(`Failed to verify entity members: ${membersError.message}`);
    }

    const validUserIds = entityMembers?.map(m => m.user_id) || [];
    const invalidUserIds = user_ids.filter(id => !validUserIds.includes(id));
    
    if (invalidUserIds.length > 0) {
      throw new Error(`Users ${invalidUserIds.join(', ')} are not members of the project's entity`);
    }

    // Filter out owners (they don't need explicit project access)
    const memberUserIds = entityMembers
      ?.filter(member => member.role === 'member')
      .map(m => m.user_id) || [];

    const validMemberIds = user_ids.filter(id => memberUserIds.includes(id));

    if (validMemberIds.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No valid members to process (owners have automatic access)",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let result;
    if (action === 'grant') {
      // Grant project access to members with specified access level
      const permissions = validMemberIds.map(user_id => ({
        project_id,
        user_id,
        granted_by: user.id
      }));

      const { data, error } = await supabaseAdmin
        .from("project_access_permissions")
        .upsert(permissions, {
          onConflict: "project_id,user_id"
        })
        .select();

      if (error) throw new Error(`Failed to grant project access: ${error.message}`);
      result = { granted: data, count: data?.length || 0 };

    } else if (action === 'revoke') {
      // Revoke project access from members (removes both view and edit access)
      const { data, error } = await supabaseAdmin
        .from("project_access_permissions")
        .delete()
        .eq("project_id", project_id)
        .in("user_id", validMemberIds)
        .select();

      if (error) throw new Error(`Failed to revoke project access: ${error.message}`);
      result = { revoked: data, count: data?.length || 0 };
    }

    return new Response(JSON.stringify({ 
      action,
      project_id,
      result,
      message: `Successfully ${action}ed access for ${result.count} members`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[manage-project-access] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
