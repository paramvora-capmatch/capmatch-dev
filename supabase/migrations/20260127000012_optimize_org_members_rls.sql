-- =============================================================================
-- Migration: Optimize org_members RLS Policy for Performance
-- =============================================================================
--
-- Fixes performance issue where auth.uid() was being re-evaluated for each row.
-- Wraps auth.uid() in a subquery so it's evaluated once per query instead.

-- Drop and recreate the policy with optimized auth.uid() call
DROP POLICY IF EXISTS "Advisors can view org members for assigned project orgs" ON public.org_members;

CREATE POLICY "Advisors can view org members for assigned project orgs" ON public.org_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.owner_org_id = org_members.org_id
        AND projects.assigned_advisor_id = (select auth.uid())
    )
);

COMMENT ON POLICY "Advisors can view org members for assigned project orgs" ON public.org_members IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation. Allows advisors to view org members (including owners) for orgs that own projects where they are the assigned advisor, enabling them to display borrower information.';

