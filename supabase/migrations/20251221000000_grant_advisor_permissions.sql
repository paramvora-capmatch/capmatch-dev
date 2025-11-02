-- =============================================================================
-- Migration: Grant Advisor Permissions on Project Assignment
-- =============================================================================
--
-- This migration fixes the issue where advisors assigned to projects don't
-- automatically receive permissions on the related resources, causing RLS
-- to block access to borrower_resumes, project_resumes, and project documents.
--
-- Key Features:
-- 1. Trigger function to auto-grant permissions when advisor is assigned
-- 2. Backfill permissions for existing projects with assigned advisors
-- 3. Ensures BORROWER_RESUME resources exist for project owner orgs
-- =============================================================================

-- =============================================================================
-- Step 1: Create function to grant advisor permissions on project resources
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
    -- This is required for the RLS policy on projects table to allow the advisor to see the project
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
        -- Check if permission already exists
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_project_resume_resource_id
          AND user_id = p_advisor_id;
        
        IF v_existing_permission IS NULL THEN
            -- Grant 'edit' permission on PROJECT_RESUME (advisors have owner-level permissions)
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_project_resume_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
            RAISE NOTICE 'Granted edit permission on PROJECT_RESUME to advisor %', p_advisor_id;
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
        -- Check if permission already exists
        SELECT * INTO v_existing_permission
        FROM public.permissions
        WHERE resource_id = v_project_docs_root_resource_id
          AND user_id = p_advisor_id;
        
        IF v_existing_permission IS NULL THEN
            -- Grant 'edit' permission on PROJECT_DOCS_ROOT (advisors have owner-level permissions)
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_project_docs_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
            RAISE NOTICE 'Granted edit permission on PROJECT_DOCS_ROOT to advisor %', p_advisor_id;
        END IF;
    END IF;
    
    -- Find or create BORROWER_RESUME resource for the project's owner org
    SELECT id INTO v_borrower_resume_resource_id
    FROM public.resources
    WHERE org_id = v_project.owner_org_id
      AND resource_type = 'BORROWER_RESUME'
      AND project_id IS NULL
    LIMIT 1;
    
    IF v_borrower_resume_resource_id IS NULL THEN
        -- Create BORROWER_RESUME resource if it doesn't exist
        INSERT INTO public.resources (org_id, resource_type, name)
        VALUES (v_project.owner_org_id, 'BORROWER_RESUME', 'Borrower Resume')
        RETURNING id INTO v_borrower_resume_resource_id;
        RAISE NOTICE 'Created BORROWER_RESUME resource for org %', v_project.owner_org_id;
    END IF;
    
    -- Grant permission on BORROWER_RESUME
    SELECT * INTO v_existing_permission
    FROM public.permissions
    WHERE resource_id = v_borrower_resume_resource_id
      AND user_id = p_advisor_id;
    
    IF v_existing_permission IS NULL THEN
        -- Grant 'edit' permission on BORROWER_RESUME (advisors have owner-level permissions)
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (
            v_borrower_resume_resource_id,
            p_advisor_id,
            'edit',
            COALESCE(p_granted_by_id, p_advisor_id)
        );
        RAISE NOTICE 'Granted edit permission on BORROWER_RESUME to advisor %', p_advisor_id;
    END IF;
    
    -- Find or create BORROWER_DOCS_ROOT resource for the project's owner org
    SELECT id INTO v_borrower_docs_root_resource_id
    FROM public.resources
    WHERE org_id = v_project.owner_org_id
      AND resource_type = 'BORROWER_DOCS_ROOT'
      AND project_id IS NULL
    LIMIT 1;
    
    IF v_borrower_docs_root_resource_id IS NULL THEN
        -- Create BORROWER_DOCS_ROOT resource if it doesn't exist
        INSERT INTO public.resources (org_id, resource_type, name)
        VALUES (v_project.owner_org_id, 'BORROWER_DOCS_ROOT', 'Borrower Documents')
        RETURNING id INTO v_borrower_docs_root_resource_id;
        RAISE NOTICE 'Created BORROWER_DOCS_ROOT resource for org %', v_project.owner_org_id;
    END IF;
    
    -- Grant permission on BORROWER_DOCS_ROOT
    SELECT * INTO v_existing_permission
    FROM public.permissions
    WHERE resource_id = v_borrower_docs_root_resource_id
      AND user_id = p_advisor_id;
    
        IF v_existing_permission IS NULL THEN
            -- Grant 'edit' permission on BORROWER_DOCS_ROOT (advisors have owner-level permissions)
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (
                v_borrower_docs_root_resource_id,
                p_advisor_id,
                'edit',
                COALESCE(p_granted_by_id, p_advisor_id)
            );
            RAISE NOTICE 'Granted edit permission on BORROWER_DOCS_ROOT to advisor %', p_advisor_id;
        END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grant_advisor_project_permissions IS 
'Grants edit permissions (owner-level) to an advisor on all resources related to a project they are assigned to, including PROJECT_RESUME, PROJECT_DOCS_ROOT, BORROWER_RESUME, and BORROWER_DOCS_ROOT. Creates BORROWER_RESUME and BORROWER_DOCS_ROOT resources if missing.';

-- =============================================================================
-- Step 2: Create trigger function to auto-grant permissions when advisor is assigned
-- =============================================================================

CREATE OR REPLACE FUNCTION public.on_advisor_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_granted_by UUID;
BEGIN
    -- Only process if advisor was actually assigned (not null)
    IF NEW.assigned_advisor_id IS NOT NULL THEN
        -- Only grant permissions if this is a new assignment or advisor changed
        IF OLD.assigned_advisor_id IS NULL OR OLD.assigned_advisor_id != NEW.assigned_advisor_id THEN
            -- Get the user who made the assignment (could be null in admin operations)
            v_granted_by := auth.uid();
            
            -- Grant permissions to the newly assigned advisor
            PERFORM public.grant_advisor_project_permissions(
                NEW.id,
                NEW.assigned_advisor_id,
                v_granted_by
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS trigger_grant_advisor_permissions ON public.projects;
CREATE TRIGGER trigger_grant_advisor_permissions
AFTER INSERT OR UPDATE OF assigned_advisor_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.on_advisor_assigned();

-- =============================================================================
-- Step 3: Update RLS policy on projects to also allow assigned advisors to view
-- =============================================================================

-- Update the projects RLS policy to also allow assigned advisors to view projects
-- This provides an additional check beyond project_access_grants
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
CREATE POLICY "Users can view projects they have access to" ON public.projects
FOR SELECT USING (
    public.is_org_owner(owner_org_id, auth.uid()) OR
    assigned_advisor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE project_id = projects.id AND user_id = auth.uid()
    )
);

-- =============================================================================
-- Step 4: Backfill permissions for existing projects with assigned advisors
-- =============================================================================

DO $$
DECLARE
    v_project RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Backfilling advisor permissions for existing projects...';
    
    FOR v_project IN 
        SELECT id, assigned_advisor_id, owner_org_id
        FROM public.projects
        WHERE assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            PERFORM public.grant_advisor_project_permissions(
                v_project.id,
                v_project.assigned_advisor_id,
                NULL -- No specific granted_by for backfill
            );
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to grant permissions for project %: %', v_project.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Backfilled permissions for % projects', v_count;
END;
$$;

