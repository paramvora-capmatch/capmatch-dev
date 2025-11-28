-- =============================================================================
-- Migration: Remove OM Versioning - Single Row Per Project
-- =============================================================================
-- This migration removes OM versioning and makes OM a single row per project.
-- OM is now derived on-the-fly from the latest project resume, so no versioning needed.

-- Step 1: Add UNIQUE constraint on project_id to ensure only one row per project
-- First, if there are multiple rows per project, keep only the latest one
DO $$
DECLARE
    project_record RECORD;
    latest_om_id UUID;
BEGIN
    -- For each project with multiple OM rows, delete all but the latest
    FOR project_record IN 
        SELECT project_id, COUNT(*) as count
        FROM public.om
        GROUP BY project_id
        HAVING COUNT(*) > 1
    LOOP
        -- Get the latest OM row for this project
        SELECT id INTO latest_om_id
        FROM public.om
        WHERE project_id = project_record.project_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Delete all other rows
        DELETE FROM public.om
        WHERE project_id = project_record.project_id
        AND id != latest_om_id;
    END LOOP;
END $$;

-- Now add the UNIQUE constraint
ALTER TABLE public.om
ADD CONSTRAINT om_project_id_unique UNIQUE (project_id);

-- Update the index to just be on project_id (no need for created_at DESC anymore)
DROP INDEX IF EXISTS idx_om_project_id;
CREATE INDEX IF NOT EXISTS idx_om_project_id ON public.om(project_id);

-- Step 2: Update RLS policies to not depend on resources table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view OM based on resource permissions" ON public.om;
DROP POLICY IF EXISTS "Users can insert OM based on resource permissions" ON public.om;
DROP POLICY IF EXISTS "Users can update OM based on resource permissions" ON public.om;
DROP POLICY IF EXISTS "Users can delete OM based on resource permissions" ON public.om;

-- Create new policies based on project access (similar to project_resumes)
-- Users can view OM if they can view the project
CREATE POLICY "Users can view OM if they can view the project" ON public.om
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_access_grants pag
        WHERE pag.project_id = om.project_id
        AND pag.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.org_members om_member ON om_member.org_id = p.owner_org_id
        WHERE p.id = om.project_id
        AND om_member.user_id = auth.uid()
    )
);

-- Users can insert/update OM if they can edit the project (via PROJECT_RESUME resource)
CREATE POLICY "Users can insert OM if they can edit the project" ON public.om
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'PROJECT_RESUME'
        AND public.can_edit(auth.uid(), r.id)
    )
);

CREATE POLICY "Users can update OM if they can edit the project" ON public.om
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'PROJECT_RESUME'
        AND public.can_edit(auth.uid(), r.id)
    )
);

-- Users can delete OM if they can edit the project
CREATE POLICY "Users can delete OM if they can edit the project" ON public.om
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'PROJECT_RESUME'
        AND public.can_edit(auth.uid(), r.id)
    )
);

-- Step 3: Remove OM from resources table check constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'resources_resource_type_check'
    ) THEN
        ALTER TABLE public.resources 
        DROP CONSTRAINT resources_resource_type_check;
        
        ALTER TABLE public.resources 
        ADD CONSTRAINT resources_resource_type_check 
        CHECK (resource_type IN (
            'BORROWER_RESUME',
            'BORROWER_DOCS_ROOT',
            'PROJECT_RESUME',
            'PROJECT_DOCS_ROOT',
            'FOLDER',
            'FILE'
        ));
    END IF;
END $$;

-- Step 4: Update validation triggers to remove OM
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

-- Step 5: Delete all OM resources from resources table
-- First delete any permissions associated with OM resources
DELETE FROM public.permissions
WHERE resource_id IN (
    SELECT id FROM public.resources WHERE resource_type = 'OM'
);

-- Then delete the OM resources themselves
DELETE FROM public.resources
WHERE resource_type = 'OM';

-- Update table comment
COMMENT ON TABLE public.om IS 'Stores a single row per project with derived OM data from the latest project resume. No versioning - data is derived on-the-fly.';

