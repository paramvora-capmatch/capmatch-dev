// supabase/functions/get-user-data/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Supabase environment variables are not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { userIds } = await req.json();

  if (!userIds || !Array.isArray(userIds)) {
    return new Response(JSON.stringify({ error: "userIds is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: userIds.length,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userEmails = users.users
    .filter((user) => userIds.includes(user.id))
    .map((user) => ({ id: user.id, email: user.email }));

  return new Response(JSON.stringify(userEmails), {
    headers: { "Content-Type": "application/json" },
  });
});
