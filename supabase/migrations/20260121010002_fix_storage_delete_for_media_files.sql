-- =============================================================================
-- Migration: Fix Storage DELETE Policy for Media Files
-- =============================================================================
--
-- This migration fixes the DELETE permission issue for site-images and 
-- architectural-diagrams files that don't have resource records in the database.
--
-- The issue: The DELETE policy only checks can_edit() which requires a resource
-- record. Media files (site-images, architectural-diagrams) are stored directly
-- in storage without resource records, so deletion fails.
--
-- The fix: Add the same fallback logic used in the SELECT policy - allow deletion
-- of files in site-images and architectural-diagrams folders if:
-- 1. The user has project access (via project_access_grants)
-- 2. The file path matches the pattern: projectId/site-images/* or projectId/architectural-diagrams/*
--
-- =============================================================================

-- Drop the existing DELETE policy
DROP POLICY IF EXISTS "Users can delete files they can edit" ON storage.objects;

-- Recreate the DELETE policy with fallback for media files
CREATE POLICY "Users can delete files they can edit" ON storage.objects
FOR DELETE TO authenticated
USING (
  -- Original check: user can edit if there's a resource record
  public.can_edit(auth.uid(), public.get_resource_by_storage_path(name))
  OR
  -- Fallback: allow deletion of media files (site-images, architectural-diagrams)
  -- if there's no resource record but user has project access
  (
    public.get_resource_by_storage_path(name) IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.project_access_grants pag
      WHERE pag.user_id = auth.uid()
        AND pag.project_id = (
          CASE WHEN (string_to_array(name,'/'))[1] ~ '^[0-9a-fA-F-]{36}$'
               THEN ((string_to_array(name,'/'))[1])::uuid
               ELSE NULL
          END
        )
    )
    -- Only allow for media file folders
    AND (
      (string_to_array(name,'/'))[2] = 'site-images'
      OR (string_to_array(name,'/'))[2] = 'architectural-diagrams'
    )
  )
);

-- Note: Policy allows users to delete files they can edit via resource records, 
-- OR delete media files (site-images/architectural-diagrams) if they have project 
-- access and the file has no resource record.

