-- =============================================================================
-- Migration: Definitive Advisor Permissions Fix
-- =============================================================================
--
-- This migration definitively fixes the issue where advisors cannot access
-- PROJECT_DOCS_ROOT resources. It uses a SECURITY DEFINER function to bypass
-- RLS and ensures all advisors have 'edit' permissions on all project resources.
--
-- This is a comprehensive fix that will work even if previous migrations failed
-- due to RLS restrictions.
-- =============================================================================

-- =============================================================================
-- Step 1: Create a SECURITY DEFINER function to backfill all advisor permissions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.backfill_all_advisor_permissions()
RETURNS TABLE(
    project_id UUID,
    advisor_id UUID,
    resource_type TEXT,
    resource_id UUID,
    action_taken TEXT
) AS $$
DECLARE
    v_project RECORD;
    v_resource_id UUID;
    v_existing_permission RECORD;
    v_owner_org_id UUID;
    v_action TEXT;
BEGIN
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
            
            -- Ensure project_access_grant exists
            IF NOT EXISTS (
                SELECT 1 FROM public.project_access_grants
                WHERE project_id = v_project.project_id
                  AND user_id = v_project.assigned_advisor_id
            ) THEN
                INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
                VALUES (
                    v_project.project_id,
                    v_owner_org_id,
                    v_project.assigned_advisor_id,
                    v_project.assigned_advisor_id
                )
                ON CONFLICT (project_id, user_id) DO NOTHING;
            END IF;
            
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
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                    ON CONFLICT (resource_id, user_id) DO NOTHING;
                    v_action := 'granted';
                ELSIF v_existing_permission.permission != 'edit' THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    v_action := 'upgraded';
                ELSE
                    v_action := 'already_exists';
                END IF;
                
                project_id := v_project.project_id;
                advisor_id := v_project.assigned_advisor_id;
                resource_type := 'PROJECT_DOCS_ROOT';
                resource_id := v_resource_id;
                action_taken := v_action;
                RETURN NEXT;
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
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                    ON CONFLICT (resource_id, user_id) DO NOTHING;
                    v_action := 'granted';
                ELSIF v_existing_permission.permission != 'edit' THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    v_action := 'upgraded';
                ELSE
                    v_action := 'already_exists';
                END IF;
                
                project_id := v_project.project_id;
                advisor_id := v_project.assigned_advisor_id;
                resource_type := 'PROJECT_RESUME';
                resource_id := v_resource_id;
                action_taken := v_action;
                RETURN NEXT;
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
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                        ON CONFLICT DO NOTHING;
                        v_action := 'granted';
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        v_action := 'upgraded';
                    ELSE
                        v_action := 'already_exists';
                    END IF;
                    
                    project_id := v_project.project_id;
                    advisor_id := v_project.assigned_advisor_id;
                    resource_type := 'BORROWER_RESUME';
                    resource_id := v_resource_id;
                    action_taken := v_action;
                    RETURN NEXT;
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
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                        ON CONFLICT DO NOTHING;
                        v_action := 'granted';
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        v_action := 'upgraded';
                    ELSE
                        v_action := 'already_exists';
                    END IF;
                    
                    project_id := v_project.project_id;
                    advisor_id := v_project.assigned_advisor_id;
                    resource_type := 'BORROWER_DOCS_ROOT';
                    resource_id := v_resource_id;
                    action_taken := v_action;
                    RETURN NEXT;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to process project %: %', v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.backfill_all_advisor_permissions IS 
'Backfills all missing advisor permissions on project-related resources. Uses SECURITY DEFINER to bypass RLS. Returns a table showing what actions were taken.';

-- =============================================================================
-- Step 2: Run the backfill function
-- =============================================================================

DO $$
DECLARE
    v_result RECORD;
    v_granted_count INTEGER := 0;
    v_upgraded_count INTEGER := 0;
    v_existing_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting definitive advisor permissions backfill...';
    
    FOR v_result IN SELECT * FROM public.backfill_all_advisor_permissions() LOOP
        IF v_result.action_taken = 'granted' THEN
            v_granted_count := v_granted_count + 1;
            RAISE NOTICE 'Granted % permission on % (%) for advisor % on project %', 
                v_result.resource_type, v_result.resource_id, v_result.action_taken, 
                v_result.advisor_id, v_result.project_id;
        ELSIF v_result.action_taken = 'upgraded' THEN
            v_upgraded_count := v_upgraded_count + 1;
            RAISE NOTICE 'Upgraded % permission on % (%) for advisor % on project %', 
                v_result.resource_type, v_result.resource_id, v_result.action_taken, 
                v_result.advisor_id, v_result.project_id;
        ELSE
            v_existing_count := v_existing_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Backfill complete. Granted: %, Upgraded: %, Already existed: %', 
        v_granted_count, v_upgraded_count, v_existing_count;
END;
$$;

-- =============================================================================
-- Step 3: Fix the trigger to properly handle INSERT operations
-- =============================================================================

CREATE OR REPLACE FUNCTION public.on_advisor_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_granted_by UUID;
BEGIN
    -- Only process if advisor was actually assigned (not null)
    IF NEW.assigned_advisor_id IS NOT NULL THEN
        -- For INSERT, OLD is NULL, so check if NEW has an advisor
        -- For UPDATE, only grant if advisor changed or was just assigned
        IF TG_OP = 'INSERT' OR 
           (TG_OP = 'UPDATE' AND (OLD.assigned_advisor_id IS NULL OR OLD.assigned_advisor_id != NEW.assigned_advisor_id)) THEN
            -- Get the user who made the assignment (could be null in admin operations)
            v_granted_by := auth.uid();
            
            -- Grant permissions to the advisor
            -- Use the grant_advisor_project_permissions function which has SECURITY DEFINER
            PERFORM public.grant_advisor_project_permissions(
                NEW.id,
                NEW.assigned_advisor_id,
                COALESCE(v_granted_by, NEW.assigned_advisor_id)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_grant_advisor_permissions ON public.projects;
CREATE TRIGGER trigger_grant_advisor_permissions
AFTER INSERT OR UPDATE OF assigned_advisor_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.on_advisor_assigned();

COMMENT ON FUNCTION public.on_advisor_assigned IS 
'Trigger function that automatically grants advisor permissions when an advisor is assigned to a project. Handles both INSERT and UPDATE operations.';

