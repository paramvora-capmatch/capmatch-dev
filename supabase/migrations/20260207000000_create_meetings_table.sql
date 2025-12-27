-- Create meetings table for storing scheduled meetings
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location TEXT,
  meeting_link TEXT,

  -- Organizer info
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Project association (optional - meetings can be project-specific or general)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Meeting status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),

  -- Calendar provider event IDs (for syncing)
  calendar_event_ids JSONB DEFAULT '[]'::jsonb,

  -- Recording, transcript, and summary
  recording_url TEXT,
  transcript_text TEXT,
  summary TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- Create meeting_participants table for tracking attendees
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Response status
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),

  -- Whether they were the organizer
  is_organizer BOOLEAN DEFAULT FALSE,

  -- Calendar event ID for this participant (if added to their calendar)
  calendar_event_id TEXT,

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Unique constraint: one entry per user per meeting
  UNIQUE(meeting_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX idx_meetings_organizer_id ON meetings(organizer_id);
CREATE INDEX idx_meetings_project_id ON meetings(project_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user_id ON meeting_participants(user_id);

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings table
-- Users can view meetings they're invited to or organized
CREATE POLICY "Users can view their meetings"
  ON meetings FOR SELECT
  USING (
    organizer_id = (select auth.uid())
    OR id IN (
      SELECT meeting_id
      FROM meeting_participants
      WHERE user_id = (select auth.uid())
    )
  );

-- Only organizers can insert meetings
CREATE POLICY "Users can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (organizer_id = (select auth.uid()));

-- Only organizers can update their meetings
CREATE POLICY "Organizers can update their meetings"
  ON meetings FOR UPDATE
  USING (organizer_id = (select auth.uid()))
  WITH CHECK (organizer_id = (select auth.uid()));

-- Only organizers can delete their meetings
CREATE POLICY "Organizers can delete their meetings"
  ON meetings FOR DELETE
  USING (organizer_id = (select auth.uid()));

-- RLS Policies for meeting_participants table
-- Users can view participants of meetings they're part of
CREATE POLICY "Users can view meeting participants"
  ON meeting_participants FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE organizer_id = (select auth.uid())
    )
    OR user_id = (select auth.uid())
  );

-- Only organizers can add participants
CREATE POLICY "Organizers can add participants"
  ON meeting_participants FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings WHERE organizer_id = (select auth.uid())
    )
  );

-- Participants can update their own response status
CREATE POLICY "Participants can update their response"
  ON meeting_participants FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR meeting_id IN (
      SELECT id FROM meetings WHERE organizer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR meeting_id IN (
      SELECT id FROM meetings WHERE organizer_id = (select auth.uid())
    )
  );

-- Only organizers can remove participants
CREATE POLICY "Organizers can remove participants"
  ON meeting_participants FOR DELETE
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE organizer_id = (select auth.uid())
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER meetings_updated_at_trigger
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Enable realtime for meetings and participants
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_participants TO authenticated;
