# Project Completion Reminders

This Edge Function sends in-app notifications to org owners for incomplete projects at 1, 3, 5, and 7 days after project creation.

## How It Works

1. Runs daily via `pg_cron` at 9 AM PST (4 PM UTC)
2. Finds projects created 1, 3, 5, or 7 days ago (±12 hour window)
3. Calculates overall progress: `(projectProgress + borrowerProgress) / 2`
4. Sends reminders only if `overallProgress < 100`
5. Notifies all current org owners for each incomplete project

## Setup

### 1. Run the Migration

The migration file sets up:
- `pg_cron` and `pg_net` extensions
- Function to call the Edge Function
- Scheduled cron job

### 2. Add Vault Secrets

After running the migration, add these secrets to Supabase Vault:

```sql
-- Replace with your actual project URL
SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');

-- Replace with your actual service role key
SELECT vault.create_secret('your-service-role-key-here', 'service_role_key');
```

### 3. Deploy the Edge Function

Deploy the function using Supabase CLI:
```bash
supabase functions deploy project-completion-reminders
```

## Testing

### Test Edge Function Directly

You can manually trigger the Edge Function to test it:

```bash
# Replace with your actual project URL and service role key
curl -X POST "https://your-project-ref.supabase.co/functions/v1/project-completion-reminders" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Reminders processed"
}
```

**Check the logs:**
- Go to Supabase Dashboard → Edge Functions → project-completion-reminders → Logs
- You should see detailed logs about which projects were processed and notifications created

### Test Cron Job Manually

You can manually trigger the cron function to test the pg_cron setup:

```sql
-- Call the function directly
SELECT call_project_completion_reminders();
```

This will:
1. Call the Edge Function via HTTP
2. Return a request ID from `net.http_post`
3. You can check the Edge Function logs to see if it was triggered

### Test Cron Job Execution

To verify the cron job will run correctly:

```sql
-- 1. Check if the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'project-completion-reminders-daily';

-- 2. View recent job runs (after it runs)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'project-completion-reminders-daily')
ORDER BY start_time DESC
LIMIT 10;

-- 3. Check for any errors
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'project-completion-reminders-daily')
  AND status = 'failed'
ORDER BY start_time DESC;
```

### Test with Test Data

To test with actual projects, you can create test projects with specific creation dates:

```sql
-- Create a test project that will trigger reminders
-- (Adjust the created_at date to match your test interval)
INSERT INTO projects (name, owner_org_id, created_at)
VALUES (
  'Test Reminder Project',
  'your-org-id-here',
  NOW() - INTERVAL '1 day'  -- Change to 3, 5, or 7 days for different reminders
);

-- Make sure the project has incomplete progress
-- (The function will check completenessPercent from project_resumes and borrower_resumes)
```

### Verify Notifications Were Created

After running the function, check if notifications were created:

```sql
-- Check recent notifications
SELECT 
  id,
  user_id,
  title,
  body,
  link_url,
  read_at,
  created_at
FROM notifications
WHERE title = 'Complete Your Project'
ORDER BY created_at DESC
LIMIT 20;
```

## Monitoring

### View Scheduled Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'project-completion-reminders-daily';
```

### View Job Run History
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'project-completion-reminders-daily')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Edge Function Logs
- Go to Supabase Dashboard → Edge Functions → project-completion-reminders → Logs
- Look for entries with `[project-completion-reminders]` prefix
- Check for any errors or warnings

## Notification Messages

- **Day 1**: "Getting started is the hardest part! {projectName} is {X}% complete."
- **Day 3**: "Keep up the momentum! {projectName} is {X}% complete."
- **Day 5**: "Almost there! {projectName} is {X}% complete."
- **Day 7**: "⚠️ Complete your project soon! {projectName} is {X}% complete."

## Troubleshooting

### Cron Job Not Running

1. **Check if extensions are enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
   ```

2. **Check if job is scheduled:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'project-completion-reminders-daily';
   ```

3. **Check for errors in job runs:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'project-completion-reminders-daily')
   ORDER BY start_time DESC;
   ```

### Edge Function Not Being Called

1. **Verify Vault secrets are set:**
   ```sql
   SELECT name FROM vault.decrypted_secrets WHERE name IN ('project_url', 'service_role_key');
   ```

2. **Test the function manually:**
   ```sql
   SELECT call_project_completion_reminders();
   ```

3. **Check Edge Function logs** in Supabase Dashboard

### No Notifications Created

1. **Check if projects exist in the date range:**
   ```sql
   -- Check for projects created 1 day ago (±12 hours)
   SELECT id, name, created_at 
   FROM projects 
   WHERE created_at >= NOW() - INTERVAL '1 day 12 hours'
     AND created_at <= NOW() - INTERVAL '11 hours 30 minutes';
   ```

2. **Check project completion status:**
   ```sql
   SELECT 
     p.id,
     p.name,
     pr.content->>'completenessPercent' as project_progress,
     br.content->>'completenessPercent' as borrower_progress
   FROM projects p
   LEFT JOIN project_resumes pr ON pr.project_id = p.id
   LEFT JOIN borrower_resumes br ON br.project_id = p.id
   WHERE p.created_at >= NOW() - INTERVAL '7 days';
   ```

3. **Check if org owners exist:**
   ```sql
   SELECT om.org_id, om.user_id, om.role
   FROM org_members om
   WHERE om.role = 'owner'
     AND om.org_id IN (SELECT DISTINCT owner_org_id FROM projects);
   ```

### Common Issues

- **Vault secrets not set**: Run the `vault.create_secret` commands
- **Wrong timezone**: Cron runs in UTC, adjust if needed
- **No projects in date range**: Create test projects with appropriate dates
- **Projects already complete**: Function only sends reminders for incomplete projects (< 100%)

