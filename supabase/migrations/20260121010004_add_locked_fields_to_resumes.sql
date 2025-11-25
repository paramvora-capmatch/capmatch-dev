-- =============================================================================
-- Migration: Add Locked Fields Support to Project Resumes
-- =============================================================================
-- This migration adds a locked_fields JSONB column to track which fields
-- have been manually locked by users to prevent autofill from overwriting them.

-- Add locked_fields column to project_resumes
ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT '{}'::jsonb;

-- Add locked_sections column to project_resumes
ALTER TABLE public.project_resumes
ADD COLUMN IF NOT EXISTS locked_sections JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient querying of locked fields
CREATE INDEX IF NOT EXISTS idx_project_resumes_locked_fields 
ON public.project_resumes USING GIN (locked_fields);

-- Add GIN index for efficient querying of locked sections
CREATE INDEX IF NOT EXISTS idx_project_resumes_locked_sections 
ON public.project_resumes USING GIN (locked_sections);

-- Add comment explaining the columns
COMMENT ON COLUMN public.project_resumes.locked_fields IS 
'JSONB object storing locked field IDs as keys with value true. Format: {"fieldId": true}. Empty object {} means no fields are locked.';

COMMENT ON COLUMN public.project_resumes.locked_sections IS 
'JSONB object storing locked section IDs as keys with value true. Format: {"sectionId": true}. Empty object {} means no sections are locked.';

