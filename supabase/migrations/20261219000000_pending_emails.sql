-- Migration: Pending Emails Queue
-- Creates a table for the external email service to poll for pending emails.
-- Supports both immediate and aggregated (digest) delivery types.

-- =============================================================================
-- 1. Create pending_emails table
-- =============================================================================

CREATE TABLE public.pending_emails (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('immediate', 'aggregated')),
    
    -- Denormalized fields for easy email rendering
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,
    subject TEXT NOT NULL,
    body_data JSONB NOT NULL,  -- Structured data for email template
    
    -- Processing state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    -- Prevent duplicate emails per event/user
    UNIQUE(event_id, user_id)
);

-- =============================================================================
-- 2. Create indexes for efficient querying
-- =============================================================================

-- Index for fetching pending emails by delivery type
CREATE INDEX idx_pending_emails_status_delivery 
    ON public.pending_emails(status, delivery_type, created_at);

-- Partial index for aggregated emails that are pending (used for digest queries)
CREATE INDEX idx_pending_emails_user_aggregated 
    ON public.pending_emails(user_id, delivery_type, status) 
    WHERE delivery_type = 'aggregated' AND status = 'pending';

-- Index for looking up emails by user
CREATE INDEX idx_pending_emails_user_id 
    ON public.pending_emails(user_id, created_at DESC);

-- =============================================================================
-- 3. Enable RLS (service-role only access)
-- =============================================================================

ALTER TABLE public.pending_emails ENABLE ROW LEVEL SECURITY;

-- No policies: only service-role (external email service) can access this table

-- =============================================================================
-- 4. Add comments
-- =============================================================================

COMMENT ON TABLE public.pending_emails IS 
    'Queue for pending emails to be processed by the external email service. Supports immediate and aggregated (digest) delivery types.';

COMMENT ON COLUMN public.pending_emails.delivery_type IS 
    'immediate: send right away; aggregated: batch into digest emails every 3 hours';

COMMENT ON COLUMN public.pending_emails.body_data IS 
    'Structured JSON data for email template rendering (event-specific fields)';

COMMENT ON COLUMN public.pending_emails.status IS 
    'pending: awaiting processing; processing: being sent; sent: successfully delivered; failed: delivery failed';

