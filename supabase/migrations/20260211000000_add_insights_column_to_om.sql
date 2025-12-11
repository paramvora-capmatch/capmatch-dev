-- =============================================================================
-- Migration: Add insights column to OM table
-- =============================================================================
-- This migration adds a separate JSONB column for storing AI-generated insights
-- with metadata (resume_version_id, generated_at) separate from project content.

-- Add insights JSONB column to store AI-generated insights with metadata
ALTER TABLE public.om
ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '{}';

-- Add GIN index for insights column for efficient querying
CREATE INDEX IF NOT EXISTS idx_om_insights 
ON public.om USING GIN (insights);

-- Add comment
COMMENT ON COLUMN public.om.insights IS 'JSONB column storing AI-generated insights with metadata (resume_version_id, generated_at, and all insight fields). Separate from content column for better caching and organization.';

