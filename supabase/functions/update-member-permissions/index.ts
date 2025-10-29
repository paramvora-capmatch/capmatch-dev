import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { org_id, user_id, project_grants, org_grants } = await req.json();
    if (!org_id || !user_id) {
      throw new Error("org_id and user_id are required");
    }

    // Validate project_grants structure
    if (project_grants && !Array.isArray(project_grants)) {
      throw new Error("project_grants must be an array.");
    }
    // Validate org_grants structure
    if (org_grants) {
      if (!org_grants.permissions || !Array.isArray(org_grants.permissions)) {
        throw new Error("org_grants.permissions must be an array");
      }
    }
    if (project_grants) {
      for (const grant of project_grants) {
        if (!grant.projectId || !Array.isArray(grant.permissions)) {
          throw new Error("Each grant in project_grants must have a projectId and a permissions array.");
        }
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to update permissions for this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    if (userError) throw new Error("Authentication failed");

    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc('is_org_owner', {
      p_org_id: org_id,
      p_user_id: user.id
    });
    if (ownerCheckError || !isOwner) {
      throw new Error("User must be an owner of the org to update member permissions.");
    }

    // Verify the target user is a member of this org
    const { data: memberCheck, error: memberCheckError } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (memberCheckError || !memberCheck) {
      throw new Error("Target user is not a member of this organization.");
    }

    // Step 1: Remove all existing permissions for this user in this org
    // First, get all resources belonging to this org
    const { data: orgResources, error: orgResourcesError } = await supabaseAdmin
      .from("resources")
      .select("id")
      .eq("org_id", org_id);

    if (orgResourcesError) {
      throw new Error(`Failed to fetch org resources: ${orgResourcesError.message}`);
    }

    if (orgResources && orgResources.length > 0) {
      const orgResourceIds = orgResources.map(r => r.id);
      const { error: deleteOrgPermsError } = await supabaseAdmin
        .from("permissions")
        .delete()
        .eq("user_id", user_id)
        .in("resource_id", orgResourceIds);

      if (deleteOrgPermsError) {
        console.error(`[update-member-permissions] Failed to delete org permissions: ${deleteOrgPermsError.message}`);
      }
    }

    // Step 2: Get all projects in this org and remove permissions for those too
    const { data: orgProjects, error: orgProjectsError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("owner_org_id", org_id);

    if (orgProjectsError) {
      throw new Error(`Failed to fetch org projects: ${orgProjectsError.message}`);
    }

    if (orgProjects && orgProjects.length > 0) {
      const projectIds = orgProjects.map(p => p.id);

      // Remove from project_access_grants
      const { error: deleteAccessGrantsError } = await supabaseAdmin
        .from("project_access_grants")
        .delete()
        .eq("user_id", user_id)
        .in("project_id", projectIds);

      if (deleteAccessGrantsError) {
        console.error(`[update-member-permissions] Failed to delete project access grants: ${deleteAccessGrantsError.message}`);
      }

      // Get project resources and remove permissions
      const { data: projectResources, error: projectResourcesError } = await supabaseAdmin
        .from("resources")
        .select("id")
        .in("project_id", projectIds);

      if (projectResourcesError) {
        throw new Error(`Failed to fetch project resources: ${projectResourcesError.message}`);
      }

      if (projectResources && projectResources.length > 0) {
        const projectResourceIds = projectResources.map(r => r.id);
        const { error: deleteProjectPermsError } = await supabaseAdmin
          .from("permissions")
          .delete()
          .eq("user_id", user_id)
          .in("resource_id", projectResourceIds);

        if (deleteProjectPermsError) {
          console.error(`[update-member-permissions] Failed to delete project permissions: ${deleteProjectPermsError.message}`);
        }
      }
    }

    // Step 3: Apply new project grants (same logic as accept-invite)
    const projectGrantsArr = (project_grants as any[]) || [];
    if (Array.isArray(projectGrantsArr) && projectGrantsArr.length > 0) {
      for (const grant of projectGrantsArr) {
        // 1) Grant root permissions via RPC helper
        if (grant.projectId && Array.isArray(grant.permissions)) {
          try {
            const { error: grantError } = await supabaseAdmin.rpc('grant_project_access', {
              p_project_id: grant.projectId,
              p_user_id: user_id,
              p_granted_by_id: user.id,
              p_permissions: grant.permissions,
            });
            if (grantError) {
              console.error(`[update-member-permissions] Error granting root permissions for project ${grant.projectId}: ${JSON.stringify(grantError)}`);
            }
          } catch (rpcError: any) {
            console.error(`[update-member-permissions] RPC grant_project_access failed: ${rpcError.message}`);
          }
        }

        // 2) Apply per-doc overrides (none/view/edit) and back-compat exclusions
        if (grant.fileOverrides && Array.isArray(grant.fileOverrides) && grant.fileOverrides.length > 0) {
          const rows = grant.fileOverrides.map((o: any) => ({
            resource_id: o.resource_id,
            user_id: user_id,
            permission: o.permission,
            granted_by: user.id,
          }));
          const { error: ovErr } = await supabaseAdmin
            .from('permissions')
            .upsert(rows, { onConflict: 'resource_id,user_id' });
          if (ovErr) {
            console.error(`[update-member-permissions] Failed to apply file overrides for project ${grant.projectId}: ${JSON.stringify(ovErr)}`);
          }
        } else if (grant.exclusions && Array.isArray(grant.exclusions) && grant.exclusions.length > 0) {
          const rows = grant.exclusions.map((resource_id: string) => ({
            resource_id,
            user_id: user_id,
            permission: 'none',
            granted_by: user.id
          }));
          const { error: exclError } = await supabaseAdmin.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
          if (exclError) {
            console.error(`[update-member-permissions] Failed to apply exclusions for project ${grant.projectId}: ${JSON.stringify(exclError)}`);
          }
        }

        // 3) Ensure the user is a participant in existing chat threads for this project
        if (grant.projectId) {
          const { data: threads, error: threadsError } = await supabaseAdmin
            .from('chat_threads')
            .select('id')
            .eq('project_id', grant.projectId);
          if (threadsError) {
            console.error(`[update-member-permissions] Failed to fetch chat threads for project ${grant.projectId}: ${threadsError.message}`);
          } else if (threads && threads.length > 0) {
            const participantRows = threads.map((t: any) => ({ thread_id: t.id, user_id: user_id }));
            const { error: addPartErr } = await supabaseAdmin
              .from('chat_thread_participants')
              .upsert(participantRows, { onConflict: 'thread_id,user_id' });
            if (addPartErr) {
              console.error(`[update-member-permissions] Failed to add user to chat threads for project ${grant.projectId}: ${addPartErr.message}`);
            }
          }
        }
      }
    }

    // Step 4: Apply org-level grants if provided
    const orgGrantsObj = (org_grants as any) || null;
    if (orgGrantsObj && Array.isArray(orgGrantsObj.permissions)) {
      // Grant BORROWER_RESUME / BORROWER_DOCS_ROOT as requested
      for (const g of orgGrantsObj.permissions) {
        if (!g || !g.resource_type || !g.permission) continue;
        let resourceId: string | null = null;
        if (g.resource_type === 'BORROWER_RESUME' || g.resource_type === 'BORROWER_DOCS_ROOT') {
          const { data: resource } = await supabaseAdmin
            .from('resources')
            .select('id')
            .eq('org_id', org_id)
            .eq('resource_type', g.resource_type)
            .maybeSingle();
          resourceId = resource?.id || null;
        }
        if (resourceId) {
          const { error: permErr } = await supabaseAdmin
            .from('permissions')
            .upsert({
              resource_id: resourceId,
              user_id: user_id,
              permission: g.permission,
              granted_by: user.id
            }, { onConflict: 'resource_id,user_id' });
          if (permErr) {
            console.error(`[update-member-permissions] Failed to set org grant ${g.resource_type}: ${JSON.stringify(permErr)}`);
          }
        }
      }
      // Apply org-level per-file overrides or exclusions
      if (Array.isArray(orgGrantsObj.fileOverrides) && orgGrantsObj.fileOverrides.length > 0) {
        const rows = orgGrantsObj.fileOverrides.map((o: any) => ({
          resource_id: o.resource_id,
          user_id: user_id,
          permission: o.permission,
          granted_by: user.id
        }));
        const { error: orgOvErr } = await supabaseAdmin.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
        if (orgOvErr) {
          console.error(`[update-member-permissions] Failed to apply org file overrides: ${JSON.stringify(orgOvErr)}`);
        }
      } else if (Array.isArray(orgGrantsObj.exclusions) && orgGrantsObj.exclusions.length > 0) {
        const rows = orgGrantsObj.exclusions.map((resource_id: string) => ({
          resource_id,
          user_id: user_id,
          permission: 'none',
          granted_by: user.id
        }));
        const { error: orgExclErr } = await supabaseAdmin.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
        if (orgExclErr) {
          console.error(`[update-member-permissions] Failed to apply org exclusions: ${JSON.stringify(orgExclErr)}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Permissions updated successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[update-member-permissions] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
