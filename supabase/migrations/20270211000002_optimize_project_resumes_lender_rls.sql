-- Optimize project_resumes RLS: "Lenders can view granted project resumes"
-- Replace auth.uid() with public.get_current_user_id() so the planner can cache
-- the value once per statement (STABLE), avoiding per-row re-evaluation.
-- See CLAUDE.md RLS best practices.

DROP POLICY IF EXISTS "Lenders can view granted project resumes" ON public.project_resumes;
CREATE POLICY "Lenders can view granted project resumes"
ON public.project_resumes
FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), project_id)
);

COMMENT ON POLICY "Lenders can view granted project resumes" ON public.project_resumes IS
'Lenders can SELECT project resumes for projects they have been granted access to. Uses get_current_user_id() for performance.';
