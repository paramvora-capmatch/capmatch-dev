-- =============================================================================
-- Migration: RLS Rebuild (Part 3) - Supabase Storage Security
-- =============================================================================
--
-- This migration implements the final and most critical piece of the security model:
-- Row Level Security for Supabase Storage. It creates a robust, "two-lock"
-- system that ensures a user can only interact with a file in storage if they
-- have the correct permissions in the database.
--
-- This design is secure, scalable, and correctly handles all file operations
-- (upload, download, overwrite, delete) by using different logic for each.
--
-- =============================================================================
-- 1. Helper Function for Existing Files
-- =============================================================================

-- This function is used by policies for actions on existing files (SELECT, UPDATE, DELETE).
-- It finds the corresponding `resource_id` from the file's unique storage path.
CREATE OR REPLACE FUNCTION public.get_resource_by_storage_path(p_storage_path TEXT)
RETURNS UUID AS $$
DECLARE
    v_resource_id UUID;
BEGIN
    SELECT id INTO v_resource_id
    FROM public.resources
    WHERE storage_path = p_storage_path;
    RETURN v_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_resource_by_storage_path IS 'Retrieves a resource ID from its storage path, for use in storage RLS policies.';


-- =============================================================================
-- 2. Core Logic for New Uploads (`INSERT`)
-- =============================================================================

