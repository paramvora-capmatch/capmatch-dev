#!/usr/bin/env tsx
/**
 * Script to seed lender test data
 * 
 * Creates:
 * - Lender user: lender@example.com / password
 * - Lender team member: lender.analyst@example.com / password
 * - Lender org: Capital Lending Group
 * - Access grant to first available project
 * 
 * Usage:
 *   npm run seed:lender
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nSet it in your .env.local file or run:');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedLender() {
  console.log('\n🌱 Seeding lender test data...\n');

  try {
    // 1. Create lender organization
    console.log('📋 Step 1: Creating lender organization...');
    const lenderOrgId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    
    const { data: existingOrg } = await supabaseAdmin
      .from('orgs')
      .select('id, name')
      .eq('id', lenderOrgId)
      .maybeSingle();

    if (existingOrg) {
      console.log(`   ✓ Lender org already exists: ${existingOrg.name}`);
    } else {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('orgs')
        .insert({
          id: lenderOrgId,
          name: 'Capital Lending Group',
          entity_type: 'lender',
        })
        .select()
        .single();

      if (orgError) throw orgError;
      console.log(`   ✓ Created lender org: ${org.name} (${org.id})`);
    }

    // 2. Create lender owner user
    console.log('\n📋 Step 2: Creating lender owner user...');
    const lenderEmail = 'lender@example.com';
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', lenderEmail)
      .maybeSingle();

    let lenderUserId: string;

    if (existingUser) {
      console.log(`   ✓ Lender user already exists: ${existingUser.email}`);
      lenderUserId = existingUser.id;
    } else {
      // Create in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: lenderEmail,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          full_name: 'Capital Lending Group',
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user in auth');

      lenderUserId = authData.user.id;
      console.log(`   ✓ Created auth user: ${lenderEmail}`);

      // Create profile
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: lenderUserId,
        email: lenderEmail,
        full_name: 'Capital Lending Group',
        app_role: 'lender',
        active_org_id: lenderOrgId,
      });

      if (profileError) throw profileError;
      console.log(`   ✓ Created profile for ${lenderEmail}`);
    }

    // 3. Add user to org as owner
    const { data: existingMembership } = await supabaseAdmin
      .from('org_members')
      .select('*')
      .eq('org_id', lenderOrgId)
      .eq('user_id', lenderUserId)
      .maybeSingle();

    if (!existingMembership) {
      const { error: memberError } = await supabaseAdmin.from('org_members').insert({
        org_id: lenderOrgId,
        user_id: lenderUserId,
        role: 'owner',
      });

      if (memberError) throw memberError;
      console.log(`   ✓ Added user to org as owner`);
    } else {
      console.log(`   ✓ User already member of org`);
    }

    // 4. Create lender team member (optional)
    console.log('\n📋 Step 3: Creating lender team member...');
    const analystEmail = 'lender.analyst@example.com';
    
    const { data: existingAnalyst } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', analystEmail)
      .maybeSingle();

    let analystUserId: string;

    if (existingAnalyst) {
      console.log(`   ✓ Team member already exists: ${analystEmail}`);
      analystUserId = existingAnalyst.id;
    } else {
      const { data: analystAuth, error: analystAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: analystEmail,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          full_name: 'Sarah Analyst',
        },
      });

      if (analystAuthError) throw analystAuthError;
      analystUserId = analystAuth.user!.id;

      const { error: analystProfileError } = await supabaseAdmin.from('profiles').insert({
        id: analystUserId,
        email: analystEmail,
        full_name: 'Sarah Analyst',
        app_role: 'lender',
        active_org_id: lenderOrgId,
      });

      if (analystProfileError) throw analystProfileError;

      const { error: analystMemberError } = await supabaseAdmin.from('org_members').insert({
        org_id: lenderOrgId,
        user_id: analystUserId,
        role: 'member',
      });

      if (analystMemberError) throw analystMemberError;
      console.log(`   ✓ Created team member: ${analystEmail}`);
    }

    // 5. Grant access to a project
    console.log('\n📋 Step 4: Granting access to demo project...');
    
    // Find first available project
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .limit(1);

    if (projectsError) throw projectsError;

    if (!projects || projects.length === 0) {
      console.log('   ⚠️  No projects found - skipping access grant');
      console.log('   💡 Create a project first, then run:');
      console.log(`      npm run lender:grant grant ${lenderOrgId} <project_id>`);
    } else {
      const projectId = projects[0].id;
      const projectName = projects[0].name;

      // Check if access already granted
      const { data: existingAccess } = await supabaseAdmin
        .from('lender_project_access')
        .select('id')
        .eq('lender_org_id', lenderOrgId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (existingAccess) {
        console.log(`   ✓ Access already granted to project: ${projectName}`);
      } else {
        // Use RPC function to grant access
        const { data: accessId, error: grantError } = await supabaseAdmin.rpc(
          'grant_lender_project_access',
          {
            p_lender_org_id: lenderOrgId,
            p_project_id: projectId,
            p_granted_by: lenderUserId,
          }
        );

        if (grantError) {
          console.error('   ❌ Error granting access:', grantError);
          throw grantError;
        }

        console.log(`   ✓ Granted access to project: ${projectName} (${projectId})`);
        console.log(`   ✓ Access grant ID: ${accessId}`);
      }
    }

    // Summary
    console.log('\n✅ Lender seeding complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Test Credentials:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Lender Owner:');
    console.log(`    Email:    ${lenderEmail}`);
    console.log('    Password: password');
    console.log('    Org:      Capital Lending Group');
    console.log('');
    console.log('  Lender Team Member:');
    console.log(`    Email:    ${analystEmail}`);
    console.log('    Password: password');
    console.log('    Org:      Capital Lending Group');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Login at http://localhost:3000/login');
    console.log('  2. Use credentials above');
    console.log('  3. You should land on /lender/dashboard');
    console.log('');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedLender();
