-- Ensure at most one pending/running job per (project_id, job_type).
-- Prevents duplicate autofill (or other) jobs for the same resource even under race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_one_running_per_project_type
ON jobs(project_id, job_type)
WHERE status IN ('pending', 'running');

COMMENT ON INDEX idx_jobs_one_running_per_project_type IS 'Enforces one running/pending job per project+type (e.g. one autofill per resume)';
