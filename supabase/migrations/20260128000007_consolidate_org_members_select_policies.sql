-- =============================================================================
-- Migration: Consolidate Multiple SELECT Policies on org_members and project_access_grants
-- =============================================================================
--
-- Fixes performance issues where multiple permissive SELECT policies on tables
-- cause each policy to be evaluated for every query. Combines all SELECT policies
-- into single unified policies using OR conditions.
--
-- org_members table - Previous SELECT policies:
-- 1. "Users can view their own org membership" - user_id = auth.uid()
-- 2. "Owners can view org membership" - is_org_owner(org_id, auth.uid())
-- 3. "Advisors can view org members for assigned project orgs" - advisor check
-- 4. "Owners can manage org membership" - FOR ALL (includes SELECT, redundant)
--
-- project_access_grants table - Previous SELECT policies:
-- 1. "Users can view their own project access grants" - user_id = auth.uid()
-- 2. "Advisors can view grants for assigned projects" - is_assigned_advisor check
-- 3. "Members can view grants for their projects" - user_has_project_access check
-- 4. "Org owners can manage project access grants" - FOR ALL (includes SELECT, redundant)
--
-- =============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own org membership" ON public.org_members;
DROP POLICY IF EXISTS "Owners can view org membership" ON public.org_members;
DROP POLICY IF EXISTS "Advisors can view org members for assigned project orgs" ON public.org_members;
DROP POLICY IF EXISTS "Owners can manage org membership" ON public.org_members;

-- Create unified SELECT policy combining all conditions
CREATE POLICY "Users can view org members" ON public.org_members
FOR SELECT USING (
    -- 1. Users can view their own org membership
    user_id = (select auth.uid())
    OR
    -- 2. Owners can view all members in their orgs
    public.is_org_owner(org_id, (select auth.uid()))
    OR
    -- 3. Advisors can view org members for orgs that own projects they're assigned to
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.owner_org_id = org_members.org_id
        AND projects.assigned_advisor_id = (select auth.uid())
    )
);

COMMENT ON POLICY "Users can view org members" ON public.org_members IS 
    'Unified SELECT policy combining all org member visibility rules: own membership, org owner access, and advisor access. Optimized by using (select auth.uid()) to avoid per-row evaluation.';

-- Recreate the management policy for INSERT/UPDATE/DELETE only (not SELECT)
-- Note: We use separate policies instead of FOR ALL to avoid redundant evaluation
-- on SELECT operations (FOR ALL policies are still evaluated for SELECT even if
-- a FOR SELECT policy exists)
CREATE POLICY "Owners can insert org membership" ON public.org_members
FOR INSERT WITH CHECK (
    public.is_org_owner(org_id, (select auth.uid()))
);

CREATE POLICY "Owners can update org membership" ON public.org_members
FOR UPDATE USING (
    public.is_org_owner(org_id, (select auth.uid()))
)
WITH CHECK (
    public.is_org_owner(org_id, (select auth.uid()))
);

CREATE POLICY "Owners can delete org membership" ON public.org_members
FOR DELETE USING (
    public.is_org_owner(org_id, (select auth.uid()))
);

COMMENT ON POLICY "Owners can insert org membership" ON public.org_members IS 
    'Allows org owners to INSERT org memberships. SELECT is handled by the unified "Users can view org members" policy.';

-- =============================================================================
-- Consolidate project_access_grants SELECT policies
-- =============================================================================

-- Drop all existing policies on project_access_grants
DROP POLICY IF EXISTS "Users can view their own project access grants" ON public.project_access_grants;
DROP POLICY IF EXISTS "Advisors can view grants for assigned projects" ON public.project_access_grants;
DROP POLICY IF EXISTS "Members can view grants for their projects" ON public.project_access_grants;
DROP POLICY IF EXISTS "Org owners can manage project access grants" ON public.project_access_grants;

-- Create unified SELECT policy combining all conditions
CREATE POLICY "Users can view project access grants" ON public.project_access_grants
FOR SELECT USING (
    -- 1. Users can view their own grants
    user_id = (select auth.uid())
    OR
    -- 2. Org owners can view grants for their orgs
    public.is_org_owner(org_id, (select auth.uid()))
    OR
    -- 3. Advisors can view grants for projects they're assigned to
    public.is_assigned_advisor(project_id, (select auth.uid()))
    OR
    -- 4. Members can view grants for projects they have access to
    public.user_has_project_access(project_id, (select auth.uid()))
);

COMMENT ON POLICY "Users can view project access grants" ON public.project_access_grants IS 
    'Unified SELECT policy combining all project access grant visibility rules: own grants, org owner access, advisor access, and member access. Optimized by using (select auth.uid()) to avoid per-row evaluation.';

-- Recreate the management policy for INSERT/UPDATE/DELETE only (not SELECT)
-- Note: We use separate policies instead of FOR ALL to avoid redundant evaluation
-- on SELECT operations (FOR ALL policies are still evaluated for SELECT even if
-- a FOR SELECT policy exists)
CREATE POLICY "Org owners can insert project access grants" ON public.project_access_grants
FOR INSERT WITH CHECK (
    public.is_org_owner(org_id, (select auth.uid()))
);

CREATE POLICY "Org owners can update project access grants" ON public.project_access_grants
FOR UPDATE USING (
    public.is_org_owner(org_id, (select auth.uid()))
)
WITH CHECK (
    public.is_org_owner(org_id, (select auth.uid()))
);

CREATE POLICY "Org owners can delete project access grants" ON public.project_access_grants
FOR DELETE USING (
    public.is_org_owner(org_id, (select auth.uid()))
);

COMMENT ON POLICY "Org owners can insert project access grants" ON public.project_access_grants IS 
    'Allows org owners to INSERT project access grants. SELECT is handled by the unified "Users can view project access grants" policy.';

