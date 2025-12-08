-- Fix infinite recursion in RLS policies

-- Create a security definer function to check if user is organizer
-- This bypasses RLS on meetings table to avoid recursion
CREATE OR REPLACE FUNCTION is_meeting_organizer(lookup_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM meetings
    WHERE id = lookup_meeting_id
    AND organizer_id = auth.uid()
  );
END;
$$;

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view meeting participants" ON meeting_participants;
DROP POLICY IF EXISTS "Organizers can add participants" ON meeting_participants;
DROP POLICY IF EXISTS "Participants can update their response" ON meeting_participants;
DROP POLICY IF EXISTS "Organizers can remove participants" ON meeting_participants;

-- Re-create policies using the security definer function

-- Users can view participants of meetings they're part of
CREATE POLICY "Users can view meeting participants"
  ON meeting_participants FOR SELECT
  USING (
    is_meeting_organizer(meeting_id)
    OR user_id = auth.uid()
  );

-- Only organizers can add participants
CREATE POLICY "Organizers can add participants"
  ON meeting_participants FOR INSERT
  WITH CHECK (
    is_meeting_organizer(meeting_id)
  );

-- Participants can update their own response status
-- Organizers can also update (e.g. to fix mistakes)
CREATE POLICY "Participants can update their response"
  ON meeting_participants FOR UPDATE
  USING (
    user_id = auth.uid()
    OR is_meeting_organizer(meeting_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_meeting_organizer(meeting_id)
  );

-- Only organizers can remove participants
CREATE POLICY "Organizers can remove participants"
  ON meeting_participants FOR DELETE
  USING (
    is_meeting_organizer(meeting_id)
  );
