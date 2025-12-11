// scripts/seed-sogood-blank.ts
// Seed a "blank" SoGood Apartments project:
// - Same advisor, borrower, team members as Hoque seed
// - Seeds project + borrower resumes and OM
// - DOES NOT seed documents, images, chat messages, etc.
// Run with: npx tsx scripts/seed-sogood-blank.ts [--prod]

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isProduction = args.includes('--prod') || args.includes('--production');

// Load environment variables based on mode
if (isProduction) {
  console.log('🌐 Production mode enabled\n');
  // Load production env file first (highest priority)
  config({ path: resolve(process.cwd(), '.env.production') });
  // Also load .env.local and .env as fallbacks
  config({ path: resolve(process.cwd(), '.env.local') });
  config({ path: resolve(process.cwd(), '.env') });

  // Warn if production env file doesn't exist
  const prodEnvPath = resolve(process.cwd(), '.env.production');
  if (!require('fs').existsSync(prodEnvPath)) {
    console.warn('⚠️  WARNING: .env.production file not found!');
    console.warn('   Create .env.production with production credentials.');
    console.warn('   See README-seed-hoque.md for template.\n');
  }

  // Additional production warnings
  console.log('⚠️  WARNING: This will create real users and data in PRODUCTION!');
  console.log('⚠️  Make sure you have backups before proceeding.\n');
} else {
  // Local development mode
  config({ path: resolve(process.cwd(), '.env.local') });
  config({ path: resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!supabaseUrl) {
  const envFile = isProduction ? '.env.production' : '.env.local';
  console.error('\n❌ Missing SUPABASE_URL environment variable');
  console.error(`   Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in ${envFile}`);
  process.exit(1);
}

if (!serviceRoleKey) {
  const envFile = isProduction ? '.env.production' : '.env.local';
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error(`   Please add SUPABASE_SERVICE_ROLE_KEY to ${envFile}`);
  process.exit(1);
}

// Additional validation for production
if (isProduction) {
  // Validate that we're not accidentally using localhost in production
  if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    console.error('\n❌ ERROR: Production mode detected but Supabase URL is localhost!');
    console.error(`   Current URL: ${supabaseUrl}`);
    console.error('   Production URLs should start with https://');
    process.exit(1);
  }

  if (!supabaseUrl.startsWith('https://')) {
    console.error('\n❌ ERROR: Production Supabase URL must start with https://');
    console.error(`   Current URL: ${supabaseUrl}`);
    process.exit(1);
  }
}

// Initialize Supabase client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// CONSTANTS
// ============================================================================

const HOQUE_PROJECT_NAME = 'SoGood Apartments 2';

// ============================================================================
// ACCOUNT + ORG HELPERS (copied from Hoque seed, minus docs/chat/images usage)
// ============================================================================

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
  fullName: string,
  retries = 3
): Promise<OnboardResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[onboard-borrower] Retry attempt ${attempt}/${retries} for ${email}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      } else {
        console.log(`[onboard-borrower] Calling edge function for ${email}...`);
      }

      const { data, error } = await supabaseAdmin.functions.invoke('onboard-borrower', {
        body: { email, password, full_name: fullName },
      });

      if (error) {
        let actualErrorMessage = (error as any).message || String(error);

        const isRetryable =
          (error as any).status === 502 ||
          (error as any).status === 503 ||
          (error as any).status === 504 ||
          (error as any).name === 'AuthRetryableFetchError' ||
          actualErrorMessage.includes('502') ||
          actualErrorMessage.includes('503') ||
          actualErrorMessage.includes('504');

        if (isRetryable && attempt < retries) {
          console.warn(`[onboard-borrower] Retryable error for ${email} (attempt ${attempt}): ${actualErrorMessage}`);
          continue;
        }

        if (data) {
          if (typeof data === 'object' && 'error' in data) {
            const dataError = (data as any).error;
            return { error: typeof dataError === 'string' ? dataError : JSON.stringify(dataError) };
          }
        }

        return { error: actualErrorMessage };
      }

      if (data && typeof data === 'object') {
        if ('error' in data) {
          const responseError = (data as any).error;
          return {
            error: typeof responseError === 'string' ? responseError : JSON.stringify(responseError),
          };
        }

        if ('user' in data) {
          return data as OnboardResponse;
        }
      }

      return data as OnboardResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isRetryable =
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('AuthRetryableFetchError') ||
        errorMessage.includes('fetch');

      if (isRetryable && attempt < retries) {
        console.warn(`[onboard-borrower] Retryable exception for ${email} (attempt ${attempt}): ${errorMessage}`);
        continue;
      }

      console.error(`[onboard-borrower] Exception for ${email}:`, err);
      return { error: errorMessage };
    }
  }

  return { error: `Failed after ${retries} attempts` };
}

