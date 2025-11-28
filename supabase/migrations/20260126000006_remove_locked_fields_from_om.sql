-- =============================================================================
-- Migration: Remove Locked Fields from OM Table
-- =============================================================================
-- OM table doesn't need locked_fields and locked_sections columns

-- Drop indexes first
DROP INDEX IF EXISTS idx_om_locked_fields;
DROP INDEX IF EXISTS idx_om_locked_sections;

-- Drop columns
ALTER TABLE public.om
DROP COLUMN IF EXISTS locked_fields,
DROP COLUMN IF EXISTS locked_sections;

COMMENT ON TABLE public.om IS 'Stores versioned snapshots of project data for Offering Memorandum (OM) with derived calculations. Does not track locked fields (read-only production data).';

