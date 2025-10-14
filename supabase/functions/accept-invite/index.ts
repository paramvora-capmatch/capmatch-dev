// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/*
  Request body:
  {
    token: string,
    accept: boolean
  }
  Behavior:
  - Verifies pending invite by token and expiry
  - If accept=true: marks invite accepted, creates entity_members row for user,
    optionally sets active_entity_id (not used in new schema per directive),
    and applies initial_permissions to document_permissions for the user
  - If accept=false: marks invite cancelled
*/
serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, accept } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authed user from the request (JWT via functions.invoke)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const authed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    // Set the auth for RLS reads where needed
    authed.auth.setAuth(jwt);

    // Look up invite by token and ensure it's pending and not expired
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*, entity:entities!invites_entity_id_fkey(*)")
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

    // Identify current user id via admin auth decode (service role) to avoid RLS complexity
    const { data: authUser } = await supabase.auth.getUser(jwt);
    const userId = authUser?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
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
      .from("entity_members")
      .insert({
        entity_id: invite.entity_id,
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


