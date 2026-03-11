-- =============================================================================
-- Migration: Add label column to project_resumes (advisor-assigned version name)
-- =============================================================================
--
-- Used by Resume Version History and Lender Matching tab for version labels
-- (e.g. "Conservative", "Aggressive", "Senior Debt").
--
-- =============================================================================

ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS label TEXT;

COMMENT ON COLUMN public.project_resumes.label IS
'Advisor-assigned version label (e.g. Conservative, Senior Debt). Max 120 chars in app.';
