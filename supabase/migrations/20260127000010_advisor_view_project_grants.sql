-- =============================================================================
-- Migration: Allow Advisors to View Project Access Grants
-- =============================================================================
--
-- This migration adds an RLS policy to allow advisors to view all
-- project_access_grants for projects they are assigned to.
-- This enables advisors to see all project members, not just themselves.
--
-- NOTE: We use a SECURITY DEFINER function to break the circular RLS dependency
-- between projects and project_access_grants tables.
--
-- =============================================================================

-- Create a helper function to check if user is assigned advisor (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_assigned_advisor(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id
        AND assigned_advisor_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_assigned_advisor IS 
'Checks if a user is the assigned advisor for a project. Uses SECURITY DEFINER to bypass RLS and prevent circular dependencies.';

-- Add policy for advisors to view grants for assigned projects
-- Using the helper function breaks the circular dependency
DROP POLICY IF EXISTS "Advisors can view grants for assigned projects" ON public.project_access_grants;

CREATE POLICY "Advisors can view grants for assigned projects" ON public.project_access_grants
FOR SELECT USING (
    public.is_assigned_advisor(project_id, auth.uid())
);

COMMENT ON POLICY "Advisors can view grants for assigned projects" ON public.project_access_grants IS 
'Allows advisors to view all project_access_grants for projects where they are the assigned advisor, enabling them to see all project members.';

-- =============================================================================
-- Allow Advisors to View Org Members for Assigned Projects
-- =============================================================================
-- This allows advisors to see org members (specifically owners) for orgs that
-- own projects they are assigned to, enabling them to display borrower names.

-- Add policy for advisors to view org members for orgs that own their assigned projects
CREATE POLICY "Advisors can view org members for assigned project orgs" ON public.org_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.owner_org_id = org_members.org_id
        AND projects.assigned_advisor_id = auth.uid()
    )
);

COMMENT ON POLICY "Advisors can view org members for assigned project orgs" ON public.org_members IS 
'Allows advisors to view org members (including owners) for orgs that own projects where they are the assigned advisor, enabling them to display borrower information.';

