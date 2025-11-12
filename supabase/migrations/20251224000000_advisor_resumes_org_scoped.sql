-- ============================================================================
-- Migration: Advisor Resumes - Org Scoped
-- Date: 2025-12-24
-- ============================================================================
-- Changes advisor_resumes from profile-scoped to org-scoped
-- Any advisor in the advisor org can view and edit the resume

-- Step 1: Drop the old table and recreate with org_id
DROP TRIGGER IF EXISTS update_advisor_resumes_updated_at ON public.advisor_resumes;
DROP TABLE IF EXISTS public.advisor_resumes;

CREATE TABLE public.advisor_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Ensures a 1-to-1 relationship with an advisor organization
    org_id UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_advisor_resumes_updated_at
BEFORE UPDATE ON public.advisor_resumes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_advisor_resumes_org_id ON public.advisor_resumes(org_id);

-- Enable RLS
ALTER TABLE public.advisor_resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Any advisor who is a member of the advisor org can view and edit the resume
CREATE POLICY "Advisors in org can manage their org resume" ON public.advisor_resumes
FOR ALL USING (
    -- Check if the user is a member of the advisor org
    EXISTS (
        SELECT 1 
        FROM public.org_members om
        JOIN public.orgs o ON o.id = om.org_id
        WHERE om.org_id = advisor_resumes.org_id
          AND om.user_id = auth.uid()
          AND o.entity_type = 'advisor'
    )
) WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
        SELECT 1 
        FROM public.org_members om
        JOIN public.orgs o ON o.id = om.org_id
        WHERE om.org_id = advisor_resumes.org_id
          AND om.user_id = auth.uid()
          AND o.entity_type = 'advisor'
    )
);

