// scripts/seed-demo-data.ts
// Seed script to create demo data for client demonstrations
// Run with: npx tsx scripts/seed-demo-data.ts
// Or: ts-node scripts/seed-demo-data.ts

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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
    if (value !== null && value !== undefined) {
      // For numbers, check if it's not 0 (0 is considered empty/default)
      if (typeof value === 'number') {
        if (value !== 0) filledCount++;
      } 
      // For strings, check if it's not empty after trimming
      else if (typeof value === 'string') {
        if (value.trim() !== '') filledCount++;
      }
      // For other types, count as filled
      else {
        filledCount++;
      }
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
      .insert({
        project_id: projectId,
        content: {},
        created_by: creatorId,
      });

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

    // 5.5. Ensure borrower root resources (BORROWER_RESUME and BORROWER_DOCS_ROOT)
    const { error: borrowerRootError } = await supabaseAdmin.rpc('ensure_project_borrower_roots', {
      p_project_id: projectId,
    });

    if (borrowerRootError) {
      console.warn(`[seed] Warning: Failed to ensure borrower root resources:`, borrowerRootError.message);
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
  resumeContent: ProjectResumeContent,
  createdById: string
): Promise<boolean> {
  console.log(`[seed] Updating project resume for project: ${projectId}...`);

  // For complete project, set to 100% explicitly
  // For partial project, calculate it
  const isCompleteProject = resumeContent.projectName === 'Downtown Highrise Acquisition';
  const completenessPercent = isCompleteProject ? 100 : calculateProjectProgress(resumeContent);
  
  // Build _lockedFields: lock all fields that have non-empty values
  const lockedFields: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(resumeContent)) {
    // Skip reserved keys
    if (key === '_lockedFields' || key === '_fieldStates' || key === '_metadata') {
      continue;
    }
    
    // Lock field if it has a meaningful value
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.trim() !== '') {
        lockedFields[key] = true;
      } else if (typeof value === 'number' && value !== 0) {
        lockedFields[key] = true;
      } else if (typeof value === 'boolean') {
        lockedFields[key] = true;
      } else if (Array.isArray(value) && value.length > 0) {
        lockedFields[key] = true;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        lockedFields[key] = true;
      }
    }
  }
  
  const resumeWithProgress: ProjectResumeContent & Record<string, any> = {
    ...resumeContent,
    _lockedFields: lockedFields,
  };

  // Insert new resume version
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('project_resumes')
    .insert({
      project_id: projectId,
      content: resumeWithProgress as any,
      completeness_percent: completenessPercent,
      created_by: createdById,
    });

  if (error) {
    console.error(`[seed] Failed to insert project resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated project resume (completeness: ${completenessPercent}%, locked fields: ${Object.keys(lockedFields).length})`);
  return true;
}

