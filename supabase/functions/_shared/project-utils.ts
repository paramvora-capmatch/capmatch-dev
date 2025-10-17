import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateProjectOptions {
  name: string;
  owner_org_id: string;
  creator_id: string; // The user ID of the person creating the project
}

export async function createProjectWithResumeAndStorage(
  supabaseAdmin: any,
  options: CreateProjectOptions
) {
  const { name, owner_org_id } = options;
  console.log(`[project-utils] Creating project: ${name} for org: ${owner_org_id}`);

  // 1. Create the project
  console.log("[project-utils] Step 1: Creating project record");
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({ name, owner_org_id })
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

  // 4. Create BORROWER_RESUME resource if it doesn't exist
  console.log("[project-utils] Step 4: Creating/ensuring BORROWER_RESUME resource");
  const { data: existingBorrowerResume } = await supabaseAdmin
    .from("resources")
    .select("id")
    .eq("org_id", owner_org_id)
    .eq("resource_type", "BORROWER_RESUME")
    .maybeSingle();

  let borrowerResumeResourceId;
  if (!existingBorrowerResume) {
    const { data: borrowerResumeResource, error: borrowerResumeError } = await supabaseAdmin
      .from("resources")
      .insert({
        org_id: owner_org_id,
        resource_type: "BORROWER_RESUME",
        name: "Borrower Resume"
      })
      .select()
      .single();
    
    if (borrowerResumeError) {
      console.error(`[project-utils] Borrower resume resource creation failed: ${JSON.stringify(borrowerResumeError)}`);
      // Rollback: delete project, resume, and storage folder
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      throw new Error(`Borrower resume resource creation failed: ${borrowerResumeError.message}`);
    }
    borrowerResumeResourceId = borrowerResumeResource.id;
    console.log("[project-utils] Borrower resume resource created successfully");
  } else {
    borrowerResumeResourceId = existingBorrowerResume.id;
    console.log("[project-utils] Borrower resume resource already exists");
  }

  // 5. Create PROJECT_RESUME resource
  console.log("[project-utils] Step 5: Creating PROJECT_RESUME resource");
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

  // 6. Create PROJECT_DOCS_ROOT resource
  console.log("[project-utils] Step 6: Creating PROJECT_DOCS_ROOT resource");
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

  // Step 7: Grant the creator (owner) explicit access to the new project
  console.log("[project-utils] Step 7: Granting creator access to the project");
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


  console.log(`[project-utils] Project creation completed successfully: ${project.id}`);
  return project;
}
