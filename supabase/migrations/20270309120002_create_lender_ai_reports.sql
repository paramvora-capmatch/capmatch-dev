-- =============================================================================
-- Migration: Create lender_ai_reports table (Tier 3 AI detailed reports)
-- =============================================================================
--
-- Caches Gemini-generated lender analysis reports per match_score.
-- Used by the Lender Matching tab's "Generate Detailed AI Report" button.
--
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lender_ai_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_score_id  UUID NOT NULL REFERENCES public.match_scores(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    lender_lei      TEXT NOT NULL,
    report_content  JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_used      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lender_ai_reports_match_score_id
ON public.lender_ai_reports(match_score_id);

COMMENT ON TABLE public.lender_ai_reports IS
'Cached Gemini-powered AI analysis reports for individual lender matches. One report per match_score; regenerated on demand.';

-- =============================================================================
-- RLS policies
-- =============================================================================

ALTER TABLE public.lender_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lender_ai_reports"
ON public.lender_ai_reports FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Assigned advisor can view lender AI reports"
ON public.lender_ai_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = lender_ai_reports.project_id
        AND p.assigned_advisor_id = public.get_current_user_id()
    )
);

CREATE POLICY "Project owner org members can view lender AI reports"
ON public.lender_ai_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = lender_ai_reports.project_id
        AND p.owner_org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
    )
);
