-- =============================================================================
-- Migration: Document Versioning System
-- =============================================================================
--
-- This migration introduces tables and functions to support versioning
-- of documents uploaded to the system.

-- Step 1: Create the document_versions table to store each snapshot.
CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changes_url TEXT, -- URL to OnlyOffice changes.zip
    metadata JSONB, -- Store file size, mime type, etc.
    UNIQUE(resource_id, version_number)
);
COMMENT ON TABLE public.document_versions IS 'Stores a snapshot for each version of a document resource.';
CREATE INDEX idx_document_versions_resource_id ON public.document_versions(resource_id);

-- Step 2: Modify the resources table to support versioning.
-- Remove the old storage_path and add a link to the current version.
-- The old storage_path is kept temporarily for data migration if needed, but then dropped.
ALTER TABLE public.resources
    DROP COLUMN IF EXISTS storage_path,
    ADD COLUMN current_version_id UUID REFERENCES public.document_versions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.resources.current_version_id IS 'Points to the currently active version of the document in the document_versions table.';
CREATE INDEX idx_resources_current_version_id ON public.resources(current_version_id);

-- Step 3: Create a sequence and trigger for auto-incrementing version numbers per resource.
CREATE SEQUENCE public.version_number_seq;

CREATE OR REPLACE FUNCTION public.set_version_number()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_version_number_trigger
BEFORE INSERT ON public.document_versions
FOR EACH ROW EXECUTE FUNCTION public.set_version_number();
COMMENT ON TRIGGER set_version_number_trigger ON public.document_versions IS 'Automatically assigns an incremental version number for new document versions, scoped to the resource.';

-- Step 4: Add RLS policy for the new table.
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access versions of resources they can view" ON public.document_versions
FOR ALL
USING (
    public.can_view(auth.uid(), resource_id)
)
WITH CHECK (
    public.can_edit(auth.uid(), resource_id)
);

-- Step 5: Create a function to handle rolling back to a previous version.
CREATE OR REPLACE FUNCTION public.rollback_document_version(p_resource_id UUID, p_version_id UUID)
RETURNS void AS $$
DECLARE
    v_is_valid_version BOOLEAN;
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

    -- Then, update the resource's current_version_id to the specified version.
    UPDATE public.resources
    SET current_version_id = p_version_id
    WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.rollback_document_version IS 'Sets the current_version_id of a resource to a specified historical version ID, effectively rolling it back.';


-- Step 6: Create a function to recursively delete a folder and its contents from the database.
CREATE OR REPLACE FUNCTION public.delete_folder_and_children(p_folder_id UUID)
RETURNS void AS $$
BEGIN
    -- IMPORTANT: This function ONLY deletes database records for the folder
    -- and its contents. It does NOT delete the associated files from Supabase Storage.
    -- Storage cleanup for recursive deletes should be handled by an Edge Function
    -- that can iterate through all nested files and delete them from storage before
    -- calling this function to clean up the database records. Client-side recursive
    -- deletion is also an option but is less efficient and less secure.

    -- Check if user has edit permission on the folder to be deleted.
    IF NOT public.can_edit(auth.uid(), p_folder_id) THEN
        RAISE EXCEPTION 'Permission denied to delete this folder.';
    END IF;

    -- Delete the folder and all its descendant resources from the database.
    -- The ON DELETE CASCADE constraints on `document_versions` and `permissions`
    -- will handle cleanup of related records.
    WITH RECURSIVE resource_tree AS (
        SELECT id
        FROM public.resources
        WHERE id = p_folder_id
        UNION ALL
        SELECT r.id
        FROM public.resources r
        JOIN resource_tree rt ON r.parent_id = rt.id
    )
    DELETE FROM public.resources WHERE id IN (SELECT id FROM resource_tree);

END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.delete_folder_and_children IS 'Recursively deletes a folder resource and all its descendant resources from the database. Does NOT handle storage object deletion.';


-- Step 7: Update storage RLS policy - drop old version that references resources.storage_path
-- We must drop the policy BEFORE dropping the function, since the policy depends on it.
DROP POLICY IF EXISTS "Unified storage access policy" ON storage.objects;

