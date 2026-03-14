-- Add matchmaking_run and ai_report_generate to allowed job_type values (Celery background tasks).
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN (
  'resume_autofill_project',
  'resume_autofill_borrower',
  'underwriting_generate',
  'om_generate',
  'matchmaking_run',
  'ai_report_generate'
));
