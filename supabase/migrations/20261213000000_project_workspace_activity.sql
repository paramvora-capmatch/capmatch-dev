-- Migration: Project Workspace Activity Tracking
-- Tracks per-user activity within a project workspace, including last visit,
-- last viewed step, and last edit times for project and borrower resumes.

-- =============================================================================
-- 1. Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.project_workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  last_visited_at TIMESTAMPTZ,
  last_step_id TEXT,
  last_project_resume_edit_at TIMESTAMPTZ,
  last_borrower_resume_edit_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_workspace_activity_user_project
  ON public.project_workspace_activity (user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_workspace_activity_project_user
  ON public.project_workspace_activity (project_id, user_id);

-- Keep updated_at fresh (uses existing shared trigger function)
DROP TRIGGER IF EXISTS update_project_workspace_activity_updated_at ON public.project_workspace_activity;
CREATE TRIGGER update_project_workspace_activity_updated_at
  BEFORE UPDATE ON public.project_workspace_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 2. Row Level Security
-- =============================================================================

ALTER TABLE public.project_workspace_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their workspace activity" ON public.project_workspace_activity;
DROP POLICY IF EXISTS "Users can insert their workspace activity" ON public.project_workspace_activity;
DROP POLICY IF EXISTS "Users can update their workspace activity" ON public.project_workspace_activity;

CREATE POLICY "Users can view their workspace activity"
  ON public.project_workspace_activity
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their workspace activity"
  ON public.project_workspace_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their workspace activity"
  ON public.project_workspace_activity
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No DELETE policy (keep history minimal but stable; can add later if needed).


