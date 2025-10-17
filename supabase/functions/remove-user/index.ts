// capmatch-dev/supabase/functions/remove-user/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { org_id, user_id: userIdToRemove } = await req.json();

    // Create a client with the user's auth token to identify the caller
    const userSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { data: { user: callingUser }, error: callingUserError } = await userSupabaseClient.auth.getUser();

    if (callingUserError) {
        throw new Error(`Authentication error: ${callingUserError.message}`);
    }
    if (!callingUser) {
        throw new Error("Could not identify calling user.");
    }

    // Create an admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the calling user is an owner of the organization
    const { data: member, error: memberError } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", callingUser.id)
      .single();

    if (memberError || member?.role !== 'owner') {
      return new Response(JSON.stringify({ error: "Only an organization owner can remove a user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403, // Forbidden
      });
    }

    // Prevent the last owner from being removed
    const { data: memberToRemove, error: memberToRemoveError } = await supabaseAdmin
        .from('org_members')
        .select('role')
        .eq('user_id', userIdToRemove)
        .eq('org_id', org_id)
        .single();
    
    if (memberToRemoveError) throw memberToRemoveError;

    if(memberToRemove.role === 'owner') {
        const { count, error: ownerCountError } = await supabaseAdmin
            .from('org_members')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org_id)
            .eq('role', 'owner');

        if(ownerCountError) throw ownerCountError;

        if (count !== null && count <= 1) {
            throw new Error("Cannot remove the last owner of the organization.");
        }
    }

    // Delete the user from the auth schema
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToRemove);
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in remove-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
