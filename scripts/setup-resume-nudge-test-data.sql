-- SQL script to set up test data for resume-incomplete-nudges
-- Run this in your local Supabase database to create test scenarios

-- =============================================================================
-- SCENARIO 1: Recent edit (< 45 minutes) - Should NOT send nudge
-- =============================================================================
-- Update project_workspace_activity to simulate a recent edit (30 minutes ago)
UPDATE project_workspace_activity
SET
  last_project_resume_edit_at = NOW() - INTERVAL '30 minutes'
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND project_id = (SELECT id FROM projects LIMIT 1);

-- Make sure the project resume is incomplete (e.g., 40%)
UPDATE project_resumes
SET completeness_percent = 40
WHERE project_id = (SELECT id FROM projects LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- SCENARIO 2: Edit 50 minutes ago - Should send Tier 1 nudge
-- =============================================================================
-- Insert/update activity for a different project
INSERT INTO project_workspace_activity (user_id, project_id, last_project_resume_edit_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM projects OFFSET 1 LIMIT 1),
  NOW() - INTERVAL '50 minutes'
)
ON CONFLICT (user_id, project_id)
DO UPDATE SET last_project_resume_edit_at = NOW() - INTERVAL '50 minutes';

-- Set resume to incomplete
UPDATE project_resumes
SET completeness_percent = 55
WHERE project_id = (SELECT id FROM projects OFFSET 1 LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- SCENARIO 3: Edit 2 days ago - Should send Tier 2 nudge
-- =============================================================================
INSERT INTO project_workspace_activity (user_id, project_id, last_project_resume_edit_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM projects OFFSET 2 LIMIT 1),
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (user_id, project_id)
DO UPDATE SET last_project_resume_edit_at = NOW() - INTERVAL '2 days';

UPDATE project_resumes
SET completeness_percent = 70
WHERE project_id = (SELECT id FROM projects OFFSET 2 LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- SCENARIO 4: Edit 4 days ago - Should send Tier 3 nudge
-- =============================================================================
INSERT INTO project_workspace_activity (user_id, project_id, last_borrower_resume_edit_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM projects OFFSET 3 LIMIT 1),
  NOW() - INTERVAL '4 days'
)
ON CONFLICT (user_id, project_id)
DO UPDATE SET last_borrower_resume_edit_at = NOW() - INTERVAL '4 days';

UPDATE borrower_resumes
SET completeness_percent = 65
WHERE project_id = (SELECT id FROM projects OFFSET 3 LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- SCENARIO 5: Edit 10 days ago - Should send Tier 4 nudge
-- =============================================================================
INSERT INTO project_workspace_activity (user_id, project_id, last_borrower_resume_edit_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM projects OFFSET 4 LIMIT 1),
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (user_id, project_id)
DO UPDATE SET last_borrower_resume_edit_at = NOW() - INTERVAL '10 days';

UPDATE borrower_resumes
SET completeness_percent = 80
WHERE project_id = (SELECT id FROM projects OFFSET 4 LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- SCENARIO 6: Complete resume (100%) - Should NOT send nudge
-- =============================================================================
INSERT INTO project_workspace_activity (user_id, project_id, last_project_resume_edit_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM projects OFFSET 5 LIMIT 1),
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (user_id, project_id)
DO UPDATE SET last_project_resume_edit_at = NOW() - INTERVAL '2 days';

UPDATE project_resumes
SET completeness_percent = 100
WHERE project_id = (SELECT id FROM projects OFFSET 5 LIMIT 1)
  AND is_active = true;

-- =============================================================================
-- View current test data
-- =============================================================================
SELECT
  pwa.user_id,
  pwa.project_id,
  pwa.last_project_resume_edit_at,
  pwa.last_borrower_resume_edit_at,
  pr.completeness_percent as project_completion,
  br.completeness_percent as borrower_completion,
  EXTRACT(EPOCH FROM (NOW() - pwa.last_project_resume_edit_at)) / 60 as minutes_since_project_edit,
  EXTRACT(EPOCH FROM (NOW() - pwa.last_borrower_resume_edit_at)) / 60 as minutes_since_borrower_edit
FROM project_workspace_activity pwa
LEFT JOIN LATERAL (
  SELECT completeness_percent
  FROM project_resumes
  WHERE project_id = pwa.project_id AND is_active = true
  LIMIT 1
) pr ON true
LEFT JOIN LATERAL (
  SELECT completeness_percent
  FROM borrower_resumes
  WHERE project_id = pwa.project_id AND is_active = true
  LIMIT 1
) br ON true
WHERE pwa.last_project_resume_edit_at IS NOT NULL
   OR pwa.last_borrower_resume_edit_at IS NOT NULL
ORDER BY pwa.last_project_resume_edit_at DESC NULLS LAST;

-- =============================================================================
-- Clean up existing nudge notifications (optional)
-- Run this to reset and test fresh nudge creation
-- =============================================================================
-- DELETE FROM notifications WHERE payload->>'type' = 'resume_incomplete_nudge';
-- DELETE FROM domain_events WHERE event_type = 'resume_incomplete_nudge';
