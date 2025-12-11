-- Set up cron job for renewing calendar watch channels
-- Runs daily at 2 AM UTC to renew watch channels before they expire

-- Note: pg_cron extension must be enabled
-- This is only available on Supabase production projects, NOT local development

-- Check if we're in a production environment (has cron schema)
DO $migration$
BEGIN
  -- Only schedule if cron schema exists (production Supabase)
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    -- Check if current user has permission
    IF pg_has_role(current_user, 'postgres', 'MEMBER') OR current_user = 'postgres' THEN
      -- Schedule the calendar watch renewal job
      PERFORM cron.schedule(
        'renew-calendar-watches',
        '0 2 * * *', -- Daily at 2 AM UTC
        $cron_body$
        SELECT
          net.http_post(
            url := current_setting('app.settings.edge_functions_url', true) || '/functions/v1/renew-calendar-watches',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := '{}'::jsonb
          ) as request_id;
        $cron_body$
      );

      RAISE NOTICE 'Calendar watch renewal cron job scheduled';
    ELSE
      RAISE NOTICE 'Skipping cron job setup - insufficient permissions (this is normal for local development)';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping cron job setup - pg_cron not available (this is normal for local development)';
  END IF;
END $migration$;

-- To manually run the job (for testing in production):
-- SELECT cron.unschedule('renew-calendar-watches');
-- And re-run the migration

-- For local development, you can manually trigger the edge function:
-- curl -X POST http://localhost:54321/functions/v1/renew-calendar-watches \
--   -H "Authorization: Bearer YOUR_ANON_KEY"
