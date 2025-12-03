import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[validate-invite] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[validate-invite] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { token } = requestBody;
    
    console.log(`[validate-invite] [${requestId}] Parsed request body:`, {
      has_token: !!token,
      token_type: typeof token,
      token_preview: token ? `${token.substring(0, 8)}...` : null,
    });

    if (!token || typeof token !== 'string') {
      console.error(`[validate-invite] [${requestId}] Validation failed - invalid token`);
      return new Response(JSON.stringify({ valid: false, error: "Missing token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: fetch invite by token
    console.log(`[validate-invite] [${requestId}] Looking up invite by token`);
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("id, org_id, invited_by, invited_email, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !invite) {
      console.warn(`[validate-invite] [${requestId}] Invite not found or error:`, {
        error: error?.message,
        invite_found: !!invite,
      });
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`[validate-invite] [${requestId}] Invite found:`, {
      invite_id: invite.id,
      status: invite.status,
      expires_at: invite.expires_at,
      org_id: invite.org_id,
    });

    // Validate status and expiry
    const isPending = invite.status === 'pending';
    const notExpired = !invite.expires_at || new Date(invite.expires_at) > new Date();
    
    console.log(`[validate-invite] [${requestId}] Validating invite:`, {
      is_pending: isPending,
      not_expired: notExpired,
      expires_at: invite.expires_at,
      current_time: new Date().toISOString(),
    });
    
    if (!isPending || !notExpired) {
      console.warn(`[validate-invite] [${requestId}] Invite validation failed:`, {
        is_pending: isPending,
        not_expired: notExpired,
        status: invite.status,
      });
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Step 2: fetch org name
    console.log(`[validate-invite] [${requestId}] Fetching org name for org_id: ${invite.org_id}`);
    const { data: org, error: orgError } = await supabaseAdmin
      .from('orgs')
      .select('name')
      .eq('id', invite.org_id)
      .maybeSingle();
      
    if (orgError) {
      console.error(`[validate-invite] [${requestId}] Error fetching org:`, {
        error: orgError.message,
        error_code: orgError.code,
      });
    } else {
      console.log(`[validate-invite] [${requestId}] Org found: ${org?.name || 'not found'}`);
    }

    // Step 3: fetch inviter's profile name (optional)
    console.log(`[validate-invite] [${requestId}] Fetching inviter profile for user_id: ${invite.invited_by}`);
    const { data: inviter, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', invite.invited_by)
      .maybeSingle();
      
    if (inviterError) {
      console.error(`[validate-invite] [${requestId}] Error fetching inviter profile:`, {
        error: inviterError.message,
        error_code: inviterError.code,
      });
    } else {
      console.log(`[validate-invite] [${requestId}] Inviter found: ${inviter?.full_name || 'not found'}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[validate-invite] [${requestId}] Validation successful:`, {
      valid: true,
      org_name: org?.name,
      inviter_name: inviter?.full_name,
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        valid: true,
        orgName: org?.name ?? undefined,
        inviterName: inviter?.full_name ?? undefined,
        // Expose the invited email so the frontend can auto sign-in after onboarding
        email: invite?.invited_email ?? undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[validate-invite] [${requestId}] Error after ${duration}ms:`, {
      error_message: error?.message,
      error_stack: error?.stack,
      error_name: error?.name,
    });
    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});


