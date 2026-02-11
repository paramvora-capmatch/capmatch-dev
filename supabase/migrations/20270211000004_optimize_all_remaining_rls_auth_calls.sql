-- =============================================================================
-- Optimize ALL remaining RLS policies that use bare auth.uid() or auth.jwt()
-- =============================================================================
-- Replaces direct auth calls with public.get_current_user_id() or (select auth.jwt())
-- so the planner can cache values per statement, avoiding per-row re-evaluation.
-- Covers: lender_project_access, projects, borrower_resumes, chat_threads,
--         chat_thread_participants, project_messages.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. lender_project_access
-- -----------------------------------------------------------------------------
-- (Handled by 20270211000006_consolidate_lender_project_access_policies.sql to avoid
-- multiple permissive policies for SELECT: one FOR SELECT + one FOR ALL both apply to SELECT.)

-- -----------------------------------------------------------------------------
-- 2. projects
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view granted projects" ON public.projects;
CREATE POLICY "Lenders can view granted projects"
ON public.projects
FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), id)
);

-- -----------------------------------------------------------------------------
-- 3. borrower_resumes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view borrower resumes for granted projects" ON public.borrower_resumes;
CREATE POLICY "Lenders can view borrower resumes for granted projects"
ON public.borrower_resumes
FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), borrower_resumes.project_id)
);

-- -----------------------------------------------------------------------------
-- 4. chat_threads
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view chat threads for granted projects" ON public.chat_threads;
CREATE POLICY "Lenders can view chat threads for granted projects"
ON public.chat_threads
FOR SELECT
USING (
    public.is_lender_with_project_access(public.get_current_user_id(), project_id)
);

-- -----------------------------------------------------------------------------
-- 5. chat_thread_participants (keep get_thread_project_id_safe to avoid recursion)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view thread participants" ON public.chat_thread_participants;
CREATE POLICY "Lenders can view thread participants"
ON public.chat_thread_participants
FOR SELECT
USING (
    public.is_lender_with_project_access(
        public.get_current_user_id(),
        public.get_thread_project_id_safe(thread_id)
    )
);

DROP POLICY IF EXISTS "Lenders can join chat threads for granted projects" ON public.chat_thread_participants;
CREATE POLICY "Lenders can join chat threads for granted projects"
ON public.chat_thread_participants
FOR INSERT
WITH CHECK (
    user_id = public.get_current_user_id()
    AND public.is_lender_with_project_access(
        public.get_current_user_id(),
        public.get_thread_project_id_safe(thread_id)
    )
);

-- -----------------------------------------------------------------------------
-- 6. project_messages
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lenders can view messages for granted projects" ON public.project_messages;
CREATE POLICY "Lenders can view messages for granted projects"
ON public.project_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_threads ct
        WHERE ct.id = project_messages.thread_id
        AND public.is_lender_with_project_access(public.get_current_user_id(), ct.project_id)
    )
);

DROP POLICY IF EXISTS "Lenders can send messages in granted project threads" ON public.project_messages;
CREATE POLICY "Lenders can send messages in granted project threads"
ON public.project_messages
FOR INSERT
WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
        SELECT 1 FROM public.chat_threads ct
        WHERE ct.id = thread_id
        AND public.is_lender_with_project_access(public.get_current_user_id(), ct.project_id)
    )
);

-- -----------------------------------------------------------------------------
-- 7. notifications (in case 20261222000004 wasn't applied or was reverted)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = public.get_current_user_id())
WITH CHECK (user_id = public.get_current_user_id());
