#!/usr/bin/env ts-node
/**
 * Script to grant lender org access to a project
 * 
 * Usage:
 *   npm run grant-lender-access <lender_org_id> <project_id>
 * 
 * Example:
 *   npm run grant-lender-access aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa d231b8bc-2239-4365-87a1-dc67bd795604
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function grantLenderAccess(lenderOrgId: string, projectId: string) {
  console.log(`\n🔑 Granting lender access...`);
  console.log(`   Lender Org ID: ${lenderOrgId}`);
  console.log(`   Project ID: ${projectId}`);

  try {
    // Verify lender org exists
    const { data: lenderOrg, error: lenderOrgError } = await supabaseAdmin
      .from('orgs')
      .select('id, name, entity_type')
      .eq('id', lenderOrgId)
      .single();

    if (lenderOrgError || !lenderOrg) {
      throw new Error(`Lender org not found: ${lenderOrgId}`);
    }

    if (lenderOrg.entity_type !== 'lender') {
      throw new Error(`Org ${lenderOrgId} is not a lender org (type: ${lenderOrg.entity_type})`);
    }

    console.log(`   ✓ Lender org found: ${lenderOrg.name}`);

    // Verify project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name, owner_org_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    console.log(`   ✓ Project found: ${project.name}`);

    // Get the granting user (use service role for now, or could be a specific admin user)
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    const grantedBy = user?.id || '00000000-0000-0000-0000-000000000000'; // Fallback to system user

    // Call the RPC function to grant access
    const { data, error } = await supabaseAdmin.rpc('grant_lender_project_access', {
      p_lender_org_id: lenderOrgId,
      p_project_id: projectId,
      p_granted_by: grantedBy,
    });

    if (error) {
      throw error;
    }

    console.log(`\n✅ Success! Lender access granted.`);
    console.log(`   Access ID: ${data}`);
    console.log(`\nLender "${lenderOrg.name}" can now access project "${project.name}"`);

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  }
}

async function revokeLenderAccess(lenderOrgId: string, projectId: string) {
  console.log(`\n🔒 Revoking lender access...`);
  console.log(`   Lender Org ID: ${lenderOrgId}`);
  console.log(`   Project ID: ${projectId}`);

  try {
    // Call the RPC function to revoke access
    const { data, error } = await supabaseAdmin.rpc('revoke_lender_project_access', {
      p_lender_org_id: lenderOrgId,
      p_project_id: projectId,
    });

    if (error) {
      throw error;
    }

    if (data) {
      console.log(`\n✅ Success! Lender access revoked.`);
    } else {
      console.log(`\n⚠️  No access grant found to revoke.`);
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  }
}

async function listLenderAccess(lenderOrgId?: string) {
  console.log(`\n📋 Listing lender project access...`);

  try {
    let query = supabaseAdmin
      .from('lender_project_access')
      .select(`
        id,
        lender_org_id,
        project_id,
        granted_by,
        created_at,
        orgs:lender_org_id (name, entity_type),
        projects:project_id (name)
      `);

    if (lenderOrgId) {
      query = query.eq('lender_org_id', lenderOrgId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('\n   No lender access grants found.');
      return;
    }

    console.log(`\n   Found ${data.length} access grant(s):\n`);
    data.forEach((access: any) => {
      console.log(`   • Lender: ${access.orgs?.name || access.lender_org_id}`);
      console.log(`     Project: ${access.projects?.name || access.project_id}`);
      console.log(`     Granted: ${new Date(access.created_at).toLocaleDateString()}`);
      console.log(`     Access ID: ${access.id}\n`);
    });

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'grant' || !command) {
    const lenderOrgId = args[1];
    const projectId = args[2];

    if (!lenderOrgId || !projectId) {
      console.error('\n❌ Usage: npm run grant-lender-access grant <lender_org_id> <project_id>');
      process.exit(1);
    }

    await grantLenderAccess(lenderOrgId, projectId);
  } else if (command === 'revoke') {
    const lenderOrgId = args[1];
    const projectId = args[2];

    if (!lenderOrgId || !projectId) {
      console.error('\n❌ Usage: npm run grant-lender-access revoke <lender_org_id> <project_id>');
      process.exit(1);
    }

    await revokeLenderAccess(lenderOrgId, projectId);
  } else if (command === 'list') {
    const lenderOrgId = args[1]; // Optional
    await listLenderAccess(lenderOrgId);
  } else {
    console.error('\n❌ Unknown command. Use: grant, revoke, or list');
    console.log('\nExamples:');
    console.log('  npm run grant-lender-access grant <lender_org_id> <project_id>');
    console.log('  npm run grant-lender-access revoke <lender_org_id> <project_id>');
    console.log('  npm run grant-lender-access list [lender_org_id]');
    process.exit(1);
  }
}

main();
