import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[update-member-permissions] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[update-member-permissions] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { org_id, user_id, project_grants } = requestBody;
    
    console.log(`[update-member-permissions] [${requestId}] Parsed request body:`, {
      org_id,
      user_id,
      has_project_grants: !!project_grants,
      project_grants_count: project_grants?.length || 0,
    });

    if (!org_id || !user_id) {
      console.error(`[update-member-permissions] [${requestId}] Validation failed - missing required fields:`, {
        has_org_id: !!org_id,
        has_user_id: !!user_id,
      });
      throw new Error("org_id and user_id are required");
    }

    // Validate project_grants structure
    if (project_grants && !Array.isArray(project_grants)) {
      console.error(`[update-member-permissions] [${requestId}] Validation failed - project_grants is not an array`);
      throw new Error("project_grants must be an array.");
    }
    if (project_grants) {
      for (const grant of project_grants) {
        if (!grant.projectId || !Array.isArray(grant.permissions)) {
          console.error(`[update-member-permissions] [${requestId}] Validation failed - invalid project grant structure:`, grant);
          throw new Error("Each grant in project_grants must have a projectId and a permissions array.");
        }
      }
    }
    
    console.log(`[update-member-permissions] [${requestId}] Request validation passed`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to update permissions for this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[update-member-permissions] [${requestId}] Authentication failed - no authorization header`);
      throw new Error("Authorization header required");
    }
    
    const jwt = authHeader.replace("Bearer ", "");
    console.log(`[update-member-permissions] [${requestId}] Verifying JWT token`);
    
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    
    if (userError) {
      console.error(`[update-member-permissions] [${requestId}] Authentication failed:`, userError.message);
      throw new Error("Authentication failed");
    }
    
    console.log(`[update-member-permissions] [${requestId}] User authenticated: ${user.id}`);

    console.log(`[update-member-permissions] [${requestId}] Checking org ownership - org_id: ${org_id}, user_id: ${user.id}`);
    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc('is_org_owner', {
      p_org_id: org_id,
      p_user_id: user.id
    });
    
    if (ownerCheckError) {
      console.error(`[update-member-permissions] [${requestId}] Error checking org ownership:`, ownerCheckError.message);
      throw new Error("User must be an owner of the org to update member permissions.");
    }
    
    if (!isOwner) {
      console.warn(`[update-member-permissions] [${requestId}] Authorization failed - user ${user.id} is not an owner of org ${org_id}`);
      throw new Error("User must be an owner of the org to update member permissions.");
    }
    
    console.log(`[update-member-permissions] [${requestId}] User ${user.id} confirmed as owner of org ${org_id}`);

    // Verify the target user is a member of this org
    console.log(`[update-member-permissions] [${requestId}] Verifying target user ${user_id} is a member of org ${org_id}`);
    const { data: memberCheck, error: memberCheckError } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (memberCheckError) {
      console.error(`[update-member-permissions] [${requestId}] Error checking membership:`, memberCheckError.message);
      throw new Error("Target user is not a member of this organization.");
    }
    
    if (!memberCheck) {
      console.warn(`[update-member-permissions] [${requestId}] Target user ${user_id} is not a member of org ${org_id}`);
      throw new Error("Target user is not a member of this organization.");
    }
    
    console.log(`[update-member-permissions] [${requestId}] Target user ${user_id} confirmed as member with role: ${memberCheck.role}`);

    // Step 1: Remove all existing permissions for this user in this org
    console.log(`[update-member-permissions] [${requestId}] Step 1: Removing existing permissions for user ${user_id} in org ${org_id}`);
    
    // First, get all resources belonging to this org
    console.log(`[update-member-permissions] [${requestId}] Fetching org resources`);
    const { data: orgResources, error: orgResourcesError } = await supabaseAdmin
      .from("resources")
      .select("id")
      .eq("org_id", org_id);

    if (orgResourcesError) {
      console.error(`[update-member-permissions] [${requestId}] Failed to fetch org resources:`, {
        error: orgResourcesError.message,
        error_code: orgResourcesError.code,
      });
      throw new Error(`Failed to fetch org resources: ${orgResourcesError.message}`);
    }

    console.log(`[update-member-permissions] [${requestId}] Found ${orgResources?.length || 0} org resources`);

    if (orgResources && orgResources.length > 0) {
      const orgResourceIds = orgResources.map(r => r.id);
      console.log(`[update-member-permissions] [${requestId}] Deleting permissions for ${orgResourceIds.length} org resources`);
      const { error: deleteOrgPermsError } = await supabaseAdmin
        .from("permissions")
        .delete()
        .eq("user_id", user_id)
        .in("resource_id", orgResourceIds);

      if (deleteOrgPermsError) {
        console.error(`[update-member-permissions] [${requestId}] Failed to delete org permissions:`, {
          error: deleteOrgPermsError.message,
          error_code: deleteOrgPermsError.code,
        });
      } else {
        console.log(`[update-member-permissions] [${requestId}] Successfully deleted org permissions`);
      }
    }

    // Step 2: Get all projects in this org and remove permissions for those too
    console.log(`[update-member-permissions] [${requestId}] Step 2: Removing project permissions`);
    
    const { data: orgProjects, error: orgProjectsError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("owner_org_id", org_id);

    if (orgProjectsError) {
      console.error(`[update-member-permissions] [${requestId}] Failed to fetch org projects:`, {
        error: orgProjectsError.message,
        error_code: orgProjectsError.code,
      });
      throw new Error(`Failed to fetch org projects: ${orgProjectsError.message}`);
    }

    console.log(`[update-member-permissions] [${requestId}] Found ${orgProjects?.length || 0} projects in org`);

    if (orgProjects && orgProjects.length > 0) {
      const projectIds = orgProjects.map(p => p.id);
      console.log(`[update-member-permissions] [${requestId}] Processing ${projectIds.length} projects:`, projectIds);

      // Remove from project_access_grants
      console.log(`[update-member-permissions] [${requestId}] Deleting project access grants`);
      const { error: deleteAccessGrantsError } = await supabaseAdmin
        .from("project_access_grants")
        .delete()
        .eq("user_id", user_id)
        .in("project_id", projectIds);

      if (deleteAccessGrantsError) {
        console.error(`[update-member-permissions] [${requestId}] Failed to delete project access grants:`, {
          error: deleteAccessGrantsError.message,
          error_code: deleteAccessGrantsError.code,
        });
      } else {
        console.log(`[update-member-permissions] [${requestId}] Successfully deleted project access grants`);
      }

      // Get project resources and remove permissions
      console.log(`[update-member-permissions] [${requestId}] Fetching project resources`);
      const { data: projectResources, error: projectResourcesError } = await supabaseAdmin
        .from("resources")
        .select("id")
        .in("project_id", projectIds);

      if (projectResourcesError) {
        console.error(`[update-member-permissions] [${requestId}] Failed to fetch project resources:`, {
          error: projectResourcesError.message,
          error_code: projectResourcesError.code,
        });
        throw new Error(`Failed to fetch project resources: ${projectResourcesError.message}`);
      }

      console.log(`[update-member-permissions] [${requestId}] Found ${projectResources?.length || 0} project resources`);

      if (projectResources && projectResources.length > 0) {
        const projectResourceIds = projectResources.map(r => r.id);
        console.log(`[update-member-permissions] [${requestId}] Deleting permissions for ${projectResourceIds.length} project resources`);
        const { error: deleteProjectPermsError } = await supabaseAdmin
          .from("permissions")
          .delete()
          .eq("user_id", user_id)
          .in("resource_id", projectResourceIds);

        if (deleteProjectPermsError) {
          console.error(`[update-member-permissions] [${requestId}] Failed to delete project permissions:`, {
            error: deleteProjectPermsError.message,
            error_code: deleteProjectPermsError.code,
          });
        } else {
          console.log(`[update-member-permissions] [${requestId}] Successfully deleted project permissions`);
        }
      }
    }

    // Step 3: Apply new project grants (same logic as accept-invite)
    console.log(`[update-member-permissions] [${requestId}] Step 3: Applying new project grants`);
    const projectGrantsArr = (project_grants as any[]) || [];
    console.log(`[update-member-permissions] [${requestId}] Processing ${projectGrantsArr.length} project grants`);
    
    if (Array.isArray(projectGrantsArr) && projectGrantsArr.length > 0) {
      for (const grant of projectGrantsArr) {
        console.log(`[update-member-permissions] [${requestId}] Processing grant for project ${grant.projectId}:`, {
          permissions_count: grant.permissions?.length || 0,
          has_file_overrides: !!grant.fileOverrides,
          file_overrides_count: grant.fileOverrides?.length || 0,
          has_exclusions: !!grant.exclusions,
          exclusions_count: grant.exclusions?.length || 0,
        });
        
        // 1) Grant root permissions via RPC helper
        if (grant.projectId && Array.isArray(grant.permissions)) {
          try {
            console.log(`[update-member-permissions] [${requestId}] Granting root permissions for project ${grant.projectId}`);
            const { error: grantError } = await supabaseAdmin.rpc('grant_project_access', {
              p_project_id: grant.projectId,
              p_user_id: user_id,
              p_granted_by_id: user.id,
              p_permissions: grant.permissions,
            });
            if (grantError) {
              console.error(`[update-member-permissions] [${requestId}] Error granting root permissions for project ${grant.projectId}:`, {
                error: grantError.message,
                error_code: grantError.code,
                error_details: grantError.details,
              });
            } else {
              console.log(`[update-member-permissions] [${requestId}] Root permissions granted successfully for project ${grant.projectId}`);
            }
          } catch (rpcError: any) {
            console.error(`[update-member-permissions] [${requestId}] RPC grant_project_access failed for project ${grant.projectId}:`, {
              error: rpcError.message,
              error_stack: rpcError.stack,
            });
          }
        }

        // 2) Apply per-doc overrides (none/view/edit) and back-compat exclusions
        if (grant.fileOverrides && Array.isArray(grant.fileOverrides) && grant.fileOverrides.length > 0) {
          console.log(`[update-member-permissions] [${requestId}] Applying ${grant.fileOverrides.length} file overrides for project ${grant.projectId}`);
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
            console.error(`[update-member-permissions] [${requestId}] Failed to apply file overrides for project ${grant.projectId}:`, {
              error: ovErr.message,
              error_code: ovErr.code,
            });
          } else {
            console.log(`[update-member-permissions] [${requestId}] File overrides applied successfully for project ${grant.projectId}`);
          }
        } else if (grant.exclusions && Array.isArray(grant.exclusions) && grant.exclusions.length > 0) {
          console.log(`[update-member-permissions] [${requestId}] Applying ${grant.exclusions.length} exclusions for project ${grant.projectId}`);
          const rows = grant.exclusions.map((resource_id: string) => ({
            resource_id,
            user_id: user_id,
            permission: 'none',
            granted_by: user.id
          }));
          const { error: exclError } = await supabaseAdmin.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
          if (exclError) {
            console.error(`[update-member-permissions] [${requestId}] Failed to apply exclusions for project ${grant.projectId}:`, {
              error: exclError.message,
              error_code: exclError.code,
            });
          } else {
            console.log(`[update-member-permissions] [${requestId}] Exclusions applied successfully for project ${grant.projectId}`);
          }
        }

        // 3) Ensure the user is a participant in existing chat threads for this project
        if (grant.projectId) {
          console.log(`[update-member-permissions] [${requestId}] Adding user to chat threads for project ${grant.projectId}`);
          const { data: threads, error: threadsError } = await supabaseAdmin
            .from('chat_threads')
            .select('id')
            .eq('project_id', grant.projectId);
          if (threadsError) {
            console.error(`[update-member-permissions] [${requestId}] Failed to fetch chat threads for project ${grant.projectId}:`, {
              error: threadsError.message,
              error_code: threadsError.code,
            });
          } else if (threads && threads.length > 0) {
            console.log(`[update-member-permissions] [${requestId}] Found ${threads.length} chat threads, adding user as participant`);
            const participantRows = threads.map((t: any) => ({ thread_id: t.id, user_id: user_id }));
            const { error: addPartErr } = await supabaseAdmin
              .from('chat_thread_participants')
              .upsert(participantRows, { onConflict: 'thread_id,user_id' });
            if (addPartErr) {
              console.error(`[update-member-permissions] [${requestId}] Failed to add user to chat threads for project ${grant.projectId}:`, {
                error: addPartErr.message,
                error_code: addPartErr.code,
              });
            } else {
              console.log(`[update-member-permissions] [${requestId}] Successfully added user to ${threads.length} chat threads for project ${grant.projectId}`);
            }
          } else {
            console.log(`[update-member-permissions] [${requestId}] No chat threads found for project ${grant.projectId}`);
          }
        }
      }
    } else {
      console.log(`[update-member-permissions] [${requestId}] No project grants to apply`);
    }

    const duration = Date.now() - startTime;
    console.log(`[update-member-permissions] [${requestId}] Permissions update completed successfully:`, {
      user_id,
      org_id,
      project_grants_count: projectGrantsArr.length,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({ success: true, message: "Permissions updated successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[update-member-permissions] [${requestId}] Error after ${duration}ms:`, {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
