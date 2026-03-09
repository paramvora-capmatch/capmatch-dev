-- =============================================================================
-- Migration: Add project_resume_id to match_runs (version-scoped match runs)
-- =============================================================================
--
-- One run per resume version; each new matchmaking run for that version
-- overwrites the previous run. Underwriting uses the run for current version.
--
-- =============================================================================

ALTER TABLE public.match_runs
ADD COLUMN IF NOT EXISTS project_resume_id UUID REFERENCES public.project_resumes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_runs.project_resume_id IS
'Resume version this run belongs to; one run per version, replaced on each matchmaking run.';

CREATE INDEX IF NOT EXISTS idx_match_runs_project_resume_id
ON public.match_runs(project_resume_id)
WHERE project_resume_id IS NOT NULL;
