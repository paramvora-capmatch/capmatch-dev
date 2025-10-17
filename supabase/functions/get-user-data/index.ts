// supabase/functions/get-user-data/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not set");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error("An array of userIds is required");
    }

    // Fetch user data for all userIds in parallel
    const userPromises = userIds.map(id => supabaseAdmin.auth.admin.getUserById(id));
    const userResults = await Promise.all(userPromises);

    // Process results, extracting email and handling potential errors
    const userEmails = userResults.map((result, index) => {
      if (result.error) {
        console.error(`Error fetching user ${userIds[index]}:`, result.error);
        return null; // or some error indication
      }
      return {
        id: result.data.user.id,
        email: result.data.user.email,
      };
    }).filter(user => user !== null); // Filter out any users that had errors

    return new Response(JSON.stringify(userEmails), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
