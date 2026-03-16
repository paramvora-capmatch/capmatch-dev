-- =============================================================================
-- RLS: Performance (auth_rls_initplan + multiple permissive) + Security (jobs, required_resume_fields)
-- =============================================================================
-- Idempotent: safe to run multiple times. Drops policies we create before recreating.
-- 1. Enable RLS on jobs + required_resume_fields with correct policies.
-- 2. Fix auth_rls_initplan (use ((SELECT auth.jwt()) ->> 'role')) and consolidate
--    policies on match_runs, lender_ai_reports, lender_project_access, om, orgs.
-- 3. jobs + lender_ai_reports: single SELECT (incl. service_role), separate INSERT/UPDATE/DELETE for service role.
-- Realtime: not modified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. JOBS: Enable RLS + single SELECT (project access or service_role), separate write policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view jobs for projects they can access" ON public.jobs;
DROP POLICY IF EXISTS "Service role full access on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users or service role can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role can delete jobs" ON public.jobs;

CREATE POLICY "Users or service role can view jobs"
ON public.jobs FOR SELECT
USING (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = jobs.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = jobs.project_id
    AND p.owner_org_id = ANY(public.get_user_org_ids((SELECT public.get_current_user_id())))
  )
  OR public.is_lender_with_project_access((SELECT public.get_current_user_id()), jobs.project_id)
);

CREATE POLICY "Service role can insert jobs"
ON public.jobs FOR INSERT
WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

CREATE POLICY "Service role can update jobs"
ON public.jobs FOR UPDATE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role')
WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete jobs"
ON public.jobs FOR DELETE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

-- -----------------------------------------------------------------------------
-- 2. REQUIRED_RESUME_FIELDS: Enable RLS + SELECT for authenticated (trigger reads)
-- -----------------------------------------------------------------------------
ALTER TABLE public.required_resume_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read required resume fields" ON public.required_resume_fields;

CREATE POLICY "Authenticated users can read required resume fields"
ON public.required_resume_fields FOR SELECT
TO authenticated
USING (true);

-- -----------------------------------------------------------------------------
-- 3. MATCH_RUNS: Single SELECT, single INSERT, service role UPDATE/DELETE (initPlan-safe)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access on match_runs" ON public.match_runs;
DROP POLICY IF EXISTS "Assigned advisor can view match runs" ON public.match_runs;
DROP POLICY IF EXISTS "Assigned advisor can create match runs" ON public.match_runs;
DROP POLICY IF EXISTS "Lenders can view match runs for granted projects" ON public.match_runs;
DROP POLICY IF EXISTS "Project owner org members can view match runs" ON public.match_runs;
DROP POLICY IF EXISTS "Users can view match runs for accessible projects" ON public.match_runs;
DROP POLICY IF EXISTS "Assigned advisor or service role can insert match runs" ON public.match_runs;
DROP POLICY IF EXISTS "Service role can update match runs" ON public.match_runs;
DROP POLICY IF EXISTS "Service role can delete match runs" ON public.match_runs;

CREATE POLICY "Users can view match runs for accessible projects"
ON public.match_runs FOR SELECT
USING (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = match_runs.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
  OR public.is_lender_with_project_access((SELECT public.get_current_user_id()), match_runs.project_id)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = match_runs.project_id
    AND p.owner_org_id = ANY(public.get_user_org_ids((SELECT public.get_current_user_id())))
  )
);

CREATE POLICY "Assigned advisor or service role can insert match runs"
ON public.match_runs FOR INSERT
WITH CHECK (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = match_runs.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
);

CREATE POLICY "Service role can update match runs"
ON public.match_runs FOR UPDATE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role')
WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete match runs"
ON public.match_runs FOR DELETE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

