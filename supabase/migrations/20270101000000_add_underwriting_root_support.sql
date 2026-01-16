-- =============================================================================
-- Migration: Add UNDERWRITING_DOCS_ROOT Support
-- Date: 2026-02-13
-- =============================================================================
--
-- This migration updates the resource validation constraints and triggers to
-- fully support UNDERWRITING_DOCS_ROOT as a valid root resource type.
-- This fixes the error: "Only root resource types ... can have null parent_id"
--
-- =============================================================================

-- 1. Update Check Constraint
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_resource_type_check CHECK (
    resource_type IN (
        'BORROWER_RESUME',
        'BORROWER_DOCS_ROOT',
        'PROJECT_RESUME',
        'PROJECT_DOCS_ROOT',
        'UNDERWRITING_DOCS_ROOT',
        'OM',
        'FOLDER',
        'FILE'
    )
);

-- 2. Update validate_resource_insert function
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- If parent_id is null, this is a root resource - only allow for root types
    IF NEW.parent_id IS NULL THEN
        IF NEW.resource_type NOT IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'OM', 'UNDERWRITING_DOCS_ROOT') THEN
            RAISE EXCEPTION 'Only root resource types (BORROWER_RESUME, BORROWER_DOCS_ROOT, PROJECT_RESUME, PROJECT_DOCS_ROOT, OM, UNDERWRITING_DOCS_ROOT) can have null parent_id';
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

-- 3. Update validate_resource_delete function
-- Preserving cascade logic from 20260128000000_fix_cascade_delete_for_root_resources.sql
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_project_deleting BOOLEAN;
    v_org_deleting BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources, BUT allow it if the project/org is being deleted
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT', 'OM', 'UNDERWRITING_DOCS_ROOT') THEN
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

COMMENT ON FUNCTION public.validate_resource_insert() IS 'Validates resource insertions, allowing UNDERWRITING_DOCS_ROOT as a root resource type';
COMMENT ON FUNCTION public.validate_resource_delete() IS 'Validates resource deletions, protecting UNDERWRITING_DOCS_ROOT as a root resource type';