async function updateBorrowerResume(
  projectId: string,
  resumeContent: typeof demoBorrowerResume,
  createdById: string
): Promise<boolean> {
  console.log(`[seed] Updating borrower resume for project: ${projectId}...`);

  // Ensure borrower root resources exist
  const { error: rootError } = await supabaseAdmin.rpc('ensure_project_borrower_roots', {
    p_project_id: projectId,
  });

  if (rootError) {
    console.warn(`[seed] Warning: Failed to ensure borrower root resources:`, rootError.message);
  }

  // Build _lockedFields: lock all fields that have non-empty values
  const lockedFields: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(resumeContent)) {
    // Skip reserved keys
    if (key === '_lockedFields' || key === '_fieldStates' || key === '_metadata') {
      continue;
    }
    
    // Lock field if it has a meaningful value
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.trim() !== '') {
        lockedFields[key] = true;
      } else if (typeof value === 'number' && value !== 0) {
        lockedFields[key] = true;
      } else if (typeof value === 'boolean') {
        lockedFields[key] = true;
      } else if (Array.isArray(value) && value.length > 0) {
        lockedFields[key] = true;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        lockedFields[key] = true;
      }
    }
  }

  // Ensure completenessPercent is set to 100 for complete projects
  // The calculation logic only counts booleans when true, but we want to show 100% for complete data
  const borrowerResumeWithProgress = {
    ...resumeContent,
    _lockedFields: lockedFields,
  };

  // Insert new resume version
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('borrower_resumes')
    .insert({
      project_id: projectId,
      content: borrowerResumeWithProgress as any,
      completeness_percent: 100, // Explicitly set to 100% since all fields are filled
      created_by: createdById,
    });

  if (error) {
    console.error(`[seed] Failed to insert borrower resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated borrower resume (locked fields: ${Object.keys(lockedFields).length})`);
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

async function createOwnerUser(
  email: string,
  password: string,
  fullName: string,
  orgId: string
): Promise<string | null> {
  console.log(`[seed] Creating owner user: ${email}...`);

  try {
    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      console.log(`[seed] Owner already exists: ${email} (${existingProfile.id})`);
      userId = existingProfile.id;
    } else {
      // Create user via auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authUser.user) {
        console.error(`[seed] Failed to create owner user:`, authError);
        return null;
      }

      userId = authUser.user.id;

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          app_role: 'borrower',
          active_org_id: orgId,
        });

      if (profileError) {
        console.error(`[seed] Failed to create owner profile:`, profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return null;
      }

      console.log(`[seed] ✅ Created owner user: ${email} (${userId})`);
    }

    // Add to org_members as owner
    const { error: memberError } = await supabaseAdmin
      .from('org_members')
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          role: 'owner',
        },
        { onConflict: 'org_id,user_id' }
      );

    if (memberError) {
      console.error(`[seed] Failed to add owner to org:`, memberError);
      return null;
    }

    // Ensure active_org_id is set
    await supabaseAdmin
      .from('profiles')
      .update({ active_org_id: orgId })
      .eq('id', userId);

    console.log(`[seed] ✅ Owner user setup complete: ${email}`);
    return userId;
  } catch (err) {
    console.error(`[seed] Exception creating owner user ${email}:`, err);
    return null;
  }
}

async function createMemberUser(
  email: string,
  password: string,
  fullName: string,
  orgId: string
): Promise<string | null> {
  console.log(`[seed] Creating member user: ${email}...`);

  try {
    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      console.log(`[seed] Member already exists: ${email} (${existingProfile.id})`);
      userId = existingProfile.id;
    } else {
      // Create user via auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authUser.user) {
        console.error(`[seed] Failed to create member user:`, authError);
        return null;
      }

      userId = authUser.user.id;

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          app_role: 'borrower',
          active_org_id: orgId,
        });

      if (profileError) {
        console.error(`[seed] Failed to create member profile:`, profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return null;
      }

      console.log(`[seed] ✅ Created member user: ${email} (${userId})`);
    }

    // Add to org_members
    const { error: memberError } = await supabaseAdmin
      .from('org_members')
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          role: 'member',
        },
        { onConflict: 'org_id,user_id' }
      );

    if (memberError) {
      console.error(`[seed] Failed to add member to org:`, memberError);
      return null;
    }

    // Ensure active_org_id is set
    await supabaseAdmin
      .from('profiles')
      .update({ active_org_id: orgId })
      .eq('id', userId);

    console.log(`[seed] ✅ Member user setup complete: ${email}`);
    return userId;
  } catch (err) {
    console.error(`[seed] Exception creating member user ${email}:`, err);
    return null;
  }
}

async function grantMemberProjectAccess(
  projectId: string,
  memberId: string,
  grantedById: string
): Promise<boolean> {
  console.log(`[seed] Granting project access to member: ${memberId} for project: ${projectId}...`);

  try {
    // Use grant_project_access RPC function (same as edge functions use)
    const { error: grantError } = await supabaseAdmin.rpc('grant_project_access', {
      p_project_id: projectId,
      p_user_id: memberId,
      p_granted_by_id: grantedById,
      p_permissions: [
        { resource_type: 'PROJECT_RESUME', permission: 'edit' },
        { resource_type: 'PROJECT_DOCS_ROOT', permission: 'edit' },
        { resource_type: 'BORROWER_RESUME', permission: 'edit' },
        { resource_type: 'BORROWER_DOCS_ROOT', permission: 'edit' },
      ],
    });

    if (grantError) {
      console.error(`[seed] Failed to grant project access:`, grantError);
      return false;
    }

    // Add member to General chat thread
    const { data: generalThread } = await supabaseAdmin
      .from('chat_threads')
      .select('id')
      .eq('project_id', projectId)
      .eq('topic', 'General')
      .maybeSingle();

    if (generalThread) {
      await supabaseAdmin
        .from('chat_thread_participants')
        .upsert(
          { thread_id: generalThread.id, user_id: memberId },
          { onConflict: 'thread_id,user_id' }
        );
    }

    console.log(`[seed] ✅ Granted project access to member`);
    return true;
  } catch (err) {
    console.error(`[seed] Exception granting project access:`, err);
    return false;
  }
}

