import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateProjectOptions {
  name: string;
  owner_org_id: string;
  creator_id: string; // The user ID of the person creating the project
  assigned_advisor_id?: string | null;
}

export async function createProjectWithResumeAndStorage(
  supabaseAdmin: any,
  options: CreateProjectOptions
) {
  const { name, owner_org_id, assigned_advisor_id } = options;
  console.log(`[project-utils] Creating project: ${name} for org: ${owner_org_id}`);

  // 1. Create the project
  console.log("[project-utils] Step 1: Creating project record");
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({ name, owner_org_id, assigned_advisor_id })
    .select()
    .single();
  if (projectError) {
    console.error(`[project-utils] Project creation failed: ${JSON.stringify(projectError)}`);
    throw new Error(`Project creation failed: ${projectError.message}`);
  }
  console.log(`[project-utils] Project created successfully: ${project.id}`);

  // 2. Create the associated (empty) project resume
  console.log("[project-utils] Step 2: Creating project resume");
  const { error: resumeError } = await supabaseAdmin
    .from("project_resumes")
    .insert({ project_id: project.id, content: {} });
  if (resumeError) {
    console.error(`[project-utils] Project resume creation failed: ${JSON.stringify(resumeError)}`);
    // Rollback: delete the project if resume creation fails
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Project resume creation failed: ${resumeError.message}`);
  }
  console.log("[project-utils] Project resume created successfully");

  // 3. Create the folder in Supabase Storage
  console.log("[project-utils] Step 3: Creating storage folder");
  const { error: storageError } = await supabaseAdmin.storage
    .from(owner_org_id)
    .upload(`${project.id}/.placeholder`, new Blob([""], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8'
    });
  if (storageError) {
      console.error(`[project-utils] Storage folder creation failed: ${JSON.stringify(storageError)}`);
      // Rollback: delete project and resume
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      throw new Error(`Storage folder creation failed: ${storageError.message}`);
  }
  console.log("[project-utils] Storage folder created successfully");

  // 4. Create PROJECT_RESUME resource
  console.log("[project-utils] Step 4: Creating PROJECT_RESUME resource");
  const { data: projectResumeResource, error: projectResumeError } = await supabaseAdmin
    .from("resources")
    .insert({
      org_id: owner_org_id,
      project_id: project.id,
      resource_type: "PROJECT_RESUME",
      name: `${name} Resume`
    })
    .select()
    .single();
  
  if (projectResumeError) {
    console.error(`[project-utils] Project resume resource creation failed: ${JSON.stringify(projectResumeError)}`);
    // Rollback: delete project, resume, and storage folder
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Project resume resource creation failed: ${projectResumeError.message}`);
  }
  console.log("[project-utils] Project resume resource created successfully");

  // 5. Create PROJECT_DOCS_ROOT resource
  console.log("[project-utils] Step 5: Creating PROJECT_DOCS_ROOT resource");
  const { data: projectDocsRootResource, error: projectDocsRootError } = await supabaseAdmin
    .from("resources")
    .insert({
      org_id: owner_org_id,
      project_id: project.id,
      resource_type: "PROJECT_DOCS_ROOT",
      name: `${name} Documents`
    })
    .select()
    .single();
  
  if (projectDocsRootError) {
    console.error(`[project-utils] Project docs root resource creation failed: ${JSON.stringify(projectDocsRootError)}`);
    // Rollback: delete project, resume, and storage folder
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Project docs root resource creation failed: ${projectDocsRootError.message}`);
  }
  console.log("[project-utils] Project docs root resource created successfully");

  // Step 6: Grant the creator (owner) explicit access to the new project
  console.log("[project-utils] Step 6: Granting creator access to the project");
  const { error: grantError } = await supabaseAdmin
    .from("project_access_grants")
    .insert({
      project_id: project.id,
      org_id: owner_org_id,
      user_id: options.creator_id,
      granted_by: options.creator_id,
    });
  
  if (grantError) {
    console.error(`[project-utils] Failed to grant project access to creator: ${JSON.stringify(grantError)}`);
    // Rollback
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Failed to grant project access: ${grantError.message}`);
  }
  console.log("[project-utils] Project access granted to creator successfully");


  // Step 8: Grant explicit 'edit' permissions on the project roots
  // This is critical for RLS - the user needs these permissions to upload/create files
  console.log("[project-utils] Step 8: Granting edit permissions on project root resources");

  const { error: projectDocsPermError } = await supabaseAdmin
    .from("permissions")
    .insert({
      resource_id: projectDocsRootResource.id,
      user_id: options.creator_id,
      permission: 'edit',
      granted_by: options.creator_id,
    });

  if (projectDocsPermError) {
    console.error(`[project-utils] Failed to grant permissions on PROJECT_DOCS_ROOT: ${JSON.stringify(projectDocsPermError)}`);
    // Rollback
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Failed to grant permissions on PROJECT_DOCS_ROOT: ${projectDocsPermError.message}`);
  }
  console.log("[project-utils] Edit permission granted on PROJECT_DOCS_ROOT");

  const { error: projectResumePermError } = await supabaseAdmin
    .from("permissions")
    .insert({
      resource_id: projectResumeResource.id,
      user_id: options.creator_id,
      permission: 'edit',
      granted_by: options.creator_id,
    });

  if (projectResumePermError) {
    console.error(`[project-utils] Failed to grant permissions on PROJECT_RESUME: ${JSON.stringify(projectResumePermError)}`);
    // Rollback
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(`Failed to grant permissions on PROJECT_RESUME: ${projectResumePermError.message}`);
  }
  console.log("[project-utils] Edit permission granted on PROJECT_RESUME");

  // Step 8.5: Create a default "General" chat thread
  console.log("[project-utils] Step 8.5: Creating default chat thread");
  const { data: chatThread, error: chatThreadError } = await supabaseAdmin
    .from("chat_threads")
    .insert({
      project_id: project.id,
      topic: "General",
    })
    .select()
    .single();

  if (chatThreadError) {
    // This is not a critical failure, so we'll log it and continue.
    console.error(
      `[project-utils] Default chat thread creation failed: ${
        JSON.stringify(chatThreadError)
      }`
    );
  } else {
    console.log(
      `[project-utils] Default chat thread created: ${chatThread.id}`
    );

    // Add participants: creator and advisor (if they exist)
    const participants = [{ thread_id: chatThread.id, user_id: options.creator_id }];
    if (options.assigned_advisor_id) {
      participants.push({ thread_id: chatThread.id, user_id: options.assigned_advisor_id });
    }

    const { error: participantsError } = await supabaseAdmin
      .from("chat_thread_participants")
      .insert(participants);

    if (participantsError) {
      console.error(`[project-utils] Failed to add participants to default thread: ${JSON.stringify(participantsError)}`);
    } else {
      console.log("[project-utils] Added initial participants to default thread.");
    }
  }

  // Step 9: If an advisor is assigned, grant them permissions on all resources
  // This ensures permissions are set even if the trigger fails or there's a timing issue
  if (assigned_advisor_id) {
    console.log("[project-utils] Step 9: Granting advisor permissions on project resources");
    
    // Grant permissions using the database function which handles all resources
    const { error: advisorPermError } = await supabaseAdmin.rpc(
      'grant_advisor_project_permissions',
      {
        p_project_id: project.id,
        p_advisor_id: assigned_advisor_id,
        p_granted_by_id: options.creator_id
      }
    );
    
    if (advisorPermError) {
      // Log the error but don't fail project creation - the trigger should handle it
      console.error(
        `[project-utils] Failed to grant advisor permissions: ${JSON.stringify(advisorPermError)}`
      );
    } else {
      console.log("[project-utils] Advisor permissions granted successfully");
    }
  }

  // Step 10: Storage policies are global now; skip per-bucket RPC
  console.log(`[project-utils] Project creation completed successfully: ${project.id}`);
  return project;
}
