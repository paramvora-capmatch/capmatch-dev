-- =============================================================================
-- Consolidate multiple permissive RLS policies into single policies per action
-- =============================================================================
-- Multiple permissive policies for the same role/action cause each to be
-- evaluated for every query. This migration merges them with OR conditions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. borrower_resumes: 2 SELECT (resource permissions + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view borrower resumes for granted projects" ON public.borrower_resumes;
DROP POLICY IF EXISTS "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes;

CREATE POLICY "Users can access borrower resumes"
ON public.borrower_resumes
FOR ALL
USING (
    public.can_view(public.get_current_user_id(), public.get_resource_id_from_fk(project_id, 'BORROWER_RESUME'))
    OR public.is_lender_with_project_access(public.get_current_user_id(), project_id)
)
WITH CHECK (
    public.can_edit(public.get_current_user_id(), public.get_resource_id_from_fk(project_id, 'BORROWER_RESUME'))
);

COMMENT ON POLICY "Users can access borrower resumes" ON public.borrower_resumes IS
'Single policy: view by resource permission or lender grant; write by resource permission only.';

-- -----------------------------------------------------------------------------
-- 2. project_resumes: 2 SELECT (resource permissions + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view granted project resumes" ON public.project_resumes;
DROP POLICY IF EXISTS "Users can access project resumes based on resource permissions" ON public.project_resumes;

CREATE POLICY "Users can access project resumes"
ON public.project_resumes
FOR ALL
USING (
    public.can_view(public.get_current_user_id(), public.get_resource_id_from_fk(project_id, 'PROJECT_RESUME'))
    OR public.is_lender_with_project_access(public.get_current_user_id(), project_id)
)
WITH CHECK (
    public.can_edit(public.get_current_user_id(), public.get_resource_id_from_fk(project_id, 'PROJECT_RESUME'))
);

COMMENT ON POLICY "Users can access project resumes" ON public.project_resumes IS
'Single policy: view by resource permission or lender grant; write by resource permission only.';

-- -----------------------------------------------------------------------------
-- 3. projects: 2 SELECT (org/advisor/grants + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view granted projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;

CREATE POLICY "Users can view projects they have access to"
ON public.projects
FOR SELECT
USING (
    public.is_org_owner(owner_org_id, public.get_current_user_id())
    OR assigned_advisor_id = public.get_current_user_id()
    OR EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE project_id = projects.id AND user_id = public.get_current_user_id()
    )
    OR public.is_lender_with_project_access(public.get_current_user_id(), id)
);

-- -----------------------------------------------------------------------------
-- 4. chat_threads: 2 SELECT (participant + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view chat threads for granted projects" ON public.chat_threads;
DROP POLICY IF EXISTS "Participants can view chat threads" ON public.chat_threads;

CREATE POLICY "Users can view chat threads they have access to"
ON public.chat_threads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_thread_participants p
        WHERE p.thread_id = id AND p.user_id = public.get_current_user_id()
    )
    OR public.is_lender_with_project_access(public.get_current_user_id(), project_id)
);

-- -----------------------------------------------------------------------------
-- 5. chat_thread_participants: 2 SELECT (own/participant + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view thread participants" ON public.chat_thread_participants;
DROP POLICY IF EXISTS "Users can view participants in their threads" ON public.chat_thread_participants;

CREATE POLICY "Users can view thread participants"
ON public.chat_thread_participants
FOR SELECT
USING (
    user_id = public.get_current_user_id()
    OR public.is_thread_participant(thread_id, public.get_current_user_id())
    OR public.is_lender_with_project_access(
        public.get_current_user_id(),
        public.get_thread_project_id_safe(thread_id)
    )
);

COMMENT ON POLICY "Users can view thread participants" ON public.chat_thread_participants IS
'Single SELECT: own row, participant in thread, or lender with project access.';

-- -----------------------------------------------------------------------------
-- 6. project_messages: 2 SELECT (participant + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view messages for granted projects" ON public.project_messages;
DROP POLICY IF EXISTS "Participants can read messages" ON public.project_messages;

CREATE POLICY "Users can read messages in accessible threads"
ON public.project_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_thread_participants p
        WHERE p.thread_id = project_messages.thread_id AND p.user_id = public.get_current_user_id()
    )
    OR EXISTS (
        SELECT 1 FROM public.chat_threads ct
        WHERE ct.id = project_messages.thread_id
        AND public.is_lender_with_project_access(public.get_current_user_id(), ct.project_id)
    )
);

-- -----------------------------------------------------------------------------
-- 6b. project_messages: 2 INSERT (participant + lender access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can send messages in granted project threads" ON public.project_messages;
DROP POLICY IF EXISTS "Participants can write messages" ON public.project_messages;

CREATE POLICY "Users can send messages in accessible threads"
ON public.project_messages
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = public.get_current_user_id()
    AND (
        EXISTS (
            SELECT 1 FROM public.chat_thread_participants p
            WHERE p.thread_id = thread_id AND p.user_id = public.get_current_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id
            AND public.is_lender_with_project_access(public.get_current_user_id(), ct.project_id)
        )
    )
);

-- -----------------------------------------------------------------------------
-- 7. notifications: 2 SELECT + 2 UPDATE (same conditions; one policy per action)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (user_id = public.get_current_user_id())
WITH CHECK (user_id = public.get_current_user_id());

-- -----------------------------------------------------------------------------
-- 8. org_members: 2 SELECT (unified "Users can view org members" + lender "Org members can view other members")
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Org members can view other members" ON public.org_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.org_members;

CREATE POLICY "Users can view org members"
ON public.org_members
FOR SELECT
USING (
    user_id = public.get_current_user_id()
    OR public.is_org_owner(org_id, public.get_current_user_id())
    OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.owner_org_id = org_members.org_id
        AND projects.assigned_advisor_id = public.get_current_user_id()
    )
    OR org_id = ANY(public.get_user_org_ids(public.get_current_user_id()))
);

COMMENT ON POLICY "Users can view org members" ON public.org_members IS
'Unified SELECT: own membership, org owner, advisor for project org, or member of same org (e.g. lenders).';