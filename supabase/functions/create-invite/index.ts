import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { org_id, invited_email, role } = await req.json();
    if (!org_id || !invited_email || !role) {
      throw new Error("org_id, invited_email, and role are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to create an invite for this org
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
      throw new Error("User must be an owner of the org to create an invite.");
    }
    
    // Block invites to existing users (one user -> one org)
    {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", invited_email)
        .maybeSingle();
      if (existingProfile) {
        return new Response(JSON.stringify({
          error: "Email already registered. Add this user to a project from the dashboard.",
          code: "email_already_registered",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
    }

    // Create the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invites")
      .insert({
        org_id,
        invited_by: user.id,
        invited_email,
        role,
      })
      .select()
      .single();

    if (inviteError) {
      if (inviteError.code === '23505') { // Unique constraint violation
        throw new Error("An active invite for this email already exists for this org.");
      }
      throw new Error(`Invite creation failed: ${inviteError.message}`);
    }

    return new Response(JSON.stringify({ invite }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error) {
    console.error("[create-invite] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
