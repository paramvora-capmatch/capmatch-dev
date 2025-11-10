import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createProjectWithResumeAndStorage } from "../_shared/project-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, owner_org_id, assigned_advisor_id } = await req.json();
    if (!name || !owner_org_id) {
      throw new Error("name and owner_org_id are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to create a project for this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    if (userError) throw new Error("Authentication failed");

    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc(
      "is_org_owner",
      {
        p_org_id: owner_org_id,
        p_user_id: user.id,
      }
    );
    if (ownerCheckError || !isOwner) {
      throw new Error("User must be an owner of the org to create a project.");
    }

    // --- Atomic Operation Start ---

    // Create the project using the shared utility function
    const {
      project,
      borrowerResumeContent,
      borrowerResumeSourceProjectId,
    } = await createProjectWithResumeAndStorage(supabaseAdmin, {
      name,
      owner_org_id,
      assigned_advisor_id: assigned_advisor_id || null,
      creator_id: user.id,
    });

    // --- Atomic Operation End ---

    return new Response(
      JSON.stringify({
        project,
        borrowerResumeContent,
        borrowerResumeSourceProjectId,
      }),
      {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // 201 Created
      }
    );
  } catch (error) {
    console.error("[create-project] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
