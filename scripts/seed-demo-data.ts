// scripts/seed-demo-data.ts
// Seed script to create demo data for client demonstrations
// Run with: npx tsx scripts/seed-demo-data.ts
// Or: ts-node scripts/seed-demo-data.ts

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { demoBorrowerResume, completeProjectResume, partialProjectResume } from '../lib/mockData';

// Load environment variables from .env.local (for local development)
config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
config({ path: resolve(process.cwd(), '.env') });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('\n❌ Missing SUPABASE_URL environment variable');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env.local');
  console.error('   For local: NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321');
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  console.error('   Get it by running: supabase status');
  console.error('   Or find it in your Supabase dashboard (Settings > API)');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface OnboardResponse {
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

async function callOnboardBorrower(
  email: string,
  password: string,
  fullName: string
): Promise<OnboardResponse> {
  try {
    const { data, error } = await supabaseAdmin.functions.invoke('onboard-borrower', {
      body: { email, password, full_name: fullName },
    });

    if (error) {
      console.error(`[onboard-borrower] Error for ${email}:`, error);
      return { error: error.message || String(error) };
    }

    return data as OnboardResponse;
  } catch (err) {
    console.error(`[onboard-borrower] Exception for ${email}:`, err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function createAdvisorOrg(advisorUserId: string, advisorEmail: string): Promise<string | null> {
  console.log('[seed] Creating advisor org...');
  
  // Check if advisor org already exists
  const { data: existingOrg } = await supabaseAdmin
    .from('orgs')
    .select('id')
    .eq('entity_type', 'advisor')
    .limit(1)
    .single();

  let orgId: string;

  if (existingOrg) {
    console.log('[seed] Advisor org already exists, using existing:', existingOrg.id);
    orgId = existingOrg.id;
  } else {
    // Create advisor org
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('orgs')
      .insert({
        name: 'CapMatch Advisors',
        entity_type: 'advisor',
      })
      .select()
      .single();

    if (orgError) {
      console.error('[seed] Failed to create advisor org:', orgError);
      return null;
    }

    orgId = orgData.id;
    console.log('[seed] ✅ Created advisor org:', orgId);
  }

  // Add advisor to org as owner
  const { error: memberError } = await supabaseAdmin
    .from('org_members')
    .upsert(
      {
        org_id: orgId,
        user_id: advisorUserId,
        role: 'owner',
      },
      { onConflict: 'org_id,user_id' }
    );

  if (memberError) {
    console.error('[seed] Failed to add advisor to org:', memberError);
    return null;
  }

  // Update profile with active org
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('id', advisorUserId);

  if (profileError) {
    console.error('[seed] Failed to update advisor profile:', profileError);
    return null;
  }

  console.log('[seed] ✅ Advisor org setup complete');
  return orgId;
}

async function createProject(
  ownerOrgId: string,
  projectName: string,
  assignedAdvisorId: string | null,
  creatorId: string
): Promise<string | null> {
  console.log(`[seed] Creating project: ${projectName}...`);

  try {
    // 1. Create the project record
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name: projectName,
        owner_org_id: ownerOrgId,
        assigned_advisor_id: assignedAdvisorId,
      })
      .select()
      .single();

    if (projectError) {
      console.error(`[seed] Failed to create project record:`, projectError);
      return null;
    }

    const projectId = project.id;
    console.log(`[seed] ✅ Created project record: ${projectId}`);

    // 2. Create empty project resume (will be updated later)
    const { error: resumeError } = await supabaseAdmin
      .from('project_resumes')
      .insert({ project_id: projectId, content: {} });

    if (resumeError) {
      console.error(`[seed] Failed to create project resume:`, resumeError);
      // Rollback: delete project
      await supabaseAdmin.from('projects').delete().eq('id', projectId);
      return null;
    }

    // 3. Create storage folder
    const { error: storageError } = await supabaseAdmin.storage
      .from(ownerOrgId)
      .upload(`${projectId}/.placeholder`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8',
      });

    if (storageError && !storageError.message?.toLowerCase().includes('already exists')) {
      console.warn(`[seed] Warning: Storage folder creation failed (non-critical):`, storageError.message);
    }

    // 4. Create PROJECT_RESUME resource
    const { data: projectResumeResource, error: resumeResourceError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: ownerOrgId,
        project_id: projectId,
        resource_type: 'PROJECT_RESUME',
        name: `${projectName} Resume`,
      })
      .select()
      .single();

    if (resumeResourceError) {
      console.error(`[seed] Failed to create PROJECT_RESUME resource:`, resumeResourceError);
      // Continue anyway - this is not critical for seeding
    }

    // 5. Create PROJECT_DOCS_ROOT resource
    const { data: projectDocsRootResource, error: docsRootError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: ownerOrgId,
        project_id: projectId,
        resource_type: 'PROJECT_DOCS_ROOT',
        name: `${projectName} Documents`,
      })
      .select()
      .single();

    if (docsRootError) {
      console.error(`[seed] Failed to create PROJECT_DOCS_ROOT resource:`, docsRootError);
      // Continue anyway
    }

    // 6. Grant creator access
    const { error: grantError } = await supabaseAdmin
      .from('project_access_grants')
      .insert({
        project_id: projectId,
        org_id: ownerOrgId,
        user_id: creatorId,
        granted_by: creatorId,
      });

    if (grantError) {
      console.warn(`[seed] Warning: Failed to grant project access:`, grantError.message);
    }

    // 7. Grant permissions on resources
    if (projectResumeResource?.id) {
      await supabaseAdmin.from('permissions').upsert({
        resource_id: projectResumeResource.id,
        user_id: creatorId,
        permission: 'edit',
        granted_by: creatorId,
      });
    }

    if (projectDocsRootResource?.id) {
      await supabaseAdmin.from('permissions').upsert({
        resource_id: projectDocsRootResource.id,
        user_id: creatorId,
        permission: 'edit',
        granted_by: creatorId,
      });
    }

    // 8. Create default chat thread
    const { data: chatThread, error: chatThreadError } = await supabaseAdmin
      .from('chat_threads')
      .insert({
        project_id: projectId,
        topic: 'General',
      })
      .select()
      .single();

    if (!chatThreadError && chatThread) {
      // Add participants
      const participants = [{ thread_id: chatThread.id, user_id: creatorId }];
      if (assignedAdvisorId) {
        participants.push({ thread_id: chatThread.id, user_id: assignedAdvisorId });
      }
      await supabaseAdmin.from('chat_thread_participants').insert(participants);
    }

    console.log(`[seed] ✅ Created project: ${projectName} (${projectId})`);
    return projectId;
  } catch (err) {
    console.error(`[seed] Exception creating project ${projectName}:`, err);
    return null;
  }
}

