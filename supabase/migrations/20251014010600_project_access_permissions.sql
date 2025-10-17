-- =============================================================================
-- Storage RLS Policies (for Hierarchical Permissions Model)
-- =============================================================================

-- Helper to extract project id from storage object key (expects "{org_id}/{project_id}/...")
CREATE OR REPLACE FUNCTION public.storage_object_project_id(p_name TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(split_part(p_name, '/', 2), '')::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper to find a resource by its storage path.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- The "Two-Lock" Security System for Storage Objects
-- =============================================================================

-- Lock #1: Verifies the object's bucket matches the project's owner org.
CREATE OR REPLACE FUNCTION public.bucket_owns_project_from_path(p_name TEXT, p_bucket_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_project_id UUID;
  v_owner_org_id_expected TEXT;
BEGIN
  v_project_id := public.storage_object_project_id(p_name);
  IF v_project_id IS NULL THEN
    RETURN FALSE; -- Not a valid project file path
  END IF;

  SELECT owner_org_id::text INTO v_owner_org_id_expected
  FROM public.projects
  WHERE id = v_project_id;

  RETURN v_owner_org_id_expected IS NOT NULL AND p_bucket_id = v_owner_org_id_expected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Lock #2: The master function that checks if a user has permission to a storage object.
CREATE OR REPLACE FUNCTION public.can_user_access_object(p_user_id UUID, p_storage_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_resource_id UUID;
    v_permission TEXT;
BEGIN
    v_resource_id := public.get_resource_by_storage_path(p_storage_path);
    IF v_resource_id IS NULL THEN
        RETURN FALSE; -- No resource corresponds to this file path
    END IF;

    v_permission := public.get_effective_permission(p_user_id, v_resource_id);

    -- For storage, we only care about 'view' or 'edit'. NULL means no access.
    RETURN v_permission IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Final RLS Policies on storage.objects
-- =============================================================================

DROP POLICY IF EXISTS "Unified storage access policy" ON storage.objects;

CREATE POLICY "Unified storage access policy" ON storage.objects
FOR ALL
USING (
  -- Lock #1: Is the file in the correct organization's bucket?
  public.bucket_owns_project_from_path(name, bucket_id)
  AND
  -- Lock #2: Does this user have permission to access the resource for this file?
  public.can_user_access_object(auth.uid(), name)
)
WITH CHECK (
  public.bucket_owns_project_from_path(name, bucket_id)
  AND
  public.can_user_access_object(auth.uid(), name)
);
