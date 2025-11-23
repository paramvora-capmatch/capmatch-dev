-- Migration: Project Completion Reminders Cron Job
-- Sets up pg_cron to call the project-completion-reminders edge function daily
-- Runs at 4 PM UTC (9 AM PDT / 8 AM PST)

-- =============================================================================
-- 1. Enable Required Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 2. Create Function to Call Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_project_completion_reminders()
RETURNS bigint AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
          || '/functions/v1/project-completion-reminders',
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

-- Schedule to run daily at 4 PM UTC (9 AM PDT / 8 AM PST)
-- Note: pg_cron uses UTC timezone
-- Cron expression: '0 16 * * *' means "at 16:00 UTC every day"
SELECT cron.schedule(
  'project-completion-reminders-daily',
  '0 16 * * *',
  $$ SELECT call_project_completion_reminders(); $$
);

-- =============================================================================
-- Notes:
-- =============================================================================
-- After running this migration, you must manually add the following secrets to Supabase Vault:
--
-- 1. Project URL:
--    SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
--
-- 2. Service Role Key:
--    SELECT vault.create_secret('your-service-role-key-here', 'service_role_key');
--
-- To view scheduled jobs:
--    SELECT * FROM cron.job;
--
-- To view job run history:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'project-completion-reminders-daily')
--    ORDER BY start_time DESC;
--
-- To unschedule the job:
--    SELECT cron.unschedule('project-completion-reminders-daily');

