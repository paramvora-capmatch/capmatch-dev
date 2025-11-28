-- =============================================================================
-- Migration: Create OM (Offering Memorandum) Table
-- =============================================================================
-- This migration creates the OM table for storing production snapshots of project data
-- with versioning support similar to project_resumes

-- Create OM table (similar structure to project_resumes, but without locked fields)
CREATE TABLE IF NOT EXISTS public.om (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for fetching latest OM by project
CREATE INDEX IF NOT EXISTS idx_om_project_id 
ON public.om(project_id, created_at DESC);

-- Add GIN index for JSONB content column
CREATE INDEX IF NOT EXISTS idx_om_content 
ON public.om USING GIN (content);

-- Add updated_at trigger
CREATE TRIGGER update_om_updated_at
BEFORE UPDATE ON public.om
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.om ENABLE ROW LEVEL SECURITY;

-- Add OM resource type to resources table check constraint
-- First, check if the constraint exists and what values it has
DO $$
BEGIN
    -- Check if constraint exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'resources_resource_type_check'
    ) THEN
        -- Drop and recreate with OM type
        ALTER TABLE public.resources 
        DROP CONSTRAINT IF EXISTS resources_resource_type_check;
        
        ALTER TABLE public.resources 
        ADD CONSTRAINT resources_resource_type_check 
        CHECK (resource_type IN (
            'BORROWER_RESUME',
            'BORROWER_DOCS_ROOT',
            'PROJECT_RESUME',
            'PROJECT_DOCS_ROOT',
            'OM',
            'FOLDER',
            'FILE'
        ));
    ELSE
        -- Create constraint if it doesn't exist
        ALTER TABLE public.resources 
        ADD CONSTRAINT resources_resource_type_check 
        CHECK (resource_type IN (
            'BORROWER_RESUME',
            'BORROWER_DOCS_ROOT',
            'PROJECT_RESUME',
            'PROJECT_DOCS_ROOT',
            'OM',
            'FOLDER',
            'FILE'
        ));
    END IF;
END $$;

-- RLS Policies for OM table (similar to project_resumes)
-- Users can view OM if they can view the project
CREATE POLICY "Users can view OM based on resource permissions" ON public.om
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'OM'
        AND public.can_view(auth.uid(), r.id)
    )
);

-- Users can insert OM if they can edit the project
CREATE POLICY "Users can insert OM based on resource permissions" ON public.om
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'OM'
        AND public.can_edit(auth.uid(), r.id)
    )
);

-- Users can update OM if they can edit the project
CREATE POLICY "Users can update OM based on resource permissions" ON public.om
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'OM'
        AND public.can_edit(auth.uid(), r.id)
    )
);

-- Users can delete OM if they can edit the project
CREATE POLICY "Users can delete OM based on resource permissions" ON public.om
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.project_id = om.project_id
        AND r.resource_type = 'OM'
        AND public.can_edit(auth.uid(), r.id)
    )
);

-- Enable realtime for OM table
ALTER TABLE public.om REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.om;

-- Add comments
COMMENT ON TABLE public.om IS 'Stores versioned snapshots of project data for Offering Memorandum (OM) with derived calculations';
COMMENT ON COLUMN public.om.content IS 'JSONB content in section-grouped format with all project fields and derived metrics';

