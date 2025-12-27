-- =============================================================================
-- Migration: Fix Upload Error caused by Strict Permissions
-- Date: 2025-12-28
-- =============================================================================
--
-- The previous migration (20251227000002) tightened the SELECT policy on resources
-- to `can_view(id)`. This caused issues with new file uploads where the 
-- inheritance lookup via `can_view` might fail or be too strict during the 
-- initial INSERT+SELECT transaction.
--
-- This migration adds a safety fallback: Users can view a file if they can edit
-- the parent folder, PROVIDED there is no explicit 'none' permission on the file.
-- This maintains strict "none" overrides while ensuring creators can see their new files.
--
-- IMPORTANT: This policy handles NULL parent_id (root resources) correctly by
-- only applying the fallback when parent_id IS NOT NULL.

-- Helper function to efficiently check for explicit 'none' permission
CREATE OR REPLACE FUNCTION public.has_explicit_none_permission(
  p_user_id UUID,
  p_resource_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.permissions
    WHERE resource_id = p_resource_id
      AND user_id = p_user_id
      AND permission = 'none'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_explicit_none_permission IS 
'Checks if a user has an explicit ''none'' permission on a resource. Used in RLS policies to respect explicit denials.';

-- Add index to optimize the 'none' permission check if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_permissions_resource_user_none 
ON public.permissions(resource_id, user_id) 
WHERE permission = 'none';

DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;

CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (
  -- 1. Primary strict check: explicit or correctly inherited permission
  -- This already respects 'none' permissions via get_effective_permission
  public.can_view((select auth.uid()), id)
  OR
  -- 2. Fallback for upload/creation (only for non-root resources):
  -- If the user has edit rights on the parent (which allows them to create the file),
  -- they should be able to view it, UNLESS they have an explicit 'none' permission.
  (
    parent_id IS NOT NULL
    AND public.can_edit((select auth.uid()), parent_id)
    AND NOT public.has_explicit_none_permission((select auth.uid()), id)
  )
);

COMMENT ON POLICY "Users can view resources they have access to" ON public.resources IS 
'Strict file-level permissions with upload safety: Users can view if they have explicit/inherited access OR if they can edit the parent (and are not explicitly blocked). Only applies parent fallback to non-root resources.';

