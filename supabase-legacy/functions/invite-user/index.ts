import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[invite-user] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[invite-user] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { org_id, invited_email, role, project_grants, org_grants } = requestBody;
    
    console.log(`[invite-user] [${requestId}] Parsed request body:`, {
      org_id,
      invited_email,
      role,
      has_project_grants: !!project_grants,
      project_grants_count: project_grants?.length || 0,
      has_org_grants: !!org_grants,
    });

    // Validate required fields
    if (!org_id || !invited_email || !role) {
      throw new Error("org_id, invited_email, and role are required");
    }

    // Validate project_grants structure
    if (project_grants && !Array.isArray(project_grants)) {
      console.error(`[invite-user] [${requestId}] Validation failed - project_grants is not an array`);
      throw new Error("project_grants must be an array.");
    }
    // Validate org_grants structure
    if (org_grants) {
      if (!org_grants.permissions || !Array.isArray(org_grants.permissions)) {
        console.error(`[invite-user] [${requestId}] Validation failed - org_grants.permissions is not an array`);
        throw new Error("org_grants.permissions must be an array");
      }
    }
    if (project_grants) {
      for (const grant of project_grants) {
        if (!grant.projectId || !Array.isArray(grant.permissions)) {
          console.error(`[invite-user] [${requestId}] Validation failed - invalid project grant structure:`, grant);
          throw new Error("Each grant in project_grants must have a projectId and a permissions array.");
        }
      }
    }

    console.log(`[invite-user] [${requestId}] Request validation passed`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to create an invite for this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[invite-user] [${requestId}] Authentication failed - no authorization header`);
      throw new Error("Authorization header required");
    }
    
    const jwt = authHeader.replace("Bearer ", "");
    console.log(`[invite-user] [${requestId}] Verifying JWT token`);
    
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    
    if (userError) {
      console.error(`[invite-user] [${requestId}] Authentication failed:`, userError.message);
      throw new Error("Authentication failed");
    }
    
    console.log(`[invite-user] [${requestId}] User authenticated: ${user.id}`);

    console.log(`[invite-user] [${requestId}] Checking org ownership - org_id: ${org_id}, user_id: ${user.id}`);
    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc('is_org_owner', {
      p_org_id: org_id,
      p_user_id: user.id
    });
    
    if (ownerCheckError) {
      console.error(`[invite-user] [${requestId}] Error checking org ownership:`, ownerCheckError.message);
      throw new Error("User must be an owner of the org to create an invite.");
    }
    
    if (!isOwner) {
      console.warn(`[invite-user] [${requestId}] Authorization failed - user ${user.id} is not an owner of org ${org_id}`);
      throw new Error("User must be an owner of the org to create an invite.");
    }
    
    console.log(`[invite-user] [${requestId}] User ${user.id} confirmed as owner of org ${org_id}`);
    
    // Block invites to existing users in other orgs
    console.log(`[invite-user] [${requestId}] Checking if email ${invited_email} already exists`);
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", invited_email)
      .maybeSingle();
      
    if (existingProfile) {
      console.warn(`[invite-user] [${requestId}] Invite blocked - email ${invited_email} already registered to user ${existingProfile.id}`);
      return new Response(JSON.stringify({
        error: "Email already registered to another user.",
        code: "email_already_registered",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }
    
    console.log(`[invite-user] [${requestId}] Email ${invited_email} is available for invite`);

    // Create the invite record
    console.log(`[invite-user] [${requestId}] Creating invite record`);
    const inviteData = {
      org_id,
      invited_by: user.id,
      invited_email,
      role,
      project_grants: project_grants || null,
      org_grants: org_grants || null,
    };
    
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invites")
      .insert(inviteData)
      .select()
      .single();

    if (inviteError) {
      console.error(`[invite-user] [${requestId}] Failed to create invite:`, {
        error_code: inviteError.code,
        error_message: inviteError.message,
        error_details: inviteError.details,
      });
      
      if (inviteError.code === '23505') { // Unique constraint violation
        console.log(`[invite-user] [${requestId}] Unique constraint violation - checking for existing pending invite`);
        // Check for an existing pending invite
         const { data: existingInvite } = await supabaseAdmin
          .from('invites')
          .select('id')
          .eq('org_id', org_id)
          .eq('invited_email', invited_email)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingInvite) {
          console.warn(`[invite-user] [${requestId}] Duplicate invite detected - invite_id: ${existingInvite.id}`);
          throw new Error("An active invite for this email already exists for this org.");
        } else {
          console.error(`[invite-user] [${requestId}] Unique constraint violation but no pending invite found`);
          throw new Error(`Invite creation failed. Please check for existing users or invites. Details: ${inviteError.message}`);
        }
      }
      throw new Error(`Invite creation failed: ${inviteError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[invite-user] [${requestId}] Invite created successfully:`, {
      invite_id: invite.id,
      token: invite.token,
      expires_at: invite.expires_at,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({ invite }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[invite-user] [${requestId}] Error after ${duration}ms:`, {
      error_message: error.message,
      error_stack: error.stack,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
