-- =============================================================================
-- Migration: Allow Members to View Project Access Grants
-- =============================================================================
--
-- This migration adds an RLS policy to allow members to view all
-- project_access_grants for projects they have access to (i.e., projects
-- where they themselves have a grant).
--
-- This enables members to see other members in the same project, which
-- is required for the profile RLS policy "Users can view related profiles"
-- to work correctly. That policy checks if two users share a project via
-- project_access_grants, but members could only see their own grants before.
--
-- NOTE: We use a SECURITY DEFINER function to break the circular RLS dependency
-- between project_access_grants table queries.
--
-- =============================================================================

-- Create a helper function to check if user has access to a project (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE project_id = p_project_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_project_access IS 
'Checks if a user has a project_access_grant for a project. Uses SECURITY DEFINER to bypass RLS and prevent circular dependencies.';

-- Add policy for members to view grants for projects they have access to
-- Using the helper function breaks the circular dependency
CREATE POLICY "Members can view grants for their projects" ON public.project_access_grants
FOR SELECT USING (
    public.user_has_project_access(project_id, auth.uid())
);

COMMENT ON POLICY "Members can view grants for their projects" ON public.project_access_grants IS 
'Allows members to view all project_access_grants for projects where they have a grant, enabling them to see other project members.';

