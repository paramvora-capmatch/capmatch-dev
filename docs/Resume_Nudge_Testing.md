# Resume Incomplete Nudge Testing Guide

This guide explains how to test the resume incomplete nudge notifications without waiting for the actual time intervals (45m, 1d, 3d, 1w).

## Quick Testing Methods

### Method 1: Temporarily Reduce Intervals (Easiest)

**Step 1:** Modify the intervals in `supabase/functions/resume-incomplete-nudges/index.ts`:

```typescript
// Change from:
const NUDGE_INTERVALS = [
  45 * 60 * 1000, // 45 minutes
  24 * 60 * 60 * 1000, // 1 day
  3 * 24 * 60 * 60 * 1000, // 3 days
  7 * 24 * 60 * 60 * 1000, // 1 week
];

// To (for testing - 1 minute, 2 minutes, 5 minutes, 10 minutes):
const NUDGE_INTERVALS = [
  1 * 60 * 1000, // 1 minute (instead of 45m)
  2 * 60 * 1000, // 2 minutes (instead of 1d)
  5 * 60 * 1000, // 5 minutes (instead of 3d)
  10 * 60 * 1000, // 10 minutes (instead of 1w)
];
```

**Step 2:** Manually set edit timestamps in the database:

```sql
-- Set a project resume edit to 2 minutes ago (will trigger tier 2 nudge)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '2 minutes'
WHERE project_id = 'your-project-id-here' AND user_id = 'your-user-id-here';

-- Set a borrower resume edit to 5 minutes ago (will trigger tier 3 nudge)
UPDATE project_workspace_activity
SET last_borrower_resume_edit_at = NOW() - INTERVAL '5 minutes'
WHERE project_id = 'your-project-id-here' AND user_id = 'your-user-id-here';
```

**Step 3:** Trigger the function manually:

```bash
# Replace with your local Supabase URL and service role key
curl -X POST "http://127.0.0.1:54321/functions/v1/resume-incomplete-nudges" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Step 4:** Check the notifications:

```sql
SELECT 
  id,
  user_id,
  title,
  body,
  payload->>'nudge_tier' as tier,
  payload->>'resume_type' as resume_type,
  payload->>'completion_percent' as completion,
  created_at
FROM notifications
WHERE payload->>'type' = 'resume_incomplete_nudge'
ORDER BY created_at DESC
LIMIT 10;
```

**Remember to revert the intervals back to production values after testing!**

---

### Method 2: Manually Set Past Timestamps

Instead of modifying code, you can directly manipulate database timestamps:

**Step 1:** Set edit timestamps to simulate different intervals:

```sql
-- For tier 1 test (45 minutes ago)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '46 minutes'
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';

-- For tier 2 test (1 day ago)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '25 hours'
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';

-- For tier 3 test (3 days ago)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '3 days 1 hour'
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';

-- For tier 4 test (1 week ago)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '7 days 2 hours'
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';
```

**Step 2:** Ensure the resume is incomplete:

```sql
-- Make sure completeness is < 100%
UPDATE project_resumes
SET completeness_percent = 45
WHERE project_id = 'your-project-id'
ORDER BY created_at DESC
LIMIT 1;

-- Or for borrower resume
UPDATE borrower_resumes
SET completeness_percent = 60
WHERE project_id = 'your-project-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Step 3:** Trigger the function (same as Method 1, Step 3)

---

### Method 3: Create Test Data Script

Create a SQL script to set up test scenarios:

```sql
-- Test Scenario 1: Project resume - tier 1 nudge (45m+ ago)
DO $$
DECLARE
  test_project_id UUID := 'your-project-id';
  test_user_id UUID := 'your-user-id';
BEGIN
  -- Set edit timestamp to 46 minutes ago
  INSERT INTO project_workspace_activity (user_id, project_id, last_project_resume_edit_at)
  VALUES (test_user_id, test_project_id, NOW() - INTERVAL '46 minutes')
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET last_project_resume_edit_at = NOW() - INTERVAL '46 minutes';
  
  -- Ensure resume is incomplete
  UPDATE project_resumes
  SET completeness_percent = 50
  WHERE project_id = test_project_id
  ORDER BY created_at DESC
  LIMIT 1;
END $$;

-- Test Scenario 2: Borrower resume - tier 2 nudge (1 day+ ago)
DO $$
DECLARE
  test_project_id UUID := 'your-project-id';
  test_user_id UUID := 'your-user-id';
BEGIN
  -- Set edit timestamp to 25 hours ago
  INSERT INTO project_workspace_activity (user_id, project_id, last_borrower_resume_edit_at)
  VALUES (test_user_id, test_project_id, NOW() - INTERVAL '25 hours')
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET last_borrower_resume_edit_at = NOW() - INTERVAL '25 hours';
  
  -- Ensure resume is incomplete
  UPDATE borrower_resumes
  SET completeness_percent = 70
  WHERE project_id = test_project_id
  ORDER BY created_at DESC
  LIMIT 1;
END $$;
```

---

## Testing Tier Reset Logic

To test that editing a resume resets the tier cycle:

**Step 1:** Create an initial nudge by setting timestamp 46 minutes ago:

```sql
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW() - INTERVAL '46 minutes'
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';
```

**Step 2:** Trigger the function (should create tier 1 nudge):

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/resume-incomplete-nudges" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Step 3:** Verify nudge was created:

```sql
SELECT id, payload->>'nudge_tier' as tier FROM notifications 
WHERE payload->>'type' = 'resume_incomplete_nudge' 
ORDER BY created_at DESC LIMIT 1;
```

**Step 4:** Simulate user editing again (reset tier):

```sql
-- Update the edit timestamp to now (simulating a new edit)
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NOW()
WHERE project_id = 'your-project-id' AND user_id = 'your-user-id';
```

**Step 5:** Trigger function again - should delete old nudge and reset:

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/resume-incomplete-nudges" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Step 6:** Verify old nudge was deleted:

```sql
-- Should return 0 rows (old nudge deleted)
SELECT * FROM notifications 
WHERE payload->>'type' = 'resume_incomplete_nudge'
AND payload->>'nudge_tier' = '1'
AND payload->>'project_id' = 'your-project-id';
```

---

## Testing Complete Flow

### Full Test Scenario

1. **Setup test project with incomplete resumes:**
   ```sql
   -- Get a real project ID
   SELECT id, owner_org_id FROM projects LIMIT 1;
   
   -- Get the owner user ID
   SELECT user_id FROM org_members 
   WHERE org_id = 'org-id-from-above' AND role = 'owner' LIMIT 1;
   ```

2. **Set up workspace activity:**
   ```sql
   INSERT INTO project_workspace_activity 
   (user_id, project_id, last_project_resume_edit_at, last_borrower_resume_edit_at)
   VALUES 
   (
     'your-user-id',
     'your-project-id',
     NOW() - INTERVAL '46 minutes',  -- Tier 1 for project
     NOW() - INTERVAL '25 hours'     -- Tier 2 for borrower
   )
   ON CONFLICT (user_id, project_id) DO UPDATE SET
     last_project_resume_edit_at = EXCLUDED.last_project_resume_edit_at,
     last_borrower_resume_edit_at = EXCLUDED.last_borrower_resume_edit_at;
   ```

3. **Ensure resumes are incomplete:**
   ```sql
   UPDATE project_resumes SET completeness_percent = 60 
   WHERE project_id = 'your-project-id' ORDER BY created_at DESC LIMIT 1;
   
   UPDATE borrower_resumes SET completeness_percent = 75 
   WHERE project_id = 'your-project-id' ORDER BY created_at DESC LIMIT 1;
   ```

4. **Trigger the function:**
   ```bash
   curl -X POST "http://127.0.0.1:54321/functions/v1/resume-incomplete-nudges" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

5. **Check results:**
   ```sql
   SELECT 
     title,
     body,
     payload->>'nudge_tier' as tier,
     payload->>'resume_type' as resume_type,
     payload->>'completion_percent' as completion,
     created_at
   FROM notifications
   WHERE payload->>'type' = 'resume_incomplete_nudge'
     AND user_id = 'your-user-id'
   ORDER BY created_at DESC;
   ```

6. **Verify in UI:**
   - Log in as the user
   - Check the notification bell icon
   - Should see two notifications (one for project, one for borrower)

---

## Checking Function Logs

When testing locally with `supabase functions serve`, you'll see logs in your terminal:

```
[resume-incomplete-nudges] Starting resume nudge processing
[resume-incomplete-nudges] Found X workspace activities to check
[resume-incomplete-nudges] Created domain event XXX for project resume (tier 1, 60% complete)
[resume-incomplete-nudges] Completed. Created 1 domain events.
```

Check the logs to debug any issues.

---

## Testing Notifications in UI

After triggering nudges:

1. Log in to the app as the user who received the notification
2. Click the notification bell icon (top right)
3. You should see:
   - Title: "Complete your Project Resume" or "Complete your Borrower Resume"
   - Body: "Your [project/borrower] resume for **[Project Name]** is **[X]%** complete. Finish it to generate your OM!"
4. Click the notification to navigate to the workspace

---

## Cleanup After Testing

```sql
-- Delete test notifications
DELETE FROM notifications 
WHERE payload->>'type' = 'resume_incomplete_nudge';

-- Reset timestamps if needed
UPDATE project_workspace_activity
SET last_project_resume_edit_at = NULL,
    last_borrower_resume_edit_at = NULL
WHERE project_id = 'your-test-project-id';
```

---

## Common Issues

**No notifications created:**
- Check that `completeness_percent < 100`
- Verify timestamps are set correctly (use `NOW() - INTERVAL` properly)
- Check that user is a project owner
- Look at function logs for errors

**Duplicate notifications:**
- Make sure you're not triggering multiple times within the same hour
- Check existing notifications before triggering again

**Tier reset not working:**
- Verify `last_*_resume_edit_at` timestamp is newer than notification `created_at`
- Check that the function runs after you update the timestamp

