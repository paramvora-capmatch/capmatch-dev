-- =============================================================================
-- Migration: Update project resume rollback behavior
-- =============================================================================
-- Ensure the rollback helper marks every other version as superseded before
-- activating the requested snapshot, avoiding multiple rows marked active.

CREATE OR REPLACE FUNCTION public.rollback_project_resume_version(
  p_resource_id UUID,
  p_resume_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_resource_project_id UUID;
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'User does not have permission to edit this resource.';
  END IF;

  SELECT project_id INTO v_project_id
  FROM public.project_resumes
  WHERE id = p_resume_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'The specified resume version does not exist.';
  END IF;

  SELECT project_id INTO v_resource_project_id
  FROM public.resources
  WHERE id = p_resource_id;

  IF v_resource_project_id IS NULL OR v_resource_project_id <> v_project_id THEN
    RAISE EXCEPTION 'Resume version does not belong to the provided resource.';
  END IF;

  UPDATE public.project_resumes
  SET status = CASE WHEN id = p_resume_id THEN 'active' ELSE 'superseded' END
  WHERE project_id = v_project_id;

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rollback_project_resume_version IS
'Moves the current version pointer back to a historical resume entry and ensures only the target row is marked active.';

GRANT EXECUTE ON FUNCTION public.rollback_project_resume_version(UUID, UUID) TO authenticated;

