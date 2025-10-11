-- Create test users properly for Supabase Auth
-- This script creates users through the auth.users table with proper password hashing

-- First, let's check if users already exist
SELECT id, email FROM auth.users WHERE email IN ('owner@test.com', 'member@test.com', 'advisor@test.com');

-- If no users exist, we need to create them properly
-- Note: You'll need to run this through Supabase Studio or use the Supabase Auth API

-- Alternative: Use the Supabase Auth Admin API to create users
-- This is the proper way to create users with passwords

-- For now, let's create a simple script to check what we have
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users 
WHERE email IN ('owner@test.com', 'member@test.com', 'advisor@test.com')

UNION ALL

SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles 
WHERE email IN ('owner@test.com', 'member@test.com', 'advisor@test.com')

UNION ALL

SELECT 
  'borrowers' as table_name,
  COUNT(*) as count
FROM borrowers 
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
