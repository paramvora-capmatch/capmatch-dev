-- =============================================================================
-- Migration: Update Advisor Grant Function for Underwriting
-- Date: 2027-01-20
-- =============================================================================
--
-- This migration updates the grant_advisor_project_permissions function to
-- include the new UNDERWRITING_DOCS_ROOT and UNDERWRITING_TEMPLATES_ROOT
-- resource types. This ensures future advisor assignments automatically
-- grant the correct permissions.
--
-- =============================================================================

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
    v_underwriting_docs_root_resource_id UUID;
    v_underwriting_templates_root_resource_id UUID;
    v_borrower_resume_resource_id UUID;
    v_borrower_docs_root_resource_id UUID;
    v_existing_permission RECORD;
    v_existing_grant RECORD;
BEGIN
    -- Get project details
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
    
    -- Step 0: Create project_access_grant if it doesn't exist
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
        RAISE NOTICE 'Created project_access_grant for advisor % on project %', p_advisor_id, p_project_id;
    END IF;
    
    -- Find PROJECT_RESUME resource
    SELECT id INTO v_project_resume_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_RESUME'
    LIMIT 1;
    
    IF v_project_resume_resource_id IS NULL THEN
        RAISE WARNING 'PROJECT_RESUME resource not found for project %', p_project_id;
    ELSE
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
    
    -- Find PROJECT_DOCS_ROOT resource
    SELECT id INTO v_project_docs_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_DOCS_ROOT'
    LIMIT 1;
    
    IF v_project_docs_root_resource_id IS NULL THEN
        RAISE WARNING 'PROJECT_DOCS_ROOT resource not found for project %', p_project_id;
    ELSE
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

    -- [NEW] Find UNDERWRITING_DOCS_ROOT resource
    SELECT id INTO v_underwriting_docs_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'UNDERWRITING_DOCS_ROOT'
    LIMIT 1;

    IF v_underwriting_docs_root_resource_id IS NULL THEN
        -- Only warn as it might not be created yet in some flows, but usually seeded
        RAISE INFO 'UNDERWRITING_DOCS_ROOT resource not found for project %', p_project_id;
    ELSE
         SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_underwriting_docs_root_resource_id
          AND user_id = p_advisor_id;
        
        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_underwriting_docs_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
             RAISE NOTICE 'Granted edit permission on UNDERWRITING_DOCS_ROOT to advisor %', p_advisor_id;
        END IF;
    END IF;

    -- [NEW] Find UNDERWRITING_TEMPLATES_ROOT resource
    SELECT id INTO v_underwriting_templates_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'UNDERWRITING_TEMPLATES_ROOT'
    LIMIT 1;

    IF v_underwriting_templates_root_resource_id IS NULL THEN
         RAISE INFO 'UNDERWRITING_TEMPLATES_ROOT resource not found for project %', p_project_id;
    ELSE
         SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_underwriting_templates_root_resource_id
          AND user_id = p_advisor_id;
        
        IF v_existing_permission IS NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_underwriting_templates_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
             RAISE NOTICE 'Granted edit permission on UNDERWRITING_TEMPLATES_ROOT to advisor %', p_advisor_id;
        END IF;
    END IF;
    
    -- Borrower Resources (Delegated to helper function)
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

COMMENT ON FUNCTION public.grant_advisor_project_permissions IS 
'Grants edit permissions to an advisor on all project resources including UNDERWRITING_DOCS_ROOT and UNDERWRITING_TEMPLATES_ROOT.';
