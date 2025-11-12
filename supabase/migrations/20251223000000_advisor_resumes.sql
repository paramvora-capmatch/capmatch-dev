-- ============================================================================
-- Migration: Advisor Resumes
-- Date: 2025-12-23
-- ============================================================================
-- Creates advisor_resumes table with 1-to-1 relationship to profiles (for advisors)

-- Table for advisor resumes, one per advisor profile
CREATE TABLE public.advisor_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Ensures a 1-to-1 relationship with an advisor profile
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_advisor_resumes_updated_at
BEFORE UPDATE ON public.advisor_resumes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_advisor_resumes_profile_id ON public.advisor_resumes(profile_id);

-- Enable RLS
ALTER TABLE public.advisor_resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Advisors can view and edit their own resume
CREATE POLICY "Advisors can manage their own resume" ON public.advisor_resumes
FOR ALL USING (
    auth.uid() = profile_id
) WITH CHECK (
    auth.uid() = profile_id
);

