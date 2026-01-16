-- =============================================================================
-- Migration: Fix Chat RLS Recursion (Lender Access)
-- Date: 2026-02-10
-- =============================================================================
--
-- This migration fixes an infinite recursion issue in RLS policies caused by
-- the interaction between 'chat_threads' and 'chat_thread_participants'.
--
-- The Cycle:
-- 1. querying chat_threads -> checks if user is participant (queries chat_thread_participants)
-- 2. querying chat_thread_participants -> checks if user is a lender (queries chat_threads to get project_id)
-- 3. querying chat_threads -> ... RECURSION ...
--
-- The Fix:
-- We create a SECURITY DEFINER helper function to fetch the project_id of a thread
-- WITHOUT triggering RLS on the chat_threads table.
-- =============================================================================
-- 1. Create Safe Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_thread_project_id_safe(p_thread_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT project_id 
        FROM public.chat_threads 
        WHERE id = p_thread_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
COMMENT ON FUNCTION public.get_thread_project_id_safe IS 
'Returns project_id for a thread. SECURITY DEFINER bypasses RLS to prevent recursion when used in chat_thread_participants policies.';
-- 2. Update the Lender Policy on chat_thread_participants
--    We replace the direct query to chat_threads with our safe helper.
DROP POLICY IF EXISTS "Lenders can view thread participants" ON public.chat_thread_participants;
CREATE POLICY "Lenders can view thread participants" ON public.chat_thread_participants
    FOR SELECT
    USING (
        public.is_lender_with_project_access(
            (select auth.uid()), 
            public.get_thread_project_id_safe(thread_id)
        )
    );
COMMENT ON POLICY "Lenders can view thread participants" ON public.chat_thread_participants IS 
'Lenders can see participants if they have access to the project. Uses safe helper to avoid RLS recursion.';
-- Also fix the INSERT policy just in case, though less likely to recurse on SELECT
DROP POLICY IF EXISTS "Lenders can join chat threads for granted projects" ON public.chat_thread_participants;
CREATE POLICY "Lenders can join chat threads for granted projects" ON public.chat_thread_participants
    FOR INSERT
    WITH CHECK (
        user_id = (select auth.uid())
        AND
        public.is_lender_with_project_access(
            (select auth.uid()), 
            public.get_thread_project_id_safe(thread_id)
        )
    );
