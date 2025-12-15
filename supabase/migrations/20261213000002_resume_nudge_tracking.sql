-- Migration: Add index for efficient resume nudge tier tracking queries
-- This enables fast lookups to check if a specific nudge tier was already sent
-- for a user/project/resume combination

CREATE INDEX IF NOT EXISTS idx_notifications_resume_nudge_lookup 
  ON public.notifications(user_id, (payload->>'resume_type'), (payload->>'nudge_tier'), created_at DESC) 
  WHERE (payload->>'type') = 'resume_incomplete_nudge';

COMMENT ON INDEX idx_notifications_resume_nudge_lookup IS 
  'Index for efficiently querying resume incomplete nudge notifications by user, resume type, and nudge tier';

