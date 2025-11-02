-- =============================================================================
-- Migration: Fix Resource Delete Trigger to Allow Cascade Deletes
-- =============================================================================
--
-- This migration fixes the validate_resource_delete trigger to allow cascade
-- deletes of root resources when their parent project or org is being deleted.
-- Previously, the trigger would block ALL deletions of root resources, which
-- prevented proper cleanup when deleting projects or organizations.
--

-- Update the validate_resource_delete function to allow cascade deletes
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources, BUT allow it if the project/org is being deleted
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT') THEN
        -- Check if this is a cascade delete from project deletion
        IF OLD.project_id IS NOT NULL THEN
            -- If the project doesn't exist anymore, this is a cascade delete - allow it
            IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id) THEN
                RETURN OLD;
            END IF;
        END IF;
        -- Check if this is a cascade delete from org deletion
        IF OLD.project_id IS NULL AND OLD.org_id IS NOT NULL THEN
            -- If the org doesn't exist anymore, this is a cascade delete - allow it
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

