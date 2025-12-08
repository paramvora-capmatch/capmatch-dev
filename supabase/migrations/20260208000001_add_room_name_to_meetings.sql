-- Add room_name field to meetings table for Daily.co integration
-- This allows efficient lookup when webhooks arrive from Daily.co

ALTER TABLE meetings
ADD COLUMN room_name TEXT;

-- Add index for fast lookups from webhook
CREATE INDEX idx_meetings_room_name ON meetings(room_name);

-- Add comment explaining the field
COMMENT ON COLUMN meetings.room_name IS 'Daily.co room name for video conferencing. Used by webhook to match transcript events to meetings.';
