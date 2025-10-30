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

    // Fetch auth users (emails)
    const userPromises = userIds.map((id) =>
      supabaseAdmin.auth.admin.getUserById(id)
    );
    const userResults = await Promise.all(userPromises);

    // Fetch profiles (full_name) in one query
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("get-user-data: profiles fetch error", profilesError);
    }

    const profileById = new Map(
      (profiles || []).map((p: { id: string; full_name: string | null }) => [
        p.id,
        p.full_name,
      ])
    );

    // Merge results: id, email, full_name
    const users = userResults
      .map((result, index) => {
        if (result.error) {
          console.error(`Error fetching user ${userIds[index]}:`, result.error);
          return null;
        }
        const id = result.data.user.id;
        return {
          id,
          email: result.data.user.email,
          full_name: profileById.get(id) ?? null,
        };
      })
      .filter((u) => u !== null);

    return new Response(JSON.stringify(users), {
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
