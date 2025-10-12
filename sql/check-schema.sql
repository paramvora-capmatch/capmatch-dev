-- Check if RBAC tables exist in local Supabase
-- Run this in Supabase Studio SQL editor

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('borrower_entities', 'borrower_entity_members', 'document_permissions');

-- Check if columns were added to existing tables
SELECT column_name, table_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('borrowers', 'projects', 'profiles')
AND column_name IN ('entity_id', 'master_profile_id', 'last_synced_at', 'custom_fields', 'active_entity_id');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('borrower_entities', 'borrower_entity_members', 'document_permissions');
