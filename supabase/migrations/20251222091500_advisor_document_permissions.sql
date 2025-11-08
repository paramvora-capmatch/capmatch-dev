-- =============================================================================
-- Migration: Ensure advisors have edit permissions on project and borrower documents
-- Date: 2025-12-22
-- =============================================================================
--
-- This migration does three things:
--   1. Replaces grant_advisor_project_permissions with an implementation that
--      always upserts EDIT permissions for the advisor.
--   2. Creates a helper to backfill all existing projects so the assigned
--      advisor has EDIT access to PROJECT_DOCS_ROOT, BORROWER_DOCS_ROOT,
--      PROJECT_RESUME, and BORROWER_RESUME resources.
--   3. Ensures a project_access_grant exists for the advisor on every project.
--

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
    v_granted_by UUID := COALESCE(p_granted_by_id, p_advisor_id);
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

    INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
    VALUES (p_project_id, v_project.owner_org_id, p_advisor_id, v_granted_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    SELECT id
    INTO v_project_resume_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_RESUME'
    LIMIT 1;

    IF v_project_resume_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_project_resume_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    SELECT id
    INTO v_project_docs_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_DOCS_ROOT'
    LIMIT 1;

    IF v_project_docs_root_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_project_docs_root_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    SELECT borrower_resume_resource_id, borrower_docs_root_resource_id
    INTO v_borrower_resume_resource_id, v_borrower_docs_root_resource_id
    FROM public.ensure_project_borrower_roots(p_project_id);

    IF v_borrower_resume_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_borrower_resume_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    IF v_borrower_docs_root_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_borrower_docs_root_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.refresh_all_advisor_document_permissions()
RETURNS VOID AS $$
BEGIN
    -- Ensure every assigned advisor has a project_access_grant row.
    INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
    SELECT p.id,
           p.owner_org_id,
           p.assigned_advisor_id,
           p.assigned_advisor_id
    FROM public.projects p
    WHERE p.assigned_advisor_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Upsert EDIT permissions on all relevant project-scoped resources.
    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
    SELECT r.id,
           p.assigned_advisor_id,
           'edit',
           p.assigned_advisor_id
    FROM public.projects p
    JOIN public.resources r
      ON r.project_id = p.id
     AND r.resource_type IN (
         'PROJECT_RESUME',
         'PROJECT_DOCS_ROOT',
         'BORROWER_RESUME',
         'BORROWER_DOCS_ROOT'
     )
    WHERE p.assigned_advisor_id IS NOT NULL
    ON CONFLICT (resource_id, user_id)
    DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT public.refresh_all_advisor_document_permissions();