async function updateProjectResume(
  projectId: string,
  resumeContent: typeof completeProjectResume
): Promise<boolean> {
  console.log(`[seed] Updating project resume for project: ${projectId}...`);

  const { error } = await supabaseAdmin
    .from('project_resumes')
    .upsert(
      {
        project_id: projectId,
        content: resumeContent as any,
      },
      { onConflict: 'project_id' }
    );

  if (error) {
    console.error(`[seed] Failed to update project resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated project resume`);
  return true;
}

async function updateBorrowerResume(orgId: string, resumeContent: typeof demoBorrowerResume): Promise<boolean> {
  console.log(`[seed] Updating borrower resume for org: ${orgId}...`);

  const { error } = await supabaseAdmin
    .from('borrower_resumes')
    .upsert(
      {
        org_id: orgId,
        content: resumeContent as any,
      },
      { onConflict: 'org_id' }
    );

  if (error) {
    console.error(`[seed] Failed to update borrower resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated borrower resume`);
  return true;
}

async function assignAdvisorToProject(projectId: string, advisorId: string): Promise<boolean> {
  console.log(`[seed] Assigning advisor to project: ${projectId}...`);

  const { error } = await supabaseAdmin
    .from('projects')
    .update({ assigned_advisor_id: advisorId })
    .eq('id', projectId);

  if (error) {
    console.error(`[seed] Failed to assign advisor:`, error);
    return false;
  }

  // Grant advisor permissions using the RPC function
  const { error: permError } = await supabaseAdmin.rpc('grant_advisor_project_permissions', {
    p_project_id: projectId,
    p_advisor_id: advisorId,
    p_granted_by_id: advisorId,
  });

  if (permError) {
    console.warn(`[seed] Warning: Failed to grant advisor permissions (may already exist):`, permError.message);
  }

  console.log(`[seed] ✅ Assigned advisor to project`);
  return true;
}

async function deleteDefaultProject(orgId: string): Promise<boolean> {
  console.log(`[seed] Checking for default project to delete...`);

  // Find the default "My First Project"
  const { data: projects, error: fetchError } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('owner_org_id', orgId)
    .eq('name', 'My First Project');

  if (fetchError) {
    console.error(`[seed] Failed to fetch default project:`, fetchError);
    return false;
  }

  if (projects && projects.length > 0) {
    const projectId = projects[0].id;
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error(`[seed] Failed to delete default project:`, deleteError);
      return false;
    }

    console.log(`[seed] ✅ Deleted default project`);
    return true;
  }

  console.log(`[seed] No default project found (may have been deleted already)`);
  return true;
}

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  try {
    // Step 1: Create Advisor (cody.field@capmatch.com)
    console.log('📋 Step 1: Creating advisor...');
    const advisorEmail = 'cody.field@capmatch.com';
    const advisorPassword = 'password';
    const advisorName = 'Cody Field';

    // Check if advisor already exists
    const { data: existingAdvisor } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', advisorEmail)
      .single();

    let advisorUserId: string;

    if (existingAdvisor) {
      console.log(`[seed] Advisor already exists: ${advisorEmail} (${existingAdvisor.id})`);
      advisorUserId = existingAdvisor.id;
    } else {
      const advisorResult = await callOnboardBorrower(advisorEmail, advisorPassword, advisorName);
      if (advisorResult.error || !advisorResult.user) {
        console.error(`[seed] ❌ Failed to create advisor: ${advisorResult.error}`);
        return;
      }
      advisorUserId = advisorResult.user.id;
      console.log(`[seed] ✅ Created advisor: ${advisorEmail} (${advisorUserId})`);
    }

    // Create advisor org
    const advisorOrgId = await createAdvisorOrg(advisorUserId, advisorEmail);
    if (!advisorOrgId) {
      console.error('[seed] ❌ Failed to create advisor org');
      return;
    }

    // Step 2: Create Borrower (borrower@org.com)
    console.log('\n📋 Step 2: Creating borrower...');
    const borrowerEmail = 'borrower@org.com';
    const borrowerPassword = 'password';
    const borrowerName = 'Demo Borrower';

    // Check if borrower already exists
    const { data: existingBorrower } = await supabaseAdmin
      .from('profiles')
      .select('id, active_org_id')
      .eq('email', borrowerEmail)
      .single();

    let borrowerUserId: string;
    let borrowerOrgId: string;

    if (existingBorrower) {
      console.log(`[seed] Borrower already exists: ${borrowerEmail} (${existingBorrower.id})`);
      borrowerUserId = existingBorrower.id;
      borrowerOrgId = existingBorrower.active_org_id || '';
      
      if (!borrowerOrgId) {
        // Get org from org_members
        const { data: memberData } = await supabaseAdmin
          .from('org_members')
          .select('org_id')
          .eq('user_id', borrowerUserId)
          .eq('role', 'owner')
          .single();
        
        if (memberData) {
          borrowerOrgId = memberData.org_id;
        }
      }
    } else {
      const borrowerResult = await callOnboardBorrower(borrowerEmail, borrowerPassword, borrowerName);
      if (borrowerResult.error || !borrowerResult.user) {
        console.error(`[seed] ❌ Failed to create borrower: ${borrowerResult.error}`);
        return;
      }
      borrowerUserId = borrowerResult.user.id;
      console.log(`[seed] ✅ Created borrower: ${borrowerEmail} (${borrowerUserId})`);

      // Get the org that was created during onboarding
      const { data: borrowerProfile } = await supabaseAdmin
        .from('profiles')
        .select('active_org_id')
        .eq('id', borrowerUserId)
        .single();

      if (!borrowerProfile?.active_org_id) {
        console.error('[seed] ❌ Borrower org not found after onboarding');
        return;
      }

      borrowerOrgId = borrowerProfile.active_org_id;
      console.log(`[seed] ✅ Borrower org: ${borrowerOrgId}`);
    }

    // Step 3: Delete default project if it exists
    console.log('\n📋 Step 3: Cleaning up default project...');
    await deleteDefaultProject(borrowerOrgId);

    // Step 4: Update borrower resume with demo data
    console.log('\n📋 Step 4: Updating borrower resume...');
    await updateBorrowerResume(borrowerOrgId, demoBorrowerResume);

    // Step 5: Create complete project (Downtown Highrise)
    console.log('\n📋 Step 5: Creating complete project...');
    const completeProjectId = await createProject(
      borrowerOrgId,
      completeProjectResume.projectName,
      advisorUserId,
      borrowerUserId
    );

    if (!completeProjectId) {
      console.error('[seed] ❌ Failed to create complete project');
      return;
    }

    // Update project resume with complete data
    await updateProjectResume(completeProjectId, completeProjectResume);
    await assignAdvisorToProject(completeProjectId, advisorUserId);

    // Step 6: Create partial project (Warehouse Development)
    console.log('\n📋 Step 6: Creating partial project...');
    const partialProjectId = await createProject(
      borrowerOrgId,
      partialProjectResume.projectName,
      advisorUserId,
      borrowerUserId
    );

    if (!partialProjectId) {
      console.error('[seed] ❌ Failed to create partial project');
      return;
    }

    // Update project resume with partial data
    await updateProjectResume(partialProjectId, partialProjectResume);
    await assignAdvisorToProject(partialProjectId, advisorUserId);

    // Summary
    console.log('\n✅ Demo data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Advisor: ${advisorEmail} (password: ${advisorPassword})`);
    console.log(`   Borrower: ${borrowerEmail} (password: ${borrowerPassword})`);
    console.log(`   Projects:`);
    console.log(`     - ${completeProjectResume.projectName} (Complete)`);
    console.log(`     - ${partialProjectResume.projectName} (Partial)`);
    console.log('\n🎉 You can now log in and view the demo data!');
  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the seed script
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedDemoData };

