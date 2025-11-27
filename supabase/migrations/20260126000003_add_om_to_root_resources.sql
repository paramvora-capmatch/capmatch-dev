-- =============================================================================
-- Migration: Add OM to Root Resource Types
-- =============================================================================
-- This migration updates the resource validation triggers to allow OM as a root resource type

-- Update validate_resource_insert function to include OM
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- If parent_id is null, this is a root resource - only allow for root types
    IF NEW.parent_id IS NULL THEN
        IF NEW.resource_type NOT IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'OM') THEN
            RAISE EXCEPTION 'Only root resource types (BORROWER_RESUME, BORROWER_DOCS_ROOT, PROJECT_RESUME, PROJECT_DOCS_ROOT, OM) can have null parent_id';
        END IF;
        RETURN NEW;
    END IF;

    -- For non-root resources, check if user has 'edit' permission on the parent
    IF NOT public.can_edit(v_user_id, NEW.parent_id) THEN
        RAISE EXCEPTION 'User does not have edit permission on the parent resource';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update validate_resource_delete function to include OM in protected root resources
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT', 'OM') THEN
        RAISE EXCEPTION 'Cannot delete root resource types';
    END IF;
    
    -- User must have 'edit' permission to delete a resource
    IF NOT public.can_edit(v_user_id, OLD.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_resource_insert() IS 'Validates resource insertions, allowing OM as a root resource type';
COMMENT ON FUNCTION public.validate_resource_delete() IS 'Validates resource deletions, protecting OM as a root resource type';

