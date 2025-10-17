-- Table for the core real estate projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    -- The borrower organization that owns this project
    owner_org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    -- The single advisor assigned to this project
    assigned_advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_projects_owner_org_id ON public.projects(owner_org_id);
CREATE INDEX idx_projects_assigned_advisor_id ON public.projects(assigned_advisor_id);

-- Table for borrower resumes, one per borrower organization
CREATE TABLE public.borrower_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Ensures a 1-to-1 relationship with a borrower organization
    org_id UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
    content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_borrower_resumes_updated_at BEFORE UPDATE ON public.borrower_resumes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for project resumes, one per project
CREATE TABLE public.project_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Ensures a 1-to-1 relationship with a project
    project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
    content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_project_resumes_updated_at BEFORE UPDATE ON public.project_resumes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
