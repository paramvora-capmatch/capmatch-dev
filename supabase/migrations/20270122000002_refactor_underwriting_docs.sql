-- Create underwriting_documents table to track validation status separately from resources
CREATE TABLE IF NOT EXISTS public.underwriting_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    validation_status TEXT DEFAULT 'pending',
    validation_errors JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT underwriting_documents_resource_id_key UNIQUE (resource_id)
);

-- Separate trigger for updated_at if needed, reusing the existing function
CREATE TRIGGER update_underwriting_documents_updated_at
    BEFORE UPDATE ON public.underwriting_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_underwriting_documents_resource_id ON public.underwriting_documents(resource_id);
CREATE INDEX IF NOT EXISTS idx_underwriting_documents_validation_status ON public.underwriting_documents(validation_status);

-- Migrate existing data
-- We only migrate resources that have validation status/errors set to something meaningful
-- or where we want to preserve the 'pending' status if it was explicitly set.
-- Since the default was 'pending', we migrate any resource that had these columns.
INSERT INTO public.underwriting_documents (resource_id, validation_status, validation_errors)
SELECT id, validation_status, validation_errors
FROM public.resources
WHERE validation_status IS NOT NULL OR validation_errors IS NOT NULL
ON CONFLICT (resource_id) DO NOTHING;

-- Drop the columns from resources table
ALTER TABLE public.resources
DROP COLUMN IF EXISTS validation_status,
DROP COLUMN IF EXISTS validation_errors;
