-- =============================================================================
-- Migration: Remove status columns from project and borrower resumes
-- =============================================================================
-- Context:
-- The active version of both project and borrower resumes is now tracked via
-- the resources.current_version_id pointer. The legacy status column on
-- project_resumes and borrower_resumes is therefore redundant and can be
-- removed to simplify the schema and logic.
--
-- This migration:
--   1) Drops the status column from project_resumes and borrower_resumes.
--   2) Updates rollback helper functions so they no longer reference status
--      and instead rely solely on resources.current_version_id.
-- =============================================================================

-- 1. Drop status column from project_resumes
ALTER TABLE public.project_resumes
  DROP COLUMN IF EXISTS status;

-- 2. Drop status column from borrower_resumes
ALTER TABLE public.borrower_resumes
  DROP COLUMN IF EXISTS status;

-- 3. Update rollback_project_resume_version to no longer touch status
CREATE OR REPLACE FUNCTION public.rollback_project_resume_version(p_resource_id UUID, p_resume_id UUID)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_target_version INT;
  v_resource_project_id UUID;
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'User does not have permission to edit this resource.';
  END IF;

  SELECT project_id, version_number INTO v_project_id, v_target_version
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

  -- NOTE: We no longer maintain a status column on project_resumes.
  -- The active version is determined solely by resources.current_version_id.

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rollback_project_resume_version IS
'Moves the current version pointer back to a historical resume entry by updating resources.current_version_id. The project_resumes.status column has been removed; active version is determined solely via current_version_id.';

GRANT EXECUTE ON FUNCTION public.rollback_project_resume_version(UUID, UUID) TO authenticated;

-- 4. Update rollback_borrower_resume_version to no longer touch status
CREATE OR REPLACE FUNCTION public.rollback_borrower_resume_version(p_resource_id UUID, p_resume_id UUID)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_target_version INT;
  v_resource_project_id UUID;
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'User does not have permission to edit this resource.';
  END IF;

  SELECT project_id, version_number INTO v_project_id, v_target_version
  FROM public.borrower_resumes
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

  -- NOTE: We no longer maintain a status column on borrower_resumes.
  -- The active version is determined solely by resources.current_version_id.

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rollback_borrower_resume_version IS
'Moves the current borrower resume pointer back to a historical entry by updating resources.current_version_id. The borrower_resumes.status column has been removed; active version is determined solely via current_version_id.';

GRANT EXECUTE ON FUNCTION public.rollback_borrower_resume_version(UUID, UUID) TO authenticated;


