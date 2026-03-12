-- =============================================================================
-- Lender wishlist, vaults, and underwriting_documents.lender_lei
-- =============================================================================
-- 1. project_lender_wishlist - advisors add matched lenders (after saving run)
-- 2. project_lender_vaults - one vault per (project, lender), progress tracking
-- 3. underwriting_documents.lender_lei - scope docs to lender vault (NULL = legacy)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. project_lender_wishlist
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_lender_wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    lender_lei TEXT NOT NULL,
    lender_name TEXT,
    match_run_id UUID NOT NULL REFERENCES public.match_runs(id) ON DELETE CASCADE,
    project_resume_id UUID NOT NULL REFERENCES public.project_resumes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT project_lender_wishlist_project_lender_unique UNIQUE (project_id, lender_lei)
);

CREATE INDEX idx_project_lender_wishlist_project_id ON public.project_lender_wishlist(project_id);

CREATE TRIGGER update_project_lender_wishlist_updated_at
    BEFORE UPDATE ON public.project_lender_wishlist
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_lender_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigned advisor can view wishlist"
    ON public.project_lender_wishlist FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_wishlist.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can insert wishlist"
    ON public.project_lender_wishlist FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can update wishlist"
    ON public.project_lender_wishlist FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_wishlist.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can delete wishlist"
    ON public.project_lender_wishlist FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_wishlist.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

COMMENT ON TABLE public.project_lender_wishlist IS
    'Lenders the advisor has added from matchmaking (after saving the run). One row per lender per project.';

-- -----------------------------------------------------------------------------
-- 2. project_lender_vaults
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_lender_vaults (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    lender_lei TEXT NOT NULL,
    project_resume_id UUID NOT NULL REFERENCES public.project_resumes(id) ON DELETE RESTRICT,
    match_run_id UUID REFERENCES public.match_runs(id) ON DELETE SET NULL,
    stage_1_complete BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT project_lender_vaults_project_lender_unique UNIQUE (project_id, lender_lei)
);

CREATE INDEX idx_project_lender_vaults_project_id ON public.project_lender_vaults(project_id);
CREATE INDEX idx_project_lender_vaults_lender_lei ON public.project_lender_vaults(lender_lei);

CREATE TRIGGER update_project_lender_vaults_updated_at
    BEFORE UPDATE ON public.project_lender_vaults
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_lender_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigned advisor can view vaults"
    ON public.project_lender_vaults FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_vaults.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can insert vaults"
    ON public.project_lender_vaults FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can update vaults"
    ON public.project_lender_vaults FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_vaults.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Assigned advisor can delete vaults"
    ON public.project_lender_vaults FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_lender_vaults.project_id
            AND p.assigned_advisor_id = public.get_current_user_id()
        )
    );

COMMENT ON TABLE public.project_lender_vaults IS
    'One vault per (project, lender). Tracks resume/run for deal numbers and progress (stage_1_complete, sent_at).';

-- -----------------------------------------------------------------------------
-- 3. underwriting_documents.lender_lei
-- -----------------------------------------------------------------------------
ALTER TABLE public.underwriting_documents
    ADD COLUMN IF NOT EXISTS lender_lei TEXT;

CREATE INDEX IF NOT EXISTS idx_underwriting_documents_lender_lei
    ON public.underwriting_documents(lender_lei);

COMMENT ON COLUMN public.underwriting_documents.lender_lei IS
    'When set, this document belongs to the vault for this lender (project from resources). NULL = legacy project-level vault.';
