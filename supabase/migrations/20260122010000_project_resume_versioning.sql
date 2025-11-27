-- =============================================================================
-- Migration: Enhance Project Resume Versioning
-- =============================================================================
-- Adds metadata and helper functions so project resumes behave like the
-- document versioning system: sequential version numbers, status tracking,
-- creator attribution, and a rollback helper.

-- Step 1: Add new columns to store version metadata.
ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS version_number INT;

ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded'));

ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_resumes.version_number IS
'Sequential version number scoped to each project resume.';
COMMENT ON COLUMN public.project_resumes.status IS
'Tracks whether this resume snapshot is the active version or has been superseded.';
COMMENT ON COLUMN public.project_resumes.created_by IS
'References the user that created this resume snapshot.';

CREATE INDEX IF NOT EXISTS idx_project_resumes_version_number ON public.project_resumes(project_id, version_number);

-- Step 2: Backfill the version_number column for existing rows.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM public.project_resumes
)
UPDATE public.project_resumes pr
SET version_number = numbered.rn
FROM numbered
WHERE pr.id = numbered.id;

ALTER TABLE public.project_resumes
ALTER COLUMN version_number SET NOT NULL;

-- Step 3: Ensure only the latest resume per project is marked 'active'.
WITH latest_per_project AS (
  SELECT DISTINCT ON (project_id) id
  FROM public.project_resumes
  ORDER BY project_id, created_at DESC
)
UPDATE public.project_resumes
SET status = CASE
  WHEN id IN (SELECT id FROM latest_per_project) THEN 'active'
  ELSE 'superseded'
END;

-- Step 4: Create trigger to auto-assign version_number.
CREATE OR REPLACE FUNCTION public.set_project_resume_version_number()
RETURNS TRIGGER AS $$
DECLARE
  max_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO max_version
  FROM public.project_resumes
  WHERE project_id = NEW.project_id;

  NEW.version_number = max_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_resume_version_number
BEFORE INSERT ON public.project_resumes
FOR EACH ROW EXECUTE FUNCTION public.set_project_resume_version_number();

-- Step 5: Provide a rollback helper that mirrors the document version rollback.
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

  UPDATE public.project_resumes
  SET status = CASE WHEN id = p_resume_id THEN 'active' ELSE 'superseded' END
  WHERE project_id = v_project_id;

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rollback_project_resume_version IS
'Moves the current version pointer back to a historical resume entry.';

GRANT EXECUTE ON FUNCTION public.rollback_project_resume_version(UUID, UUID) TO authenticated;

