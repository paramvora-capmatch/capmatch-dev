-- =============================================================================
-- Migration: Fix Search Path Security for SECURITY DEFINER Functions
-- =============================================================================
--
-- Fixes security issue where SECURITY DEFINER functions have mutable search_path.
-- All SECURITY DEFINER functions must explicitly set search_path to prevent
-- search_path injection attacks.
--
-- This migration updates all SECURITY DEFINER functions to include
-- SET search_path = public (or appropriate schema).
--
-- =============================================================================

-- Fix validate_resource_delete function
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION public.validate_resource_delete() IS 
    'Validates resource deletions, allowing cascade deletes of root resources when their parent project/org is being deleted. SECURITY DEFINER with explicit search_path for security.';

-- Fix mark_project_deleting function
CREATE OR REPLACE FUNCTION public.mark_project_deleting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into temporary table to mark this project as being deleted
    INSERT INTO public._deleting_projects (project_id)
    VALUES (OLD.id)
    ON CONFLICT (project_id) DO NOTHING;
    
    RETURN OLD;
END;
$$;

-- Fix mark_org_deleting function
CREATE OR REPLACE FUNCTION public.mark_org_deleting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into temporary table to mark this org as being deleted
    INSERT INTO public._deleting_orgs (org_id)
    VALUES (OLD.id)
    ON CONFLICT (org_id) DO NOTHING;
    
    RETURN OLD;
END;
$$;

-- Fix cleanup_deleting_project function
CREATE OR REPLACE FUNCTION public.cleanup_deleting_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove from temporary table after deletion completes
    DELETE FROM public._deleting_projects WHERE project_id = OLD.id;
    RETURN OLD;
END;
$$;

-- Fix cleanup_deleting_org function
CREATE OR REPLACE FUNCTION public.cleanup_deleting_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove from temporary table after deletion completes
    DELETE FROM public._deleting_orgs WHERE org_id = OLD.id;
    RETURN OLD;
END;
$$;

-- Fix rollback_document_version function
CREATE OR REPLACE FUNCTION public.rollback_document_version(p_resource_id UUID, p_version_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_valid_version BOOLEAN;
    v_current_version_number INT;
    v_rollback_version_number INT;
BEGIN
    -- First, check if the user has edit permissions on the resource.
    IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
        RAISE EXCEPTION 'User does not have permission to edit this resource.';
    END IF;

    -- Verify that the provided version_id actually belongs to the resource_id.
    SELECT EXISTS (
        SELECT 1 FROM public.document_versions
        WHERE id = p_version_id AND resource_id = p_resource_id
    ) INTO v_is_valid_version;

    IF NOT v_is_valid_version THEN
        RAISE EXCEPTION 'The specified version does not belong to the given resource.';
    END IF;

    -- Get the version number we're rolling back to
    SELECT version_number INTO v_rollback_version_number
    FROM public.document_versions
    WHERE id = p_version_id;

    -- Get the current version number
    SELECT dv.version_number INTO v_current_version_number
    FROM public.document_versions dv
    JOIN public.resources r ON r.current_version_id = dv.id
    WHERE r.id = p_resource_id;

    -- Mark all versions after the rollback version as "superseded"
    -- This preserves them in the audit trail but prevents them from being current
    UPDATE public.document_versions
    SET status = 'superseded'
    WHERE resource_id = p_resource_id
      AND version_number > v_rollback_version_number;

    -- Set the rollback version back to 'active'
    UPDATE public.document_versions
    SET status = 'active'
    WHERE id = p_version_id;

    -- Update the resource's current_version_id to the specified version
    UPDATE public.resources
    SET current_version_id = p_version_id
    WHERE id = p_resource_id;
END;
$$;

COMMENT ON FUNCTION public.rollback_document_version(UUID, UUID) IS 
    'Rolls back to a previous version, marking newer versions as superseded in the audit trail. SECURITY DEFINER with explicit search_path for security.';

-- Fix set_version_number function
-- Note: This is a trigger function, not SECURITY DEFINER, but still needs SET search_path for security
CREATE OR REPLACE FUNCTION public.set_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    max_version INT;
BEGIN
    -- Find the current max version number for this resource and increment it.
    -- Version numbers are NEVER reused. They form a complete audit trail.
    -- Rollbacks don't reset the sequence - new edits always get the next number.
    -- This prevents any ambiguity or collisions.
    --
    -- Example: v1 → v2 → v3 → v4 → v5
    --          Rollback to v3 (v4 and v5 become superseded)
    --          New edit → v6 (active), v4 and v5 remain superseded
    --
    -- The COALESCE ensures that the first version will be 1.
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO max_version
    FROM public.document_versions
    WHERE resource_id = NEW.resource_id;

    NEW.version_number = max_version;
    RETURN NEW;
END;
$$;

-- Fix validate_resource_insert function (latest version without OM)
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix validate_resource_update function
CREATE OR REPLACE FUNCTION public.validate_resource_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

