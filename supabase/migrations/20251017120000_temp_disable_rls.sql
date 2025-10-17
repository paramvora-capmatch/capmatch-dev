-- =============================================================================
-- TEMPORARY MIGRATION TO DISABLE RLS FOR DEBUGGING
-- To re-enable RLS, delete this file and run `npx supabase db reset`
-- =============================================================================

ALTER TABLE public.orgs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
