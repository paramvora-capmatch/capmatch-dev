-- =============================================================================
-- Migration: Upgrade Existing Advisor Permissions from 'view' to 'edit'
-- =============================================================================
--
-- This migration upgrades all existing advisor permissions from 'view' to 'edit'
-- to ensure advisors have owner-level permissions on all project-related resources.
-- This fixes advisors who were granted permissions before we changed the default
-- from 'view' to 'edit'.
-- =============================================================================

-- Upgrade permissions for all advisors on project-related resources
DO $$
DECLARE
    v_project RECORD;
    v_resource_id UUID;
    v_owner_org_id UUID;
BEGIN
    RAISE NOTICE 'Upgrading advisor permissions from view to edit...';
    
    FOR v_project IN 
        SELECT DISTINCT
            p.id as project_id,
            p.assigned_advisor_id,
            p.owner_org_id
        FROM public.projects p
        WHERE p.assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            v_owner_org_id := v_project.owner_org_id;
            
            -- Upgrade PROJECT_DOCS_ROOT permissions
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                UPDATE public.permissions
                SET permission = 'edit'
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id
                  AND permission = 'view';
                
                IF FOUND THEN
                    RAISE NOTICE 'Upgraded PROJECT_DOCS_ROOT permission to edit for advisor % on project %', 
                        v_project.assigned_advisor_id, v_project.project_id;
                END IF;
            END IF;
            
            -- Upgrade PROJECT_RESUME permissions
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_RESUME'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                UPDATE public.permissions
                SET permission = 'edit'
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id
                  AND permission = 'view';
                
                IF FOUND THEN
                    RAISE NOTICE 'Upgraded PROJECT_RESUME permission to edit for advisor % on project %', 
                        v_project.assigned_advisor_id, v_project.project_id;
                END IF;
            END IF;
            
            -- Upgrade BORROWER_RESUME permissions
            IF v_owner_org_id IS NOT NULL THEN
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_RESUME'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id
                      AND permission = 'view';
                    
                    IF FOUND THEN
                        RAISE NOTICE 'Upgraded BORROWER_RESUME permission to edit for advisor % on org %', 
                            v_project.assigned_advisor_id, v_owner_org_id;
                    END IF;
                END IF;
                
                -- Upgrade BORROWER_DOCS_ROOT permissions
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_DOCS_ROOT'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id
                      AND permission = 'view';
                    
                    IF FOUND THEN
                        RAISE NOTICE 'Upgraded BORROWER_DOCS_ROOT permission to edit for advisor % on org %', 
                            v_project.assigned_advisor_id, v_owner_org_id;
                    END IF;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to upgrade permissions for advisor % on project %: %', 
                v_project.assigned_advisor_id, v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Finished upgrading advisor permissions';
END;
$$;