-- Step 8: Now drop and recreate `get_resource_by_storage_path` to be version-aware.
-- This replaces the old implementation from 20251014010200 that looked for
-- storage_path directly on resources (which no longer exists after step 2).
DROP FUNCTION IF EXISTS public.get_resource_by_storage_path(TEXT);
CREATE OR REPLACE FUNCTION public.get_resource_by_storage_path(p_storage_path TEXT)
RETURNS UUID AS $$
DECLARE
    v_resource_id UUID;
BEGIN
    SELECT resource_id INTO v_resource_id
    FROM public.document_versions
    WHERE storage_path = p_storage_path;
    RETURN v_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.get_resource_by_storage_path IS 'Finds the resource ID associated with a specific version''s storage path (version-aware replacement).';

-- Step 9: Recreate the storage policy with the new version-aware function
CREATE POLICY "Unified storage access policy" ON storage.objects FOR ALL
USING (
    -- The bucket ID must be the org_id the user is a member of.
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = bucket_id::uuid AND user_id = auth.uid()
    )
    AND
    -- User must have 'view' or 'edit' on the corresponding resource.
    -- For uploads in progress, the document_versions record may not exist yet,
    -- so we check: if a resource is found, verify permission; otherwise allow
    -- (assuming the application layer has already validated ownership).
    (
        public.get_resource_by_storage_path(name) IS NULL
        OR
        public.get_effective_permission(auth.uid(), public.get_resource_by_storage_path(name)) IS NOT NULL
    )
)
WITH CHECK (
    -- User must have 'edit' on the corresponding resource to upload/update.
    -- Same logic as above: if no version record exists yet, allow it (new upload).
    -- If a version record exists, user must have edit permission.
    (
        public.get_resource_by_storage_path(name) IS NULL
        OR
        public.get_effective_permission(auth.uid(), public.get_resource_by_storage_path(name)) = 'edit'
    )
);

-- Step 10: Verify delete_folder_and_children function exists (it should from Step 6)
-- If it doesn't exist for some reason, create it here
CREATE OR REPLACE FUNCTION public.delete_folder_and_children(p_folder_id UUID)
RETURNS void AS $$
BEGIN
    -- IMPORTANT: This function ONLY deletes database records for the folder
    -- and its contents. It does NOT delete the associated files from Supabase Storage.
    -- Storage cleanup for recursive deletes should be handled by an Edge Function
    -- that can iterate through all nested files and delete them from storage before
    -- calling this function to clean up the database records. Client-side recursive
    -- deletion is also an option but is less efficient and less secure.

    -- Check if user has edit permission on the folder to be deleted.
    IF NOT public.can_edit(auth.uid(), p_folder_id) THEN
        RAISE EXCEPTION 'Permission denied to delete this folder.';
    END IF;

    -- Delete the folder and all its descendant resources from the database.
    -- The ON DELETE CASCADE constraints on `document_versions` and `permissions`
    -- will handle cleanup of related records.
    WITH RECURSIVE resource_tree AS (
        SELECT id
        FROM public.resources
        WHERE id = p_folder_id
        UNION ALL
        SELECT r.id
        FROM public.resources r
        JOIN resource_tree rt ON r.parent_id = rt.id
    )
    DELETE FROM public.resources WHERE id IN (SELECT id FROM resource_tree);

END;
$$ LANGUAGE plpgsql;

-- Step 10: Grant execute permissions on new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.rollback_document_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_folder_and_children(UUID) TO authenticated;

-- Step 11: Update the get_resource_id_from_fk function to handle BORROWER_DOCS_ROOT
CREATE OR REPLACE FUNCTION public.get_resource_id_from_fk(p_fk_id UUID, p_resource_type TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.resources WHERE 
    (
        (p_resource_type = 'PROJECT_RESUME' AND project_id = p_fk_id) OR
        (p_resource_type = 'PROJECT_DOCS_ROOT' AND project_id = p_fk_id) OR
        (p_resource_type = 'BORROWER_RESUME' AND org_id = p_fk_id) OR
        (p_resource_type = 'BORROWER_DOCS_ROOT' AND org_id = p_fk_id)
    )
    AND resource_type = p_resource_type 
  LIMIT 1;
$$ LANGUAGE sql STABLE;