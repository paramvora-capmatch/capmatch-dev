-- =============================================================================
-- Migration: Enable Resume History & Flexible Pointers
-- =============================================================================

-- 1. Allow multiple resume rows per project (History Log)
-- We drop the UNIQUE constraint so we can INSERT new rows for the same project_id
ALTER TABLE public.project_resumes
DROP CONSTRAINT IF EXISTS project_resumes_project_id_key;

-- 2. Add index for performance (fetching latest by date)
CREATE INDEX IF NOT EXISTS idx_project_resumes_history 
ON public.project_resumes(project_id, created_at DESC);

-- 3. CRITICAL: Remove the Foreign Key constraint on current_version_id.
-- This allows the column to hold a UUID from the project_resumes table 
-- instead of enforcing it to be from the document_versions table.
ALTER TABLE public.resources
DROP CONSTRAINT IF EXISTS resources_current_version_id_fkey;

COMMENT ON TABLE public.project_resumes IS 'Stores project resume data. Supports multiple rows per project (version history).';