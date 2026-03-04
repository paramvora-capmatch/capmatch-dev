-- =============================================================================
-- Lender chat: participant-only access + profiles for chat co-participants
-- =============================================================================
--
-- 1. Chat: Lenders may only see and message in channels (threads) they are
--    explicitly added to as participants. Remove project-level lender bypass
--    from chat_threads, chat_thread_participants, and project_messages.
--
-- 2. Profiles: Allow users to view profiles of others who share a chat thread
--    (so lenders and others see real names in chat instead of "User").
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. chat_threads: SELECT only for participants (remove lender project access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view chat threads they have access to" ON public.chat_threads;

CREATE POLICY "Users can view chat threads they have access to"
ON public.chat_threads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_thread_participants p
        WHERE p.thread_id = id AND p.user_id = public.get_current_user_id()
    )
);

COMMENT ON POLICY "Users can view chat threads they have access to" ON public.chat_threads IS
'Users (including lenders) only see threads they are participants in. Lenders must be added to specific channels via chat_thread_participants.';

-- -----------------------------------------------------------------------------
-- 2. chat_thread_participants: SELECT only own row or same-thread participants
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view thread participants" ON public.chat_thread_participants;

CREATE POLICY "Users can view thread participants"
ON public.chat_thread_participants
FOR SELECT
USING (
    user_id = public.get_current_user_id()
    OR public.is_thread_participant(thread_id, public.get_current_user_id())
);

COMMENT ON POLICY "Users can view thread participants" ON public.chat_thread_participants IS
'Users see participants only in threads they are in (no lender project-level bypass).';

-- -----------------------------------------------------------------------------
-- 3. project_messages: SELECT only in threads where user is participant
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read messages in accessible threads" ON public.project_messages;

CREATE POLICY "Users can read messages in accessible threads"
ON public.project_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_thread_participants p
        WHERE p.thread_id = project_messages.thread_id AND p.user_id = public.get_current_user_id()
    )
);

-- -----------------------------------------------------------------------------
-- 4. project_messages: INSERT only in threads where user is participant
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can send messages in accessible threads" ON public.project_messages;

CREATE POLICY "Users can send messages in accessible threads"
ON public.project_messages
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
        SELECT 1 FROM public.chat_thread_participants p
        WHERE p.thread_id = thread_id AND p.user_id = public.get_current_user_id()
    )
);

-- -----------------------------------------------------------------------------
-- 5. profiles: Allow viewing profiles of users who share a chat thread
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

CREATE POLICY "Users can view related profiles" ON public.profiles
FOR SELECT USING (
  public.get_current_user_id() = id
  OR
  EXISTS (
    SELECT 1 FROM public.org_members om1
    JOIN public.org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = public.get_current_user_id() AND om2.user_id = profiles.id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.project_access_grants pag1
    JOIN public.project_access_grants pag2 ON pag1.project_id = pag2.project_id
    WHERE pag1.user_id = public.get_current_user_id() AND pag2.user_id = profiles.id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON p.owner_org_id = om.org_id
    JOIN public.project_access_grants pag ON p.id = pag.project_id
    WHERE om.user_id = public.get_current_user_id() AND om.role = 'owner'
    AND pag.user_id = profiles.id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON p.owner_org_id = om.org_id
    JOIN public.project_access_grants pag ON p.id = pag.project_id
    WHERE pag.user_id = public.get_current_user_id()
    AND om.user_id = profiles.id AND om.role = 'owner'
  )
  OR
  -- 6. Same chat thread: so lenders and others see real names in channel
  EXISTS (
    SELECT 1 FROM public.chat_thread_participants p1
    JOIN public.chat_thread_participants p2 ON p1.thread_id = p2.thread_id
    WHERE p1.user_id = public.get_current_user_id() AND p2.user_id = profiles.id
  )
);

COMMENT ON POLICY "Users can view related profiles" ON public.profiles IS
'View own profile, org members, project grant peers, or chat thread co-participants (so chat shows real names).';
