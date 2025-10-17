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

    // Apply initial permissions if provided
    const initial = invite.initial_permissions as any | null;
    if (initial && Array.isArray(initial)) {
      // Expecting array of { project_id: string, document_path: string }
      const rows = initial
        .filter((p) => p && p.project_id && p.document_path)
        .map((p) => ({ project_id: p.project_id, user_id: userId, document_path: p.document_path }));
      if (rows.length > 0) {
        // Use upsert to avoid duplicates
        const { error: permError } = await supabase.from("document_permissions").upsert(rows, {
          onConflict: "project_id,user_id,document_path",
        });
        if (permError) {
          return new Response(JSON.stringify({ error: permError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
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


