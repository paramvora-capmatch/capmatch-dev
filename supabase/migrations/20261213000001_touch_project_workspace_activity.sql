-- Migration: RPC helper for workspace activity tracking
-- Provides a safe partial upsert so callers can update individual columns
-- without overwriting others with NULL.

CREATE OR REPLACE FUNCTION public.touch_project_workspace_activity(
  p_project_id UUID,
  p_last_visited_at TIMESTAMPTZ DEFAULT NULL,
  p_last_step_id TEXT DEFAULT NULL,
  p_last_project_resume_edit_at TIMESTAMPTZ DEFAULT NULL,
  p_last_borrower_resume_edit_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.project_workspace_activity (
    user_id,
    project_id,
    last_visited_at,
    last_step_id,
    last_project_resume_edit_at,
    last_borrower_resume_edit_at
  )
  VALUES (
    v_user_id,
    p_project_id,
    p_last_visited_at,
    p_last_step_id,
    p_last_project_resume_edit_at,
    p_last_borrower_resume_edit_at
  )
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET
    last_visited_at = COALESCE(EXCLUDED.last_visited_at, public.project_workspace_activity.last_visited_at),
    last_step_id = COALESCE(EXCLUDED.last_step_id, public.project_workspace_activity.last_step_id),
    last_project_resume_edit_at = COALESCE(
      EXCLUDED.last_project_resume_edit_at,
      public.project_workspace_activity.last_project_resume_edit_at
    ),
    last_borrower_resume_edit_at = COALESCE(
      EXCLUDED.last_borrower_resume_edit_at,
      public.project_workspace_activity.last_borrower_resume_edit_at
    ),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.touch_project_workspace_activity(UUID, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_project_workspace_activity(UUID, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


