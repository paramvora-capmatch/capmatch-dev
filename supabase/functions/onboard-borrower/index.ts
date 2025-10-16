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
    const { email, password, full_name } = await req.json();
    console.log(`[onboard-borrower] Parsed request data: email=${email}, full_name=${full_name}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable is not set");
    }
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }
    
    console.log(`[onboard-borrower] Environment check passed: URL=${supabaseUrl ? 'set' : 'missing'}, ServiceKey=${serviceRoleKey ? 'set' : 'missing'}`);
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Create the user in Supabase Auth
    console.log("[onboard-borrower] Step 1: Creating user in Supabase Auth");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: full_name },
    });
    
    if (authError) {
      console.error(`[onboard-borrower] Auth Error: ${JSON.stringify(authError)}`);
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      console.error("[onboard-borrower] User not created, but no error was thrown");
      throw new Error("User not created, but no error was thrown.");
    }
    newUser = authData.user;
    console.log(`[onboard-borrower] User created successfully: ${newUser.id}`);

    const app_role = email.endsWith('@advisor.com') ? 'advisor' : 'borrower';
    console.log(`[onboard-borrower] Determined app_role: ${app_role}`);

    // Step 2: Create the user's profile
    console.log("[onboard-borrower] Step 2: Creating user profile");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ 
        id: newUser.id, 
        full_name: full_name, 
        email: email,
        app_role: app_role 
      });
    if (profileError) {
      console.error(`[onboard-borrower] Profile Error: ${JSON.stringify(profileError)}`);
      throw new Error(`Profile Error: ${profileError.message}`);
    }
    console.log("[onboard-borrower] Profile created successfully");
    
    // Only perform borrower-specific onboarding if the user is a borrower
    if (app_role === 'borrower') {
      console.log("[onboard-borrower] Starting borrower-specific onboarding");
      
      // Step 3: Create the borrower entity
      console.log("[onboard-borrower] Step 3: Creating borrower entity");
      const { data: entityData, error: entityError } = await supabaseAdmin
        .from("entities")
        .insert({ 
          name: `${full_name}'s Entity`, 
          entity_type: 'borrower' 
        })
        .select()
        .single();
      if (entityError) {
        console.error(`[onboard-borrower] Entity Error: ${JSON.stringify(entityError)}`);
        throw new Error(`Entity Error: ${entityError.message}`);
      }
      if (!entityData) {
        console.error("[onboard-borrower] Entity not created");
        throw new Error("Entity not created.");
      }
      console.log(`[onboard-borrower] Entity created successfully: ${entityData.id}`);

      // Create a private storage bucket for this entity (id = entity id)
      console.log("[onboard-borrower] Creating storage bucket for entity");
      {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket(entityData.id, {
          public: false,
          fileSizeLimit: 200 * 1024 * 1024, // 200MB
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
        });
        // If bucket exists already, ignore; otherwise fail fast
        if (bucketError && bucketError.message && !bucketError.message.toLowerCase().includes("already exists")) {
          console.error(`[onboard-borrower] Bucket creation failed: ${JSON.stringify(bucketError)}`);
          throw new Error(`Bucket creation failed: ${bucketError.message}`);
        }
        console.log("[onboard-borrower] Storage bucket created successfully");
      }

      // Step 4: Make the user the owner of the entity
      console.log("[onboard-borrower] Step 4: Making user owner of entity");
      const { error: memberError } = await supabaseAdmin
        .from("entity_members")
        .insert({
          entity_id: entityData.id,
          user_id: newUser.id,
          role: "owner"
        });
      if (memberError) {
        console.error(`[onboard-borrower] Membership Error: ${JSON.stringify(memberError)}`);
        throw new Error(`Membership Error: ${memberError.message}`);
      }
      console.log("[onboard-borrower] User made owner of entity successfully");
      
      // Step 5: Create a default project for the entity using the shared utility
      console.log("[onboard-borrower] Step 5: Creating default project");
      const projectData = await createProjectWithResumeAndStorage(supabaseAdmin, {
        name: "My First Project",
        owner_entity_id: entityData.id,
        member_permissions: [] // No additional members for the default project
      });
      console.log(`[onboard-borrower] Default project created successfully: ${projectData.id}`);

      // Step 6: Create the borrower resume/record
      console.log("[onboard-borrower] Step 6: Creating borrower resume");
      const { error: borrowerResumeError } = await supabaseAdmin
        .from("borrower_resumes")
        .insert({ 
          entity_id: entityData.id,
          content: {} // Empty JSONB content initially
        });
      if (borrowerResumeError) {
        console.error(`[onboard-borrower] Borrower Resume Error: ${JSON.stringify(borrowerResumeError)}`);
        throw new Error(`Borrower Resume Error: ${borrowerResumeError.message}`);
      }
      console.log("[onboard-borrower] Borrower resume created successfully");
        
      // Step 7: Update profile with the active entity
      console.log("[onboard-borrower] Step 7: Updating profile with active entity");
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ active_entity_id: entityData.id })
        .eq('id', newUser.id);
      if (updateProfileError) {
        console.error(`[onboard-borrower] Profile Update Error: ${JSON.stringify(updateProfileError)}`);
        throw new Error(`Profile Update Error: ${updateProfileError.message}`);
      }
      console.log("[onboard-borrower] Profile updated with active entity successfully");
    }

    console.log("[onboard-borrower] Onboarding completed successfully");
    return new Response(JSON.stringify({ user: newUser }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[onboard-borrower] Error occurred: ${error.message}`);
    console.error(`[onboard-borrower] Error stack: ${error.stack}`);
    
    // This is the crucial rollback logic
    if (newUser) {
      console.log(`[onboard-borrower] Attempting to roll back and delete auth user: ${newUser.id}`);
      try {
        await createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        ).auth.admin.deleteUser(newUser.id);
        console.log(`[onboard-borrower] Successfully rolled back user: ${newUser.id}`);
      } catch (rollbackError) {
        console.error(`[onboard-borrower] Rollback failed: ${rollbackError.message}`);
      }
    }

    console.error(`[onboard-borrower] Returning error response: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