-- -----------------------------------------------------------------------------
-- 4. LENDER_AI_REPORTS: Single SELECT (incl. service_role), separate INSERT/UPDATE/DELETE for service role
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access on lender_ai_reports" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Assigned advisor can view lender AI reports" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Project owner org members can view lender AI reports" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Users can view lender AI reports for accessible projects" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Service role can insert lender_ai_reports" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Service role can update lender_ai_reports" ON public.lender_ai_reports;
DROP POLICY IF EXISTS "Service role can delete lender_ai_reports" ON public.lender_ai_reports;

CREATE POLICY "Users can view lender AI reports for accessible projects"
ON public.lender_ai_reports FOR SELECT
USING (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = lender_ai_reports.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = lender_ai_reports.project_id
    AND p.owner_org_id = ANY(public.get_user_org_ids((SELECT public.get_current_user_id())))
  )
);

CREATE POLICY "Service role can insert lender_ai_reports"
ON public.lender_ai_reports FOR INSERT
WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

CREATE POLICY "Service role can update lender_ai_reports"
ON public.lender_ai_reports FOR UPDATE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role')
WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

CREATE POLICY "Service role can delete lender_ai_reports"
ON public.lender_ai_reports FOR DELETE
USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

-- -----------------------------------------------------------------------------
-- 5. LENDER_PROJECT_ACCESS: Single SELECT, single DELETE (initPlan-safe); INSERT/UPDATE unchanged
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assigned advisor can view lender access for their project" ON public.lender_project_access;
DROP POLICY IF EXISTS "Users can select lender project access" ON public.lender_project_access;
DROP POLICY IF EXISTS "Assigned advisor can delete lender access for their project" ON public.lender_project_access;
DROP POLICY IF EXISTS "Service role can delete lender access" ON public.lender_project_access;
DROP POLICY IF EXISTS "Assigned advisor or service role can delete lender access" ON public.lender_project_access;

CREATE POLICY "Users can select lender project access"
ON public.lender_project_access FOR SELECT
USING (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = lender_project_access.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
  OR lender_org_id = ANY(public.get_user_org_ids((SELECT public.get_current_user_id())))
);

CREATE POLICY "Assigned advisor or service role can delete lender access"
ON public.lender_project_access FOR DELETE
USING (
  ((SELECT auth.jwt()) ->> 'role') = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = lender_project_access.project_id
    AND p.assigned_advisor_id = (SELECT public.get_current_user_id())
  )
);

-- -----------------------------------------------------------------------------
-- 6. OM: Single SELECT (initPlan-safe)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view OM for projects they have access to" ON public.om;
DROP POLICY IF EXISTS "Users can view OM if they can view the project" ON public.om;
DROP POLICY IF EXISTS "Users can view OM for accessible projects" ON public.om;

CREATE POLICY "Users can view OM for accessible projects"
ON public.om FOR SELECT
USING (
  public.is_lender_with_project_access((SELECT public.get_current_user_id()), om.project_id)
  OR EXISTS (
    SELECT 1 FROM public.project_access_grants pag
    WHERE pag.project_id = om.project_id
    AND pag.user_id = (SELECT public.get_current_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om_member ON om_member.org_id = p.owner_org_id
    WHERE p.id = om.project_id
    AND om_member.user_id = (SELECT public.get_current_user_id())
  )
);

-- -----------------------------------------------------------------------------
-- 7. ORGS: Single SELECT (initPlan-safe)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assigned advisors can view lender orgs for their projects" ON public.orgs;
DROP POLICY IF EXISTS "Members can view their own orgs" ON public.orgs;
DROP POLICY IF EXISTS "Users can view orgs they belong to or lender orgs for advisor projects" ON public.orgs;

CREATE POLICY "Users can view orgs they belong to or lender orgs for advisor projects"
ON public.orgs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = orgs.id
    AND om.user_id = (SELECT public.get_current_user_id())
  )
  OR (
    entity_type = 'lender'
    AND id IN (
      SELECT lpa.lender_org_id
      FROM public.lender_project_access lpa
      JOIN public.projects p ON p.id = lpa.project_id
      WHERE p.assigned_advisor_id = (SELECT public.get_current_user_id())
    )
  )
);
