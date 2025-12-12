-- Migration: Resume Nudges Cron Job
-- Calls the resume-nudges edge function hourly.
--
-- Requires:
-- - pg_cron
-- - pg_net
-- - vault secrets:
--   - project_url (e.g. https://<ref>.supabase.co)
--   - service_role_key

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION call_resume_nudges()
RETURNS bigint AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/resume-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run hourly (UTC). Cron expression: at minute 10 every hour.
SELECT cron.schedule(
  'resume-nudges-hourly',
  '10 * * * *',
  $$ SELECT call_resume_nudges(); $$
);


