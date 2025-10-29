import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
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
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("id, org_id, invited_by, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !invite) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate status and expiry
    const isPending = invite.status === 'pending';
    const notExpired = !invite.expires_at || new Date(invite.expires_at) > new Date();
    if (!isPending || !notExpired) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Step 2: fetch org name
    const { data: org } = await supabaseAdmin
      .from('orgs')
      .select('name')
      .eq('id', invite.org_id)
      .maybeSingle();

    // Step 3: fetch inviter's profile name (optional)
    const { data: inviter } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', invite.invited_by)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        valid: true,
        orgName: org?.name ?? undefined,
        inviterName: inviter?.full_name ?? undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[validate-invite] Error:", (error as any)?.message || String(error));
    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});


