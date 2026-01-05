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

    // =========================================================================
    // BEFORE STATE: Capture existing project access + document permissions
    // =========================================================================
    console.log(
      `[update-member-permissions] [${requestId}] Capturing BEFORE state of project and document access`
    );
    
    // Get all org projects with their names for later use
    const { data: orgProjectsWithNames, error: orgProjectsNamesError } =
      await supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("owner_org_id", org_id);
    
    if (orgProjectsNamesError) {
      console.error(
        `[update-member-permissions] [${requestId}] Failed to fetch org projects for before state:`,
        orgProjectsNamesError.message
      );
    }
    
    const projectNameMap = new Map<string, string>();
    (orgProjectsWithNames || []).forEach((p: any) =>
      projectNameMap.set(p.id, p.name)
    );
    const orgProjectIds = Array.from(projectNameMap.keys());
    
    // ---- BEFORE: project-level snapshot (existing behaviour) -----------------
    type BeforeGrant = { project_id: string; permission_level: string };
    const beforeGrants: BeforeGrant[] = [];
    
    if (orgProjectIds.length > 0) {
      const { data: existingGrants, error: existingGrantsError } =
        await supabaseAdmin
        .from("project_access_grants")
        .select("project_id")
        .eq("user_id", user_id)
        .in("project_id", orgProjectIds);
      
      if (existingGrantsError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to fetch existing grants:`,
          existingGrantsError.message
        );
      } else if (existingGrants && existingGrants.length > 0) {
        // For each project, determine the permission level by checking PROJECT_DOCS_ROOT permission
        for (const grant of existingGrants) {
          // Find the PROJECT_DOCS_ROOT resource for this project
          const { data: docsRootResource } = await supabaseAdmin
            .from("resources")
            .select("id")
            .eq("project_id", grant.project_id)
            .eq("resource_type", "PROJECT_DOCS_ROOT")
            .maybeSingle();
          
          let permissionLevel = "view"; // Default to view
          if (docsRootResource) {
            const { data: perm } = await supabaseAdmin
              .from("permissions")
              .select("permission")
              .eq("resource_id", docsRootResource.id)
              .eq("user_id", user_id)
              .maybeSingle();
            
            if (perm?.permission === "edit") {
              permissionLevel = "edit";
            }
          }
          
          beforeGrants.push({
            project_id: grant.project_id,
            permission_level: permissionLevel,
          });
        }
      }
    }
    
    console.log(
      `[update-member-permissions] [${requestId}] BEFORE project-level state captured:`,
      {
      projects_with_access: beforeGrants.length,
        grants: beforeGrants.map((g) => ({
          project_id: g.project_id,
          level: g.permission_level,
        })),
      }
    );

    // ---- BEFORE: document-level snapshot (with inheritance) ----------------
    type BeforeDocPerm = {
      resource_id: string;
      project_id: string | null;
      permission_level: string;
      resource_name: string | null;
    };

    const beforeDocPerms: BeforeDocPerm[] = [];

    if (orgProjectIds.length > 0) {
      // Get all FILE resources for these projects
      const { data: allFileResources, error: filesError } = await supabaseAdmin
        .from("resources")
        .select("id, project_id, name, parent_id, resource_type")
        .in("project_id", orgProjectIds)
        .eq("resource_type", "FILE");

      if (filesError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to fetch file resources:`,
          filesError.message
        );
      } else if (allFileResources && allFileResources.length > 0) {
        // Get explicit document permissions
        const fileResourceIds = allFileResources.map((r: any) => r.id);
        const { data: explicitPerms, error: explicitPermsError } =
          await supabaseAdmin
            .from("permissions")
            .select("resource_id, permission")
            .eq("user_id", user_id)
            .in("resource_id", fileResourceIds);

        const explicitPermsMap = new Map<string, string>();
        if (!explicitPermsError && explicitPerms) {
          for (const perm of explicitPerms) {
            // Include 'none', 'view', and 'edit' as valid permissions
            const level =
              perm.permission === "edit" || perm.permission === "view" || perm.permission === "none"
                ? perm.permission
                : "view";
            explicitPermsMap.set(perm.resource_id, level);
          }
        }

        // Get project root permissions (PROJECT_DOCS_ROOT and BORROWER_DOCS_ROOT) for inheritance
        const { data: rootResources, error: rootResourcesError } =
          await supabaseAdmin
            .from("resources")
            .select("id, project_id, resource_type")
            .in("project_id", orgProjectIds)
            .in("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"]);

        const rootPermsMap = new Map<string, string>(); // key: `${project_id}:${resource_type}`, value: permission
        if (!rootResourcesError && rootResources) {
          const rootResourceIds = rootResources.map((r: any) => r.id);
          const { data: rootPerms, error: rootPermsError } =
            await supabaseAdmin
              .from("permissions")
              .select("resource_id, permission")
              .eq("user_id", user_id)
              .in("resource_id", rootResourceIds);

          if (!rootPermsError && rootPerms) {
            for (const perm of rootPerms) {
              const rootRes = rootResources.find(
                (r: any) => r.id === perm.resource_id
              );
              if (rootRes) {
                const key = `${rootRes.project_id}:${rootRes.resource_type}`;
                const level =
                  perm.permission === "edit" || perm.permission === "view"
                    ? perm.permission
                    : "view";
                rootPermsMap.set(key, level);
              }
            }
          }
        }

        // Build a map of resource_id -> root info for inheritance lookup
        // We need to traverse up the parent chain to find the root
        const resourceToRootMap = new Map<
          string,
          { project_id: string; root_type: string }
        >();

        // Get all resources (not just files) to build the parent chain
        const { data: allResources, error: allResourcesError } =
          await supabaseAdmin
            .from("resources")
            .select("id, project_id, parent_id, resource_type")
            .in("project_id", orgProjectIds);

        if (!allResourcesError && allResources) {
          // Helper to find root for a resource by traversing parent chain
          // Continues past BORROWER_RESUME and PROJECT_RESUME to find the docs root
          const findRootForResource = (
            resourceId: string
          ): { project_id: string; root_type: string } | null => {
            const resource = allResources.find((r: any) => r.id === resourceId);
            if (!resource) return null;

            let current: any = resource;
            const visited = new Set<string>();

            while (current.parent_id && !visited.has(current.id)) {
              visited.add(current.id);
              const parent = allResources.find(
                (r: any) => r.id === current.parent_id
              );
              if (!parent) break;
              
              // Check if this is a docs root
              if (
                parent.resource_type === "PROJECT_DOCS_ROOT" ||
                parent.resource_type === "BORROWER_DOCS_ROOT"
              ) {
                return {
                  project_id: current.project_id,
                  root_type: parent.resource_type,
                };
              }
              
              // Continue traversing past BORROWER_RESUME and PROJECT_RESUME
              // (these are intermediate nodes in the hierarchy)
              current = parent;
            }
            return null;
          };

          for (const fileRes of allFileResources) {
            const rootInfo = findRootForResource(fileRes.id);
            if (rootInfo) {
              resourceToRootMap.set(fileRes.id, rootInfo);
            }
          }
        }

        // Now build beforeDocPerms with effective permissions (explicit or inherited)
        for (const fileRes of allFileResources) {
          const explicitPerm = explicitPermsMap.get(fileRes.id);

          if (explicitPerm) {
            // Has explicit permission
            beforeDocPerms.push({
              resource_id: fileRes.id,
              project_id: fileRes.project_id,
              permission_level: explicitPerm,
              resource_name: fileRes.name ?? null,
            });
          } else {
            // No explicit permission - inherit from root
            const rootInfo = resourceToRootMap.get(fileRes.id);
            if (rootInfo) {
              const rootKey = `${rootInfo.project_id}:${rootInfo.root_type}`;
              const inheritedPerm = rootPermsMap.get(rootKey);
              if (inheritedPerm) {
                beforeDocPerms.push({
                  resource_id: fileRes.id,
                  project_id: fileRes.project_id,
                  permission_level: inheritedPerm,
                  resource_name: fileRes.name ?? null,
                });
              }
              // If no root permission found, document has no access (don't add to beforeDocPerms)
            }
            // If no root found, document has no access (don't add to beforeDocPerms)
          }
        }
      }
    }

    console.log(
      `[update-member-permissions] [${requestId}] BEFORE document-level state captured:`,
      {
        docs_with_access: beforeDocPerms.length,
      }
    );

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
          
          // Upsert all permissions including 'none' (which explicitly blocks inheritance)
          const rows = grant.fileOverrides
            .filter((o: any) => o.permission === 'none' || o.permission === 'view' || o.permission === 'edit')
            .map((o: any) => ({
              resource_id: o.resource_id,
              user_id: user_id,
              permission: o.permission, // Can be 'none', 'view', or 'edit'
              granted_by: user.id,
            }));
          
          if (rows.length > 0) {
            const { error: ovErr } = await supabaseAdmin
              .from('permissions')
              .upsert(rows, { onConflict: 'resource_id,user_id' });
            if (ovErr) {
              console.error(`[update-member-permissions] [${requestId}] Failed to apply file overrides for project ${grant.projectId}:`, {
                error: ovErr.message,
                error_code: ovErr.code,
              });
            } else {
              const noneCount = rows.filter((r: any) => r.permission === 'none').length;
              const otherCount = rows.length - noneCount;
              console.log(`[update-member-permissions] [${requestId}] File overrides applied successfully for project ${grant.projectId} (${otherCount} view/edit, ${noneCount} none)`);
            }
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

    // =========================================================================
    // AFTER STATE: Compare with before and create domain events for changes
    // =========================================================================
    console.log(
      `[update-member-permissions] [${requestId}] Comparing BEFORE vs AFTER states`
    );
    
    // ---------------- Project-level AFTER state (existing behaviour) ---------
    // Build AFTER state from the new project_grants
    type AfterGrant = { project_id: string; permission_level: string };
    const afterGrants: AfterGrant[] = projectGrantsArr.map((g: any) => {
      // Determine permission level - if any permission is 'edit', they have edit access
      const hasEdit = (g.permissions || []).some((p: any) => p.permission === "edit");
      return {
        project_id: g.projectId,
        permission_level: hasEdit ? "edit" : "view",
      };
    });
    
    const beforeProjectMap = new Map(
      beforeGrants.map((g) => [g.project_id, g.permission_level])
    );
    const afterProjectMap = new Map(
      afterGrants.map((g) => [g.project_id, g.permission_level])
    );
    
    // Detect changes
    const accessGranted: { project_id: string; new_permission: string }[] = [];
    const accessChanged: {
      project_id: string;
      old_permission: string;
      new_permission: string;
    }[] = [];
    
    // Check for new grants and changes
    for (const [projectId, newLevel] of afterProjectMap) {
      const oldLevel = beforeProjectMap.get(projectId);
      if (!oldLevel) {
        // New access granted
        accessGranted.push({ project_id: projectId, new_permission: newLevel });
      } else if (oldLevel !== newLevel) {
        // Permission level changed
        accessChanged.push({ project_id: projectId, old_permission: oldLevel, new_permission: newLevel });
      }
    }
    
    console.log(
      `[update-member-permissions] [${requestId}] Project access changes detected:`,
      {
      granted: accessGranted.length,
      changed: accessChanged.length,
      }
    );

    // ---------------- Document-level AFTER state + diff (with inheritance) ---
    type AfterDocPerm = {
      resource_id: string;
      project_id: string | null;
      permission_level: string;
      resource_name: string | null;
    };

    const afterDocPerms: AfterDocPerm[] = [];

    if (orgProjectIds.length > 0) {
      // Get all FILE resources for these projects (same as BEFORE state)
      const { data: allFileResources, error: filesError } = await supabaseAdmin
        .from("resources")
        .select("id, project_id, name, parent_id, resource_type")
        .in("project_id", orgProjectIds)
        .eq("resource_type", "FILE");

      if (filesError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to fetch file resources for AFTER state:`,
          filesError.message
        );
      } else if (allFileResources && allFileResources.length > 0) {
        // Get explicit document permissions
        const fileResourceIds = allFileResources.map((r: any) => r.id);
        const { data: explicitPerms, error: explicitPermsError } =
          await supabaseAdmin
            .from("permissions")
            .select("resource_id, permission")
            .eq("user_id", user_id)
            .in("resource_id", fileResourceIds);

        const explicitPermsMap = new Map<string, string>();
        if (!explicitPermsError && explicitPerms) {
          for (const perm of explicitPerms) {
            // Include 'none', 'view', and 'edit' as valid permissions
            const level =
              perm.permission === "edit" || perm.permission === "view" || perm.permission === "none"
                ? perm.permission
                : "view";
            explicitPermsMap.set(perm.resource_id, level);
          }
        }

        // Get project root permissions (PROJECT_DOCS_ROOT and BORROWER_DOCS_ROOT) for inheritance
        const { data: rootResources, error: rootResourcesError } =
          await supabaseAdmin
            .from("resources")
            .select("id, project_id, resource_type")
            .in("project_id", orgProjectIds)
            .in("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"]);

        const rootPermsMap = new Map<string, string>(); // key: `${project_id}:${resource_type}`, value: permission
        if (!rootResourcesError && rootResources) {
          const rootResourceIds = rootResources.map((r: any) => r.id);
          const { data: rootPerms, error: rootPermsError } =
            await supabaseAdmin
              .from("permissions")
              .select("resource_id, permission")
              .eq("user_id", user_id)
              .in("resource_id", rootResourceIds);

          if (!rootPermsError && rootPerms) {
            for (const perm of rootPerms) {
              const rootRes = rootResources.find(
                (r: any) => r.id === perm.resource_id
              );
              if (rootRes) {
                const key = `${rootRes.project_id}:${rootRes.resource_type}`;
                const level =
                  perm.permission === "edit" || perm.permission === "view"
                    ? perm.permission
                    : "view";
                rootPermsMap.set(key, level);
              }
            }
          }
        }

        // Build a map of resource_id -> root info for inheritance lookup
        const resourceToRootMap = new Map<
          string,
          { project_id: string; root_type: string }
        >();

        // Get all resources (not just files) to build the parent chain
        const { data: allResources, error: allResourcesError } =
          await supabaseAdmin
            .from("resources")
            .select("id, project_id, parent_id, resource_type")
            .in("project_id", orgProjectIds);

        if (!allResourcesError && allResources) {
          // Helper to find root for a resource by traversing parent chain
          // Continues past BORROWER_RESUME and PROJECT_RESUME to find the docs root
          const findRootForResource = (
            resourceId: string
          ): { project_id: string; root_type: string } | null => {
            const resource = allResources.find((r: any) => r.id === resourceId);
            if (!resource) return null;

            let current: any = resource;
            const visited = new Set<string>();

            while (current.parent_id && !visited.has(current.id)) {
              visited.add(current.id);
              const parent = allResources.find(
                (r: any) => r.id === current.parent_id
              );
              if (!parent) break;
              
              // Check if this is a docs root
              if (
                parent.resource_type === "PROJECT_DOCS_ROOT" ||
                parent.resource_type === "BORROWER_DOCS_ROOT"
              ) {
                return {
                  project_id: current.project_id,
                  root_type: parent.resource_type,
                };
              }
              
              // Continue traversing past BORROWER_RESUME and PROJECT_RESUME
              // (these are intermediate nodes in the hierarchy)
              current = parent;
            }
            return null;
          };

          for (const fileRes of allFileResources) {
            const rootInfo = findRootForResource(fileRes.id);
            if (rootInfo) {
              resourceToRootMap.set(fileRes.id, rootInfo);
            }
          }
        }

        // Now build afterDocPerms with effective permissions (explicit or inherited)
        for (const fileRes of allFileResources) {
          const explicitPerm = explicitPermsMap.get(fileRes.id);

          if (explicitPerm) {
            // Has explicit permission (including 'none' which blocks inheritance)
            afterDocPerms.push({
              resource_id: fileRes.id,
              project_id: fileRes.project_id,
              permission_level: explicitPerm, // Can be 'none', 'view', or 'edit'
              resource_name: fileRes.name ?? null,
            });
          } else {
            // No explicit permission - inherit from root
            const rootInfo = resourceToRootMap.get(fileRes.id);
            if (rootInfo) {
              const rootKey = `${rootInfo.project_id}:${rootInfo.root_type}`;
              const inheritedPerm = rootPermsMap.get(rootKey);
              if (inheritedPerm) {
                afterDocPerms.push({
                  resource_id: fileRes.id,
                  project_id: fileRes.project_id,
                  permission_level: inheritedPerm,
                  resource_name: fileRes.name ?? null,
                });
              }
              // If no root permission found, document has no access (don't add to afterDocPerms)
            }
            // If no root found, document has no access (don't add to afterDocPerms)
          }
        }
      }
    }

    console.log(
      `[update-member-permissions] [${requestId}] AFTER document-level state captured:`,
      {
        docs_with_access: afterDocPerms.length,
        sample_docs: afterDocPerms.slice(0, 5).map(d => ({
          resource_id: d.resource_id,
          resource_name: d.resource_name,
          permission: d.permission_level,
          project_id: d.project_id
        }))
      }
    );

    const beforeDocMap = new Map<
      string,
      { project_id: string | null; permission_level: string; resource_name: string | null }
    >();
    beforeDocPerms.forEach((d) => {
      beforeDocMap.set(d.resource_id, {
        project_id: d.project_id,
        permission_level: d.permission_level,
        resource_name: d.resource_name,
      });
    });

    const afterDocMap = new Map<
      string,
      { project_id: string | null; permission_level: string; resource_name: string | null }
    >();
    afterDocPerms.forEach((d) => {
      afterDocMap.set(d.resource_id, {
        project_id: d.project_id,
        permission_level: d.permission_level,
        resource_name: d.resource_name,
      });
    });

    const docGranted: {
      resource_id: string;
      project_id: string | null;
      old_permission: string | null;
      new_permission: string;
      resource_name: string | null;
    }[] = [];
    const docChanged: {
      resource_id: string;
      project_id: string | null;
      old_permission: string;
      new_permission: string;
      resource_name: string | null;
    }[] = [];

    // Grants and changes
    for (const [resourceId, afterVal] of afterDocMap.entries()) {
      const beforeVal = beforeDocMap.get(resourceId);
      const newLevel = afterVal.permission_level;
      const projectId = afterVal.project_id;
      const resourceName = afterVal.resource_name ?? null;

      if (!beforeVal) {
        // No previous access
        if (newLevel === 'none') {
          // Setting to 'none' when there was no access before - no event needed (no change)
          continue;
        }
        // Now has view/edit access
        docGranted.push({
          resource_id: resourceId,
          project_id: projectId,
          old_permission: null, // No previous access
          new_permission: newLevel,
          resource_name: resourceName,
        });
      } else if (beforeVal.permission_level !== newLevel) {
        // Permission level changed between view/edit (skip 'none' as that's effectively a revoke)
        if (newLevel !== 'none') {
          docChanged.push({
            resource_id: resourceId,
            project_id: projectId,
            old_permission: beforeVal.permission_level,
            new_permission: newLevel,
            resource_name: resourceName,
          });
        }
      }
    }

    console.log(
      `[update-member-permissions] [${requestId}] Document access changes detected:`,
      {
        granted: docGranted.length,
        changed: docChanged.length,
      }
    );
    
    // Create domain events for each change
    const domainEventIds: number[] = [];
    
    // Get org name for notifications
    const { data: orgData } = await supabaseAdmin
      .from("orgs")
      .select("name")
      .eq("id", org_id)
      .single();
    const orgName = orgData?.name || "your organization";
    
    // Events for access granted
    for (const grant of accessGranted) {
      const projectName = projectNameMap.get(grant.project_id) || "a project";
      const { data: event, error: eventError } = await supabaseAdmin
        .from("domain_events")
        .insert({
          event_type: "project_access_granted",
          actor_id: user.id, // The admin who made the change
          project_id: grant.project_id,
          org_id: org_id,
          payload: {
            affected_user_id: user_id,
            project_id: grant.project_id,
            project_name: projectName,
            new_permission: grant.new_permission,
            changed_by_id: user.id,
            org_id: org_id,
            org_name: orgName,
          },
        })
        .select("id")
        .single();
      
      if (eventError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to create project_access_granted event:`,
          eventError.message
        );
      } else if (event) {
        domainEventIds.push(event.id);
        console.log(`[update-member-permissions] [${requestId}] Created project_access_granted event ${event.id} for project ${grant.project_id}`);
      }
    }
    
    // Events for access changed (only for upgrades: view -> edit, not downgrades)
    for (const change of accessChanged) {
      // Only create events for upgrades (view -> edit), skip downgrades (edit -> view)
      if (change.old_permission !== "view" || change.new_permission !== "edit") {
        console.log(
          `[update-member-permissions] [${requestId}] Skipping project_access_changed event for project ${change.project_id} - downgrade from ${change.old_permission} to ${change.new_permission}`
        );
        continue;
      }
      
      const projectName = projectNameMap.get(change.project_id) || "a project";
      const { data: event, error: eventError } = await supabaseAdmin
        .from("domain_events")
        .insert({
          event_type: "project_access_changed",
          actor_id: user.id,
          project_id: change.project_id,
          org_id: org_id,
          payload: {
            affected_user_id: user_id,
            project_id: change.project_id,
            project_name: projectName,
            old_permission: change.old_permission,
            new_permission: change.new_permission,
            changed_by_id: user.id,
            org_id: org_id,
            org_name: orgName,
          },
        })
        .select("id")
        .single();
      
      if (eventError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to create project_access_changed event:`,
          eventError.message
        );
      } else if (event) {
        domainEventIds.push(event.id);
        console.log(`[update-member-permissions] [${requestId}] Created project_access_changed event ${event.id} for project ${change.project_id}`);
      }
    }
    
    // Document-level events: granted
    for (const grant of docGranted) {
      if (!grant.project_id) continue;
      const projectName =
        projectNameMap.get(grant.project_id) || "a project";
      const { data: event, error: eventError } = await supabaseAdmin
        .from("domain_events")
        .insert({
          event_type: "document_permission_granted",
          actor_id: user.id,
          project_id: grant.project_id,
          org_id: org_id,
          resource_id: grant.resource_id,
          payload: {
            affected_user_id: user_id,
            project_id: grant.project_id,
            project_name: projectName,
            resource_id: grant.resource_id,
            resource_name: grant.resource_name,
            old_permission: grant.old_permission, // null or "none" - no previous access
            new_permission: grant.new_permission, // final permission (view or edit)
            changed_by_id: user.id,
            org_id: org_id,
            org_name: orgName,
          },
        })
        .select("id")
        .single();

      if (eventError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to create document_permission_granted event:`,
          eventError.message
        );
      } else if (event) {
        domainEventIds.push(event.id);
        console.log(
          `[update-member-permissions] [${requestId}] Created document_permission_granted event ${event.id} for resource ${grant.resource_id}`
        );
      }
    }

    // Document-level events: changed (only for upgrades: view -> edit, not downgrades)
    for (const change of docChanged) {
      if (!change.project_id) continue;
      
      // Only create events for upgrades (view -> edit), skip downgrades (edit -> view)
      if (change.old_permission !== "view" || change.new_permission !== "edit") {
        console.log(
          `[update-member-permissions] [${requestId}] Skipping document_permission_changed event for resource ${change.resource_id} - downgrade from ${change.old_permission} to ${change.new_permission}`
        );
        continue;
      }
      
      const projectName =
        projectNameMap.get(change.project_id) || "a project";
      const { data: event, error: eventError } = await supabaseAdmin
        .from("domain_events")
        .insert({
          event_type: "document_permission_changed",
          actor_id: user.id,
          project_id: change.project_id,
          org_id: org_id,
          resource_id: change.resource_id,
          payload: {
            affected_user_id: user_id,
            project_id: change.project_id,
            project_name: projectName,
            resource_id: change.resource_id,
            resource_name: change.resource_name,
            old_permission: change.old_permission,
            new_permission: change.new_permission,
            changed_by_id: user.id,
            org_id: org_id,
            org_name: orgName,
          },
        })
        .select("id")
        .single();

      if (eventError) {
        console.error(
          `[update-member-permissions] [${requestId}] Failed to create document_permission_changed event:`,
          eventError.message
        );
      } else if (event) {
        domainEventIds.push(event.id);
        console.log(
          `[update-member-permissions] [${requestId}] Created document_permission_changed event ${event.id} for resource ${change.resource_id}`
        );
      }
    }

    console.log(
      `[update-member-permissions] [${requestId}] Created ${domainEventIds.length} domain events (project + document level)`
    );
    // Note: Domain events created. The GCP notify-fan-out service will automatically
    // poll and process these events within 0-60 seconds (avg 30s).

    const duration = Date.now() - startTime;
    console.log(`[update-member-permissions] [${requestId}] Permissions update completed successfully:`, {
      user_id,
      org_id,
      project_grants_count: projectGrantsArr.length,
      events_created: domainEventIds.length,
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