async function createAdvisorAccount(): Promise<{ userId: string; orgId: string } | null> {
  console.log('[seed-blank] Setting up advisor account (Cody Field)...');

  const advisorEmail = 'cody.field@capmatch.com';
  const advisorPassword = 'password';
  const advisorName = 'Cody Field';

  // Check if advisor already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, active_org_id')
    .eq('email', advisorEmail)
    .maybeSingle();

  let advisorUserId: string;
  let advisorOrgId: string | null = null;

  if (existingProfile) {
    console.log(`[seed-blank] Advisor already exists: ${advisorEmail} (${existingProfile.id})`);
    advisorUserId = existingProfile.id;
    advisorOrgId = existingProfile.active_org_id;
  } else {
    const advisorResult = await callOnboardBorrower(advisorEmail, advisorPassword, advisorName);
    if (advisorResult.error || !advisorResult.user) {
      console.error(`[seed-blank] ❌ Failed to create advisor: ${advisorResult.error}`);
      return null;
    }
    advisorUserId = advisorResult.user.id;

    await supabaseAdmin.from('profiles').update({ app_role: 'advisor' }).eq('id', advisorUserId);

    console.log(`[seed-blank] ✅ Created advisor: ${advisorEmail} (${advisorUserId})`);
  }

  // Create or get advisor org
  const { data: existingOrg } = await supabaseAdmin
    .from('orgs')
    .select('id')
    .eq('entity_type', 'advisor')
    .limit(1)
    .maybeSingle();

  if (existingOrg) {
    advisorOrgId = existingOrg.id;
    console.log('[seed-blank] Advisor org already exists, using existing:', advisorOrgId);
  } else {
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('orgs')
      .insert({
        name: 'CapMatch Advisors',
        entity_type: 'advisor',
      })
      .select()
      .single();

    if (orgError) {
      console.error('[seed-blank] Failed to create advisor org:', orgError);
      return null;
    }

    advisorOrgId = orgData.id;
    console.log('[seed-blank] ✅ Created advisor org:', advisorOrgId);
  }

  // Add advisor to org as owner
  await supabaseAdmin
    .from('org_members')
    .upsert(
      {
        org_id: advisorOrgId,
        user_id: advisorUserId,
        role: 'owner',
      },
      { onConflict: 'org_id,user_id' }
    );

  // Update profile with active org
  await supabaseAdmin.from('profiles').update({ active_org_id: advisorOrgId }).eq('id', advisorUserId);

  console.log('[seed-blank] ✅ Advisor account setup complete');
  if (!advisorOrgId) {
    console.error('[seed-blank] ❌ Advisor org ID is null');
    return null;
  }
  return { userId: advisorUserId, orgId: advisorOrgId };
}

/**
 * Get or create the borrower account (param.vora@capmatch.com)
 * This account is shared between the Hoque seed script and the demo seed script.
 */
