// scripts/seed-demo-data.ts
// Seed script to create demo data for client demonstrations
// Run with: npx tsx scripts/seed-demo-data.ts
// Or: ts-node scripts/seed-demo-data.ts

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { demoBorrowerResume, completeProjectResume, partialProjectResume } from '../lib/mockData';
import { ProjectResumeContent } from '../src/lib/project-queries';

/**
 * Calculate project completion percentage based on required fields.
 * This matches the logic in useProjectStore.calculateProgress()
 */
function calculateProjectProgress(resume: ProjectResumeContent): number {
  const requiredFields: (keyof ProjectResumeContent)[] = [
    'projectName',
    'propertyAddressStreet',
    'propertyAddressCity',
    'propertyAddressState',
    'propertyAddressZip',
    'assetType',
    'projectDescription',
    'projectPhase',
    'loanAmountRequested',
    'loanType',
    'targetLtvPercent',
    'targetCloseDate',
    'useOfProceeds',
    'recoursePreference',
    'exitStrategy',
    'businessPlanSummary',
  ];

  let filledCount = 0;
  requiredFields.forEach((field) => {
    const value = resume[field];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      if (typeof value === 'number' && value === 0) return; // Don't count default 0
      filledCount++;
    }
  });

  return requiredFields.length > 0
    ? Math.round((filledCount / requiredFields.length) * 100)
    : 0;
}

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
    console.log(`[onboard-borrower] Calling edge function for ${email}...`);
    const { data, error } = await supabaseAdmin.functions.invoke('onboard-borrower', {
      body: { email, password, full_name: fullName },
    });

    // Log the full response for debugging
    console.log(`[onboard-borrower] Response for ${email}:`, { data, error });

    if (error) {
      console.error(`[onboard-borrower] Error object for ${email}:`, JSON.stringify(error, null, 2));
      
      // Try to read the response body from the error context
      let actualErrorMessage = error.message || String(error);
      
      // Check if error has a context with a Response object
      if (error && typeof error === 'object' && 'context' in error) {
        const context = (error as any).context;
        if (context && context instanceof Response) {
          try {
            const responseBody = await context.text();
            console.log(`[onboard-borrower] Response body:`, responseBody);
            try {
              const parsedBody = JSON.parse(responseBody);
              if (parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody) {
                actualErrorMessage = parsedBody.error;
                console.error(`[onboard-borrower] Extracted error from response body:`, actualErrorMessage);
              }
            } catch (parseError) {
              // If JSON parsing fails, use the raw body
              actualErrorMessage = responseBody || actualErrorMessage;
            }
          } catch (readError) {
            console.warn(`[onboard-borrower] Could not read response body:`, readError);
          }
        }
      }
      
      // Check if data contains error details (sometimes error is in data even when error object exists)
      if (data) {
        console.log(`[onboard-borrower] Response data (may contain error):`, data);
        if (typeof data === 'object' && 'error' in data) {
          const dataError = (data as any).error;
          console.error(`[onboard-borrower] Response error details:`, dataError);
          return { error: typeof dataError === 'string' ? dataError : JSON.stringify(dataError) };
        }
      }
      
      return { error: actualErrorMessage };
    }

    // Check if the response data itself contains an error
    if (data && typeof data === 'object') {
      if ('error' in data) {
        const responseError = (data as any).error;
        console.error(`[onboard-borrower] Response contains error for ${email}:`, responseError);
        return { 
          error: typeof responseError === 'string' 
            ? responseError 
            : JSON.stringify(responseError) 
        };
      }
      
      // Check if we have a user object (success case)
      if ('user' in data) {
        return data as OnboardResponse;
      }
    }

    // If we get here, the response is unexpected
    console.warn(`[onboard-borrower] Unexpected response format for ${email}:`, data);
    return data as OnboardResponse;
  } catch (err) {
    console.error(`[onboard-borrower] Exception for ${email}:`, err);
    if (err instanceof Error) {
      console.error(`[onboard-borrower] Exception stack:`, err.stack);
    }
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
  resumeContent: ProjectResumeContent
): Promise<boolean> {
  console.log(`[seed] Updating project resume for project: ${projectId}...`);

  // Calculate and include completenessPercent
  const completenessPercent = calculateProjectProgress(resumeContent);
  const resumeWithProgress: ProjectResumeContent = {
    ...resumeContent,
    completenessPercent,
  };

  const { error } = await supabaseAdmin
    .from('project_resumes')
    .upsert(
      {
        project_id: projectId,
        content: resumeWithProgress as any,
      },
      { onConflict: 'project_id' }
    );

  if (error) {
    console.error(`[seed] Failed to update project resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated project resume (completeness: ${completenessPercent}%)`);
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

/**
 * Cleanup function to delete all demo data created by the seed script.
 * This allows you to rollback and re-run the seed script cleanly.
 */
async function cleanupDemoData() {
  console.log('🧹 Starting demo data cleanup...\n');

  try {
    const advisorEmail = 'cody.field@capmatch.com';
    const borrowerEmail = 'borrower@org.com';

    // Step 1: Find and delete demo projects
    console.log('📋 Step 1: Deleting demo projects...');
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name, owner_org_id')
      .in('name', ['Downtown Highrise Acquisition', 'Warehouse Development']);

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      
      // Delete related data first (due to foreign key constraints)
      await supabaseAdmin.from('project_access_grants').delete().in('project_id', projectIds);
      await supabaseAdmin.from('permissions').delete().in('resource_id', projectIds);
      await supabaseAdmin.from('project_resumes').delete().in('project_id', projectIds);
      await supabaseAdmin.from('chat_threads').delete().in('project_id', projectIds);
      
      // Delete resources associated with projects
      const { data: resources } = await supabaseAdmin
        .from('resources')
        .select('id')
        .in('project_id', projectIds);
      
      if (resources && resources.length > 0) {
        const resourceIds = resources.map(r => r.id);
        await supabaseAdmin.from('permissions').delete().in('resource_id', resourceIds);
        await supabaseAdmin.from('resources').delete().in('id', resourceIds);
      }
      
      // Finally delete projects
      await supabaseAdmin.from('projects').delete().in('id', projectIds);
      console.log(`[cleanup] ✅ Deleted ${projects.length} demo project(s)`);
    } else {
      console.log('[cleanup] No demo projects found');
    }

    // Step 2: Delete borrower org and user
    console.log('\n📋 Step 2: Deleting borrower data...');
    
    // First, try to find user in auth.users by email
    let borrowerUserId: string | null = null;
    let borrowerOrgId: string | null = null;
    
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === borrowerEmail);
      if (authUser) {
        borrowerUserId = authUser.id;
        console.log(`[cleanup] Found borrower in auth.users: ${borrowerUserId}`);
      }
    } catch (err) {
      console.warn(`[cleanup] Could not list auth users:`, err);
    }
    
    // Also check profiles table
    const { data: borrowerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, active_org_id')
      .eq('email', borrowerEmail)
      .maybeSingle();

    if (borrowerProfile) {
      borrowerUserId = borrowerProfile.id;
      borrowerOrgId = borrowerProfile.active_org_id;
      console.log(`[cleanup] Found borrower in profiles: ${borrowerUserId}`);
    }

    if (borrowerUserId) {
      // Delete org data if org exists
      if (borrowerOrgId) {
        // Delete borrower resume
        await supabaseAdmin.from('borrower_resumes').delete().eq('org_id', borrowerOrgId);
        
        // Delete org members
        await supabaseAdmin.from('org_members').delete().eq('org_id', borrowerOrgId);
        
        // Delete resources associated with org
        const { data: orgResources } = await supabaseAdmin
          .from('resources')
          .select('id')
          .eq('org_id', borrowerOrgId);
        
        if (orgResources && orgResources.length > 0) {
          const resourceIds = orgResources.map(r => r.id);
          await supabaseAdmin.from('permissions').delete().in('resource_id', resourceIds);
          await supabaseAdmin.from('resources').delete().in('id', resourceIds);
        }
        
        // Delete org
        await supabaseAdmin.from('orgs').delete().eq('id', borrowerOrgId);
        console.log(`[cleanup] ✅ Deleted borrower org: ${borrowerOrgId}`);
      }
      
      // Delete user from auth.users (this will cascade delete the profile due to FK constraint)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(borrowerUserId);
      if (deleteAuthError) {
        console.error(`[cleanup] Failed to delete borrower from auth.users:`, deleteAuthError);
        // Fallback: try deleting from profiles if auth delete fails
        await supabaseAdmin.from('profiles').delete().eq('id', borrowerUserId);
      } else {
        console.log(`[cleanup] ✅ Deleted borrower user from auth.users: ${borrowerEmail}`);
      }
    } else {
      console.log('[cleanup] Borrower user not found in auth.users or profiles');
    }

    // Step 3: Delete advisor org and user
    console.log('\n📋 Step 3: Deleting advisor data...');
    
    // First, try to find user in auth.users by email
    let advisorUserId: string | null = null;
    let advisorOrgId: string | null = null;
    
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === advisorEmail);
      if (authUser) {
        advisorUserId = authUser.id;
        console.log(`[cleanup] Found advisor in auth.users: ${advisorUserId}`);
      }
    } catch (err) {
      console.warn(`[cleanup] Could not list auth users:`, err);
    }
    
    // Also check profiles table
    const { data: advisorProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, active_org_id')
      .eq('email', advisorEmail)
      .maybeSingle();

    if (advisorProfile) {
      advisorUserId = advisorProfile.id;
      advisorOrgId = advisorProfile.active_org_id;
      console.log(`[cleanup] Found advisor in profiles: ${advisorUserId}`);
    }

    if (advisorUserId) {
      // Delete org data if org exists
      if (advisorOrgId) {
        // Delete org members
        await supabaseAdmin.from('org_members').delete().eq('org_id', advisorOrgId);
        
        // Delete resources associated with org
        const { data: orgResources } = await supabaseAdmin
          .from('resources')
          .select('id')
          .eq('org_id', advisorOrgId);
        
        if (orgResources && orgResources.length > 0) {
          const resourceIds = orgResources.map(r => r.id);
          await supabaseAdmin.from('permissions').delete().in('resource_id', resourceIds);
          await supabaseAdmin.from('resources').delete().in('id', resourceIds);
        }
        
        // Delete org
        await supabaseAdmin.from('orgs').delete().eq('id', advisorOrgId);
        console.log(`[cleanup] ✅ Deleted advisor org: ${advisorOrgId}`);
      }
      
      // Delete user from auth.users (this will cascade delete the profile due to FK constraint)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(advisorUserId);
      if (deleteAuthError) {
        console.error(`[cleanup] Failed to delete advisor from auth.users:`, deleteAuthError);
        // Fallback: try deleting from profiles if auth delete fails
        await supabaseAdmin.from('profiles').delete().eq('id', advisorUserId);
      } else {
        console.log(`[cleanup] ✅ Deleted advisor user from auth.users: ${advisorEmail}`);
      }
    } else {
      console.log('[cleanup] Advisor user not found in auth.users or profiles');
    }

    // Step 4: Clean up storage buckets (if they exist)
    console.log('\n📋 Step 4: Cleaning up storage...');
    try {
      // Note: Storage cleanup is optional and may require additional permissions
      // The buckets will be recreated on next seed run
      console.log('[cleanup] Storage buckets will be recreated on next seed run');
    } catch (error) {
      console.warn('[cleanup] Could not clean up storage (non-fatal):', error);
    }

    console.log('\n✅ Demo data cleanup completed successfully!');
    console.log('🌱 You can now run the seed script again for a fresh start.\n');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
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
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'cleanup' || command === '--cleanup' || command === '-c') {
    // Run cleanup
    cleanupDemoData()
      .then(() => {
        console.log('\n✨ Cleanup done!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    // Run seed (default)
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
}

export { seedDemoData, cleanupDemoData };

