-- =============================================================================
-- Migration: Ensure RLS Enabled on All Tables
-- =============================================================================
--
-- This migration ensures that Row Level Security is enabled on all tables.
-- It also removes any dev-permissive storage policies.
--

-- Step 1: Ensure RLS is enabled on all public tables (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Step 2: Remove any dev-permissive storage policies if they exist
DROP POLICY IF EXISTS "Dev: Allow all storage operations for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Dev: Allow all bucket operations for authenticated users" ON storage.buckets;

-- Step 3: Preserve resource authorization triggers and functions (no drops here)

-- Step 4: Add clarifying comments
COMMENT ON TABLE public.profiles IS 'RLS ENABLED';
COMMENT ON TABLE public.resources IS 'RLS ENABLED';
COMMENT ON TABLE public.permissions IS 'RLS ENABLED';