-- Debug RLS policies and test queries
-- Run this in Supabase Studio SQL editor

-- Test 1: Check if we can query borrower_entities directly
SELECT * FROM borrower_entities LIMIT 5;

-- Test 2: Check if we can query borrowers table
SELECT id, full_legal_name, entity_id FROM borrowers LIMIT 5;

-- Test 3: Check current user context
SELECT auth.uid() as current_user_id;

-- Test 4: Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('borrower_entities', 'borrower_entity_members', 'document_permissions', 'borrowers', 'projects', 'profiles');

-- Test 5: Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('borrower_entities', 'borrower_entity_members', 'document_permissions', 'borrowers', 'projects', 'profiles');
