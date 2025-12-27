-- Create calendar_connections table for storing user calendar integrations
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'apple')),
  provider_account_id TEXT NOT NULL, -- The unique ID from the calendar provider
  provider_email TEXT, -- Email associated with the calendar account
  access_token TEXT, -- Encrypted OAuth access token
  refresh_token TEXT, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMPTZ, -- When the access token expires
  calendar_list JSONB DEFAULT '[]'::jsonb, -- List of calendars from this connection
  sync_enabled BOOLEAN DEFAULT true, -- Whether sync is active
  last_synced_at TIMESTAMPTZ, -- Last successful sync timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(user_id, provider);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own calendar connections
CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_connections_updated_at();

-- Create calendar_events table for storing synced events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL, -- Unique event ID from provider
  calendar_id TEXT NOT NULL, -- Which calendar this event belongs to
  summary TEXT, -- Event title
  description TEXT, -- Event description
  location TEXT, -- Event location
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  attendees JSONB DEFAULT '[]'::jsonb, -- List of attendees
  event_data JSONB DEFAULT '{}'::jsonb, -- Full event data from provider
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, provider_event_id)
);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_connection_id ON calendar_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider_event_id ON calendar_events(connection_id, provider_event_id);

-- Enable RLS for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view events from their own connections
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_connections
      WHERE calendar_connections.id = calendar_events.connection_id
      AND calendar_connections.user_id = (select auth.uid())
    )
  );

CREATE POLICY "System can manage calendar events"
  ON calendar_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger for calendar_events
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_connections_updated_at();
