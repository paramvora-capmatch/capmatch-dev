-- Debug script to check test user data
-- Run this in Supabase Studio SQL editor

-- Check if test users exist in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email IN ('owner@test.com', 'member@test.com', 'advisor@test.com');

-- Check if profiles exist and have correct roles
SELECT id, email, role, full_name, active_entity_id
FROM profiles 
WHERE email IN ('owner@test.com', 'member@test.com', 'advisor@test.com');

-- Check if borrowers exist
SELECT id, full_legal_name, entity_id
FROM borrowers 
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- Check if entities exist
SELECT id, name, created_by
FROM borrower_entities 
WHERE id IN ('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111115');

-- Check if memberships exist
SELECT id, entity_id, user_id, role, status
FROM borrower_entity_members 
WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
