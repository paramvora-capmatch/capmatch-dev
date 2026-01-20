-- =============================================================================
-- Migration: Fix Underwriting Permissions for Advisors
-- Date: 2027-01-20
-- =============================================================================
--
-- This migration ensures that ALL advisors assigned to projects have 'edit'
-- permissions on the new UNDERWRITING_DOCS_ROOT and UNDERWRITING_TEMPLATES_ROOT
-- resource types.
--
-- =============================================================================

DO $$
DECLARE
    v_project RECORD;
    v_resource_id UUID;
    v_existing_permission RECORD;
BEGIN
    RAISE NOTICE 'Ensuring advisor permissions for underwriting resources...';
    
    FOR v_project IN 
        SELECT 
            p.id as project_id,
            p.assigned_advisor_id,
            p.owner_org_id
        FROM public.projects p
        WHERE p.assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            -- UNDERWRITING_DOCS_ROOT
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'UNDERWRITING_DOCS_ROOT'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                    RAISE NOTICE 'Granted edit permission on UNDERWRITING_DOCS_ROOT % to advisor %', 
                        v_resource_id, v_project.assigned_advisor_id;
                END IF;
            END IF;

             -- UNDERWRITING_TEMPLATES_ROOT
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'UNDERWRITING_TEMPLATES_ROOT'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                    RAISE NOTICE 'Granted edit permission on UNDERWRITING_TEMPLATES_ROOT % to advisor %', 
                        v_resource_id, v_project.assigned_advisor_id;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to ensure permissions for project %: %', 
                v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Finished ensuring underwriting advisor permissions';
END;
$$;
