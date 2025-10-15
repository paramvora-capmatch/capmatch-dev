import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, owner_entity_id } = await req.json();
    if (!name || !owner_entity_id) {
      throw new Error("name and owner_entity_id are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission to create a project for this entity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    if (userError) throw new Error("Authentication failed");

    const { data: isOwner, error: ownerCheckError } = await supabaseAdmin.rpc('is_entity_owner', {
      p_entity_id: owner_entity_id,
      p_user_id: user.id
    });
    if (ownerCheckError || !isOwner) {
      throw new Error("User must be an owner of the entity to create a project.");
    }

    // --- Atomic Operation Start ---
    
    // 1. Create the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({ name, owner_entity_id })
      .select()
      .single();
    if (projectError) throw new Error(`Project creation failed: ${projectError.message}`);

    // 2. Create the associated (empty) project resume
    const { error: resumeError } = await supabaseAdmin
      .from("project_resumes")
      .insert({ project_id: project.id, content: {} });
    if (resumeError) {
      // Rollback: delete the project if resume creation fails
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      throw new Error(`Project resume creation failed: ${resumeError.message}`);
    }

    // 3. Create the folder in Supabase Storage
    // The bucket ID is the same as the entity ID.
    const { error: storageError } = await supabaseAdmin.storage
      .from(owner_entity_id)
      .upload(`${project.id}/.placeholder`, new Blob([""]), {
          contentType: 'text/plain;charset=UTF-8'
      });
    if (storageError) {
        // Rollback: delete project and resume
        await supabaseAdmin.from("projects").delete().eq("id", project.id);
        // The resume will be deleted automatically by ON DELETE CASCADE
        throw new Error(`Storage folder creation failed: ${storageError.message}`);
    }

    // --- Atomic Operation End ---

    return new Response(JSON.stringify({ project }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // 201 Created
    });

  } catch (error) {
    console.error("[create-project] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
