-- Migration: Unread Thread Nudges
-- Tracks and notifies users when they have unread messages in a thread for >3 hours
-- Uses existing chat_thread_participants.last_read_at for read status tracking

-- =============================================================================
-- 1. Create Dedupe Table
-- =============================================================================

-- Prevents duplicate notifications per thread/user/message-batch
-- Uses latest_message_at so new nudges are sent when new messages arrive
CREATE TABLE IF NOT EXISTS public.unread_thread_stale_log (
    id BIGSERIAL PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- The timestamp of the latest message when nudge was sent
    -- Allows new nudge when new messages arrive after last nudge
    latest_message_at TIMESTAMPTZ NOT NULL,
    
    -- Optional linkage to the domain event
    event_id BIGINT REFERENCES public.domain_events(id) ON DELETE SET NULL,
    
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: prevent duplicate nudges for the same thread/user/message-batch
CREATE UNIQUE INDEX IF NOT EXISTS ux_unread_thread_stale_log_dedupe
    ON public.unread_thread_stale_log (thread_id, user_id, latest_message_at);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_unread_thread_stale_log_user_sent_at
    ON public.unread_thread_stale_log (user_id, sent_at DESC);

-- Index for cleanup queries by sent_at
CREATE INDEX IF NOT EXISTS idx_unread_thread_stale_log_sent_at
    ON public.unread_thread_stale_log (sent_at);

COMMENT ON TABLE public.unread_thread_stale_log IS
'Append-only log of unread thread nudges sent to users. Used to dedupe and throttle. anchor_last_read_at allows nudge reset after user reads the thread and goes inactive again.';

-- =============================================================================
-- 2. Create Function to Call Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_unread_thread_nudges()
RETURNS bigint AS $$
DECLARE
    v_request_id bigint;
BEGIN
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
              || '/functions/v1/unread-thread-nudges',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('scheduled_at', now())
    ) INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION call_unread_thread_nudges IS
'Calls the unread-thread-nudges edge function via HTTP. Used by pg_cron.';

-- =============================================================================
-- 3. Schedule Cron Job
-- =============================================================================

-- Schedule to run every 15 minutes
-- Cron expression: '*/15 * * * *' means "every 15 minutes"
SELECT cron.schedule(
    'unread-thread-nudges-periodic',
    '*/15 * * * *',
    $$ SELECT call_unread_thread_nudges(); $$
);

-- =============================================================================
-- Notes:
-- =============================================================================
-- This migration requires the following secrets to already be in Supabase Vault:
--
-- 1. Project URL (should already exist from project-completion-reminders):
--    SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
--
-- 2. Service Role Key (should already exist):
--    SELECT vault.create_secret('your-service-role-key-here', 'service_role_key');
--
-- To view scheduled jobs:
--    SELECT * FROM cron.job;
--
-- To view job run history:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'unread-thread-nudges-periodic')
--    ORDER BY start_time DESC;
--
-- To unschedule the job:
--    SELECT cron.unschedule('unread-thread-nudges-periodic');

