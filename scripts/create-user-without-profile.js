/**
 * Script to create a user in Supabase Auth WITHOUT creating a profile
 * This is used to test the onboarding flow for existing authenticated users
 * 
 * Usage:
 * 1. Update SUPABASE_URL and SERVICE_ROLE_KEY below
 * 2. Run: node scripts/create-user-without-profile.js
 * 3. Sign in with the created user to trigger onboarding
 */

import { createClient } from '@supabase/supabase-js';

// Update these values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserWithoutProfile() {
  const testEmail = `test-no-profile-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  const testFullName = 'Test User Without Profile';

  console.log('Creating user in Supabase Auth without profile...');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);

  try {
    // Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: testFullName,
        full_name: testFullName
      }
    });

    if (authError) {
      console.error('❌ Error creating user in Auth:', authError);
      return;
    }

    if (!authData.user) {
      console.error('❌ User not created');
      return;
    }

    console.log('✅ User created in Auth:');
    console.log('  - ID:', authData.user.id);
    console.log('  - Email:', authData.user.email);
    console.log('  - Profile: NOT CREATED (this is intentional)');
    console.log('\n📋 Next steps:');
    console.log('1. Sign in with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('2. Watch the Network tab for POST /users/onboard-borrower');
    console.log('3. Check that profile is created automatically');

    // Verify no profile exists
    const { data: profileCheck } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileCheck) {
      console.warn('⚠️  WARNING: Profile already exists for this user!');
      console.log('   This means onboarding won\'t trigger automatically.');
      console.log('   Delete the profile to test onboarding:');
      console.log(`   DELETE FROM profiles WHERE id = '${authData.user.id}';`);
    } else {
      console.log('✅ Confirmed: No profile exists (ready for testing)');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createUserWithoutProfile();

