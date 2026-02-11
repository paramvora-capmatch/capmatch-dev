-- Optimize org_members RLS: "Org members can view other members"
-- Replace auth.uid() with public.get_current_user_id() so the planner can cache
-- the value once per statement (STABLE), avoiding per-row re-evaluation.
-- Policy was added in 20260115000000_lender_access.sql for lender org visibility.

DROP POLICY IF EXISTS "Org members can view other members" ON public.org_members;
CREATE POLICY "Org members can view other members"
ON public.org_members
FOR SELECT
USING (
    org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
);

COMMENT ON POLICY "Org members can view other members" ON public.org_members IS
'Lenders (and other users) can view org members for orgs they belong to. Uses get_current_user_id() for performance.';
