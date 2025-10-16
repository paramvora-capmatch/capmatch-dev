import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateProjectOptions {
  name: string;
  owner_entity_id: string;
  member_permissions?: Array<{ user_id: string }>;
}

export async function createProjectWithResumeAndStorage(
  supabaseAdmin: any,
  options: CreateProjectOptions
) {
  const { name, owner_entity_id, member_permissions = [] } = options;
  console.log(`[project-utils] Creating project: ${name} for entity: ${owner_entity_id}`);

  // 1. Create the project
  console.log("[project-utils] Step 1: Creating project record");
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({ name, owner_entity_id })
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
    .from(owner_entity_id)
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

  // 4. Grant project access to selected members (if any)
  if (member_permissions && member_permissions.length > 0) {
    console.log(`[project-utils] Step 4: Granting access to ${member_permissions.length} members`);
    // Get entity members to validate
    const { data: entityMembers, error: membersError } = await supabaseAdmin
      .from("entity_members")
      .select("user_id, role")
      .eq("entity_id", owner_entity_id);
    
    if (membersError) {
        console.error(`[project-utils] Failed to get entity members: ${JSON.stringify(membersError)}`);
        // Rollback: delete project, resume, and storage folder
        await supabaseAdmin.from("projects").delete().eq("id", project.id);
        throw new Error(`Failed to get entity members: ${membersError.message}`);
    }

    // Validate that all provided member IDs are actually members of the entity
    const memberUserIds = entityMembers?.filter(member => member.role === 'member').map(m => m.user_id) || [];
    const validMemberPermissions = member_permissions.filter(perm => memberUserIds.includes(perm.user_id));

    if (validMemberPermissions.length > 0) {
      console.log(`[project-utils] Granting access to ${validMemberPermissions.length} valid members`);
      // Grant project access permissions (presence = editor)
      const projectAccessPermissions = validMemberPermissions.map(perm => ({
        project_id: project.id,
        user_id: perm.user_id,
        granted_by: null // Will be set by the calling function if needed
      }));

      const { error: projectAccessError } = await supabaseAdmin
        .from("project_access_permissions")
        .insert(projectAccessPermissions);
      if (projectAccessError) {
          console.error(`[project-utils] Project access permissions creation failed: ${JSON.stringify(projectAccessError)}`);
          // Rollback: delete project, resume, and storage folder
          await supabaseAdmin.from("projects").delete().eq("id", project.id);
          throw new Error(`Project access permissions creation failed: ${projectAccessError.message}`);
      }
      console.log("[project-utils] Project access permissions created successfully");
    } else {
      console.log("[project-utils] No valid member permissions to grant");
    }
  } else {
    console.log("[project-utils] No member permissions provided");
  }

  console.log(`[project-utils] Project creation completed successfully: ${project.id}`);
  return project;
}
