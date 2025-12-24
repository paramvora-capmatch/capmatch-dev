import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createProjectWithResumeAndStorage } from "../_shared/project-utils.ts";

serve(async (req) => {
  console.log(`[onboard-borrower] Request received: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log("[onboard-borrower] Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  let newUser;

  try {
    console.log("[onboard-borrower] Starting user onboarding process");
    const { email, password, full_name, existing_user, user_id } = await req.json();
    console.log(
      `[onboard-borrower] Parsed request data: email=${email}, full_name=${full_name}`
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable is not set");
    }
    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
      );
    }

    console.log(
      `[onboard-borrower] Environment check passed: URL=${
        supabaseUrl ? "set" : "missing"
      }, ServiceKey=${serviceRoleKey ? "set" : "missing"}`
    );

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Create or reuse the user in Supabase Auth
    if (existing_user) {
      console.log("[onboard-borrower] Step 1: Using existing auth user for onboarding");
      if (!user_id || !email) {
        throw new Error("existing_user requires user_id and email");
      }
      // Fetch the user to validate existence
      const { data: existingUserData, error: existingUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (existingUserError || !existingUserData?.user) {
        throw new Error(`Existing user lookup failed: ${existingUserError?.message || "User not found"}`);
      }
      newUser = existingUserData.user;
      console.log(`[onboard-borrower] Using existing user: ${newUser.id}`);
    } else {
      console.log("[onboard-borrower] Step 1: Creating user in Supabase Auth");
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name },
        });

      if (authError) {
        console.error(
          `[onboard-borrower] Auth Error: ${JSON.stringify(authError)}`
        );
        throw new Error(`Auth Error: ${authError.message}`);
      }
      if (!authData.user) {
        console.error(
          "[onboard-borrower] User not created, but no error was thrown"
        );
        throw new Error("User not created, but no error was thrown.");
      }
      newUser = authData.user;
      console.log(`[onboard-borrower] User created successfully: ${newUser.id}`);
    }

    const app_role = email.endsWith("@advisor.com") ? "advisor" : "borrower";
    console.log(`[onboard-borrower] Determined app_role: ${app_role}`);

    // Helper function to find advisor (can run independently)
    const findAdvisor = async (): Promise<string | null> => {
      try {
        const { data: advisorOrg } = await supabaseAdmin
          .from("orgs")
          .select("id")
          .eq("entity_type", "advisor")
          .limit(1)
          .maybeSingle();

        if (advisorOrg) {
          const { data: advisorMember } = await supabaseAdmin
            .from("org_members")
            .select("user_id")
            .eq("org_id", advisorOrg.id)
            .limit(1)
            .maybeSingle();

          if (advisorMember?.user_id) {
            console.log(
              `[onboard-borrower] Found advisor for auto-assignment: ${advisorMember.user_id}`
      );
            return advisorMember.user_id;
          }
        }
        return null;
      } catch (error) {
        console.warn(
          "[onboard-borrower] Could not find advisor for auto-assignment:",
          error instanceof Error ? error.message : String(error)
        );
        return null;
      }
    };

    // Only perform borrower-specific onboarding if the user is a borrower
    if (app_role === "borrower") {
      console.log("[onboard-borrower] Starting borrower-specific onboarding");

      // Phase 1: Parallelize profile creation, org creation, and advisor lookup
      console.log("[onboard-borrower] Phase 1: Creating profile, org, and finding advisor in parallel");
      const [profileResult, orgResult, advisorId] = await Promise.all([
        // Step 2: Create the user's profile
        supabaseAdmin
          .from("profiles")
          .upsert({
            id: newUser.id,
            full_name: full_name,
            email: email,
            app_role: app_role,
          }, { onConflict: "id" })
          .then(({ error }) => {
            if (error) {
              console.error(
                `[onboard-borrower] Profile Error: ${JSON.stringify(error)}`
              );
              throw new Error(`Profile Error: ${error.message}`);
            }
            console.log("[onboard-borrower] Profile created successfully");
            return { success: true };
          }),
      // Step 3: Create the borrower org
        supabaseAdmin
        .from("orgs")
        .insert({
          name: `${full_name}'s Organization`,
          entity_type: "borrower",
        })
        .select()
          .single()
          .then(({ data, error }) => {
            if (error) {
        console.error(
                `[onboard-borrower] Org Error: ${JSON.stringify(error)}`
        );
              throw new Error(`Org Error: ${error.message}`);
      }
            if (!data) {
              throw new Error("Org not created.");
            }
            console.log(`[onboard-borrower] Org created successfully: ${data.id}`);
            return data;
          }),
        // Find advisor (optional, can fail silently)
        findAdvisor(),
      ]);

      const orgData = orgResult;
      if (!orgData) {
        throw new Error("Org creation failed");
      }

      // Phase 2: Parallelize storage bucket and org member creation
      console.log("[onboard-borrower] Phase 2: Creating storage bucket and org member in parallel");
      const [bucketResult, memberResult] = await Promise.all([
      // Create a private storage bucket for this org (id = org id)
        supabaseAdmin.storage.createBucket(
          orgData.id,
          {
            public: false,
            fileSizeLimit: 50 * 1024 * 1024, // 50MB
            allowedMimeTypes: [
              "application/pdf",
              "image/jpeg",
              "image/png",
              "image/gif",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "text/plain",
              "application/zip",
              "text/plain;charset=UTF-8", // Add this for the placeholder file
            ],
          }
        ).then(({ error }) => {
        // If bucket exists already, ignore; otherwise fail fast
        if (
            error &&
            error.message &&
            !error.message.toLowerCase().includes("already exists")
        ) {
          console.error(
              `[onboard-borrower] Bucket creation failed: ${JSON.stringify(error)}`
          );
            throw new Error(`Bucket creation failed: ${error.message}`);
        }
        console.log("[onboard-borrower] Storage bucket created successfully");
          return { success: true };
        }),
      // Step 4: Make the user the owner of the org
        supabaseAdmin
        .from("org_members")
        .insert({
          org_id: orgData.id,
          user_id: newUser.id,
          role: "owner",
        })
        .select()
          .single()
          .then(({ data, error }) => {
            if (error) {
        console.error(
                `[onboard-borrower] Membership Error: ${JSON.stringify(error)}`
        );
              throw new Error(`Membership Error: ${error.message}`);
      }
      console.log("[onboard-borrower] User made owner of org successfully");
            console.log(`[onboard-borrower] DEBUG - Membership created:`, data);
            return data;
          }),
      ]);

      // Step 5: Create a default project for the org using the shared utility
      // Note: createProjectWithResumeAndStorage already handles borrower resume creation
      console.log("[onboard-borrower] Step 5: Creating default project");
      const {
        project: projectData,
      } = await createProjectWithResumeAndStorage(supabaseAdmin, {
        name: "My First Project",
        owner_org_id: orgData.id,
        creator_id: newUser.id, // Pass the new user's ID as the creator
        assigned_advisor_id: advisorId,
      });
      console.log(
        `[onboard-borrower] Default project created successfully: ${projectData.id}`
      );

      // Step 6: Update profile with the active org (deferred - not critical for login)
      // This can be done in parallel with other operations or even after response
      console.log(
        "[onboard-borrower] Step 6: Updating profile with active org (deferred)"
      );
      // Fire and forget - don't block response if this fails
      supabaseAdmin
        .from("profiles")
        .update({ active_org_id: orgData.id })
        .eq("id", newUser.id)
        .then(({ error }) => {
          if (error) {
            console.warn(
              `[onboard-borrower] Profile Update Warning (non-blocking): ${JSON.stringify(error)}`
        );
          } else {
      console.log(
        "[onboard-borrower] Profile updated with active org successfully"
      );
          }
        })
        .catch((err) => {
          console.warn(
            `[onboard-borrower] Profile update failed (non-critical): ${err.message}`
          );
        });
    }

    console.log("[onboard-borrower] Onboarding completed successfully");
    return new Response(JSON.stringify({ user: newUser }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(
      `[onboard-borrower] Error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(
      `[onboard-borrower] Error stack: ${
        error instanceof Error ? error.stack : "No stack trace"
      }`
    );

    // This is the crucial rollback logic
    if (newUser) {
      console.log(
        `[onboard-borrower] Attempting to roll back and delete auth user: ${newUser.id}`
      );
      try {
        await createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        ).auth.admin.deleteUser(newUser.id);
        console.log(
          `[onboard-borrower] Successfully rolled back user: ${newUser.id}`
        );
      } catch (rollbackError) {
        console.error(
          `[onboard-borrower] Rollback failed: ${
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError)
          }`
        );
      }
    }

    console.error(
      `[onboard-borrower] Returning error response: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
