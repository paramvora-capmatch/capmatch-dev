-- Migration: Remove legacy insert_thread_message overload
-- This drops the 4-argument version so only the reply-capable function remains.

DROP FUNCTION IF EXISTS public.insert_thread_message(UUID, UUID, TEXT, UUID[]);


