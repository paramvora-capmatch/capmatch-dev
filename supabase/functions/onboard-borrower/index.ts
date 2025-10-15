import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let newUser;

  try {
    const { email, password, full_name } = await req.json();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: full_name },
    });
    if (authError) throw new Error(`Auth Error: ${authError.message}`);
    if (!authData.user) throw new Error("User not created, but no error was thrown.");
    newUser = authData.user;

    const app_role = email.endsWith('@advisor.com') ? 'advisor' : 'borrower';

    // Step 2: Create the user's profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ 
        id: newUser.id, 
        full_name: full_name, 
        email: email,
        app_role: app_role 
      });
    if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
    
    // Only perform borrower-specific onboarding if the user is a borrower
    if (app_role === 'borrower') {
      // Step 3: Create the borrower entity
      const { data: entityData, error: entityError } = await supabaseAdmin
        .from("entities")
        .insert({ 
          name: `${full_name}'s Entity`, 
          entity_type: 'borrower' 
        })
        .select()
        .single();
      if (entityError) throw new Error(`Entity Error: ${entityError.message}`);
      if (!entityData) throw new Error("Entity not created.");

      // Step 4: Make the user the owner of the entity
      const { error: memberError } = await supabaseAdmin
        .from("entity_members")
        .insert({
          entity_id: entityData.id,
          user_id: newUser.id,
          role: "owner"
        });
      if (memberError) throw new Error(`Membership Error: ${memberError.message}`);
      
      // Step 5: Create a default project for the entity
      const { error: projectError } = await supabaseAdmin
        .from("projects")
        .insert({
          name: "My First Project",
          owner_entity_id: entityData.id,
          // Add any other required fields for a project here
        });
      if (projectError) throw new Error(`Project Error: ${projectError.message}`);

      // Step 6: Create the borrower resume/record
      const { error: borrowerResumeError } = await supabaseAdmin
        .from("borrower_resumes")
        .insert({ 
          entity_id: entityData.id,
          content: {} // Empty JSONB content initially
        });
      if (borrowerResumeError) throw new Error(`Borrower Resume Error: ${borrowerResumeError.message}`);
        
      // Step 7: Update profile with the active entity
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ active_entity_id: entityData.id })
        .eq('id', newUser.id);
      if (updateProfileError) throw new Error(`Profile Update Error: ${updateProfileError.message}`);
    }

    return new Response(JSON.stringify({ user: newUser }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // This is the crucial rollback logic
    if (newUser) {
      console.log(`Attempting to roll back and delete auth user: ${newUser.id}`);
      await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      ).auth.admin.deleteUser(newUser.id);
    }

    console.error("Unhandled error in onboard-borrower function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
