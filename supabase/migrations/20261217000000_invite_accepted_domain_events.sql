-- Migration: Support invite_accepted domain events
-- This migration:
-- 1. Makes project_id nullable on domain_events for org-level events

-- =============================================================================
-- 1. Allow project_id to be NULL for org-level events
-- =============================================================================

ALTER TABLE public.domain_events 
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN public.domain_events.project_id IS 
  'Reference to the project for project-scoped events. NULL for org-level events (e.g., invite_accepted).';

