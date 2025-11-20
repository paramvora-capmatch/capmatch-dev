-- =============================================================================
-- Migration: Update chat_thread_participants RLS to allow viewing all participants
-- =============================================================================
-- 
-- This migration updates the RLS policy on chat_thread_participants to allow
-- users to see all participants in threads they are part of, not just their own
-- membership record. This enables direct queries from the frontend and simplifies
-- the participant loading logic.
--
-- Note: Profiles RLS remains unchanged - users can still only see their own
-- profile, so profile data must be fetched via the get-user-data edge function.

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view their chat memberships" ON public.chat_thread_participants;

-- Helper function to check if user is participant (bypasses RLS to avoid recursion)
-- This is needed because chat_threads RLS queries chat_thread_participants,
-- which would otherwise cause infinite recursion
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_thread_participant IS 
'Checks if a user is a participant in a thread. Uses SECURITY DEFINER to bypass RLS and avoid recursion when used in RLS policies.';

-- Create new policy using the helper function
CREATE POLICY "Users can view participants in their threads" ON public.chat_thread_participants
FOR SELECT USING (
  -- Allow if this is the user's own record (needed for chat_threads RLS subquery)
  user_id = auth.uid()
  OR
  -- Allow if user is a participant in the same thread (uses SECURITY DEFINER to avoid recursion)
  public.is_thread_participant(thread_id, auth.uid())
);

COMMENT ON POLICY "Users can view participants in their threads" ON public.chat_thread_participants IS 
'Allows users to see all participants in threads where they are also participants. The first condition (user_id = auth.uid()) ensures chat_threads RLS subqueries work correctly. The second condition uses a SECURITY DEFINER function to avoid RLS recursion.';

