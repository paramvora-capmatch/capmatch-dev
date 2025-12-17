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
          const rows = grant.fileOverrides.map((o: any) => ({
            resource_id: o.resource_id,
            user_id: userId,
            permission: o.permission,
            granted_by: invite.invited_by,
          }));
          const { error: ovErr } = await supabase
            .from('permissions')
            .upsert(rows, { onConflict: 'resource_id,user_id' });
          if (ovErr) {
            console.error(`[accept-invite] [${requestId}] Failed to apply file overrides for project ${grant.projectId}:`, {
              error: ovErr.message,
              error_code: ovErr.code,
            });
          } else {
            console.log(`[accept-invite] [${requestId}] File overrides applied successfully for project ${grant.projectId}`);
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
              .upsert({ thread_id: generalThread.id, user_id: userId }, { onConflict: 'thread_id,user_id' });
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

      // Invoke notify-fan-out to create notifications for org owners
      try {
        console.log(`[accept-invite] [${requestId}] Invoking notify-fan-out for event ${domainEvent.id}`);
        const { error: fanOutError } = await supabase.functions.invoke("notify-fan-out", {
          body: { eventId: domainEvent.id },
        });
        if (fanOutError) {
          console.error(`[accept-invite] [${requestId}] notify-fan-out invocation failed:`, fanOutError);
        } else {
          console.log(`[accept-invite] [${requestId}] notify-fan-out invoked successfully`);
        }
      } catch (fanOutException: any) {
        console.error(`[accept-invite] [${requestId}] Exception invoking notify-fan-out:`, fanOutException?.message);
      }
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


