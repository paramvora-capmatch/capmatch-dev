-- Fix: Restore participant visibility so all meeting participants can see each other.
-- The optimization migration 20261222000004 accidentally replaced
-- is_meeting_participant(meeting_id) with user_id = get_current_user_id(),
-- causing invitees to only see their own row instead of all participants.

-- Update is_meeting_participant to use the optimized get_current_user_id()
CREATE OR REPLACE FUNCTION public.is_meeting_participant(lookup_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := public.get_current_user_id();
  RETURN EXISTS (
    SELECT 1
    FROM public.meeting_participants
    WHERE meeting_id = lookup_meeting_id
    AND user_id = v_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.is_meeting_participant IS
'Checks if current user is a participant of a meeting. Uses get_current_user_id() for optimized performance. SECURITY DEFINER bypasses RLS to avoid recursion.';

-- Fix the SELECT policy to allow participants to see all other participants
DROP POLICY IF EXISTS "Users can view meeting participants" ON public.meeting_participants;
CREATE POLICY "Users can view meeting participants"
  ON public.meeting_participants FOR SELECT
  USING (
    public.is_meeting_organizer(meeting_id)
    OR public.is_meeting_participant(meeting_id)
  );
