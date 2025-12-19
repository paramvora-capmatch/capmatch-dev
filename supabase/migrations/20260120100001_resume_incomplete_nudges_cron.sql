-- Migration: Resume Incomplete Nudges Cron Job
-- Sets up pg_cron to call the resume-incomplete-nudges edge function hourly
-- Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)

-- =============================================================================
-- 1. Enable Required Extensions (if not already enabled)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 2. Create Function to Call Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_resume_incomplete_nudges()
RETURNS bigint AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
          || '/functions/v1/resume-incomplete-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. Schedule Cron Job
-- =============================================================================

-- Schedule to run every hour at minute 0
-- Cron expression: '0 * * * *' means "at minute 0 of every hour"
SELECT cron.schedule(
  'resume-incomplete-nudges-hourly',
  '0 * * * *',
  $$ SELECT call_resume_incomplete_nudges(); $$
);

-- =============================================================================
-- Notes:
-- =============================================================================
-- After running this migration, you must manually add the following secrets to Supabase Vault:
-- (These should already exist if project-completion-reminders is set up)
--
-- SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
-- SELECT vault.create_secret('your-service-role-key-here', 'service_role_key');
--
-- To test the function manually:
-- SELECT call_resume_incomplete_nudges();
--
-- To check if the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'resume-incomplete-nudges-hourly';
--
-- To unschedule the job (if needed):
-- SELECT cron.unschedule('resume-incomplete-nudges-hourly');

