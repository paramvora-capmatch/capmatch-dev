-- Migration: Lock down email digest + domain events tables
-- Goal: Enable RLS and intentionally leave zero policies so only service-role
--       contexts (Cloud Run jobs, edge functions, SECURITY DEFINER RPCs)
--       can touch the tables.

BEGIN;

-- ============================================================================
-- email_digest_processed
-- ============================================================================

ALTER TABLE public.email_digest_processed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own digest state" ON public.email_digest_processed;
DROP POLICY IF EXISTS "Users can manage email digest state" ON public.email_digest_processed;

-- No policies recreated: user/anon clients cannot read or write this table.

-- ============================================================================
-- domain_events
-- ============================================================================

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert document events" ON public.domain_events;
DROP POLICY IF EXISTS "Users can select events they are entitled to" ON public.domain_events;

-- Again, no policies are added; only service-role traffic (which bypasses RLS)
-- or SECURITY DEFINER functions can interact with domain_events.

COMMIT;

