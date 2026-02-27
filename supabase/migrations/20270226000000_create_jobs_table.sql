-- Jobs table for background task tracking (autofill, underwriting, future OM).
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  CONSTRAINT jobs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  CONSTRAINT jobs_job_type_check CHECK (job_type IN ('resume_autofill_project', 'resume_autofill_borrower', 'underwriting_generate', 'om_generate'))
);

CREATE INDEX idx_jobs_project_status ON jobs(project_id, status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

COMMENT ON TABLE jobs IS 'Background job tracking for resume autofill, underwriting doc generation, and future OM generation';
COMMENT ON COLUMN jobs.metadata IS 'Standardized JSON: subsections (autofill), steps (underwriting), etc.';
