-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_project_messages_thread_created
  ON public.project_messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_project_status
  ON public.chat_threads(project_id, status);

CREATE INDEX IF NOT EXISTS idx_resources_org_type
  ON public.resources(org_id, resource_type);

-- Optimize meetings and meeting_participants RLS to use get_current_user_id()
DROP POLICY IF EXISTS "Users can view their meetings" ON public.meetings;
CREATE POLICY "Users can view their meetings"
  ON public.meetings FOR SELECT
  USING (
    organizer_id = public.get_current_user_id()
    OR id IN (
      SELECT meeting_id
      FROM public.meeting_participants
      WHERE user_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
CREATE POLICY "Users can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (organizer_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Organizers can update their meetings" ON public.meetings;
CREATE POLICY "Organizers can update their meetings"
  ON public.meetings FOR UPDATE
  USING (organizer_id = public.get_current_user_id())
  WITH CHECK (organizer_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Organizers can delete their meetings" ON public.meetings;
CREATE POLICY "Organizers can delete their meetings"
  ON public.meetings FOR DELETE
  USING (organizer_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Organizers can add participants" ON public.meeting_participants;
CREATE POLICY "Organizers can add participants"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE organizer_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Participants can update their response" ON public.meeting_participants;
CREATE POLICY "Participants can update their response"
  ON public.meeting_participants FOR UPDATE
  USING (
    user_id = public.get_current_user_id()
    OR meeting_id IN (
      SELECT id FROM public.meetings WHERE organizer_id = public.get_current_user_id()
    )
  )
  WITH CHECK (
    user_id = public.get_current_user_id()
    OR meeting_id IN (
      SELECT id FROM public.meetings WHERE organizer_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Organizers can remove participants" ON public.meeting_participants;
CREATE POLICY "Organizers can remove participants"
  ON public.meeting_participants FOR DELETE
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE organizer_id = public.get_current_user_id()
    )
  );
