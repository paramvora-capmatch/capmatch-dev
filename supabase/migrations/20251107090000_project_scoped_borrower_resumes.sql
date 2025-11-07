-- ============================================================================
-- Migration: Project-scoped Borrower Resumes & Documents
-- Date: 2025-11-07
-- ============================================================================

-- 1. Drop existing borrower resume table (org-scoped) and recreate project-scoped version
DROP TRIGGER IF EXISTS update_borrower_resumes_updated_at ON public.borrower_resumes;
DROP TABLE IF EXISTS public.borrower_resumes;

CREATE TABLE public.borrower_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_borrower_resumes_updated_at
BEFORE UPDATE ON public.borrower_resumes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Remove legacy borrower-level resources (no production data to preserve)
DELETE FROM public.resources
WHERE resource_type IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT');

-- 3. Update helper function to resolve project-scoped resources
CREATE OR REPLACE FUNCTION public.get_resource_id_from_fk(p_fk_id UUID, p_resource_type TEXT)
RETURNS UUID AS $$
  SELECT id
  FROM public.resources
  WHERE resource_type = p_resource_type
    AND (
      (p_resource_type IN ('PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'BORROWER_RESUME', 'BORROWER_DOCS_ROOT')
        AND project_id = p_fk_id)
      OR id = p_fk_id
    )
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 4. Refresh RLS policy for borrower resumes to use project-based permissions
ALTER TABLE public.borrower_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes;

CREATE POLICY "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes
FOR ALL USING (
    public.can_view(auth.uid(), public.get_resource_id_from_fk(project_id, 'BORROWER_RESUME'))
) WITH CHECK (
    public.can_edit(auth.uid(), public.get_resource_id_from_fk(project_id, 'BORROWER_RESUME'))
);

-- 5. Ensure BORROWER_RESUME / BORROWER_DOCS_ROOT root resources require project_id
ALTER TABLE public.resources
    DROP CONSTRAINT IF EXISTS resources_project_org_check;

ALTER TABLE public.resources
    ADD CONSTRAINT resources_project_org_check
    CHECK (
      CASE resource_type
        WHEN 'BORROWER_RESUME' THEN project_id IS NOT NULL
        WHEN 'BORROWER_DOCS_ROOT' THEN project_id IS NOT NULL
        WHEN 'PROJECT_RESUME' THEN project_id IS NOT NULL
        WHEN 'PROJECT_DOCS_ROOT' THEN project_id IS NOT NULL
        ELSE TRUE
      END
    );

-- 6. Helper function for creating borrower root resources per project
CREATE OR REPLACE FUNCTION public.ensure_project_borrower_roots(p_project_id UUID)
RETURNS TABLE (borrower_resume_resource_id UUID, borrower_docs_root_resource_id UUID) AS $$
DECLARE
    v_project RECORD;
BEGIN
    SELECT id, owner_org_id, name
    INTO v_project
    FROM public.projects
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project % not found', p_project_id;
    END IF;

    INSERT INTO public.resources (org_id, project_id, parent_id, resource_type, name)
    VALUES (v_project.owner_org_id, v_project.id, NULL, 'BORROWER_RESUME', v_project.name || ' Borrower Resume')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.resources (org_id, project_id, parent_id, resource_type, name)
    VALUES (v_project.owner_org_id, v_project.id, NULL, 'BORROWER_DOCS_ROOT', v_project.name || ' Borrower Documents')
    ON CONFLICT DO NOTHING;

    RETURN QUERY
    SELECT
        (SELECT id FROM public.resources WHERE project_id = v_project.id AND resource_type = 'BORROWER_RESUME' LIMIT 1),
        (SELECT id FROM public.resources WHERE project_id = v_project.id AND resource_type = 'BORROWER_DOCS_ROOT' LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure uniqueness for borrower root resources per project
CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_project_borrower_resume
    ON public.resources(project_id)
    WHERE resource_type = 'BORROWER_RESUME';

CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_project_borrower_docs_root
    ON public.resources(project_id)
    WHERE resource_type = 'BORROWER_DOCS_ROOT';

-- 8. Update advisor permission grant function for project-scoped borrower resources
CREATE OR REPLACE FUNCTION public.grant_advisor_project_permissions(
    p_project_id UUID,
    p_advisor_id UUID,
    p_granted_by_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_project RECORD;
    v_project_resume_resource_id UUID;
    v_project_docs_root_resource_id UUID;
    v_borrower_resume_resource_id UUID;
    v_borrower_docs_root_resource_id UUID;
    v_existing_permission RECORD;
    v_existing_grant RECORD;
BEGIN
    SELECT owner_org_id, assigned_advisor_id
    INTO v_project
    FROM public.projects
    WHERE id = p_project_id;

    IF v_project IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', p_project_id;
    END IF;

    IF v_project.assigned_advisor_id != p_advisor_id THEN
        RAISE EXCEPTION 'Advisor % is not assigned to project %', p_advisor_id, p_project_id;
    END IF;

    SELECT * INTO v_existing_grant
    FROM public.project_access_grants
    WHERE project_id = p_project_id
      AND user_id = p_advisor_id;

    IF v_existing_grant IS NULL THEN
        INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
        VALUES (
            p_project_id,
            v_project.owner_org_id,
            p_advisor_id,
            COALESCE(p_granted_by_id, p_advisor_id)
        );
    END IF;

    SELECT id INTO v_project_resume_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_RESUME'
    LIMIT 1;

    IF v_project_resume_resource_id IS NOT NULL THEN
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_project_resume_resource_id
          AND user_id = p_advisor_id;

        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_project_resume_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
        END IF;
    END IF;

    SELECT id INTO v_project_docs_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_DOCS_ROOT'
    LIMIT 1;

    IF v_project_docs_root_resource_id IS NOT NULL THEN
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_project_docs_root_resource_id
          AND user_id = p_advisor_id;

        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_project_docs_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
        END IF;
    END IF;

    SELECT borrower_resume_resource_id, borrower_docs_root_resource_id
    INTO v_borrower_resume_resource_id, v_borrower_docs_root_resource_id
    FROM public.ensure_project_borrower_roots(p_project_id);

    IF v_borrower_resume_resource_id IS NOT NULL THEN
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_borrower_resume_resource_id
          AND user_id = p_advisor_id;

        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_borrower_resume_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
        END IF;
    END IF;

    IF v_borrower_docs_root_resource_id IS NOT NULL THEN
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_borrower_docs_root_resource_id
          AND user_id = p_advisor_id;

        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_borrower_docs_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


