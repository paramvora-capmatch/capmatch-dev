-- Fix: AI responses were appearing in every chat thread because all threads had stage='underwriting'
-- (from request default and column default). Only the "AI Underwriter" thread should have
-- stage='underwriting'; team channels (General, etc.) must have stage NULL so the backend
-- does not generate AI replies for them.

-- 1. Change column default so new inserts (including from seed) get NULL unless stage is set.
ALTER TABLE public.chat_threads
ALTER COLUMN stage SET DEFAULT NULL;

-- 2. Set stage to NULL for all threads that are not the AI Underwriter topic (fixes existing and seeded rows).
UPDATE public.chat_threads
SET stage = NULL
WHERE (topic IS NULL OR trim(lower(coalesce(topic, ''))) <> 'ai underwriter');