async function uploadDocumentToProject(
  projectId: string,
  orgId: string,
  filePath: string,
  fileName: string,
  rootResourceType: 'PROJECT_DOCS_ROOT' | 'BORROWER_DOCS_ROOT',
  uploadedById: string
): Promise<string | null> {
  console.log(`[seed] Uploading document: ${fileName} to ${rootResourceType}...`);

  try {
    // Get the root resource
    const { data: rootResource, error: rootError } = await supabaseAdmin
      .from('resources')
      .select('id')
      .eq('project_id', projectId)
      .eq('resource_type', rootResourceType)
      .maybeSingle();

    if (rootError || !rootResource) {
      console.error(`[seed] Failed to find ${rootResourceType} resource:`, rootError);
      return null;
    }

    // Create FILE resource entry
    const { data: fileResource, error: resourceError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: orgId,
        project_id: projectId,
        parent_id: rootResource.id,
        resource_type: 'FILE',
        name: fileName,
      })
      .select()
      .single();

    if (resourceError) {
      console.error(`[seed] Failed to create file resource:`, resourceError);
      return null;
    }

    const resourceId = fileResource.id;

    // Create document version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('document_versions')
      .insert({
        resource_id: resourceId,
        created_by: uploadedById,
        storage_path: 'placeholder',
      })
      .select()
      .single();

    if (versionError) {
      console.error(`[seed] Failed to create document version:`, versionError);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Mark version as active
    await supabaseAdmin
      .from('document_versions')
      .update({ status: 'active' })
      .eq('id', version.id);

    // Build storage path
    const storageSubdir = rootResourceType === 'BORROWER_DOCS_ROOT' ? 'borrower-docs' : 'project-docs';
    const finalStoragePath = `${projectId}/${storageSubdir}/${resourceId}/v${version.version_number}_user${uploadedById}_${fileName}`;

    // Read file from filesystem
    if (!existsSync(filePath)) {
      console.error(`[seed] File not found: ${filePath}`);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    const fileBuffer = readFileSync(filePath);

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(orgId)
      .upload(finalStoragePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error(`[seed] Failed to upload file to storage:`, uploadError);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Update version with storage path
    const { error: updateVersionError } = await supabaseAdmin
      .from('document_versions')
      .update({ storage_path: finalStoragePath })
      .eq('id', version.id);

    if (updateVersionError) {
      console.error(`[seed] Failed to update version storage path:`, updateVersionError);
      await supabaseAdmin.storage.from(orgId).remove([finalStoragePath]);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Update resource with current version
    const { error: updateResourceError } = await supabaseAdmin
      .from('resources')
      .update({ current_version_id: version.id })
      .eq('id', resourceId);

    if (updateResourceError) {
      console.error(`[seed] Failed to update resource current version:`, updateResourceError);
    }

    // Log a domain event so downstream notification plumbing (digests, unread counts, etc.) sees seeded docs
    const { data: eventId, error: eventError } = await supabaseAdmin.rpc(
      'insert_document_uploaded_event',
      {
        p_actor_id: uploadedById,
        p_project_id: projectId,
        p_resource_id: resourceId,
        p_payload: {
          fileName,
          size: fileBuffer.length,
          mimeType: 'application/pdf',
          rootResourceType,
          source: 'seed-demo-data',
        },
      }
    );

    if (eventError) {
      console.warn('[seed] Failed to log document_uploaded event during seeding', {
        projectId,
        resourceId,
        error: eventError.message,
      });
    } else if (eventId) {
      const { error: notifyError } = await supabaseAdmin.functions.invoke('notify-fan-out', {
        body: { eventId },
      });
      if (notifyError) {
        console.warn('[seed] notify-fan-out failed for seeded document', {
          eventId,
          projectId,
          resourceId,
          error: notifyError.message,
        });
      }
    }

    console.log(`[seed] ✅ Uploaded document: ${fileName}`);
    return resourceId;
  } catch (err) {
    console.error(`[seed] Exception uploading document ${fileName}:`, err);
    return null;
  }
}

async function createChatMessage(
  threadId: string,
  userId: string,
  content: string,
  resourceIds?: string[]
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('insert_thread_message', {
      p_thread_id: threadId,
      p_user_id: userId,
      p_content: content,
      p_resource_ids: resourceIds || [],
    p_reply_to: null,
    });

    if (error) {
      console.error(`[seed] Failed to create chat message:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[seed] Exception creating chat message:`, err);
    return false;
  }
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
    console.warn(`[seed] Could not fetch default project (non-critical):`, fetchError.message);
    return true; // Continue anyway
  }

  if (projects && projects.length > 0) {
    const projectId = projects[0].id;
    
    // Try to delete the project - this may fail if it has root resources
    // In that case, we'll just skip it (non-critical)
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      // This is expected with the new schema - projects with root resources can't be deleted directly
      // We'll just skip it (non-critical)
      console.log(`[seed] ⚠️  Could not delete default project (may have root resources): ${deleteError.message}`);
      console.log(`[seed]    This is non-critical - continuing with seed...`);
      return true; // Continue anyway
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
    const borrowerEmail = 'param.vora@capmatch.com';

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
        // Delete borrower resumes (project-scoped now)
        const { data: borrowerProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('owner_org_id', borrowerOrgId);
        if (borrowerProjects && borrowerProjects.length > 0) {
          const projectIds = borrowerProjects.map(p => p.id);
          await supabaseAdmin.from('borrower_resumes').delete().in('project_id', projectIds);
        }
        
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

    // Step 4: Delete member users and additional owner
    console.log('\n📋 Step 4: Deleting member users and additional owner...');
    const memberEmails = ['aryan.jain@capmatch.com', 'sarthak.karandikar@capmatch.com', 'kabeer.merchant@capmatch.com'];
    
    for (const email of memberEmails) {
      try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email === email);
        if (authUser) {
          // Delete project access grants
          await supabaseAdmin
            .from('project_access_grants')
            .delete()
            .eq('user_id', authUser.id);
          
          // Delete permissions
          const { data: memberPermissions } = await supabaseAdmin
            .from('permissions')
            .select('resource_id')
            .eq('user_id', authUser.id);
          
          if (memberPermissions && memberPermissions.length > 0) {
            await supabaseAdmin
              .from('permissions')
              .delete()
              .eq('user_id', authUser.id);
          }
          
          // Delete org memberships
          await supabaseAdmin
            .from('org_members')
            .delete()
            .eq('user_id', authUser.id);
          
          // Delete chat thread participants
          await supabaseAdmin
            .from('chat_thread_participants')
            .delete()
            .eq('user_id', authUser.id);
          
          // Delete user
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          console.log(`[cleanup] ✅ Deleted member user: ${email}`);
        }
      } catch (err) {
        console.warn(`[cleanup] Could not delete member user ${email}:`, err);
      }
    }

    // Step 5: Clean up storage buckets (if they exist)
    console.log('\n📋 Step 5: Cleaning up storage...');
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

    // Step 2: Create Borrower (param.vora@capmatch.com)
    console.log('\n📋 Step 2: Creating borrower...');
    const borrowerEmail = 'param.vora@capmatch.com';
    const borrowerPassword = 'password';
    const borrowerName = 'Param Vora';

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

    // Step 2.5: Create another owner
    console.log('\n📋 Step 2.5: Creating additional owner...');
    const owner2Email = 'kabeer.merchant@capmatch.com';
    const owner2Password = 'password';
    const owner2Name = 'Kabeer Merchant';
    const owner2Id = await createOwnerUser(owner2Email, owner2Password, owner2Name, borrowerOrgId);

    if (!owner2Id) {
      console.error('[seed] ❌ Failed to create additional owner');
      return;
    }

    // Step 3: Delete default project if it exists
    console.log('\n📋 Step 3: Cleaning up default project...');
    await deleteDefaultProject(borrowerOrgId);

    // Step 4: Skip borrower resume update (will be done per project)

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
    await updateProjectResume(completeProjectId, completeProjectResume, borrowerUserId);
    await assignAdvisorToProject(completeProjectId, advisorUserId);

    // Update borrower resume for complete project
    await updateBorrowerResume(completeProjectId, demoBorrowerResume, borrowerUserId);

    // Seed OM data for complete project
    console.log(`[seed] Seeding OM data for complete project...`);
    const completeOMContent = { ...completeProjectResume, completenessPercent: 100 };
    delete (completeOMContent as any)._lockedFields;
    delete (completeOMContent as any)._fieldStates;
    const { error: completeOMError } = await supabaseAdmin
      .from('om')
      .upsert(
        {
          project_id: completeProjectId,
          content: completeOMContent as any,
        },
        { onConflict: 'project_id' }
      );
    if (completeOMError) {
      console.warn(`[seed] ⚠️  Failed to seed OM data for complete project:`, completeOMError.message);
    } else {
      console.log(`[seed] ✅ Seeded OM data for complete project`);
    }

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
    await updateProjectResume(partialProjectId, partialProjectResume, borrowerUserId);
    await assignAdvisorToProject(partialProjectId, advisorUserId);

    // Update borrower resume for partial project
    await updateBorrowerResume(partialProjectId, demoBorrowerResume, borrowerUserId);

    // Seed OM data for partial project
    console.log(`[seed] Seeding OM data for partial project...`);
    const partialProgress = calculateProjectProgress(partialProjectResume);
    const partialOMContent = { ...partialProjectResume, completenessPercent: partialProgress };
    delete (partialOMContent as any)._lockedFields;
    delete (partialOMContent as any)._fieldStates;
    const { error: partialOMError } = await supabaseAdmin
      .from('om')
      .upsert(
        {
          project_id: partialProjectId,
          content: partialOMContent as any,
        },
        { onConflict: 'project_id' }
      );
    if (partialOMError) {
      console.warn(`[seed] ⚠️  Failed to seed OM data for partial project:`, partialOMError.message);
    } else {
      console.log(`[seed] ✅ Seeded OM data for partial project`);
    }

    // Step 7: Upload documents to complete project
    console.log('\n📋 Step 7: Uploading documents to complete project...');
    const sampleLoanPackagePath = resolve(process.cwd(), '../SampleLoanPackage/Deal1');
    const completeProjectDocs: Record<string, string> = {};

    // Borrower documents
    const borrowerDocs1 = [
      { file: 'Schedule E - Form 1040.pdf', name: 'Schedule E - Form 1040.pdf' },
      { file: 'Universal Credit Application Form .pdf', name: 'Universal Credit Application Form.pdf' },
    ];

    for (const doc of borrowerDocs1) {
      const filePath = join(sampleLoanPackagePath, doc.file);
      const resourceId = await uploadDocumentToProject(
        completeProjectId,
        borrowerOrgId,
        filePath,
        doc.name,
        'BORROWER_DOCS_ROOT',
        borrowerUserId
      );
      if (resourceId) {
        completeProjectDocs[doc.name] = resourceId;
      }
    }

    // Project documents
    const projectDocs1 = [
      { file: 'Appraisal Summary Report.pdf', name: 'Appraisal Summary Report.pdf' },
      { file: 'Architectural-Drawings.pdf', name: 'Architectural-Drawings.pdf' },
      { file: 'Environments Site Assessment.pdf', name: 'Environmental Site Assessment.pdf' },
      { file: 'Operating Statement 2024.pdf', name: 'Operating Statement 2024.pdf' },
      { file: 'Rent Roll Detail.pdf', name: 'Rent Roll Detail.pdf' },
    ];

    for (const doc of projectDocs1) {
      const filePath = join(sampleLoanPackagePath, doc.file);
      const resourceId = await uploadDocumentToProject(
        completeProjectId,
        borrowerOrgId,
        filePath,
        doc.name,
        'PROJECT_DOCS_ROOT',
        borrowerUserId
      );
      if (resourceId) {
        completeProjectDocs[doc.name] = resourceId;
      }
    }

    // Step 8: Upload documents to partial project
    console.log('\n📋 Step 8: Uploading documents to partial project...');
    const deal2Path = resolve(process.cwd(), '../SampleLoanPackage/Deal2');
    const partialProjectDocs: Record<string, string> = {};

    // Borrower documents
    const borrowerDocs2 = [
      { file: 'Schedule-E-Form-1040.pdf', name: 'Schedule E - Form 1040.pdf' },
    ];

    for (const doc of borrowerDocs2) {
      const filePath = join(deal2Path, doc.file);
      const resourceId = await uploadDocumentToProject(
        partialProjectId,
        borrowerOrgId,
        filePath,
        doc.name,
        'BORROWER_DOCS_ROOT',
        borrowerUserId
      );
      if (resourceId) {
        partialProjectDocs[doc.name] = resourceId;
      }
    }

    // Project documents
    const projectDocs2 = [
      { file: 'Appraisal-Report.pdf', name: 'Appraisal Report.pdf' },
      { file: 'Architectural Drawings.pdf', name: 'Architectural Drawings.pdf' },
      { file: 'Environmental Site Assessment I March 2024 Final.pdf', name: 'Environmental Site Assessment.pdf' },
      { file: 'Operating Statement 2024.pdf', name: 'Operating Statement 2024.pdf' },
      { file: 'RentRoll.pdf', name: 'Rent Roll.pdf' },
      { file: 'Commercial Loan Application Packet.pdf', name: 'Commercial Loan Application Packet.pdf' },
    ];

    for (const doc of projectDocs2) {
      const filePath = join(deal2Path, doc.file);
      const resourceId = await uploadDocumentToProject(
        partialProjectId,
        borrowerOrgId,
        filePath,
        doc.name,
        'PROJECT_DOCS_ROOT',
        borrowerUserId
      );
      if (resourceId) {
        partialProjectDocs[doc.name] = resourceId;
      }
    }

    // Step 9: Create member users
    console.log('\n📋 Step 9: Creating member users...');
    const member1Email = 'aryan.jain@capmatch.com';
    const member1Password = 'password';
    const member1Name = 'Aryan Jain';
    const member1Id = await createMemberUser(member1Email, member1Password, member1Name, borrowerOrgId);

    if (!member1Id) {
      console.error('[seed] ❌ Failed to create member 1');
      return;
    }

    const member2Email = 'sarthak.karandikar@capmatch.com';
    const member2Password = 'password';
    const member2Name = 'Sarthak Karandikar';
    const member2Id = await createMemberUser(member2Email, member2Password, member2Name, borrowerOrgId);

    if (!member2Id) {
      console.error('[seed] ❌ Failed to create member 2');
      return;
    }

    // Step 10: Grant project access to members
    console.log('\n📋 Step 10: Granting project access to members...');
    await grantMemberProjectAccess(completeProjectId, member1Id, borrowerUserId);
    await grantMemberProjectAccess(partialProjectId, member2Id, borrowerUserId);

    // Step 11: Create chat messages
    console.log('\n📋 Step 11: Creating chat messages...');

    // Get General thread IDs
    const { data: completeThread } = await supabaseAdmin
      .from('chat_threads')
      .select('id')
      .eq('project_id', completeProjectId)
      .eq('topic', 'General')
      .maybeSingle();

    const { data: partialThread } = await supabaseAdmin
      .from('chat_threads')
      .select('id')
      .eq('project_id', partialProjectId)
      .eq('topic', 'General')
      .maybeSingle();

    // Complete project chat messages
    if (completeThread) {
      const appraisalId = completeProjectDocs['Appraisal Summary Report.pdf'];
      const rentRollId = completeProjectDocs['Rent Roll Detail.pdf'];
      const operatingStmtId = completeProjectDocs['Operating Statement 2024.pdf'];
      const envAssessmentId = completeProjectDocs['Environmental Site Assessment.pdf'];

      // Initial welcome and document upload
      await createChatMessage(
        completeThread.id,
        borrowerUserId,
        `Welcome to the project, @[Aryan Jain](user:${member1Id})! I've uploaded the key documents we have so far. Please review the @[Appraisal Summary Report.pdf](doc:${appraisalId}) when you have a chance.`,
        appraisalId ? [appraisalId] : []
      );

      await createChatMessage(
        completeThread.id,
        member1Id,
        `Thanks @[Param Vora](user:${borrowerUserId})! I'll review everything this afternoon. What's our timeline looking like for lender submissions?`,
        []
      );

      await createChatMessage(
        completeThread.id,
        advisorUserId,
        `Hi team! @[Param Vora](user:${borrowerUserId}), thanks for getting the documents uploaded. @[Aryan Jain](user:${member1Id}), we're targeting initial lender outreach in about 2 weeks. The @[Appraisal Summary Report.pdf](doc:${appraisalId}) shows strong fundamentals - $75M purchase price with stabilized NOI around $4M.`,
        appraisalId ? [appraisalId] : []
      );

      // Discussion about rent roll
      await createChatMessage(
        completeThread.id,
        member1Id,
        `I've reviewed the @[Rent Roll Detail.pdf](doc:${rentRollId}). Occupancy looks good at 96%, but I noticed a few units coming up for renewal in Q2. Should we factor that into our projections?`,
        rentRollId ? [rentRollId] : []
      );

      await createChatMessage(
        completeThread.id,
        borrowerUserId,
        `Good catch, @[Aryan Jain](user:${member1Id}). We're planning to renew those at market rates, which should actually improve NOI. The current rents are slightly below market.`,
        []
      );

      await createChatMessage(
        completeThread.id,
        advisorUserId,
        `That's a great point. @[Aryan Jain](user:${member1Id}), can you update the pro forma to reflect the renewal assumptions? Also, let's make sure the @[Operating Statement 2024.pdf](doc:${operatingStmtId}) aligns with what we're seeing in the rent roll.`,
        operatingStmtId ? [operatingStmtId] : []
      );

      // Environmental assessment discussion
      await createChatMessage(
        completeThread.id,
        member1Id,
        `I've also reviewed the @[Environmental Site Assessment.pdf](doc:${envAssessmentId}). No red flags - just some minor recommendations for ongoing monitoring. Should we include this in the lender package?`,
        envAssessmentId ? [envAssessmentId] : []
      );

      await createChatMessage(
        completeThread.id,
        advisorUserId,
        `Yes, definitely include it. Most lenders will want to see it, and having a clean report is a positive. @[Param Vora](user:${borrowerUserId}), do we have the architectural drawings ready? Those are typically requested early in the process.`,
        []
      );

      await createChatMessage(
        completeThread.id,
        borrowerUserId,
        `Yes, they're uploaded. I can share the link if needed. @[Cody Field](user:${advisorUserId}), what's our next step - should we start reaching out to lenders now or wait until we have everything polished?`,
        []
      );

      await createChatMessage(
        completeThread.id,
        advisorUserId,
        `Let's get the pro forma updated first, then we can start soft outreach. I have a few lenders in mind who would be a good fit for this deal size and asset type. @[Aryan Jain](user:${member1Id}), can you have the updated pro forma ready by Friday?`,
        []
      );

      await createChatMessage(
        completeThread.id,
        member1Id,
        `Absolutely, I'll have it ready by end of day Thursday. I'll flag any assumptions that need your review, @[Cody Field](user:${advisorUserId}).`,
        []
      );
    }

    // Partial project chat messages
    if (partialThread) {
      const appraisalId = partialProjectDocs['Appraisal Report.pdf'];
      const operatingStmtId = partialProjectDocs['Operating Statement 2024.pdf'];
      const rentRollId = partialProjectDocs['Rent Roll.pdf'];
      const envAssessmentId = partialProjectDocs['Environmental Site Assessment.pdf'];
      const loanAppId = partialProjectDocs['Commercial Loan Application Packet.pdf'];

      // Initial project setup
      await createChatMessage(
        partialThread.id,
        borrowerUserId,
        `Hi @[Sarthak Karandikar](user:${member2Id}), welcome to the Warehouse Development project. This is a ground-up development in Dallas. I've started uploading the initial documents - the @[Appraisal Report.pdf](doc:${appraisalId}) is ready for review.`,
        appraisalId ? [appraisalId] : []
      );

      await createChatMessage(
        partialThread.id,
        member2Id,
        `Thanks @[Param Vora](user:${borrowerUserId})! I'll dive into the appraisal today. This is a pre-development deal, right? Do we have stabilized NOI projections or is this all pro forma?`,
        []
      );

      await createChatMessage(
        partialThread.id,
        advisorUserId,
        `Hi team! Yes @[Sarthak Karandikar](user:${member2Id}), this is pre-development. We're projecting stabilized NOI around $800K once fully leased. The @[Appraisal Report.pdf](doc:${appraisalId}) should have the market analysis and comparable properties.`,
        appraisalId ? [appraisalId] : []
      );

      // Operating statement discussion
      await createChatMessage(
        partialThread.id,
        member2Id,
        `Got it. I see the @[Operating Statement 2024.pdf](doc:${operatingStmtId}) is uploaded. Since this is pre-development, are these numbers from a similar property or projected?`,
        operatingStmtId ? [operatingStmtId] : []
      );

      await createChatMessage(
        partialThread.id,
        borrowerUserId,
        `Those are projected based on similar properties in the area. We're using a 100,000 sqft warehouse with market rents around $8/sqft. @[Cody Field](user:${advisorUserId}), does that sound reasonable for the Dallas market?`,
        []
      );

      await createChatMessage(
        partialThread.id,
        advisorUserId,
        `Yes, $8/sqft is in line with the market. @[Sarthak Karandikar](user:${member2Id}), can you verify the expense assumptions? We want to make sure we're being conservative on operating expenses.`,
        []
      );

      // Rent roll discussion (even though it's pre-development)
      await createChatMessage(
        partialThread.id,
        member2Id,
        `I've reviewed the @[Rent Roll.pdf](doc:${rentRollId}). Since this is pre-development, I assume this is a template or from a comparable property?`,
        rentRollId ? [rentRollId] : []
      );

      await createChatMessage(
        partialThread.id,
        borrowerUserId,
        `Exactly - it's a template based on similar properties. We're planning to start pre-leasing about 6 months before completion.`,
        []
      );

      // Environmental assessment
      await createChatMessage(
        partialThread.id,
        member2Id,
        `I've also looked at the @[Environmental Site Assessment.pdf](doc:${envAssessmentId}). Everything looks clean. For a ground-up development, lenders will definitely want this.`,
        envAssessmentId ? [envAssessmentId] : []
      );

      await createChatMessage(
        partialThread.id,
        advisorUserId,
        `Good. @[Param Vora](user:${borrowerUserId}), do we have the construction budget finalized? That's going to be critical for the loan application.`,
        []
      );

      await createChatMessage(
        partialThread.id,
        borrowerUserId,
        `We're still finalizing a few items with the contractor, but we should have it locked in by next week. @[Sarthak Karandikar](user:${member2Id}), I've uploaded the @[Commercial Loan Application Packet.pdf](doc:${loanAppId}) - can you review and let me know if we're missing anything?`,
        loanAppId ? [loanAppId] : []
      );

      await createChatMessage(
        partialThread.id,
        member2Id,
        `I'll review it today. From what I can see, we'll need the construction budget, equity commitment letter, and maybe some contractor references. @[Cody Field](user:${advisorUserId}), what's typical for construction loans in this market?`,
        []
      );

      await createChatMessage(
        partialThread.id,
        advisorUserId,
        `For construction loans, lenders typically want 25-30% equity, contractor financials, and a detailed construction budget. @[Param Vora](user:${borrowerUserId}), what's our target LTC?`,
        []
      );

      await createChatMessage(
        partialThread.id,
        borrowerUserId,
        `We're targeting 75% LTC. Total project cost is around $10M, so we're looking for about $7.5M in financing.`,
        []
      );

      await createChatMessage(
        partialThread.id,
        advisorUserId,
        `That's reasonable. @[Sarthak Karandikar](user:${member2Id}), once you've reviewed the application packet, let's schedule a call to discuss the lender strategy. I have a few construction lenders who specialize in industrial properties.`,
        []
      );

      await createChatMessage(
        partialThread.id,
        member2Id,
        `Sounds good. I'll have my review notes ready by tomorrow. Thanks for the context, @[Cody Field](user:${advisorUserId})!`,
        []
      );
    }

    // Summary
    console.log('\n✅ Demo data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Advisor: ${advisorEmail} (password: ${advisorPassword})`);
    console.log(`   Borrower: ${borrowerEmail} (password: ${borrowerPassword})`);
    console.log(`   Owner 2: ${owner2Email} (password: ${owner2Password})`);
    console.log(`   Member 1: ${member1Email} (password: ${member1Password}) - ${completeProjectResume.projectName}`);
    console.log(`   Member 2: ${member2Email} (password: ${member2Password}) - ${partialProjectResume.projectName}`);
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



