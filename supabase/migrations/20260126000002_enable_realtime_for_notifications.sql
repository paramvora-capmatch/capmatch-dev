-- Enable Realtime for notifications table
-- This allows real-time synchronization when new notifications are created
-- so users can see notifications without refreshing the page

-- Step 1: Ensure the table has replica identity (required for UPDATE/DELETE events)
-- For INSERTs, a primary key is usually enough, but setting it to FULL is robust.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Step 2: Add the table to the 'supabase_realtime' publication
-- This tells PostgreSQL to send change events for this table to Supabase's Realtime service
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMENT ON TABLE public.notifications IS 'Enable realtime functionality for in-app notifications.';

