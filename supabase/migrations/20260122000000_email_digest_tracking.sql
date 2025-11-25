-- Migration: Email Digest Tracking
-- Tracks which events have been included in daily digest emails
-- This ensures idempotency and prevents duplicate emails on job reruns

CREATE TABLE IF NOT EXISTS public.email_digest_processed (
    event_id BIGINT NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    digest_date DATE NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (event_id, user_id, digest_date)
);

-- Index for finding unprocessed events per user
CREATE INDEX IF NOT EXISTS idx_email_digest_date 
    ON public.email_digest_processed(user_id, digest_date);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_email_digest_event 
    ON public.email_digest_processed(event_id);

COMMENT ON TABLE public.email_digest_processed IS 'Tracks which domain events have been included in digest emails for each user to prevent duplicates';

