-- =============================================================================
-- Migration: Add locked_fields column to project_resumes and borrower_resumes
-- =============================================================================
-- Context:
-- Moving _lockedFields out of the content JSONB column into a dedicated
-- JSONB column to simplify schema and avoid rich format handling issues.
--
-- This migration:
--   1) Adds locked_fields JSONB NOT NULL DEFAULT '{}'::jsonb to both tables
--   2) Extracts existing _lockedFields from content JSONB
--   3) Removes _lockedFields from all content JSONB objects
-- =============================================================================

-- 1. Add locked_fields column to project_resumes
ALTER TABLE public.project_resumes
  ADD COLUMN IF NOT EXISTS locked_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add locked_fields column to borrower_resumes
ALTER TABLE public.borrower_resumes
  ADD COLUMN IF NOT EXISTS locked_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Extract _lockedFields from project_resumes content and populate column
UPDATE public.project_resumes
SET locked_fields = COALESCE(
  content->'_lockedFields',
  '{}'::jsonb
)
WHERE content IS NOT NULL;

-- 4. Extract _lockedFields from borrower_resumes content and populate column
UPDATE public.borrower_resumes
SET locked_fields = COALESCE(
  content->'_lockedFields',
  '{}'::jsonb
)
WHERE content IS NOT NULL;

-- 5. Remove _lockedFields from all project_resumes content JSONB
UPDATE public.project_resumes
SET content = content - '_lockedFields'
WHERE content ? '_lockedFields';

-- 6. Remove _lockedFields from all borrower_resumes content JSONB
UPDATE public.borrower_resumes
SET content = content - '_lockedFields'
WHERE content ? '_lockedFields';

-- 7. Add comment to column for documentation
COMMENT ON COLUMN public.project_resumes.locked_fields IS 
  'Map of field IDs to lock status (field_id -> boolean). Fields marked as locked are protected from autofill overwrites. Stored separately from content JSONB to simplify schema.';

COMMENT ON COLUMN public.borrower_resumes.locked_fields IS 
  'Map of field IDs to lock status (field_id -> boolean). Fields marked as locked are protected from autofill overwrites. Stored separately from content JSONB to simplify schema.';

