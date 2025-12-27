-- =============================================================================
-- Migration: Optimize Remaining RLS Policies for Performance
-- =============================================================================
--
-- Fixes performance issues where auth.uid() was being re-evaluated for each row.
-- Wraps auth.uid() in subqueries so it's evaluated once per query instead.
--
-- This migration fixes the following policies:
-- 1. project_access_grants: "Advisors can view grants for assigned projects"
-- 2. project_access_grants: "Members can view grants for their projects"
-- 3. message_attachments: "Participants can create attachments"
-- 4. advisor_resumes: "Advisors in org can manage their org resume"
--
-- =============================================================================

-- =============================================================================
-- 1. project_access_grants: "Advisors can view grants for assigned projects"
-- =============================================================================
DROP POLICY IF EXISTS "Advisors can view grants for assigned projects" ON public.project_access_grants;

CREATE POLICY "Advisors can view grants for assigned projects" ON public.project_access_grants
FOR SELECT USING (
    public.is_assigned_advisor(project_id, (select auth.uid()))
);

COMMENT ON POLICY "Advisors can view grants for assigned projects" ON public.project_access_grants IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation. Allows advisors to view all project_access_grants for projects where they are the assigned advisor, enabling them to see all project members.';

-- =============================================================================
-- 2. project_access_grants: "Members can view grants for their projects"
-- =============================================================================
DROP POLICY IF EXISTS "Members can view grants for their projects" ON public.project_access_grants;

CREATE POLICY "Members can view grants for their projects" ON public.project_access_grants
FOR SELECT USING (
    public.user_has_project_access(project_id, (select auth.uid()))
);

COMMENT ON POLICY "Members can view grants for their projects" ON public.project_access_grants IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation. Allows members to view all project_access_grants for projects where they have a grant, enabling them to see other project members.';

-- =============================================================================
-- 3. message_attachments: "Participants can create attachments"
-- =============================================================================
DROP POLICY IF EXISTS "Participants can create attachments" ON public.message_attachments;

CREATE POLICY "Participants can create attachments" ON public.message_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_messages m
    JOIN public.chat_thread_participants p ON p.thread_id = m.thread_id
    WHERE m.id = message_id
      AND p.user_id = (select auth.uid())
  )
  AND public.can_view((select auth.uid()), resource_id)
);

COMMENT ON POLICY "Participants can create attachments" ON public.message_attachments IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation';

-- =============================================================================
-- 4. advisor_resumes: "Advisors in org can manage their org resume"
-- =============================================================================
DROP POLICY IF EXISTS "Advisors in org can manage their org resume" ON public.advisor_resumes;

CREATE POLICY "Advisors in org can manage their org resume" ON public.advisor_resumes
FOR ALL USING (
    -- Check if the user is a member of the advisor org
    EXISTS (
        SELECT 1 
        FROM public.org_members om
        JOIN public.orgs o ON o.id = om.org_id
        WHERE om.org_id = advisor_resumes.org_id
          AND om.user_id = (select auth.uid())
          AND o.entity_type = 'advisor'
    )
) WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
        SELECT 1 
        FROM public.org_members om
        JOIN public.orgs o ON o.id = om.org_id
        WHERE om.org_id = advisor_resumes.org_id
          AND om.user_id = (select auth.uid())
          AND o.entity_type = 'advisor'
    )
);

COMMENT ON POLICY "Advisors in org can manage their org resume" ON public.advisor_resumes IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation';

