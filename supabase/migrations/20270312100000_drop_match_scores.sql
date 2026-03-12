-- =============================================================================
-- Migration: Drop match_scores table (legacy)
-- =============================================================================
-- Scores are stored in match_runs.visualization_data. The match_scores table
-- is no longer used; wishlist and vault read scores from visualization_data.
-- lender_ai_reports was already migrated to (match_run_id, lender_lei) in
-- 20270311120000_lender_ai_reports_match_run_id.sql.
-- =============================================================================

-- Drop RLS policies on match_scores
DROP POLICY IF EXISTS "Service role full access on match_scores" ON public.match_scores;
DROP POLICY IF EXISTS "Assigned advisor can view match scores" ON public.match_scores;
DROP POLICY IF EXISTS "Assigned advisor can create match scores" ON public.match_scores;
DROP POLICY IF EXISTS "Lenders can view match scores for granted projects" ON public.match_scores;
DROP POLICY IF EXISTS "Project owner org members can view match scores" ON public.match_scores;

-- Drop table
DROP TABLE IF EXISTS public.match_scores;
