-- =============================================================================
-- Migration: Enable realtime for chat_thread_participants
-- =============================================================================
--
-- Purpose:
--   Allow Supabase Realtime to emit events when chat thread memberships change.
--   This lets the frontend subscribe to participant INSERT/DELETE events and
--   refresh the UI without a full reload when users are added to new threads.

-- Ensure the table exposes all columns needed for realtime updates
ALTER TABLE public.chat_thread_participants REPLICA IDENTITY FULL;

-- Publish chat_thread_participants changes to Supabase Realtime
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.chat_thread_participants;

COMMENT ON TABLE public.chat_thread_participants IS
  'Realtime enabled so clients can react to membership changes.';

