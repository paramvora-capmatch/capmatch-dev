-- =============================================================================
-- Migration: Ensure All Advisor Permissions Exist (Comprehensive Fix)
-- =============================================================================
--
-- This migration ensures that ALL advisors assigned to projects have 'edit'
-- permissions on ALL related resources (PROJECT_RESUME, PROJECT_DOCS_ROOT,
-- BORROWER_RESUME, BORROWER_DOCS_ROOT), regardless of whether they were
-- granted before or after the trigger was in place.
--
-- This is a comprehensive fix that will grant permissions even if they're
-- completely missing (not just upgrade from view to edit).
-- =============================================================================

-- Grant or upgrade permissions for all advisors on all project-related resources
DO $$
DECLARE
    v_project RECORD;
    v_resource_id UUID;
    v_existing_permission RECORD;
    v_owner_org_id UUID;
BEGIN
    RAISE NOTICE 'Ensuring all advisor permissions exist...';
    
    FOR v_project IN 
        SELECT 
            p.id as project_id,
            p.assigned_advisor_id,
            p.owner_org_id
        FROM public.projects p
        WHERE p.assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            v_owner_org_id := v_project.owner_org_id;
            
            -- PROJECT_DOCS_ROOT
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    -- Insert new permission
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                    RAISE NOTICE 'Granted edit permission on PROJECT_DOCS_ROOT % to advisor %', 
                        v_resource_id, v_project.assigned_advisor_id;
                ELSIF v_existing_permission.permission != 'edit' THEN
                    -- Upgrade existing permission
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    RAISE NOTICE 'Upgraded PROJECT_DOCS_ROOT permission to edit for advisor %', 
                        v_project.assigned_advisor_id;
                END IF;
            END IF;
            
            -- PROJECT_RESUME
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_RESUME'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                    RAISE NOTICE 'Granted edit permission on PROJECT_RESUME % to advisor %', 
                        v_resource_id, v_project.assigned_advisor_id;
                ELSIF v_existing_permission.permission != 'edit' THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    RAISE NOTICE 'Upgraded PROJECT_RESUME permission to edit for advisor %', 
                        v_project.assigned_advisor_id;
                END IF;
            END IF;
            
            -- BORROWER_RESUME
            IF v_owner_org_id IS NOT NULL THEN
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_RESUME'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    SELECT * INTO v_existing_permission
                    FROM public.permissions
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    
                    IF v_existing_permission IS NULL THEN
                        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                        RAISE NOTICE 'Granted edit permission on BORROWER_RESUME % to advisor %', 
                            v_resource_id, v_project.assigned_advisor_id;
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        RAISE NOTICE 'Upgraded BORROWER_RESUME permission to edit for advisor %', 
                            v_project.assigned_advisor_id;
                    END IF;
                END IF;
                
                -- BORROWER_DOCS_ROOT
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_DOCS_ROOT'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    SELECT * INTO v_existing_permission
                    FROM public.permissions
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    
                    IF v_existing_permission IS NULL THEN
                        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id);
                        RAISE NOTICE 'Granted edit permission on BORROWER_DOCS_ROOT % to advisor %', 
                            v_resource_id, v_project.assigned_advisor_id;
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        RAISE NOTICE 'Upgraded BORROWER_DOCS_ROOT permission to edit for advisor %', 
                            v_project.assigned_advisor_id;
                    END IF;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to ensure permissions for project %: %', 
                v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Finished ensuring all advisor permissions';
END;
$$;

