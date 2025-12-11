-- Add watch channel fields to calendar_connections table
-- These fields track Google Calendar push notification channels

ALTER TABLE calendar_connections
ADD COLUMN IF NOT EXISTS watch_channel_id TEXT,
ADD COLUMN IF NOT EXISTS watch_resource_id TEXT,
ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMPTZ;

-- Index for quick lookup during webhook processing
CREATE INDEX IF NOT EXISTS idx_calendar_connections_watch_channel
  ON calendar_connections(watch_channel_id)
  WHERE watch_channel_id IS NOT NULL;

COMMENT ON COLUMN calendar_connections.watch_channel_id IS 'Google Calendar API watch channel ID for push notifications';
COMMENT ON COLUMN calendar_connections.watch_resource_id IS 'Google Calendar API resource ID that identifies the watched resource';
COMMENT ON COLUMN calendar_connections.watch_expiration IS 'When the watch channel expires and needs to be renewed';
