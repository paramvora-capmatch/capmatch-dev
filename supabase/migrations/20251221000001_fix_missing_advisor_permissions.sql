-- =============================================================================
-- Migration: Fix Missing Advisor Permissions on PROJECT_DOCS_ROOT
-- =============================================================================
--
-- This migration fixes cases where advisors were assigned to projects but
-- didn't receive permissions on PROJECT_DOCS_ROOT resources due to RLS
-- blocking the backfill, or projects created before the trigger was in place.
--
-- It ensures all advisors assigned to projects have the necessary permissions.
-- =============================================================================

-- Grant missing permissions to advisors on all project-related resources
-- This uses the grant_advisor_project_permissions function to ensure consistency
DO $$
DECLARE
    v_project RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Fixing missing advisor permissions for existing projects...';
    
    FOR v_project IN 
        SELECT 
            p.id as project_id,
            p.assigned_advisor_id,
            p.owner_org_id
        FROM public.projects p
        WHERE p.assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            -- Use the grant_advisor_project_permissions function which handles all resources
            PERFORM public.grant_advisor_project_permissions(
                v_project.project_id,
                v_project.assigned_advisor_id,
                NULL -- No specific granted_by for backfill
            );
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to grant permissions for project %: %', 
                v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed permissions for % projects', v_count;
END;
$$;

