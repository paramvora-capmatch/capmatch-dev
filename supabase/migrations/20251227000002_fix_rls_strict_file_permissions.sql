-- =============================================================================
-- Migration: Fix RLS Policy to Enforce Strict File-Level Permissions
-- =============================================================================
--
-- This migration fixes the RLS policy on the resources table to enforce
-- strict file-level permissions for confidentiality.
--
-- The previous policy allowed viewing files if you could edit the parent folder,
-- which bypassed explicit "none" permissions on individual files.
--
-- The fix: Remove the parent edit check from SELECT policy, so users can only
-- view files they explicitly have view/edit permissions on (respecting "none" overrides).

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;

-- Create a strict SELECT policy that only checks explicit permissions on the resource itself
-- This respects "none" permissions that override parent permissions
CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (
  public.can_view((select auth.uid()), id)
);

COMMENT ON POLICY "Users can view resources they have access to" ON public.resources IS 
'Strict file-level permissions: Users can only view resources they explicitly have view/edit permissions on. Explicit "none" permissions override parent permissions for confidentiality.';