-- This function is the "brain" for the INSERT policy. It checks if a user has
-- 'edit' permission on the DESTINATION FOLDER of a new file upload.
CREATE OR REPLACE FUNCTION public.can_upload_to_path(p_bucket_id TEXT, p_path_tokens TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID := p_bucket_id::UUID;
    v_context_token TEXT := p_path_tokens[1];
    v_resource_token TEXT := CASE WHEN array_length(p_path_tokens, 1) >= 2 THEN p_path_tokens[2] ELSE NULL END;
    v_path_depth INT := array_length(p_path_tokens, 1);
    v_parent_id UUID;
    v_target_file_id UUID;
    v_current_folder_name TEXT;
    i INT;
BEGIN
    -- A valid path must have at least a context (e.g., project_id or borrower_docs) and a filename.
    IF v_path_depth < 2 THEN
        RETURN FALSE;
    END IF;

    -- Step 1: Determine the root folder based on the path's context.
    IF v_context_token IN ('borrower-docs', 'borrower_docs') THEN
        -- This is an org-level document. The root is BORROWER_DOCS_ROOT.
        SELECT id INTO v_parent_id FROM public.resources WHERE org_id = v_org_id AND resource_type = 'BORROWER_DOCS_ROOT';
    ELSE
        -- Assume the context is a project_id. The root is PROJECT_DOCS_ROOT.
        BEGIN
            SELECT id INTO v_parent_id FROM public.resources WHERE project_id = v_context_token::UUID AND resource_type = 'PROJECT_DOCS_ROOT';
        EXCEPTION WHEN invalid_text_representation THEN
            -- If the token is not a valid UUID, it's an invalid path.
            RETURN FALSE;
        END;
    END IF;

    -- If the root folder resource doesn't exist, access is denied.
    IF v_parent_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fast-path: If the second token is a UUID referencing an existing FILE resource under the root,
    -- allow upload when the user can edit that file (new version uploads pattern: <context>/<resourceId>/<fileName>)
    IF v_resource_token IS NOT NULL THEN
        BEGIN
            SELECT id INTO v_target_file_id
            FROM public.resources
            WHERE id = v_resource_token::UUID AND parent_id = v_parent_id AND resource_type = 'FILE';
        EXCEPTION WHEN invalid_text_representation THEN
            v_target_file_id := NULL;
        END;

        IF v_target_file_id IS NOT NULL THEN
            RETURN public.can_edit(auth.uid(), v_target_file_id) OR public.can_edit(auth.uid(), v_parent_id);
        END IF;
    END IF;

    -- Fallback: Traverse subfolders by names (classic folder paths)
    IF v_path_depth > 2 THEN
        FOR i IN 2..(v_path_depth - 1) LOOP
            v_current_folder_name := p_path_tokens[i];
            SELECT id INTO v_parent_id FROM public.resources WHERE parent_id = v_parent_id AND name = v_current_folder_name AND resource_type = 'FOLDER';
            IF v_parent_id IS NULL THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;

    -- Final check on the computed destination parent
    RETURN public.can_edit(auth.uid(), v_parent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_upload_to_path IS 'Checks if a user has "edit" permission on the destination folder for a new file upload.';


-- A variant that accepts the user id explicitly to avoid auth context issues
CREATE OR REPLACE FUNCTION public.can_upload_to_path_for_user(p_user_id UUID, p_bucket_id TEXT, p_path_tokens TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID := p_bucket_id::UUID;
    v_context_token TEXT := p_path_tokens[1];
    v_resource_token TEXT := CASE WHEN array_length(p_path_tokens, 1) >= 2 THEN p_path_tokens[2] ELSE NULL END;
    v_path_depth INT := array_length(p_path_tokens, 1);
    v_parent_id UUID;
    v_target_file_id UUID;
    v_current_folder_name TEXT;
    i INT;
BEGIN
    IF v_path_depth < 2 THEN
        RETURN FALSE;
    END IF;

    IF v_context_token IN ('borrower-docs', 'borrower_docs') THEN
        SELECT id INTO v_parent_id FROM public.resources WHERE org_id = v_org_id AND resource_type = 'BORROWER_DOCS_ROOT';
    ELSE
        BEGIN
            SELECT id INTO v_parent_id FROM public.resources WHERE project_id = v_context_token::UUID AND resource_type = 'PROJECT_DOCS_ROOT';
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN FALSE;
        END;
    END IF;

    IF v_parent_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fast-path for versioned file uploads using <context>/<resourceId>/...
    IF v_resource_token IS NOT NULL THEN
        BEGIN
            SELECT id INTO v_target_file_id
            FROM public.resources
            WHERE id = v_resource_token::UUID AND parent_id = v_parent_id AND resource_type = 'FILE';
        EXCEPTION WHEN invalid_text_representation THEN
            v_target_file_id := NULL;
        END;

        IF v_target_file_id IS NOT NULL THEN
            RETURN public.can_edit(p_user_id, v_target_file_id) OR public.can_edit(p_user_id, v_parent_id);
        END IF;
    END IF;

    IF v_path_depth > 2 THEN
        FOR i IN 2..(v_path_depth - 1) LOOP
            v_current_folder_name := p_path_tokens[i];
            SELECT id INTO v_parent_id FROM public.resources WHERE parent_id = v_parent_id AND name = v_current_folder_name AND resource_type = 'FOLDER';
            IF v_parent_id IS NULL THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;

    RETURN public.can_edit(p_user_id, v_parent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =============================================================================
-- 3. RLS Policies for `storage.objects`
-- =============================================================================

-- Drop any existing policies to ensure a clean slate.
DROP POLICY IF EXISTS "Unified storage access policy" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to folders they can edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files they can edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files they can edit" ON storage.objects;

-- Policy 1: INSERT (Uploads)
-- Checks permissions on the DESTINATION FOLDER. Policies must be TO public;
-- auth.uid() is still available from the JWT claims provided by the storage service.
CREATE POLICY "Users can upload files to folders they can edit" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK ( public.can_upload_to_path_for_user((select auth.uid()), bucket_id, string_to_array(name,'/')) );

-- Policy 2: SELECT (Downloads)
-- Checks permissions on the FILE ITSELF. Apply TO public.
CREATE POLICY "Users can view files they have access to" ON storage.objects
FOR SELECT TO authenticated
USING (
  public.can_view((select auth.uid()), public.get_resource_by_storage_path(name))
  OR (
    public.get_resource_by_storage_path(name) IS NULL AND EXISTS (
      SELECT 1 FROM public.project_access_grants pag
      WHERE pag.user_id = (select auth.uid())
        AND pag.project_id = (
          CASE WHEN (string_to_array(name,'/'))[1] ~ '^[0-9a-fA-F-]{36}$'
               THEN ((string_to_array(name,'/'))[1])::uuid
               ELSE NULL
          END
        )
    )
  )
);

-- Policy 3: UPDATE (Overwrites)
-- Checks permissions on the FILE ITSELF. Apply TO public.
CREATE POLICY "Users can update files they can edit" ON storage.objects
FOR UPDATE TO authenticated
USING ( public.can_edit((select auth.uid()), public.get_resource_by_storage_path(name)) );

-- Policy 4: DELETE (Deletions)
-- Checks permissions on the FILE ITSELF. Apply TO public.
CREATE POLICY "Users can delete files they can edit" ON storage.objects
FOR DELETE TO authenticated
USING ( public.can_edit((select auth.uid()), public.get_resource_by_storage_path(name)) );
