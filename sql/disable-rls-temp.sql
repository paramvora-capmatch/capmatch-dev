-- Temporarily disable RLS for debugging
-- Run this in Supabase Studio SQL editor

-- Disable RLS on new tables
ALTER TABLE borrower_entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_entity_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions DISABLE ROW LEVEL SECURITY;

-- Test queries should work now
SELECT 'Testing borrower_entities' as test;
SELECT * FROM borrower_entities LIMIT 1;

SELECT 'Testing borrower_entity_members' as test;
SELECT * FROM borrower_entity_members LIMIT 1;

SELECT 'Testing document_permissions' as test;
SELECT * FROM document_permissions LIMIT 1;
