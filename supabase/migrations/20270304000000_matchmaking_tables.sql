-- =============================================================================
-- Migration: Matchmaking Engine Tables
-- =============================================================================
--
-- Creates tables to store matchmaking engine results:
-- 1. match_runs   - one row per engine invocation (metadata + visualization JSON)
-- 2. match_scores - one row per lender scored in a run (detailed breakdown)
--
-- =============================================================================

-- =============================================================================
-- 1. match_runs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.match_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    run_id          TEXT NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    hmda_source     TEXT,
    total_lenders   INTEGER NOT NULL DEFAULT 0,
    total_deals     INTEGER NOT NULL DEFAULT 0,
    visualization_data JSONB,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_runs_project_id ON public.match_runs(project_id);
CREATE INDEX idx_match_runs_created_at ON public.match_runs(created_at DESC);

COMMENT ON TABLE public.match_runs IS
'Stores metadata and visualization data for each matchmaking engine run.';

-- =============================================================================
-- 2. match_scores table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.match_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_run_id    UUID NOT NULL REFERENCES public.match_runs(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    deal_id         TEXT NOT NULL,
    deal_name       TEXT,
    lender_lei      TEXT NOT NULL,
    lender_name     TEXT,
    total_score     DOUBLE PRECISION NOT NULL DEFAULT 0,
    rank            INTEGER NOT NULL DEFAULT 0,
    overall_narrative TEXT,
    pillar_scores   JSONB NOT NULL DEFAULT '{}'::jsonb,
    variable_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_scores_run_id ON public.match_scores(match_run_id);
CREATE INDEX idx_match_scores_project_id ON public.match_scores(project_id);
CREATE INDEX idx_match_scores_total_score ON public.match_scores(total_score DESC);

COMMENT ON TABLE public.match_scores IS
'Stores per-lender scoring breakdown for each matchmaking run.';

-- =============================================================================
-- 3. RLS policies
-- =============================================================================

ALTER TABLE public.match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on match_runs"
ON public.match_runs FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on match_scores"
ON public.match_scores FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Assigned advisor can SELECT match_runs for their projects
CREATE POLICY "Assigned advisor can view match runs"
ON public.match_runs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_runs.project_id
        AND p.assigned_advisor_id = public.get_current_user_id()
    )
);

-- Assigned advisor can INSERT match_runs for their projects
CREATE POLICY "Assigned advisor can create match runs"
ON public.match_runs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_runs.project_id
        AND p.assigned_advisor_id = public.get_current_user_id()
    )
);

-- Assigned advisor can SELECT match_scores for their projects
CREATE POLICY "Assigned advisor can view match scores"
ON public.match_scores FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_scores.project_id
        AND p.assigned_advisor_id = public.get_current_user_id()
    )
);

-- Assigned advisor can INSERT match_scores for their projects
CREATE POLICY "Assigned advisor can create match scores"
ON public.match_scores FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_scores.project_id
        AND p.assigned_advisor_id = public.get_current_user_id()
    )
);

-- Lenders with project access can view match results
CREATE POLICY "Lenders can view match runs for granted projects"
ON public.match_runs FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), match_runs.project_id)
);

CREATE POLICY "Lenders can view match scores for granted projects"
ON public.match_scores FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), match_scores.project_id)
);

-- Project owner org members can view match results
CREATE POLICY "Project owner org members can view match runs"
ON public.match_runs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_runs.project_id
        AND p.owner_org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
    )
);

CREATE POLICY "Project owner org members can view match scores"
ON public.match_scores FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = match_scores.project_id
        AND p.owner_org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
    )
);
