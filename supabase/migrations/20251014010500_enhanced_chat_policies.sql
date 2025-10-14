-- =============================================================================
-- Enhanced Chat RLS Policies
-- =============================================================================

-- Drop existing chat policies to replace with more comprehensive ones
DROP POLICY IF EXISTS "Participants can interact with their chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Participants can see other participants in their threads" ON public.chat_thread_participants;
DROP POLICY IF EXISTS "Participants can read and write messages in their threads" ON public.project_messages;

-- Enhanced Chat Threads Policy
CREATE POLICY "Participants can view and create threads in their projects" ON public.chat_threads
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_thread_participants ctp 
        WHERE ctp.thread_id = id AND ctp.user_id = auth.uid()
    )
);

CREATE POLICY "Project owners and advisors can create threads" ON public.chat_threads
FOR INSERT WITH CHECK (
    public.can_edit_project(project_id, auth.uid())
);

CREATE POLICY "Project owners and advisors can update threads" ON public.chat_threads
FOR UPDATE USING (
    public.can_edit_project(project_id, auth.uid())
) WITH CHECK (
    public.can_edit_project(project_id, auth.uid())
);

-- Enhanced Chat Thread Participants Policy
CREATE POLICY "Participants can view other participants in their threads" ON public.chat_thread_participants
FOR SELECT USING (
    public.is_thread_participant(thread_id, auth.uid())
);

CREATE POLICY "Project owners and advisors can manage participants" ON public.chat_thread_participants
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM chat_threads ct 
        WHERE ct.id = thread_id AND public.can_edit_project(ct.project_id, auth.uid())
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_threads ct 
        WHERE ct.id = thread_id AND public.can_edit_project(ct.project_id, auth.uid())
    )
);

-- Enhanced Project Messages Policy
CREATE POLICY "Participants can read messages in their threads" ON public.project_messages
FOR SELECT USING (
    public.is_thread_participant(thread_id, auth.uid())
);

CREATE POLICY "Participants can send messages in their threads" ON public.project_messages
FOR INSERT WITH CHECK (
    public.is_thread_participant(thread_id, auth.uid())
);

CREATE POLICY "Message authors can update their own messages" ON public.project_messages
FOR UPDATE USING (
    public.is_thread_participant(thread_id, auth.uid()) AND user_id = auth.uid()
) WITH CHECK (
    public.is_thread_participant(thread_id, auth.uid()) AND user_id = auth.uid()
);

CREATE POLICY "Message authors can delete their own messages" ON public.project_messages
FOR DELETE USING (
    public.is_thread_participant(thread_id, auth.uid()) AND user_id = auth.uid()
);

-- Project owners and advisors can delete any message in their project threads
CREATE POLICY "Project owners and advisors can delete messages" ON public.project_messages
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM chat_threads ct 
        WHERE ct.id = thread_id AND public.can_edit_project(ct.project_id, auth.uid())
    )
);
