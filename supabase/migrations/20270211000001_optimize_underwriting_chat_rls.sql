-- Optimize underwriting_chat_threads and underwriting_chat_messages RLS policies
-- Replace direct auth.uid() with public.get_current_user_id() so the planner can
-- cache the value once per statement (STABLE), avoiding per-row re-execution.
-- See CLAUDE.md RLS best practices and 20251228000002_optimize_rls_auth_uid.sql.

-- underwriting_chat_threads: SELECT
DROP POLICY IF EXISTS "Users can view underwriting threads for projects they have access to" ON public.underwriting_chat_threads;
CREATE POLICY "Users can view underwriting threads for projects they have access to"
ON public.underwriting_chat_threads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.org_members om ON p.owner_org_id = om.org_id
        WHERE p.id = underwriting_chat_threads.project_id
        AND (
            p.assigned_advisor_id = public.get_current_user_id()
            OR (om.user_id = public.get_current_user_id())
        )
    )
);

-- underwriting_chat_threads: INSERT
DROP POLICY IF EXISTS "Users can create underwriting threads for their projects" ON public.underwriting_chat_threads;
CREATE POLICY "Users can create underwriting threads for their projects"
ON public.underwriting_chat_threads
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.org_members om ON p.owner_org_id = om.org_id
        WHERE p.id = project_id
        AND (
            p.assigned_advisor_id = public.get_current_user_id()
            OR (om.user_id = public.get_current_user_id())
        )
    )
);

-- underwriting_chat_messages: SELECT
DROP POLICY IF EXISTS "Users can view messages in visible threads" ON public.underwriting_chat_messages;
CREATE POLICY "Users can view messages in visible threads"
ON public.underwriting_chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.underwriting_chat_threads t
        WHERE t.id = underwriting_chat_messages.thread_id
        AND EXISTS (
            SELECT 1 FROM public.projects p
            LEFT JOIN public.org_members om ON p.owner_org_id = om.org_id
            WHERE p.id = t.project_id
            AND (
                p.assigned_advisor_id = public.get_current_user_id()
                OR (om.user_id = public.get_current_user_id())
            )
        )
    )
);

-- underwriting_chat_messages: INSERT
DROP POLICY IF EXISTS "Users can insert messages in visible threads" ON public.underwriting_chat_messages;
CREATE POLICY "Users can insert messages in visible threads"
ON public.underwriting_chat_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.underwriting_chat_threads t
        WHERE t.id = thread_id
        AND EXISTS (
            SELECT 1 FROM public.projects p
            LEFT JOIN public.org_members om ON p.owner_org_id = om.org_id
            WHERE p.id = t.project_id
            AND (
                p.assigned_advisor_id = public.get_current_user_id()
                OR (om.user_id = public.get_current_user_id())
            )
        )
    )
);

-- Indexes already exist: idx_underwriting_threads_project_id, idx_underwriting_messages_thread_id
