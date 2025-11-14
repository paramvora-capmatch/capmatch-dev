-- =============================================================================
-- Migration: Add index on chat_thread_participants(thread_id)
-- =============================================================================
--
-- This index is critical for performance when querying participants by thread_id,
-- which is done frequently in validate_docs_for_thread and other chat functions.
-- Without this index, queries can be very slow in production with many participants.
--

CREATE INDEX IF NOT EXISTS idx_chat_participants_thread_id 
ON public.chat_thread_participants(thread_id);

COMMENT ON INDEX idx_chat_participants_thread_id IS 
'Index on thread_id for fast participant lookups in chat validation queries';

