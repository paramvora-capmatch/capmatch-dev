-- Migration: Add deal_type column to projects table
-- Description: Adds a deal_type column to classify projects as 'ground_up' or 'refinance'
-- The deal type determines which resume fields are shown in the project forms.

-- Add deal_type column to projects table
ALTER TABLE public.projects
ADD COLUMN deal_type TEXT NOT NULL DEFAULT 'ground_up' 
   CHECK (deal_type IN ('ground_up', 'refinance'));

-- Add comment for documentation
COMMENT ON COLUMN public.projects.deal_type IS 
   'Deal type for the project: ground_up (new development/construction) or refinance (stabilized assets/acquisitions). Determines which resume fields are displayed.';

-- Create index for filtering projects by deal type
CREATE INDEX idx_projects_deal_type ON public.projects(deal_type);
