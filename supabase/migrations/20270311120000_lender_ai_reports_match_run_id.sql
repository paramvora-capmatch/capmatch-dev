-- =============================================================================
-- Migration: lender_ai_reports keyed by (match_run_id, lender_lei) instead of match_score_id
-- =============================================================================
-- Draft-first matchmaking: scores live in match_runs.visualization_data; match_scores
-- table is no longer used. AI reports are keyed by match_run + lender_lei.
-- =============================================================================

-- 1. Add match_run_id (nullable for backfill)
ALTER TABLE public.lender_ai_reports
ADD COLUMN IF NOT EXISTS match_run_id UUID REFERENCES public.match_runs(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.lender_ai_reports.match_run_id IS
'Match run this report belongs to (replaces match_score_id). One report per (match_run_id, lender_lei).';

-- 2. Backfill from match_scores
UPDATE public.lender_ai_reports r
SET match_run_id = s.match_run_id
FROM public.match_scores s
WHERE r.match_score_id = s.id
  AND r.match_run_id IS NULL;

-- 3. Drop FK and column match_score_id
ALTER TABLE public.lender_ai_reports
DROP CONSTRAINT IF EXISTS lender_ai_reports_match_score_id_fkey;

ALTER TABLE public.lender_ai_reports
DROP COLUMN IF EXISTS match_score_id;

-- 4. Unique index for (match_run_id, lender_lei) so we upsert one report per lender per run
DROP INDEX IF EXISTS public.idx_lender_ai_reports_match_score_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lender_ai_reports_match_run_lender
ON public.lender_ai_reports(match_run_id, lender_lei)
WHERE match_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lender_ai_reports_match_run_id
ON public.lender_ai_reports(match_run_id)
WHERE match_run_id IS NOT NULL;
