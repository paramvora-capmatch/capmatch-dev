-- =============================================================================
-- Migration: Enable RLS on Missing Tables
-- =============================================================================
--
-- Fixes security issue where some public tables do not have Row Level Security
-- enabled. All tables in the public schema exposed to PostgREST must have RLS
-- enabled to prevent unauthorized access.
--
-- Tables fixed:
-- - unread_thread_stale_log: Append-only log for unread thread nudges
-- - resume_nudge_log: Append-only log for resume abandonment nudges
-- - _deleting_projects: Temporary tracking table for cascade deletes
-- - _deleting_orgs: Temporary tracking table for cascade deletes
--
-- These tables are service-role only (no policies) as they are used by
-- background jobs, triggers, and SECURITY DEFINER functions and should not
-- be accessible to client applications.
--
-- =============================================================================

-- Enable RLS on unread_thread_stale_log
-- This table is used by the unread-thread-nudges cron job to track sent nudges
ALTER TABLE public.unread_thread_stale_log ENABLE ROW LEVEL SECURITY;

-- No policies: only service-role (cron jobs, SECURITY DEFINER functions) can access
COMMENT ON TABLE public.unread_thread_stale_log IS 
    'RLS enabled: service-role only. Append-only log of unread thread nudges sent to users. Used to dedupe and throttle.';

-- Enable RLS on resume_nudge_log
-- This table is used by the resume-nudges cron job to track sent nudges
ALTER TABLE public.resume_nudge_log ENABLE ROW LEVEL SECURITY;

-- No policies: only service-role (cron jobs, SECURITY DEFINER functions) can access
COMMENT ON TABLE public.resume_nudge_log IS 
    'RLS enabled: service-role only. Append-only log of resume abandonment nudges (in-app + email), used to dedupe and throttle.';

-- Enable RLS on _deleting_projects
-- This table is used by triggers to coordinate cascade deletes of root resources
ALTER TABLE public._deleting_projects ENABLE ROW LEVEL SECURITY;

-- No policies: only SECURITY DEFINER functions and triggers can access
COMMENT ON TABLE public._deleting_projects IS 
    'RLS enabled: service-role only. Temporary table to track projects being deleted in the current transaction, used to allow cascade deletes of root resources.';

-- Enable RLS on _deleting_orgs
-- This table is used by triggers to coordinate cascade deletes of root resources
ALTER TABLE public._deleting_orgs ENABLE ROW LEVEL SECURITY;

-- No policies: only SECURITY DEFINER functions and triggers can access
COMMENT ON TABLE public._deleting_orgs IS 
    'RLS enabled: service-role only. Temporary table to track orgs being deleted in the current transaction, used to allow cascade deletes of root resources.';

