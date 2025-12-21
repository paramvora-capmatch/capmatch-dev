-- Migration: Create notification_processing table for GCP notify-fan-out service
-- Purpose: Track processing state for domain events without modifying the immutable event log
-- Pattern: Follows email-notifications service architecture

-- Create processing tracking table
CREATE TABLE IF NOT EXISTS public.notification_processing (
    event_id BIGINT PRIMARY KEY REFERENCES public.domain_events(id) ON DELETE CASCADE,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processor_id TEXT DEFAULT 'gcp-notify-fan-out',
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for polling queries (WHERE status IN ('pending', 'failed') ORDER BY created_at)
CREATE INDEX idx_notification_processing_status_created
ON public.notification_processing(processing_status, created_at)
WHERE processing_status IN ('pending', 'failed');

-- Index for event_id lookups (used by LEFT JOIN in get_pending_events)
CREATE INDEX idx_notification_processing_event_id
ON public.notification_processing(event_id);

-- Enable RLS (service role access only - no policies needed)
ALTER TABLE public.notification_processing ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (explicit for clarity)
GRANT ALL ON public.notification_processing TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.notification_processing IS 'Tracks processing state for domain events by GCP notify-fan-out service. Preserves domain_events immutability by separating event logging from processing state.';
COMMENT ON COLUMN public.notification_processing.processing_status IS 'State machine: pending -> processing -> completed/failed';
COMMENT ON COLUMN public.notification_processing.retry_count IS 'Number of retry attempts for failed events';
COMMENT ON COLUMN public.notification_processing.error_message IS 'Error details for debugging failed events';

-- Create RPC function to get pending events (LEFT JOIN query)
CREATE OR REPLACE FUNCTION public.get_pending_notification_events(p_limit INT DEFAULT 500)
RETURNS TABLE (
    id BIGINT,
    event_type TEXT,
    actor_id UUID,
    project_id UUID,
    org_id UUID,
    resource_id UUID,
    thread_id UUID,
    meeting_id UUID,
    occurred_at TIMESTAMPTZ,
    payload JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.event_type,
        de.actor_id,
        de.project_id,
        de.org_id,
        de.resource_id,
        de.thread_id,
        de.meeting_id,
        de.occurred_at,
        de.payload
    FROM public.domain_events de
    LEFT JOIN public.notification_processing np ON de.id = np.event_id
    WHERE (np.event_id IS NULL OR np.processing_status = 'failed')
      AND de.occurred_at > NOW() - INTERVAL '24 hours'
    ORDER BY de.occurred_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.get_pending_notification_events(INT) TO service_role;
