-- Add validation fields to resources table
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '{}'::jsonb;

-- Add index for efficient querying of needs-action resources
CREATE INDEX IF NOT EXISTS idx_resources_validation_status ON public.resources(project_id, validation_status);

-- Comment
COMMENT ON COLUMN public.resources.validation_status IS 'Status of validation: pending, valid, action_required, invalid';
COMMENT ON COLUMN public.resources.validation_errors IS 'JSON object containing missing fields and reasoning';
