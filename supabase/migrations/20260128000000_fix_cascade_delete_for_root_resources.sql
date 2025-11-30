-- =============================================================================
-- Migration: Fix Cascade Delete for Root Resources
-- =============================================================================
--
-- This migration fixes the validate_resource_delete trigger to properly allow
-- cascade deletes of root resources when their parent project is being deleted.
-- 
-- The issue: When a project is deleted, the ON DELETE CASCADE constraint tries
-- to delete root resources, but the validate_resource_delete trigger blocks it
-- because it can't detect that the deletion is part of a cascade within the
-- same transaction.
--
-- Solution: Use a BEFORE DELETE trigger on projects to temporarily disable
-- the resource validation, or modify the validation to check transaction state.
-- We'll use a simpler approach: check if the project_id exists in a way that
-- works within the same transaction by using a subquery that accounts for
-- pending deletions.

-- Update the validate_resource_delete function to properly handle cascade deletes
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_project_exists BOOLEAN;
    v_org_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources, BUT allow it if the project/org is being deleted
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT', 'OM') THEN
        -- Check if this is a cascade delete from project deletion
        IF OLD.project_id IS NOT NULL THEN
            -- Use a more reliable check: if the project is being deleted in this transaction,
            -- the SELECT will return false even if the row still exists in the transaction
            -- We check by attempting to lock the row - if it's being deleted, the lock will fail
            -- Actually, a simpler approach: check if there's a pending DELETE on projects
            -- But PostgreSQL doesn't expose that easily. Instead, we'll use a different strategy:
            -- Check if the project exists AND if we can still access it (meaning it's not being deleted)
            -- If the project is being deleted, the foreign key constraint will handle it
            -- So we allow the delete if the project doesn't exist OR if we're in a cascade context
            
            -- Try to select the project - if it doesn't exist, it's a cascade delete
            SELECT EXISTS(SELECT 1 FROM public.projects WHERE id = OLD.project_id) INTO v_project_exists;
            
            -- If project doesn't exist, this is definitely a cascade delete - allow it
            IF NOT v_project_exists THEN
                RETURN OLD;
            END IF;
            
            -- Even if project exists, if we're here it means the resource is being deleted
            -- In a cascade scenario, the project deletion happens first, then resources
            -- But in PostgreSQL, the order might vary. Let's use a different approach:
            -- Check if the current transaction has any pending deletes on the projects table
            -- Actually, the best approach is to check if we can still reference the project
            -- If the foreign key constraint is about to cascade, we should allow it
            
            -- For now, we'll use a workaround: if the project_id is set but the project
            -- check fails in a way that suggests cascade, allow it.
            -- Actually, let's just allow cascade deletes by checking transaction state differently
            
            -- Better approach: Use pg_trigger_depth() to detect if we're in a nested trigger
            -- If we're being called from a cascade (nested trigger), allow it
            -- But that's not reliable either.
            
            -- Final approach: Since the foreign key has ON DELETE CASCADE, we know that
            -- if a project is being deleted, the resources will be cascade deleted.
            -- The issue is the trigger fires BEFORE the cascade completes.
            -- Solution: Check if there's a deletion in progress by using a different method.
            -- We'll allow the delete if the project_id matches a project that's in the
            -- process of being deleted (which we can't easily detect).
            
            -- Actually, the simplest fix: Since we can't reliably detect cascade deletes
            -- in the same transaction, we'll modify the logic to be more permissive:
            -- If the resource has a project_id and the user has permission to delete projects,
            -- OR if we're in a context where the project is being deleted, allow it.
            
            -- But that's not secure. Let's use a better approach:
            -- Create a temporary table to track projects being deleted in this transaction
            -- Actually, that's complex.
            
            -- Best solution: Modify the trigger to check if we're being called as part of
            -- a CASCADE operation. We can do this by checking the call stack or by using
            -- a session variable. But PostgreSQL doesn't have easy session variables.
            
            -- Practical solution: Use a BEFORE DELETE trigger on projects that sets a flag,
            -- and check that flag in the resource delete trigger. We'll use a temporary table.
        END IF;
        
        -- Check if this is a cascade delete from org deletion
        IF OLD.project_id IS NULL AND OLD.org_id IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM public.orgs WHERE id = OLD.org_id) INTO v_org_exists;
            IF NOT v_org_exists THEN
                RETURN OLD;
            END IF;
        END IF;
        
        -- Otherwise, prevent manual deletion of root resources
        RAISE EXCEPTION 'Cannot delete root resource types';
    END IF;
    
    -- User must have 'edit' permission to delete a resource
    IF NOT public.can_edit(v_user_id, OLD.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a temporary table to track projects being deleted in the current transaction
-- This table will be used by triggers to coordinate cascade deletes
CREATE TABLE IF NOT EXISTS public._deleting_projects (
    project_id UUID PRIMARY KEY,
    deleted_at TIMESTAMPTZ DEFAULT now()
);

-- Create a temporary table to track orgs being deleted
CREATE TABLE IF NOT EXISTS public._deleting_orgs (
    org_id UUID PRIMARY KEY,
    deleted_at TIMESTAMPTZ DEFAULT now()
);

-- Create a BEFORE DELETE trigger on projects to mark them as being deleted
CREATE OR REPLACE FUNCTION public.mark_project_deleting()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into temporary table to mark this project as being deleted
    INSERT INTO public._deleting_projects (project_id)
    VALUES (OLD.id)
    ON CONFLICT (project_id) DO NOTHING;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS mark_project_deleting_trigger ON public.projects;
CREATE TRIGGER mark_project_deleting_trigger
BEFORE DELETE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.mark_project_deleting();

-- Create a BEFORE DELETE trigger on orgs to mark them as being deleted
CREATE OR REPLACE FUNCTION public.mark_org_deleting()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into temporary table to mark this org as being deleted
    INSERT INTO public._deleting_orgs (org_id)
    VALUES (OLD.id)
    ON CONFLICT (org_id) DO NOTHING;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS mark_org_deleting_trigger ON public.orgs;
CREATE TRIGGER mark_org_deleting_trigger
BEFORE DELETE ON public.orgs
FOR EACH ROW
EXECUTE FUNCTION public.mark_org_deleting();

-- Now update validate_resource_delete to check the temporary tables
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_project_deleting BOOLEAN;
    v_org_deleting BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources, BUT allow it if the project/org is being deleted
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT', 'OM') THEN
        -- Check if this is a cascade delete from project deletion
        IF OLD.project_id IS NOT NULL THEN
            -- Check if the project is marked as being deleted in the temporary table
            SELECT EXISTS(
                SELECT 1 FROM public._deleting_projects WHERE project_id = OLD.project_id
            ) INTO v_project_deleting;
            
            IF v_project_deleting THEN
                -- Project is being deleted - allow cascade delete of root resource
                RETURN OLD;
            END IF;
            
            -- Also check if project doesn't exist (fallback for edge cases)
            IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id) THEN
                RETURN OLD;
            END IF;
        END IF;
        
        -- Check if this is a cascade delete from org deletion
        IF OLD.project_id IS NULL AND OLD.org_id IS NOT NULL THEN
            -- Check if the org is marked as being deleted
            SELECT EXISTS(
                SELECT 1 FROM public._deleting_orgs WHERE org_id = OLD.org_id
            ) INTO v_org_deleting;
            
            IF v_org_deleting THEN
                -- Org is being deleted - allow cascade delete of root resource
                RETURN OLD;
            END IF;
            
            -- Also check if org doesn't exist (fallback)
            IF NOT EXISTS (SELECT 1 FROM public.orgs WHERE id = OLD.org_id) THEN
                RETURN OLD;
            END IF;
        END IF;
        
        -- Otherwise, prevent manual deletion of root resources
        RAISE EXCEPTION 'Cannot delete root resource types';
    END IF;
    
    -- User must have 'edit' permission to delete a resource
    IF NOT public.can_edit(v_user_id, OLD.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create AFTER DELETE triggers to clean up the temporary tables
CREATE OR REPLACE FUNCTION public.cleanup_deleting_project()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove from temporary table after deletion completes
    DELETE FROM public._deleting_projects WHERE project_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_deleting_project_trigger ON public.projects;
CREATE TRIGGER cleanup_deleting_project_trigger
AFTER DELETE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_deleting_project();

CREATE OR REPLACE FUNCTION public.cleanup_deleting_org()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove from temporary table after deletion completes
    DELETE FROM public._deleting_orgs WHERE org_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_deleting_org_trigger ON public.orgs;
CREATE TRIGGER cleanup_deleting_org_trigger
AFTER DELETE ON public.orgs
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_deleting_org();

-- Add comments
COMMENT ON TABLE public._deleting_projects IS 'Temporary table to track projects being deleted in the current transaction, used to allow cascade deletes of root resources';
COMMENT ON TABLE public._deleting_orgs IS 'Temporary table to track orgs being deleted in the current transaction, used to allow cascade deletes of root resources';
COMMENT ON FUNCTION public.mark_project_deleting() IS 'Marks a project as being deleted before the deletion occurs, allowing cascade deletes of root resources';
COMMENT ON FUNCTION public.mark_org_deleting() IS 'Marks an org as being deleted before the deletion occurs, allowing cascade deletes of root resources';
COMMENT ON FUNCTION public.validate_resource_delete() IS 'Validates resource deletions, allowing cascade deletes of root resources when their parent project/org is being deleted';

