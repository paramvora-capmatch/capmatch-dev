// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/*
  Request body:
  {
    token: string,
    accept: true,
    password: string,
    full_name: string
  }
  Behavior:
  - Verifies pending invite by token and expiry
  - If accept=true: marks invite accepted, creates org_members row for user,
    optionally sets active_org_id (not used in new schema per directive),
    and applies initial_permissions to document_permissions for the user
  - If accept=false: marks invite cancelled
*/
serve(async (req: any) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[accept-invite] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[accept-invite] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { token, accept, password, full_name } = requestBody;
    
    console.log(`[accept-invite] [${requestId}] Parsed request body:`, {
      has_token: !!token,
      token_preview: token ? `${token.substring(0, 8)}...` : null,
      accept,
      has_password: !!password,
      password_length: password?.length || 0,
      has_full_name: !!full_name,
    });

    if (!token) {
      console.error(`[accept-invite] [${requestId}] Validation failed - missing token`);
      return new Response(JSON.stringify({ error: "Missing token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (accept !== true) {
      console.error(`[accept-invite] [${requestId}] Validation failed - accept is not true:`, accept);
      return new Response(JSON.stringify({ error: "Invalid request", code: "invalid_request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up invite by token and ensure it's pending and not expired
    console.log(`[accept-invite] [${requestId}] Looking up invite by token`);
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*, org:orgs!invites_org_id_fkey(*)")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      console.error(`[accept-invite] [${requestId}] Invalid or expired invite:`, {
        error: inviteError?.message,
        invite_found: !!invite,
      });
      return new Response(JSON.stringify({ error: "Invalid or expired invite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log(`[accept-invite] [${requestId}] Invite found:`, {
      invite_id: invite.id,
      org_id: invite.org_id,
      invited_email: invite.invited_email,
      role: invite.role,
      expires_at: invite.expires_at,
      has_project_grants: !!invite.project_grants,
      project_grants_count: Array.isArray(invite.project_grants) ? invite.project_grants.length : 0,
    });

    // Enforce: invites only for brand-new accounts
    if (!invite.invited_email) {
      console.error(`[accept-invite] [${requestId}] Invalid invite - no email in invite record`);
      return new Response(JSON.stringify({ error: "Invalid invite - no email", code: "invalid_invite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Guardrail: block if email already exists (profiles as proxy for auth.users)
    console.log(`[accept-invite] [${requestId}] Checking if email ${invite.invited_email} already exists`);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", invite.invited_email)
      .maybeSingle();
      
    if (existingProfile) {
      console.warn(`[accept-invite] [${requestId}] Invite blocked - email ${invite.invited_email} already registered to user ${existingProfile.id}`);
      return new Response(JSON.stringify({
        error: "Email already registered",
        code: "email_already_registered",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }
    
    console.log(`[accept-invite] [${requestId}] Email ${invite.invited_email} is available`);

    // Require credentials to create the account
    if (!password || typeof password !== "string" || password.length < 8) {
      console.error(`[accept-invite] [${requestId}] Validation failed - invalid password:`, {
        has_password: !!password,
        password_type: typeof password,
        password_length: password?.length || 0,
      });
      return new Response(JSON.stringify({ error: "Password required (min 8 chars)", code: "invalid_password" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
      console.error(`[accept-invite] [${requestId}] Validation failed - invalid full_name:`, {
        has_full_name: !!full_name,
        full_name_type: typeof full_name,
        full_name_length: full_name?.length || 0,
        full_name_trimmed_length: full_name?.trim().length || 0,
      });
      return new Response(JSON.stringify({ error: "Full name required", code: "invalid_full_name" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log(`[accept-invite] [${requestId}] Request validation passed`);

    // Create user account with password
    console.log(`[accept-invite] [${requestId}] Creating auth user account for ${invite.invited_email}`);
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: invite.invited_email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });
    
    if (createUserError || !newUser?.user) {
      console.error(`[accept-invite] [${requestId}] Failed to create auth user:`, {
        error: createUserError?.message,
        error_code: createUserError?.status,
        user_created: !!newUser?.user,
      });
      return new Response(JSON.stringify({
        error: `Failed to create user account: ${createUserError?.message || 'Unknown error'}`,
        code: "create_user_failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const userId = newUser.user.id;
    console.log(`[accept-invite] [${requestId}] Auth user created successfully: ${userId}`);

    // Create user profile
    console.log(`[accept-invite] [${requestId}] Creating user profile for ${userId}`);
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email: invite.invited_email,
        app_role: 'borrower'
      });
      
    if (profileError) {
      console.error(`[accept-invite] [${requestId}] Failed to create profile, cleaning up auth user:`, {
        error: profileError.message,
        error_code: profileError.code,
      });
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        error: `Failed to create user profile: ${profileError.message}`,
        code: "create_profile_failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    console.log(`[accept-invite] [${requestId}] User profile created successfully`);

    if (!accept) {
      console.log(`[accept-invite] [${requestId}] Invite declined, marking as cancelled`);
      await supabase
        .from("invites")
        .update({ status: "cancelled" })
        .eq("id", invite.id);
      return new Response(JSON.stringify({ status: "cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create membership for the user
    console.log(`[accept-invite] [${requestId}] Creating org membership:`, {
      org_id: invite.org_id,
      user_id: userId,
      role: invite.role,
    });
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role,
      });
      
    if (memberError) {
      console.error(`[accept-invite] [${requestId}] Failed to create org membership:`, {
        error: memberError.message,
        error_code: memberError.code,
      });
      return new Response(JSON.stringify({ error: memberError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log(`[accept-invite] [${requestId}] Org membership created successfully`);

    // NEW STEP: Update the user's profile to set their active organization
    console.log(`[accept-invite] [${requestId}] Setting active_org_id to ${invite.org_id} for user ${userId}`);
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ active_org_id: invite.org_id })
      .eq("id", userId);

    if (updateProfileError) {
      // This is not a critical failure that should roll back the user, but we should log it.
      console.error(`[accept-invite] [${requestId}] Failed to set active_org_id for user ${userId}:`, {
        error: updateProfileError.message,
        error_code: updateProfileError.code,
      });
    } else {
      console.log(`[accept-invite] [${requestId}] Active org set successfully`);
    }

    // Apply project grants (permissions) if provided
    const projectGrants = (invite.project_grants as any[]) || [];
    console.log(`[accept-invite] [${requestId}] Processing project grants:`, {
      project_grants_count: projectGrants.length,
    });
    
    if (Array.isArray(projectGrants) && projectGrants.length > 0) {
      for (const grant of projectGrants) {
        console.log(`[accept-invite] [${requestId}] Processing grant for project ${grant.projectId}:`, {
          permissions_count: grant.permissions?.length || 0,
          has_file_overrides: !!grant.fileOverrides,
          file_overrides_count: grant.fileOverrides?.length || 0,
          has_exclusions: !!grant.exclusions,
          exclusions_count: grant.exclusions?.length || 0,
        });
        
        // 1) Grant root permissions via RPC helper
        if (grant.projectId && Array.isArray(grant.permissions)) {
          try {
            console.log(`[accept-invite] [${requestId}] Granting root permissions for project ${grant.projectId}`);
            const { error: grantError } = await supabase.rpc('grant_project_access', {
              p_project_id: grant.projectId,
              p_user_id: userId,
              p_granted_by_id: invite.invited_by,
              p_permissions: grant.permissions,
            });
            if (grantError) {
              // Check if it's a duplicate key error (already granted) - this is OK
              const isDuplicateError = grantError.code === '23505' || 
                (typeof grantError === 'string' && grantError.includes('duplicate key'));
              if (isDuplicateError) {
                console.log(`[accept-invite] Project access already granted for project ${grant.projectId} - continuing with permission updates`);
              } else {
                console.error(`[accept-invite] Error granting root permissions for project ${grant.projectId}: ${JSON.stringify(grantError)}`);
              }
            } else {
              console.log(`[accept-invite] Successfully granted access to project ${grant.projectId} for user ${userId}`);
            }
          } catch (rpcError: any) {
            // Check if it's a duplicate key error - this is OK
            const isDuplicateError = rpcError?.code === '23505' || 
              (rpcError?.message && rpcError.message.includes('duplicate key'));
            if (isDuplicateError) {
              console.log(`[accept-invite] Project access already granted for project ${grant.projectId} - continuing with permission updates`);
            } else {
              console.error(`[accept-invite] RPC grant_project_access failed: ${rpcError.message}`);
            }
          }
        }

        // 2) Apply per-doc overrides (none/view/edit) and back-compat exclusions
        if (grant.fileOverrides && Array.isArray(grant.fileOverrides) && grant.fileOverrides.length > 0) {
          console.log(`[accept-invite] [${requestId}] Applying ${grant.fileOverrides.length} file overrides for project ${grant.projectId}`);
          
          // Upsert all permissions including 'none' (which explicitly blocks inheritance)
          const rows = grant.fileOverrides
            .filter((o: any) => o.permission === 'none' || o.permission === 'view' || o.permission === 'edit')
            .map((o: any) => ({
              resource_id: o.resource_id,
              user_id: userId,
              permission: o.permission, // Can be 'none', 'view', or 'edit'
              granted_by: invite.invited_by,
            }));
          
          if (rows.length > 0) {
            const { error: ovErr } = await supabase
              .from('permissions')
              .upsert(rows, { onConflict: 'resource_id,user_id' });
            if (ovErr) {
              console.error(`[accept-invite] [${requestId}] Failed to apply file overrides for project ${grant.projectId}:`, {
                error: ovErr.message,
                error_code: ovErr.code,
              });
            } else {
              const noneCount = rows.filter((r: any) => r.permission === 'none').length;
              const otherCount = rows.length - noneCount;
              console.log(`[accept-invite] [${requestId}] File overrides applied successfully for project ${grant.projectId} (${otherCount} view/edit, ${noneCount} none)`);
            }
          }
        } else if (grant.exclusions && Array.isArray(grant.exclusions) && grant.exclusions.length > 0) {
          console.log(`[accept-invite] [${requestId}] Applying ${grant.exclusions.length} exclusions for project ${grant.projectId}`);
          const rows = grant.exclusions.map((resource_id: string) => ({ resource_id, user_id: userId, permission: 'none', granted_by: invite.invited_by }));
          const { error: exclError } = await supabase.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
          if (exclError) {
            console.error(`[accept-invite] [${requestId}] Failed to apply exclusions for project ${grant.projectId}:`, {
              error: exclError.message,
              error_code: exclError.code,
            });
          } else {
            console.log(`[accept-invite] [${requestId}] Exclusions applied successfully for project ${grant.projectId}`);
          }
        }

        // 3) Ensure the user is a participant in the General chat thread for this project
        if (grant.projectId) {
          console.log(`[accept-invite] [${requestId}] Adding user to General chat thread for project ${grant.projectId}`);
          const { data: generalThread, error: threadsError } = await supabase
            .from('chat_threads')
            .select('id')
            .eq('project_id', grant.projectId)
            .eq('topic', 'General')
            .maybeSingle();
          if (threadsError) {
            console.error(`[accept-invite] [${requestId}] Failed to fetch General chat thread for project ${grant.projectId}:`, {
              error: threadsError.message,
              error_code: threadsError.code,
            });
          } else if (generalThread) {
            const { error: addPartErr } = await supabase
              .from('chat_thread_participants')
              .upsert({ 
                thread_id: generalThread.id, 
                user_id: userId,
                last_read_at: '1970-01-01T00:00:00.000Z'
              }, { onConflict: 'thread_id,user_id' });
            if (addPartErr) {
              console.error(`[accept-invite] [${requestId}] Failed to add user to General chat thread for project ${grant.projectId}:`, {
                error: addPartErr.message,
                error_code: addPartErr.code,
              });
            } else {
              console.log(`[accept-invite] [${requestId}] Successfully added user ${userId} to General chat thread ${generalThread.id} for project ${grant.projectId}`);
            }
          } else {
            console.warn(`[accept-invite] [${requestId}] No General chat thread found for project ${grant.projectId} - user will not be added to any chat thread`);
          }
        }
      }
    } else {
      console.log(`[accept-invite] [${requestId}] No project grants to process`);
    }

    // =========================================================================
    // Create document-level permission events for newly granted access
    // =========================================================================
    // Since this is a new user, BEFORE state is empty - all documents they have
    // access to should generate document_permission_granted events
    console.log(`[accept-invite] [${requestId}] Creating document-level permission events`);
    
    const docDomainEventIds: number[] = [];
    
    if (projectGrants.length > 0) {
      // Get org name for events
      const { data: orgData } = await supabase
        .from("orgs")
        .select("name")
        .eq("id", invite.org_id)
        .single();
      const orgName = orgData?.name || "your organization";
      
      // Get project names
      const projectIds = projectGrants.map((g: any) => g.projectId).filter(Boolean);
      const { data: projectsWithNames } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      const projectNameMap = new Map<string, string>();
      (projectsWithNames || []).forEach((p: any) => projectNameMap.set(p.id, p.name));
      
      // Capture AFTER state of document permissions (same logic as update-member-permissions)
      type AfterDocPerm = {
        resource_id: string;
        project_id: string | null;
        permission_level: string;
        resource_name: string | null;
      };
      
      const afterDocPerms: AfterDocPerm[] = [];
      
      // Get all FILE resources for these projects
      const { data: allFileResources, error: filesError } = await supabase
        .from("resources")
        .select("id, project_id, name, parent_id, resource_type")
        .in("project_id", projectIds)
        .eq("resource_type", "FILE");
      
      if (!filesError && allFileResources && allFileResources.length > 0) {
        // Get explicit document permissions
        const fileResourceIds = allFileResources.map((r: any) => r.id);
        const { data: explicitPerms, error: explicitPermsError } = await supabase
          .from("permissions")
          .select("resource_id, permission")
          .eq("user_id", userId)
          .in("resource_id", fileResourceIds);
        
        const explicitPermsMap = new Map<string, string>();
        if (!explicitPermsError && explicitPerms) {
          for (const perm of explicitPerms) {
            const level =
              perm.permission === "edit" || perm.permission === "view" || perm.permission === "none"
                ? perm.permission
                : "view";
            explicitPermsMap.set(perm.resource_id, level);
          }
        }
        
        // Get project root permissions for inheritance
        const { data: rootResources, error: rootResourcesError } = await supabase
          .from("resources")
          .select("id, project_id, resource_type")
          .in("project_id", projectIds)
          .in("resource_type", ["PROJECT_DOCS_ROOT", "BORROWER_DOCS_ROOT"]);
        
        const rootPermsMap = new Map<string, string>();
        if (!rootResourcesError && rootResources) {
          const rootResourceIds = rootResources.map((r: any) => r.id);
          const { data: rootPerms, error: rootPermsError } = await supabase
            .from("permissions")
            .select("resource_id, permission")
            .eq("user_id", userId)
            .in("resource_id", rootResourceIds);
          
          if (!rootPermsError && rootPerms) {
            for (const perm of rootPerms) {
              const rootRes = rootResources.find((r: any) => r.id === perm.resource_id);
              if (rootRes) {
                const key = `${rootRes.project_id}:${rootRes.resource_type}`;
                const level =
                  perm.permission === "edit" || perm.permission === "view" || perm.permission === "none"
                    ? perm.permission
                    : "view";
                rootPermsMap.set(key, level);
              }
            }
          }
        }
        
        // Build resource-to-root map for inheritance
        const resourceToRootMap = new Map<string, { project_id: string; root_type: string }>();
        const { data: allResources, error: allResourcesError } = await supabase
          .from("resources")
          .select("id, project_id, parent_id, resource_type")
          .in("project_id", projectIds);
        
        if (!allResourcesError && allResources) {
          const findRootForResource = (resourceId: string): { project_id: string; root_type: string } | null => {
            const resource = allResources.find((r: any) => r.id === resourceId);
            if (!resource) return null;
            
            let current: any = resource;
            const visited = new Set<string>();
            
            while (current.parent_id && !visited.has(current.id)) {
              visited.add(current.id);
              const parent = allResources.find((r: any) => r.id === current.parent_id);
              if (!parent) break;
              
              if (parent.resource_type === "PROJECT_DOCS_ROOT" || parent.resource_type === "BORROWER_DOCS_ROOT") {
                return { project_id: current.project_id, root_type: parent.resource_type };
              }
              
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
        
        // Build afterDocPerms with effective permissions
        for (const fileRes of allFileResources) {
          const explicitPerm = explicitPermsMap.get(fileRes.id);
          
          if (explicitPerm) {
            // Has explicit permission (including 'none')
            if (explicitPerm !== 'none') {
              // Only include non-'none' permissions (skip 'none' as it means no access)
              afterDocPerms.push({
                resource_id: fileRes.id,
                project_id: fileRes.project_id,
                permission_level: explicitPerm,
                resource_name: fileRes.name ?? null,
              });
            }
          } else {
            // No explicit permission - inherit from root
            const rootInfo = resourceToRootMap.get(fileRes.id);
            if (rootInfo) {
              const rootKey = `${rootInfo.project_id}:${rootInfo.root_type}`;
              const inheritedPerm = rootPermsMap.get(rootKey);
              if (inheritedPerm && inheritedPerm !== 'none') {
                afterDocPerms.push({
                  resource_id: fileRes.id,
                  project_id: fileRes.project_id,
                  permission_level: inheritedPerm,
                  resource_name: fileRes.name ?? null,
                });
              }
            }
          }
        }
      }
      
      // Create document_permission_granted events for all documents (BEFORE state is empty for new user)
      for (const docPerm of afterDocPerms) {
        if (!docPerm.project_id) continue;
        const projectName = projectNameMap.get(docPerm.project_id) || "a project";
        const { data: event, error: eventError } = await supabase
          .from("domain_events")
          .insert({
            event_type: "document_permission_granted",
            actor_id: invite.invited_by, // The person who sent the invite
            project_id: docPerm.project_id,
            org_id: invite.org_id,
            resource_id: docPerm.resource_id,
            payload: {
              affected_user_id: userId,
              project_id: docPerm.project_id,
              project_name: projectName,
              resource_id: docPerm.resource_id,
              resource_name: docPerm.resource_name,
              old_permission: null, // No previous access (new user)
              new_permission: docPerm.permission_level, // Final permission (view or edit)
              changed_by_id: invite.invited_by,
              org_id: invite.org_id,
              org_name: orgName,
            },
          })
          .select("id")
          .single();
        
        if (eventError) {
          console.error(`[accept-invite] [${requestId}] Failed to create document_permission_granted event:`, eventError.message);
        } else if (event) {
          docDomainEventIds.push(event.id);
          console.log(`[accept-invite] [${requestId}] Created document_permission_granted event ${event.id} for resource ${docPerm.resource_id}`);
        }
      }
      
      // Note: Domain events created. The GCP notify-fan-out service will automatically
      // poll and process these events within 0-60 seconds (avg 30s).
      
      console.log(`[accept-invite] [${requestId}] Created ${docDomainEventIds.length} document permission events`);
    }

    // Mark invite accepted
    console.log(`[accept-invite] [${requestId}] Marking invite ${invite.id} as accepted`);
    const { error: updateInviteError } = await supabase
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
      
    if (updateInviteError) {
      console.error(`[accept-invite] [${requestId}] Failed to mark invite as accepted:`, {
        error: updateInviteError.message,
        error_code: updateInviteError.code,
      });
    } else {
      console.log(`[accept-invite] [${requestId}] Invite marked as accepted successfully`);
    }

    // Create domain event for invite_accepted
    console.log(`[accept-invite] [${requestId}] Creating invite_accepted domain event`);
    const projectGrantIds = projectGrants.map((g: any) => g.projectId).filter(Boolean);
    const { data: domainEvent, error: domainEventError } = await supabase
      .from("domain_events")
      .insert({
        event_type: "invite_accepted",
        actor_id: userId,
        org_id: invite.org_id,
        project_id: null, // Org-level event, no specific project
        payload: {
          new_member_id: userId,
          new_member_name: full_name,
          new_member_email: invite.invited_email,
          invited_by: invite.invited_by,
          org_id: invite.org_id,
          org_name: invite.org?.name || null,
          project_grant_ids: projectGrantIds,
        },
      })
      .select("id")
      .single();

    if (domainEventError) {
      // Log but don't fail the request - the invite acceptance is complete
      console.error(`[accept-invite] [${requestId}] Failed to create domain event:`, {
        error: domainEventError.message,
        error_code: domainEventError.code,
      });
    } else {
      console.log(`[accept-invite] [${requestId}] Domain event created: ${domainEvent.id}`);
      // Note: Domain event created. The GCP notify-fan-out service will automatically
      // poll and process this event within 0-60 seconds (avg 30s).
    }

    const duration = Date.now() - startTime;
    console.log(`[accept-invite] [${requestId}] Invite acceptance completed successfully:`, {
      user_id: userId,
      org_id: invite.org_id,
      role: invite.role,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({ status: "accepted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    const err: any = e;
    console.error(`[accept-invite] [${requestId}] Error after ${duration}ms:`, {
      error_message: err?.message,
      error_stack: err?.stack,
      error_name: err?.name,
    });
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


