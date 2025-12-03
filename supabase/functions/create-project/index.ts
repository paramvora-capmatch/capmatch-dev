import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createProjectWithResumeAndStorage } from "../_shared/project-utils.ts";

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[create-project] [${requestId}] Request received - Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[create-project] [${requestId}] CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { name, owner_org_id, assigned_advisor_id } = requestBody;
    
    console.log(`[create-project] [${requestId}] Parsed request body:`, {
      name,
      owner_org_id,
      assigned_advisor_id: assigned_advisor_id || null,
    });

    if (!name || !owner_org_id) {
      console.error(`[create-project] [${requestId}] Validation failed - missing required fields:`, {
        has_name: !!name,
        has_owner_org_id: !!owner_org_id,
      });
      throw new Error("name and owner_org_id are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to create a project for this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[create-project] [${requestId}] Authentication failed - no authorization header`);
      throw new Error("Authorization header required");
    }
    
    const jwt = authHeader.replace("Bearer ", "");
    console.log(`[create-project] [${requestId}] Verifying JWT token`);
    
    const {
      data: { user },
      error: userError,
    } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    
    if (userError) {
      console.error(`[create-project] [${requestId}] Authentication failed:`, userError.message);
      throw new Error("Authentication failed");
    }
    
    console.log(`[create-project] [${requestId}] User authenticated: ${user.id}`);

    console.log(`[create-project] [${requestId}] Checking org ownership - org_id: ${owner_org_id}, user_id: ${user.id}`);
    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc(
      "is_org_owner",
      {
        p_org_id: owner_org_id,
        p_user_id: user.id,
      }
    );
    
    if (ownerCheckError) {
      console.error(`[create-project] [${requestId}] Error checking org ownership:`, ownerCheckError.message);
      throw new Error("User must be an owner of the org to create a project.");
    }
    
    if (!isOwner) {
      console.warn(`[create-project] [${requestId}] Authorization failed - user ${user.id} is not an owner of org ${owner_org_id}`);
      throw new Error("User must be an owner of the org to create a project.");
    }
    
    console.log(`[create-project] [${requestId}] User ${user.id} confirmed as owner of org ${owner_org_id}`);

    // Find an advisor to auto-assign if not provided (same logic as onboard-borrower)
    let finalAdvisorId: string | null = assigned_advisor_id || null;
    if (!finalAdvisorId) {
      console.log(`[create-project] [${requestId}] Looking for advisor to auto-assign...`);
      try {
        const { data: advisorOrg, error: advisorOrgError } = await supabaseAdmin
          .from("orgs")
          .select("id")
          .eq("entity_type", "advisor")
          .limit(1)
          .maybeSingle();

        if (advisorOrgError) {
          console.error(`[create-project] [${requestId}] Error finding advisor org:`, advisorOrgError.message);
        } else if (advisorOrg) {
          console.log(`[create-project] [${requestId}] Found advisor org: ${advisorOrg.id}`);
          const { data: advisorMember, error: advisorMemberError } = await supabaseAdmin
            .from("org_members")
            .select("user_id")
            .eq("org_id", advisorOrg.id)
            .limit(1)
            .maybeSingle();

          if (advisorMemberError) {
            console.error(`[create-project] [${requestId}] Error finding advisor member:`, advisorMemberError.message);
          } else if (advisorMember) {
            finalAdvisorId = advisorMember.user_id;
            console.log(`[create-project] [${requestId}] Found advisor for auto-assignment: ${finalAdvisorId}`);
          } else {
            console.warn(`[create-project] [${requestId}] No advisor members found in advisor org ${advisorOrg.id}`);
          }
        } else {
          console.warn(`[create-project] [${requestId}] No advisor org found`);
        }
      } catch (error: any) {
        console.warn(`[create-project] [${requestId}] Could not find advisor for auto-assignment:`, {
          error: error.message,
          error_stack: error.stack,
        });
      }
    } else {
      console.log(`[create-project] [${requestId}] Using provided advisor_id: ${finalAdvisorId}`);
    }

    // --- Atomic Operation Start ---
    console.log(`[create-project] [${requestId}] Starting project creation with utility function:`, {
      name,
      owner_org_id,
      assigned_advisor_id: finalAdvisorId,
      creator_id: user.id,
    });

    // Create the project using the shared utility function
    const {
      project,
      borrowerResumeContent,
      borrowerResumeSourceProjectId,
    } = await createProjectWithResumeAndStorage(supabaseAdmin, {
      name,
      owner_org_id,
      assigned_advisor_id: finalAdvisorId,
      creator_id: user.id,
    });

    // --- Atomic Operation End ---
    const duration = Date.now() - startTime;
    console.log(`[create-project] [${requestId}] Project created successfully:`, {
      project_id: project?.id,
      project_name: project?.name,
      has_borrower_resume: !!borrowerResumeContent,
      borrower_resume_source_project_id: borrowerResumeSourceProjectId,
      duration_ms: duration,
    });

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
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[create-project] [${requestId}] Error after ${duration}ms:`, {
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
