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

    // Step 2: Create the user's profile
    console.log("[onboard-borrower] Step 2: Creating user profile");
    // Upsert profile for idempotency (covers existing_user flows)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.id,
        full_name: full_name,
        email: email,
        app_role: app_role,
      }, { onConflict: "id" });
    if (profileError) {
      console.error(
        `[onboard-borrower] Profile Error: ${JSON.stringify(profileError)}`
      );
      throw new Error(`Profile Error: ${profileError.message}`);
    }
    console.log("[onboard-borrower] Profile created successfully");

    // Only perform borrower-specific onboarding if the user is a borrower
    if (app_role === "borrower") {
      console.log("[onboard-borrower] Starting borrower-specific onboarding");

      // Step 3: Create the borrower org
      console.log("[onboard-borrower] Step 3: Creating borrower org");
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from("orgs")
        .insert({
          name: `${full_name}'s Organization`,
          entity_type: "borrower",
        })
        .select()
        .single();
      if (orgError) {
        console.error(
          `[onboard-borrower] Org Error: ${JSON.stringify(orgError)}`
        );
        throw new Error(`Org Error: ${orgError.message}`);
      }
      if (!orgData) {
        console.error("[onboard-borrower] Org not created");
        throw new Error("Org not created.");
      }
      console.log(`[onboard-borrower] Org created successfully: ${orgData.id}`);

      // Create a private storage bucket for this org (id = org id)
      console.log("[onboard-borrower] Creating storage bucket for org");
      {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket(
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
        );
        // If bucket exists already, ignore; otherwise fail fast
        if (
          bucketError &&
          bucketError.message &&
          !bucketError.message.toLowerCase().includes("already exists")
        ) {
          console.error(
            `[onboard-borrower] Bucket creation failed: ${JSON.stringify(
              bucketError
            )}`
          );
          throw new Error(`Bucket creation failed: ${bucketError.message}`);
        }
        console.log("[onboard-borrower] Storage bucket created successfully");
      }

      // Step 3.5: Project-scoped storage directories are provisioned during project creation.

      // Step 4: Make the user the owner of the org
      console.log("[onboard-borrower] Step 4: Making user owner of org");
      console.log(
        `[onboard-borrower] DEBUG - User ID: ${newUser.id}, Org ID: ${orgData.id}`
      );
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from("org_members")
        .insert({
          org_id: orgData.id,
          user_id: newUser.id,
          role: "owner",
        })
        .select()
        .single();
      if (memberError) {
        console.error(
          `[onboard-borrower] Membership Error: ${JSON.stringify(memberError)}`
        );
        throw new Error(`Membership Error: ${memberError.message}`);
      }
      console.log("[onboard-borrower] User made owner of org successfully");
      console.log(`[onboard-borrower] DEBUG - Membership created:`, memberData);

      // Find an advisor to auto-assign
      console.log("[onboard-borrower] Looking for advisor to auto-assign...");
      let advisorId: string | null = null;
      try {
        const { data: advisorOrg } = await supabaseAdmin
          .from("orgs")
          .select("id")
          .eq("entity_type", "advisor")
          .limit(1)
          .single();

        if (advisorOrg) {
          const { data: advisorMember } = await supabaseAdmin
            .from("org_members")
            .select("user_id")
            .eq("org_id", advisorOrg.id)
            .limit(1)
            .single();

          if (advisorMember) {
            advisorId = advisorMember.user_id;
            console.log(
              `[onboard-borrower] Found advisor for auto-assignment: ${advisorId}`
            );
          }
        }
      } catch (error) {
        console.warn(
          "[onboard-borrower] Could not find advisor for auto-assignment:",
          error.message
        );
      }

      // Step 5: Create a default project for the org using the shared utility
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

      // Step 6: Verify borrower resume and project-scoped resources exist
      console.log("[onboard-borrower] Step 6: Verifying project borrower resources");
      const { error: borrowerRootsError } = await supabaseAdmin.rpc(
        "ensure_project_borrower_roots",
        {
          p_project_id: projectData.id,
        }
      );

      if (borrowerRootsError) {
        throw new Error(
          `Failed to ensure project borrower resources: ${borrowerRootsError.message}`
        );
      }

      const { data: borrowerResumeRecord, error: borrowerResumeCheckError } =
        await supabaseAdmin
          .from("borrower_resumes")
          .select("id")
          .eq("project_id", projectData.id)
          .maybeSingle();

      if (borrowerResumeCheckError) {
        throw new Error(
          `Borrower Resume existence check failed: ${borrowerResumeCheckError.message}`
        );
      }

      if (!borrowerResumeRecord) {
        console.warn(
          "[onboard-borrower] Borrower resume record missing after project creation; creating fallback"
        );
        const { error: borrowerResumeInsertError } = await supabaseAdmin
          .from("borrower_resumes")
          .insert({ project_id: projectData.id, content: {} });

        if (borrowerResumeInsertError) {
          throw new Error(
            `Fallback borrower resume creation failed: ${borrowerResumeInsertError.message}`
          );
        }
      }

      // Step 7: Update profile with the active org
      console.log(
        "[onboard-borrower] Step 7: Updating profile with active org"
      );
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({ active_org_id: orgData.id })
        .eq("id", newUser.id);
      if (updateProfileError) {
        console.error(
          `[onboard-borrower] Profile Update Error: ${JSON.stringify(
            updateProfileError
          )}`
        );
        throw new Error(`Profile Update Error: ${updateProfileError.message}`);
      }
      console.log(
        "[onboard-borrower] Profile updated with active org successfully"
      );
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