async function getOrCreateDemoBorrowerAccount(): Promise<{ userId: string; orgId: string } | null> {
  console.log('[seed-blank] Getting or creating borrower account (param.vora@capmatch.com)...');
  console.log('[seed-blank] Note: This account is shared with seed-demo-data.ts and Hoque seed');

  const borrowerEmail = 'param.vora@capmatch.com';
  const borrowerPassword = 'password';
  const borrowerName = 'Param Vora';

  // Check if borrower already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, active_org_id')
    .eq('email', borrowerEmail)
    .maybeSingle();

  let borrowerUserId: string;
  let borrowerOrgId: string | null = null;

  if (existingProfile) {
    console.log(`[seed-blank] Borrower already exists: ${borrowerEmail} (${existingProfile.id})`);
    borrowerUserId = existingProfile.id;
    borrowerOrgId = existingProfile.active_org_id;

    if (!borrowerOrgId) {
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
      console.error(`[seed-blank] ❌ Failed to create borrower: ${borrowerResult.error}`);
      return null;
    }
    borrowerUserId = borrowerResult.user.id;

    const { data: borrowerProfile } = await supabaseAdmin
      .from('profiles')
      .select('active_org_id')
      .eq('id', borrowerUserId)
      .single();

    if (!borrowerProfile?.active_org_id) {
      console.error('[seed-blank] ❌ Borrower org not found after onboarding');
      return null;
    }

    borrowerOrgId = borrowerProfile.active_org_id;
    console.log(`[seed-blank] ✅ Created borrower: ${borrowerEmail} (${borrowerUserId})`);
    console.log(`[seed-blank] ✅ Borrower org: ${borrowerOrgId}`);
  }

  if (!borrowerOrgId) {
    console.error('[seed-blank] ❌ Borrower org ID is null');
    return null;
  }

  return { userId: borrowerUserId, orgId: borrowerOrgId };
}

async function createMemberUser(
  email: string,
  password: string,
  fullName: string,
  orgId: string
): Promise<string | null> {
  console.log(`[seed-blank] Creating member user: ${email}...`);

  try {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      console.log(`[seed-blank] Member already exists: ${email} (${existingProfile.id})`);
      userId = existingProfile.id;
    } else {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authUser.user) {
        console.error(`[seed-blank] Failed to create member user:`, authError);
        return null;
      }

      userId = authUser.user.id;

      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        email,
        full_name: fullName,
        app_role: 'borrower',
        active_org_id: orgId,
      });

      if (profileError) {
        console.error(`[seed-blank] Failed to create member profile:`, profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return null;
      }

      console.log(`[seed-blank] ✅ Created member user: ${email} (${userId})`);
    }

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
      console.error(`[seed-blank] Failed to add member to org:`, memberError);
      return null;
    }

    await supabaseAdmin.from('profiles').update({ active_org_id: orgId }).eq('id', userId);

    console.log(`[seed-blank] ✅ Member user setup complete: ${email}`);
    return userId;
  } catch (err) {
    console.error(`[seed-blank] Exception creating member user ${email}:`, err);
    return null;
  }
}

async function grantMemberProjectAccess(
  projectId: string,
  memberId: string,
  grantedById: string
): Promise<boolean> {
  console.log(
    `[seed-blank] Granting project access to member: ${memberId} for project: ${projectId} (no docs/chat seeded)...`
  );

  try {
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
      console.error(`[seed-blank] Failed to grant project access:`, grantError);
      return false;
    }

    console.log(`[seed-blank] ✅ Granted project access to member`);
    return true;
  } catch (err) {
    console.error(`[seed-blank] Exception granting project access:`, err);
    return false;
  }
}

// ============================================================================
// MAIN SEEDING HELPERS (project only, no resumes, OM, docs, images, chat messages)
// ============================================================================

