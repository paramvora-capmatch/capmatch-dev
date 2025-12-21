-- Fix: Unread chat system - Initialize last_read_at to epoch instead of now()
-- 
-- Problem: When a participant joins a thread, last_read_at defaults to now(),
-- which marks ALL existing messages as "read" even though the user hasn't seen them.
-- 
-- Solution: Set last_read_at to a time in the distant past (epoch) so existing
-- messages appear as unread when the user first joins.

-- Step 1: Change the default value for new participants
ALTER TABLE public.chat_thread_participants 
ALTER COLUMN last_read_at SET DEFAULT '1970-01-01 00:00:00+00'::TIMESTAMPTZ;

-- Step 2: Update existing participants who haven't read any messages yet
-- (We identify these as participants whose last_read_at equals their created_at,
--  meaning they've never marked the thread as read)
UPDATE public.chat_thread_participants
SET last_read_at = '1970-01-01 00:00:00+00'::TIMESTAMPTZ
WHERE last_read_at = created_at
  OR last_read_at >= created_at - INTERVAL '1 second'; -- Account for slight timing differences

-- Note: This will cause all threads to show unread messages for users who
-- haven't explicitly marked them as read. This is the correct behavior -
-- users should see unread counts for messages they haven't actually read.
