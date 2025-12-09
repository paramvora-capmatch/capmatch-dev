-- =============================================================================
-- Migration: Add completeness_percent column to project_resumes and borrower_resumes
-- =============================================================================
-- Context:
-- Moving completenessPercent out of the content JSONB column into a dedicated
-- INTEGER column to simplify schema and avoid rich format handling issues.
--
-- This migration:
--   1) Adds completeness_percent INTEGER NOT NULL DEFAULT 0 to both tables
--   2) Extracts existing completenessPercent from content JSONB (handles both
--      number format and rich format {value: number, source: {...}})
--   3) Removes completenessPercent from all content JSONB objects
-- =============================================================================

-- 1. Add completeness_percent column to project_resumes
ALTER TABLE public.project_resumes
  ADD COLUMN IF NOT EXISTS completeness_percent INTEGER NOT NULL DEFAULT 0;

-- 2. Add completeness_percent column to borrower_resumes
ALTER TABLE public.borrower_resumes
  ADD COLUMN IF NOT EXISTS completeness_percent INTEGER NOT NULL DEFAULT 0;

-- 3. Extract completenessPercent from project_resumes content and populate column
-- Handle both number format and rich format {value: number, source: {...}}
UPDATE public.project_resumes
SET completeness_percent = COALESCE(
  -- Try to extract from rich format first: content->'completenessPercent'->>'value'
  CASE 
    WHEN content->'completenessPercent'->>'value' IS NOT NULL 
    THEN (content->'completenessPercent'->>'value')::INTEGER
    ELSE NULL
  END,
  -- Fall back to number format: content->>'completenessPercent'
  CASE 
    WHEN content->>'completenessPercent' IS NOT NULL 
    THEN (content->>'completenessPercent')::INTEGER
    ELSE NULL
  END,
  -- Default to 0 if not found
  0
)
WHERE content IS NOT NULL;

-- 4. Extract completenessPercent from borrower_resumes content and populate column
UPDATE public.borrower_resumes
SET completeness_percent = COALESCE(
  -- Try to extract from rich format first: content->'completenessPercent'->>'value'
  CASE 
    WHEN content->'completenessPercent'->>'value' IS NOT NULL 
    THEN (content->'completenessPercent'->>'value')::INTEGER
    ELSE NULL
  END,
  -- Fall back to number format: content->>'completenessPercent'
  CASE 
    WHEN content->>'completenessPercent' IS NOT NULL 
    THEN (content->>'completenessPercent')::INTEGER
    ELSE NULL
  END,
  -- Default to 0 if not found
  0
)
WHERE content IS NOT NULL;

-- 5. Remove completenessPercent from all project_resumes content JSONB
UPDATE public.project_resumes
SET content = content - 'completenessPercent'
WHERE content ? 'completenessPercent';

-- 6. Remove completenessPercent from all borrower_resumes content JSONB
UPDATE public.borrower_resumes
SET content = content - 'completenessPercent'
WHERE content ? 'completenessPercent';

-- 7. Add comment to column for documentation
COMMENT ON COLUMN public.project_resumes.completeness_percent IS 
  'Completion percentage (0-100) calculated from required fields that are both filled and locked. Stored separately from content JSONB to simplify schema.';

COMMENT ON COLUMN public.borrower_resumes.completeness_percent IS 
  'Completion percentage (0-100) calculated from required fields that are both filled and locked. Stored separately from content JSONB to simplify schema.';

