// capmatch-dev/supabase/functions/remove-user/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[remove-user] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[remove-user] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { org_id, user_id: userIdToRemove } = requestBody;
    
    console.log(`[remove-user] [${requestId}] Parsed request body:`, {
      org_id,
      user_id_to_remove: userIdToRemove,
    });

    if (!org_id || !userIdToRemove) {
      console.error(`[remove-user] [${requestId}] Validation failed - missing required fields:`, {
        has_org_id: !!org_id,
        has_user_id: !!userIdToRemove,
      });
      throw new Error("org_id and user_id are required");
    }

    // Create a client with the user's auth token to identify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[remove-user] [${requestId}] Authentication failed - no authorization header`);
      throw new Error("Authorization header required");
    }
    
    console.log(`[remove-user] [${requestId}] Verifying calling user`);
    const userSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user: callingUser }, error: callingUserError } = await userSupabaseClient.auth.getUser();

    if (callingUserError) {
      console.error(`[remove-user] [${requestId}] Authentication error:`, callingUserError.message);
      throw new Error(`Authentication error: ${callingUserError.message}`);
    }
    if (!callingUser) {
      console.error(`[remove-user] [${requestId}] Could not identify calling user`);
      throw new Error("Could not identify calling user.");
    }
    
    console.log(`[remove-user] [${requestId}] Calling user authenticated: ${callingUser.id}`);

    // Create an admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the calling user is an owner of the organization
    console.log(`[remove-user] [${requestId}] Verifying calling user is owner of org ${org_id}`);
    const { data: member, error: memberError } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", callingUser.id)
      .single();

    if (memberError) {
      console.error(`[remove-user] [${requestId}] Error checking membership:`, memberError.message);
      return new Response(JSON.stringify({ error: "Only an organization owner can remove a user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403, // Forbidden
      });
    }
    
    if (member?.role !== 'owner') {
      console.warn(`[remove-user] [${requestId}] Authorization failed - calling user ${callingUser.id} is not an owner (role: ${member?.role})`);
      return new Response(JSON.stringify({ error: "Only an organization owner can remove a user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403, // Forbidden
      });
    }
    
    console.log(`[remove-user] [${requestId}] Calling user ${callingUser.id} confirmed as owner`);

    // Prevent the last owner from being removed
    console.log(`[remove-user] [${requestId}] Checking target user membership and role`);
    const { data: memberToRemove, error: memberToRemoveError } = await supabaseAdmin
        .from('org_members')
        .select('role')
        .eq('user_id', userIdToRemove)
        .eq('org_id', org_id)
        .single();
    
    if (memberToRemoveError) {
      console.error(`[remove-user] [${requestId}] Error fetching target user membership:`, memberToRemoveError.message);
      throw memberToRemoveError;
    }
    
    console.log(`[remove-user] [${requestId}] Target user ${userIdToRemove} has role: ${memberToRemove.role}`);

    if(memberToRemove.role === 'owner') {
      console.log(`[remove-user] [${requestId}] Target user is an owner - checking owner count`);
      const { count, error: ownerCountError } = await supabaseAdmin
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org_id)
          .eq('role', 'owner');

      if(ownerCountError) {
        console.error(`[remove-user] [${requestId}] Error counting owners:`, ownerCountError.message);
        throw ownerCountError;
      }

      console.log(`[remove-user] [${requestId}] Found ${count} owner(s) in org`);

      if (count !== null && count <= 1) {
        console.warn(`[remove-user] [${requestId}] Cannot remove last owner - blocking operation`);
        throw new Error("Cannot remove the last owner of the organization.");
      }
    }

    // Delete the user from the auth schema
    console.log(`[remove-user] [${requestId}] Deleting user ${userIdToRemove} from auth schema`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToRemove);
    if (deleteError) {
      console.error(`[remove-user] [${requestId}] Failed to delete user:`, {
        error: deleteError.message,
        error_status: deleteError.status,
      });
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[remove-user] [${requestId}] User removed successfully:`, {
      removed_user_id: userIdToRemove,
      org_id,
      removed_by: callingUser.id,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[remove-user] [${requestId}] Error after ${duration}ms:`, {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
