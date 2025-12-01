-- =============================================================================
-- Migration: Move Resume Lock State into JSONB Content
-- Date: 2026-01-28
--
-- This migration copies existing locked_fields / locked_sections columns on
-- project_resumes and borrower_resumes into the JSONB content column under
-- reserved root keys:
--   - "_lockedFields"
--   - "_lockedSections"
--
-- After backfilling the JSONB content, the legacy columns and their indexes
-- are dropped. All future lock state must be read from / written to the
-- content JSON.
-- =============================================================================

-- 1. Backfill lock state into project_resumes.content
UPDATE public.project_resumes
SET content = (
  -- Ensure content is an object
  COALESCE(content, '{}'::jsonb)
  ||
  jsonb_build_object(
    '_lockedFields',
      -- Existing JSON wins; DB column adds any missing keys
      COALESCE(locked_fields, '{}'::jsonb) || COALESCE(content->'_lockedFields', '{}'::jsonb),
    '_lockedSections',
      COALESCE(locked_sections, '{}'::jsonb) || COALESCE(content->'_lockedSections', '{}'::jsonb)
  )
);

-- 2. Backfill lock state into borrower_resumes.content
UPDATE public.borrower_resumes
SET content = (
  COALESCE(content, '{}'::jsonb)
  ||
  jsonb_build_object(
    '_lockedFields',
      COALESCE(locked_fields, '{}'::jsonb) || COALESCE(content->'_lockedFields', '{}'::jsonb),
    '_lockedSections',
      COALESCE(locked_sections, '{}'::jsonb) || COALESCE(content->'_lockedSections', '{}'::jsonb)
  )
);

-- 3. Drop legacy indexes and columns on project_resumes
DROP INDEX IF EXISTS idx_project_resumes_locked_fields;
DROP INDEX IF EXISTS idx_project_resumes_locked_sections;

ALTER TABLE public.project_resumes
  DROP COLUMN IF EXISTS locked_fields,
  DROP COLUMN IF EXISTS locked_sections;

-- 4. Drop legacy indexes and columns on borrower_resumes
DROP INDEX IF EXISTS idx_borrower_resumes_locked_fields;
DROP INDEX IF EXISTS idx_borrower_resumes_locked_sections;

ALTER TABLE public.borrower_resumes
  DROP COLUMN IF EXISTS locked_fields,
  DROP COLUMN IF EXISTS locked_sections;

-- 5. Optional: document the JSON lock keys on content columns
COMMENT ON COLUMN public.project_resumes.content IS
'JSONB resume document. Field-level lock state is stored under reserved keys "_lockedFields" and "_lockedSections".';

COMMENT ON COLUMN public.borrower_resumes.content IS
'JSONB resume document. Field-level lock state is stored under reserved keys "_lockedFields" and "_lockedSections".';


