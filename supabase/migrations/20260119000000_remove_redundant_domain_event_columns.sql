-- Migration: Remove Redundant Columns from domain_events
-- This migration removes org_id and occurred_at columns from domain_events table.
-- 
-- Rationale:
-- 1. org_id is redundant - can be derived from project_id or resource_id relations
-- 2. occurred_at is redundant - use created_at instead (standard convention)
--
-- Analysis showed:
-- - Only 1 of 15 handlers uses org_id (invite_accepted), and it has a fallback to payload
-- - Zero handlers read occurred_at - only used for external queries
-- - created_at provides the same functionality and is more consistent

-- =============================================================================
-- Step 1: Add created_at column (if not exists)
-- =============================================================================

ALTER TABLE public.domain_events 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.domain_events.created_at IS 
  'Timestamp when the event was recorded in the database. Replaces occurred_at.';

-- =============================================================================
-- Step 2: Backfill created_at from occurred_at for existing rows
-- =============================================================================

UPDATE public.domain_events 
SET created_at = occurred_at 
WHERE occurred_at IS NOT NULL;

-- =============================================================================
-- Step 3: Drop old indexes that used occurred_at and org_id
-- =============================================================================

DROP INDEX IF EXISTS public.idx_domain_events_project_id_occurred_at;
DROP INDEX IF EXISTS public.idx_domain_events_resource_id_occurred_at;
DROP INDEX IF EXISTS public.idx_domain_events_org_id;

-- =============================================================================
-- Step 4: Create new indexes using created_at
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_domain_events_project_id_created_at
    ON public.domain_events (project_id, created_at DESC)
    WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_resource_id_created_at
    ON public.domain_events (resource_id, created_at DESC)
    WHERE resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_created_at
    ON public.domain_events (created_at DESC);

-- =============================================================================
-- Step 5: Drop redundant columns
-- =============================================================================

-- Drop org_id (can derive from project_id.owner_org_id or resource_id.org_id)
ALTER TABLE public.domain_events 
  DROP COLUMN IF EXISTS org_id;

-- Drop occurred_at (using created_at instead)
ALTER TABLE public.domain_events 
  DROP COLUMN IF EXISTS occurred_at;

-- =============================================================================
-- Step 6: Update comments
-- =============================================================================

COMMENT ON TABLE public.domain_events IS 
  'Immutable event log for the notification system. Each row represents a domain event that triggers notifications. Uses created_at for temporal ordering.';

COMMENT ON COLUMN public.domain_events.project_id IS 
  'Reference to the project for project-scoped events. NULL for org-level events (e.g., invite_accepted). Use projects.owner_org_id to get org_id when needed.';
