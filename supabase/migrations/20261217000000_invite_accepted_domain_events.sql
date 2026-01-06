-- Migration: Support invite_accepted domain events
-- This migration:
-- 1. Makes project_id nullable on domain_events for org-level events
-- 2. Adds org_id column for org-level events (e.g., invite_accepted)

-- =============================================================================
-- 1. Allow project_id to be NULL for org-level events
-- =============================================================================

ALTER TABLE public.domain_events 
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN public.domain_events.project_id IS 
  'Reference to the project for project-scoped events. NULL for org-level events (e.g., invite_accepted).';

-- =============================================================================
-- 2. Add org_id column for org-level events
-- =============================================================================

ALTER TABLE public.domain_events
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_domain_events_org_id
  ON public.domain_events (org_id, created_at DESC);

COMMENT ON COLUMN public.domain_events.org_id IS 
  'Reference to the org for org-level events (e.g., invite_accepted). NULL for project-scoped events.';

