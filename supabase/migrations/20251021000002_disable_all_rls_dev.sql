-- =============================================================================
-- DEV ONLY: Disable All RLS (Keep Policies for Later Re-enablement)
-- =============================================================================
-- 
-- WARNING: This migration disables Row Level Security on all tables.
-- This should ONLY be used in development environments.
-- DO NOT use in production or with sensitive data.
--
-- Policies are preserved so they can be re-enabled later.

-- Step 1: Disable RLS on all public tables (policies remain intact)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access_grants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions DISABLE ROW LEVEL SECURITY;

-- Step 2: Create permissive policies on storage tables (can't disable RLS on managed tables)
DROP POLICY IF EXISTS "Unified storage access policy" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to folders they can edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files they can edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files they can edit" ON storage.objects;

CREATE POLICY "Dev: Allow all storage operations for authenticated users" ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Create permissive policy on storage.buckets
DROP POLICY IF EXISTS "Enable all actions for storage flow on buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Enable all actions for authenticated users on buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Enable access to all authenticated users" ON storage.buckets;
DROP POLICY IF EXISTS "allow_upload_%" ON storage.buckets;
DROP POLICY IF EXISTS "allow_select_%" ON storage.buckets;
DROP POLICY IF EXISTS "allow_update_%" ON storage.buckets;
DROP POLICY IF EXISTS "allow_delete_%" ON storage.buckets;
DROP POLICY IF EXISTS "allow_bucket_%" ON storage.buckets;

CREATE POLICY "Dev: Allow all bucket operations for authenticated users" ON storage.buckets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 4: Drop authorization triggers (no longer needed without RLS enforcement)
DROP TRIGGER IF EXISTS validate_resource_insert_trigger ON public.resources;
DROP TRIGGER IF EXISTS validate_resource_update_trigger ON public.resources;
DROP TRIGGER IF EXISTS validate_resource_delete_trigger ON public.resources;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.validate_resource_insert();
DROP FUNCTION IF EXISTS public.validate_resource_update();
DROP FUNCTION IF EXISTS public.validate_resource_delete();

-- Step 5: Comments for clarity
COMMENT ON TABLE public.profiles IS 'RLS DISABLED - Dev environment only. Policies preserved for later re-enablement.';
COMMENT ON TABLE public.resources IS 'RLS DISABLED - Dev environment only. Policies preserved for later re-enablement.';
COMMENT ON TABLE public.permissions IS 'RLS DISABLED - Dev environment only. Policies preserved for later re-enablement.';