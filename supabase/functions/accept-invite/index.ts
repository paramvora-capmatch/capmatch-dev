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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, accept, password, full_name } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (accept !== true) {
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
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*, org:orgs!invites_org_id_fkey(*)")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Enforce: invites only for brand-new accounts
    if (!invite.invited_email) {
      return new Response(JSON.stringify({ error: "Invalid invite - no email", code: "invalid_invite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Guardrail: block if email already exists (profiles as proxy for auth.users)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", invite.invited_email)
      .maybeSingle();
    if (existingProfile) {
      return new Response(JSON.stringify({
        error: "Email already registered",
        code: "email_already_registered",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Require credentials to create the account
    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password required (min 8 chars)", code: "invalid_password" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Full name required", code: "invalid_full_name" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create user account with password
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: invite.invited_email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });
    if (createUserError || !newUser?.user) {
      return new Response(JSON.stringify({
        error: `Failed to create user account: ${createUserError?.message || 'Unknown error'}`,
        code: "create_user_failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const userId = newUser.user.id;

    // Create user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email: invite.invited_email,
        app_role: 'borrower'
      });
    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        error: `Failed to create user profile: ${profileError.message}`,
        code: "create_profile_failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!accept) {
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
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role,
      });
    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // NEW STEP: Update the user's profile to set their active organization
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ active_org_id: invite.org_id })
      .eq("id", userId);

    if (updateProfileError) {
      // This is not a critical failure that should roll back the user, but we should log it.
      console.error(
        `[accept-invite] Failed to set active_org_id for user ${userId}: ${updateProfileError.message}`
      );
    }

    // Apply project grants (permissions) if provided
    const projectGrants = (invite.project_grants as any[]) || [];
    if (Array.isArray(projectGrants) && projectGrants.length > 0) {
      for (const grant of projectGrants) {
        // 1) Grant root permissions via RPC helper
        if (grant.projectId && Array.isArray(grant.permissions)) {
          try {
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
            console.error(`[accept-invite] Failed to apply file overrides for project ${grant.projectId}: ${JSON.stringify(ovErr)}`);
          }
        } else if (grant.exclusions && Array.isArray(grant.exclusions) && grant.exclusions.length > 0) {
          const rows = grant.exclusions.map((resource_id: string) => ({ resource_id, user_id: userId, permission: 'none', granted_by: invite.invited_by }));
          const { error: exclError } = await supabase.from('permissions').upsert(rows, { onConflict: 'resource_id,user_id' });
          if (exclError) {
            console.error(`[accept-invite] Failed to apply exclusions for project ${grant.projectId}: ${JSON.stringify(exclError)}`);
          }
        }

        // 3) Ensure the user is a participant in the General chat thread for this project
        if (grant.projectId) {
          const { data: generalThread, error: threadsError } = await supabase
            .from('chat_threads')
            .select('id')
            .eq('project_id', grant.projectId)
            .eq('topic', 'General')
            .maybeSingle();
          if (threadsError) {
            console.error(`[accept-invite] Failed to fetch General chat thread for project ${grant.projectId}: ${threadsError.message}`);
          } else if (generalThread) {
            const { error: addPartErr } = await supabase
              .from('chat_thread_participants')
              .upsert({ thread_id: generalThread.id, user_id: userId }, { onConflict: 'thread_id,user_id' });
            if (addPartErr) {
              console.error(`[accept-invite] Failed to add user to General chat thread for project ${grant.projectId}: ${addPartErr.message}`);
            } else {
              console.log(`[accept-invite] Successfully added user ${userId} to General chat thread for project ${grant.projectId}`);
            }
          } else {
            console.warn(`[accept-invite] No General chat thread found for project ${grant.projectId} - user will not be added to any chat thread`);
          }
        }
      }
    }

    // Mark invite accepted
    await supabase
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(JSON.stringify({ status: "accepted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const err: any = e;
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


