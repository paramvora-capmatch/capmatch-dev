-- =============================================================================
-- Migration: Add Resource Validation Triggers
-- =============================================================================
--
-- This migration adds triggers for INSERT, UPDATE, and DELETE operations on resources.
-- These triggers provide an additional layer of authorization validation alongside RLS.
--

-- Step 1: Create the validate_resource_insert function if it doesn't exist
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- If parent_id is null, this is a root resource - only allow for root types
    IF NEW.parent_id IS NULL THEN
        IF NEW.resource_type NOT IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT') THEN
            RAISE EXCEPTION 'Only root resource types (BORROWER_RESUME, BORROWER_DOCS_ROOT, PROJECT_RESUME, PROJECT_DOCS_ROOT) can have null parent_id';
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

-- Step 2: Create the validation triggers for resources
DROP TRIGGER IF EXISTS validate_resource_insert_trigger ON public.resources;
CREATE TRIGGER validate_resource_insert_trigger
BEFORE INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_insert();

-- Step 4: Create a trigger for UPDATE operations
CREATE OR REPLACE FUNCTION public.validate_resource_update()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- User must have 'edit' permission to update a resource
    IF NOT public.can_edit(v_user_id, NEW.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_resource_update_trigger ON public.resources;

CREATE TRIGGER validate_resource_update_trigger
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_update();

-- Step 5: Create a trigger for DELETE operations
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT') THEN
        RAISE EXCEPTION 'Cannot delete root resource types';
    END IF;
    
    -- User must have 'edit' permission to delete a resource
    IF NOT public.can_edit(v_user_id, OLD.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_resource_delete_trigger ON public.resources;

CREATE TRIGGER validate_resource_delete_trigger
BEFORE DELETE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_delete();

