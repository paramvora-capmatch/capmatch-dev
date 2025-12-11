-- Fix participant visibility so invitees can see other invitees

-- Create a security definer function to check if user is a participant
-- This bypasses RLS on meeting_participants table to avoid recursion
CREATE OR REPLACE FUNCTION is_meeting_participant(lookup_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM meeting_participants
    WHERE meeting_id = lookup_meeting_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view meeting participants" ON meeting_participants;

-- Re-create policy to allow viewing all participants if you are part of the meeting
CREATE POLICY "Users can view meeting participants"
  ON meeting_participants FOR SELECT
  USING (
    is_meeting_organizer(meeting_id)
    OR is_meeting_participant(meeting_id)
  );
