-- =============================================================================
-- Migration: Borrower Resume Versioning & Metadata
-- =============================================================================

-- 1. Allow multiple borrower resume rows per project (history log)
ALTER TABLE public.borrower_resumes
DROP CONSTRAINT IF EXISTS borrower_resumes_project_id_key;

-- 2. Index history for fast lookups
CREATE INDEX IF NOT EXISTS idx_borrower_resumes_history 
ON public.borrower_resumes(project_id, created_at DESC);

-- 3. Add metadata columns
ALTER TABLE public.borrower_resumes
ADD COLUMN IF NOT EXISTS version_number INT;

ALTER TABLE public.borrower_resumes
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded'));

ALTER TABLE public.borrower_resumes
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.borrower_resumes.version_number IS
'Sequential version number scoped to each project resume.';
COMMENT ON COLUMN public.borrower_resumes.status IS
'Tracks whether this resume snapshot is the active version or has been superseded.';
COMMENT ON COLUMN public.borrower_resumes.created_by IS
'References the user that created this resume snapshot.';

-- 4. Add locking metadata
ALTER TABLE public.borrower_resumes
ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.borrower_resumes
ADD COLUMN IF NOT EXISTS locked_sections JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_borrower_resumes_locked_fields 
ON public.borrower_resumes USING GIN (locked_fields);

CREATE INDEX IF NOT EXISTS idx_borrower_resumes_locked_sections 
ON public.borrower_resumes USING GIN (locked_sections);

COMMENT ON COLUMN public.borrower_resumes.locked_fields IS 
'JSONB object storing locked field IDs as keys with value true. Empty object {} means no fields are locked.';
COMMENT ON COLUMN public.borrower_resumes.locked_sections IS 
'JSONB object storing locked section IDs as keys with value true. Empty object {} means no sections are locked.';

-- 5. Backfill version_number and enforce NOT NULL
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM public.borrower_resumes
)
UPDATE public.borrower_resumes br
SET version_number = numbered.rn
FROM numbered
WHERE br.id = numbered.id;

ALTER TABLE public.borrower_resumes
ALTER COLUMN version_number SET NOT NULL;

-- 6. Mark only the latest version as active
WITH latest_per_project AS (
  SELECT DISTINCT ON (project_id) id
  FROM public.borrower_resumes
  ORDER BY project_id, created_at DESC
)
UPDATE public.borrower_resumes
SET status = CASE
  WHEN id IN (SELECT id FROM latest_per_project) THEN 'active'
  ELSE 'superseded'
END;

-- 7. Trigger to auto-assign version_number
CREATE OR REPLACE FUNCTION public.set_borrower_resume_version_number()
RETURNS TRIGGER AS $$
DECLARE
  max_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO max_version
  FROM public.borrower_resumes
  WHERE project_id = NEW.project_id;

  NEW.version_number = max_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_borrower_resume_version_number
BEFORE INSERT ON public.borrower_resumes
FOR EACH ROW EXECUTE FUNCTION public.set_borrower_resume_version_number();

-- 8. Rollback helper
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

  UPDATE public.borrower_resumes
  SET status = CASE WHEN id = p_resume_id THEN 'active' ELSE 'superseded' END
  WHERE project_id = v_project_id;

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rollback_borrower_resume_version IS
'Moves the current version pointer back to a historical borrower resume entry.';

GRANT EXECUTE ON FUNCTION public.rollback_borrower_resume_version(UUID, UUID) TO authenticated;

-- 9. Ensure BORROWER_RESUME resource points to latest version
WITH latest AS (
  SELECT DISTINCT ON (project_id) project_id, id
  FROM public.borrower_resumes
  ORDER BY project_id, created_at DESC
)
UPDATE public.resources
SET current_version_id = latest.id
FROM latest
WHERE public.resources.project_id = latest.project_id
  AND public.resources.resource_type = 'BORROWER_RESUME';

