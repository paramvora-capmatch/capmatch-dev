-- Step 1: Ensure the table has a replica identity.
-- This is necessary for Supabase Realtime to get old data on updates/deletes.
-- For INSERTs, a primary key is usually enough, but setting it to FULL is robust.
ALTER TABLE public.project_messages REPLICA IDENTITY FULL;

-- Step 2: Add the table to the 'supabase_realtime' publication.
-- This tells PostgreSQL to send change events for this table to Supabase's Realtime service.
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;

COMMENT ON TABLE public.project_messages IS 'Enable realtime functionality for chat messages.';
