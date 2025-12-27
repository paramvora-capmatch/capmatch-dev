-- Migration: Allow authenticated users to view profiles of related users
-- This replaces the strict "view own profile only" policy to allow collaboration.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON public.profiles;

-- Create new policy for viewing profiles
-- Users can view a profile if:
-- 1. It is their own profile.
-- 2. They share an organization membership.
-- 3. They share a project access grant.
-- 4. They are an owner of an org that owns a project the target user has access to.
-- 5. The target user is an owner of an org that owns a project the current user has access to.

CREATE POLICY "Users can view related profiles" ON public.profiles
FOR SELECT USING (
  -- 1. Own profile
  (select auth.uid()) = id
  OR
  -- 2. Shared Org Membership
  EXISTS (
    SELECT 1 FROM public.org_members om1
    JOIN public.org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = (select auth.uid()) AND om2.user_id = profiles.id
  )
  OR
  -- 3. Shared Project Access (via grants)
  EXISTS (
    SELECT 1 FROM public.project_access_grants pag1
    JOIN public.project_access_grants pag2 ON pag1.project_id = pag2.project_id
    WHERE pag1.user_id = (select auth.uid()) AND pag2.user_id = profiles.id
  )
  OR
  -- 4. Org Owner viewing Project Member (Owner -> Member)
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON p.owner_org_id = om.org_id
    JOIN public.project_access_grants pag ON p.id = pag.project_id
    WHERE om.user_id = (select auth.uid()) AND om.role = 'owner' -- Current user is owner
    AND pag.user_id = profiles.id -- Target user is grantee
  )
  OR
  -- 5. Project Member viewing Org Owner (Member -> Owner)
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON p.owner_org_id = om.org_id
    JOIN public.project_access_grants pag ON p.id = pag.project_id
    WHERE pag.user_id = (select auth.uid()) -- Current user is grantee
    AND om.user_id = profiles.id AND om.role = 'owner' -- Target user is owner
  )
);

-- Keep the update policy restricted to own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = id);

-- Keep the insert policy restricted (usually handled by triggers, but good to have)
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = id);
