-- =============================================================================
-- Fix RLS policy "Allow inserts for authenticated users - validation via trigger"
-- =============================================================================
-- The policy used WITH CHECK (true), which bypasses RLS for INSERT. Replace with
-- a restrictive check: user can insert only when they can edit the parent
-- (non-root) or when inserting an allowed root type (trigger still validates).
-- =============================================================================

DROP POLICY IF EXISTS "Allow inserts for authenticated users - validation via trigger" ON public.resources;

CREATE POLICY "Users can create resources in folders they can edit or allowed root types"
ON public.resources
FOR INSERT
TO authenticated
WITH CHECK (
  -- Non-root: must be able to edit the parent folder
  (parent_id IS NOT NULL AND public.can_edit(public.get_current_user_id(), parent_id))
  OR
  -- Root: only allowed resource types (validate_resource_insert trigger enforces permissions)
  (
    parent_id IS NULL
    AND resource_type IN (
      'BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT',
      'OM', 'UNDERWRITING_DOCS_ROOT', 'UNDERWRITING_TEMPLATES_ROOT'
    )
  )
);

COMMENT ON POLICY "Users can create resources in folders they can edit or allowed root types" ON public.resources IS
'INSERT restricted by RLS: non-root requires can_edit(parent_id); root requires allowed resource_type. validate_resource_insert trigger still enforces full permission and type validation.';