async function createProject(
  ownerOrgId: string,
  projectName: string,
  assignedAdvisorId: string | null,
  creatorId: string
): Promise<string | null> {
  console.log(`[seed-blank] Creating project: ${projectName} (blank)...`);

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
      console.error(`[seed-blank] Failed to create project record:`, projectError);
      return null;
    }

    const projectId = project.id;
    console.log(`[seed-blank] ✅ Created project record: ${projectId}`);

    // 2. Create empty project resume row (no actual content seeded; UI can create versions)
    const { error: resumeError } = await supabaseAdmin.from('project_resumes').insert({
      project_id: projectId,
      content: {},
    });

    if (resumeError) {
      console.error(`[seed-blank] Failed to create project resume:`, resumeError);
      await supabaseAdmin.from('projects').delete().eq('id', projectId);
      return null;
    }

    // 3. Create PROJECT_RESUME and PROJECT_DOCS_ROOT resources (no actual docs or resume versions uploaded)
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
      console.error(`[seed-blank] Failed to create PROJECT_RESUME resource:`, resumeResourceError);
    }

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
      console.error(`[seed-blank] Failed to create PROJECT_DOCS_ROOT resource:`, docsRootError);
    }

    // 4. Ensure borrower root resources
    const { error: borrowerRootError } = await supabaseAdmin.rpc('ensure_project_borrower_roots', {
      p_project_id: projectId,
    });

    if (borrowerRootError) {
      console.warn(
        `[seed-blank] Warning: Failed to ensure borrower root resources (no borrower docs will be seeded anyway):`,
        borrowerRootError.message
      );
    }

    // 5. Grant creator access
    const { error: grantError } = await supabaseAdmin.from('project_access_grants').insert({
      project_id: projectId,
      org_id: ownerOrgId,
      user_id: creatorId,
      granted_by: creatorId,
    });

    if (grantError) {
      console.warn(`[seed-blank] Warning: Failed to grant project access:`, grantError.message);
    }

    // 6. Grant permissions on resources
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

    // 7. Create default chat thread with participants only (no messages seeded)
    const { data: chatThread, error: chatThreadError } = await supabaseAdmin
      .from('chat_threads')
      .insert({
        project_id: projectId,
        topic: 'General',
      })
      .select()
      .single();

    if (!chatThreadError && chatThread) {
      const participants = [{ thread_id: chatThread.id, user_id: creatorId }];
      if (assignedAdvisorId) {
        participants.push({ thread_id: chatThread.id, user_id: assignedAdvisorId });
      }
      await supabaseAdmin.from('chat_thread_participants').insert(participants);
    }

    console.log(`[seed-blank] ✅ Created blank project: ${projectName} (${projectId})`);
    return projectId;
  } catch (err) {
    console.error(`[seed-blank] Exception creating project ${projectName}:`, err);
    return null;
  }
}

async function seedTeamMembers(projectId: string, orgId: string, ownerId: string): Promise<string[]> {
  console.log(`[seed-blank] Seeding team members for SoGood Apartments (blank)...`);
  console.log(`[seed-blank] Note: Using same member accounts as seed-demo-data.ts and Hoque seed`);

  const memberEmails = [
    { email: 'aryan.jain@capmatch.com', name: 'Aryan Jain', role: 'Team Member' },
    { email: 'sarthak.karandikar@capmatch.com', name: 'Sarthak Karandikar', role: 'Team Member' },
    { email: 'kabeer.merchant@capmatch.com', name: 'Kabeer Merchant', role: 'Team Member' },
    { email: 'vatsal.hariramani@capmatch.com', name: 'Vatsal Hariramani', role: 'Team Member' },
  ];

  const memberIds: string[] = [];

  for (const member of memberEmails) {
    const userId = await createMemberUser(member.email, 'password', member.name, orgId);
    if (userId) {
      memberIds.push(userId);

      await grantMemberProjectAccess(projectId, userId, ownerId);

      // Add to General chat thread (no messages seeded)
      const { data: generalThread } = await supabaseAdmin
        .from('chat_threads')
        .select('id')
        .eq('project_id', projectId)
        .eq('topic', 'General')
        .maybeSingle();

      if (generalThread) {
        await supabaseAdmin
          .from('chat_thread_participants')
          .upsert({ thread_id: generalThread.id, user_id: userId }, { onConflict: 'thread_id,user_id' });
      }
    }
  }

  console.log(`[seed-blank] ✅ Seeded ${memberIds.length} team members`);
  return memberIds;
}

// ============================================================================
// MAIN SEED FUNCTION (blank SoGood project)
// ============================================================================

