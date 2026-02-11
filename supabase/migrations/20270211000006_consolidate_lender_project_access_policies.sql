-- =============================================================================
-- Consolidate multiple permissive policies on lender_project_access
-- =============================================================================
-- Table had: "Lenders can view their project access" (FOR SELECT) and
-- "Service role can manage lender access" (FOR ALL). FOR ALL includes SELECT,
-- so SELECT was evaluated twice. Replace with one policy per action.
-- =============================================================================

DROP POLICY IF EXISTS "Lenders can view their project access" ON public.lender_project_access;
DROP POLICY IF EXISTS "Service role can manage lender access" ON public.lender_project_access;

-- Single SELECT: lenders see their org's grants, or service role sees all
CREATE POLICY "Users can select lender project access"
ON public.lender_project_access
FOR SELECT
USING (
    lender_org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
    OR (select auth.jwt()) ->> 'role' = 'service_role'
);

-- INSERT/UPDATE/DELETE: service role only (admin/backend grants)
CREATE POLICY "Service role can insert lender access"
ON public.lender_project_access
FOR INSERT
WITH CHECK ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role can update lender access"
ON public.lender_project_access
FOR UPDATE
USING ((select auth.jwt()) ->> 'role' = 'service_role')
WITH CHECK ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete lender access"
ON public.lender_project_access
FOR DELETE
USING ((select auth.jwt()) ->> 'role' = 'service_role');

COMMENT ON POLICY "Users can select lender project access" ON public.lender_project_access IS
'Single SELECT: lenders see rows for their org; service role sees all.';
