// Create test users with proper Supabase Auth
// Run this in your browser console or as a Node.js script

import { createClient } from '@supabase/supabase-js';

// Use your service role key for admin operations
const supabaseAdmin = createClient(
  'http://localhost:54321', // Your local Supabase URL
  'YOUR_SERVICE_ROLE_KEY' // Get this from: supabase status
);

async function createTestUsers() {
  console.log('Creating test users...');

  const testUsers = [
    {
      email: 'owner@test.com',
      password: 'password123',
      user_metadata: { name: 'John Owner' }
    },
    {
      email: 'member@test.com', 
      password: 'password123',
      user_metadata: { name: 'Jane Member' }
    },
    {
      email: 'advisor@test.com',
      password: 'password123', 
      user_metadata: { name: 'Advisor Smith' }
    }
  ];

  for (const user of testUsers) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: user.user_metadata
      });

      if (error) {
        console.error(`Error creating ${user.email}:`, error);
      } else {
        console.log(`✅ Created user: ${user.email} (${data.user.id})`);
      }
    } catch (err) {
      console.error(`Failed to create ${user.email}:`, err);
    }
  }
}

// Run the function
createTestUsers();