async function seedSoGoodBlankProject(): Promise<void> {
  console.log('🌱 Starting SoGood Apartments BLANK project seed...\n');
  console.log('📝 This script seeds:');
  console.log('   - Advisor and borrower accounts (shared with other seeds)');
  console.log('   - A new SoGood Apartments project');
  console.log('   - Team members and chat participants (no messages)');
  console.log('   - Team members and chat participants');
  console.log('   - NO resumes, NO OM, NO documents, NO images, NO chat messages\n');

  try {
    // Step 1: Create advisor account and org
    console.log('📋 Step 1: Creating advisor account (Cody Field)...');
    const advisorInfo = await createAdvisorAccount();
    if (!advisorInfo) {
      console.error('[seed-blank] ❌ Failed to create advisor account');
      return;
    }
    const { userId: advisorId } = advisorInfo;

    // Step 2: Get or create borrower account
    console.log('\n📋 Step 2: Getting/creating borrower account (param.vora@capmatch.com)...');
    const borrowerInfo = await getOrCreateDemoBorrowerAccount();
    if (!borrowerInfo) {
      console.error('[seed-blank] ❌ Failed to get/create borrower account');
      return;
    }
    const { userId: borrowerId, orgId: borrowerOrgId } = borrowerInfo;

    // Step 3: Create SoGood Apartments project (blank)
    console.log('\n📋 Step 3: Creating SoGood Apartments project (blank)...');
    const projectId = await createProject(borrowerOrgId, HOQUE_PROJECT_NAME, advisorId, borrowerId);

    if (!projectId) {
      console.error('[seed-blank] ❌ Failed to create project');
      return;
    }

    // Grant advisor permissions
    const { error: permError } = await supabaseAdmin.rpc('grant_advisor_project_permissions', {
      p_project_id: projectId,
      p_advisor_id: advisorId,
      p_granted_by_id: advisorId,
    });

    if (permError) {
      console.warn(`[seed-blank] Warning: Failed to grant advisor permissions:`, permError.message);
    }

    // Step 4: Seed team members (no resumes/OM/docs/images/chat messages)
    console.log('\n📋 Step 4: Seeding team members...');
    const memberIds = await seedTeamMembers(projectId, borrowerOrgId, borrowerId);

    // Summary
    console.log('\n✅ SoGood Apartments BLANK project seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Advisor: cody.field@capmatch.com (password: password)`);
    console.log(`   Project Owner: param.vora@capmatch.com (password: password)`);
    console.log(`   Project: ${HOQUE_PROJECT_NAME} (blank) (${projectId})`);
    console.log(`   Project Resume: ⛔ Not seeded (only empty row exists)`);
    console.log(`   Borrower Resume: ⛔ Not seeded`);
    console.log(`   OM Data: ⛔ Not seeded`);
    console.log(`   Team Members: ✅ ${memberIds.length} members`);
    console.log(`   Documents: ⛔ Not seeded`);
    console.log(`   Images: ⛔ Not seeded`);
    console.log(`   Chat Messages: ⛔ Not seeded (only participants added)`);
    console.log('\n🎉 The blank SoGood project is now ready for the Hoque deal team to work in!');
  } catch (error) {
    console.error('\n❌ Blank seed script failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// ============================================================================
// CLI ENTRYPOINT
// ============================================================================

async function main() {
  if (isProduction) {
    console.log('⚠️  PRODUCTION MODE DETECTED');
    console.log(`   Database: ${supabaseUrl}`);
    const key = serviceRoleKey!;
    console.log(`   Service Role Key: ${key.substring(0, 20)}...`);
    console.log('\n⚠️  This will create real users and data in PRODUCTION!');
    console.log('⚠️  Make sure you have backups before proceeding.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('Proceeding with production seed...\n');
  }

  await seedSoGoodBlankProject();
  console.log('\n✨ Done!');
  if (isProduction) {
    console.log('\n📝 Next steps:');
    console.log('   1. Change user passwords (default is "password")');
    console.log('   2. Verify data in Supabase Dashboard');
    console.log('   3. Test login with created accounts');
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedSoGoodBlankProject };


