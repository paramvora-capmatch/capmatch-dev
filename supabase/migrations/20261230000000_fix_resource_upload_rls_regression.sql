-- =============================================================================
-- Migration: Fix Resource Upload RLS Regression
-- Date: 2026-12-30
-- =============================================================================
--
-- This migration fixes a regression introduced in 20251228000002_optimize_rls_auth_uid.sql
-- where the upload safety fallback in the resources table's SELECT policy was
-- inadvertently removed.
--
-- The issue: When a new resource is inserted, Supabase (PostgREST) try to SELECT 
-- the row back (INSERT ... RETURNING). If the SELECT policy is too strict 
-- (e.g., only checking explicit access which might not be indexed yet for the
-- new row in the same transaction), the SELECT fails with a 403 or 406 error.
--
-- The fix: Restore the fallback that allows viewing a resource if the user
-- can EDIT the parent folder, provided there is no explicit 'none' permission.
-- This ensures creators can see their new files while maintaining strict
-- confidentiality overrides.
--
-- =============================================================================

DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;

CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (
  -- 1. Primary strict check: explicit or correctly inherited permission
  public.can_view(public.get_current_user_id(), id)
  OR
  -- 2. Fallback for upload/creation:
  -- If the user has edit rights on the parent (which allowed them to create the file),
  -- they should be able to view it, UNLESS they have an explicit 'none' permission on this resource.
  (
    parent_id IS NOT NULL
    AND public.can_edit(public.get_current_user_id(), parent_id)
    AND NOT public.has_explicit_none_permission(public.get_current_user_id(), id)
  )
);

COMMENT ON POLICY "Users can view resources they have access to" ON public.resources IS 
'Strict file-level permissions with upload safety: Users can view if they have explicit/inherited access OR if they can edit the parent (and are not explicitly blocked). Optimized with get_current_user_id().';
