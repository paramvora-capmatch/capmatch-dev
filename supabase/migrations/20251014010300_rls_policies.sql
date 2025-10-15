-- =============================================================================
-- 1. Helper Functions
-- These SECURITY DEFINER functions encapsulate common permission checks.
-- =============================================================================

-- Checks if a user is a member of any role in a given entity
CREATE OR REPLACE FUNCTION public.is_entity_member(p_entity_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.entity_members
    WHERE entity_id = p_entity_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if a user is an 'owner' of a given entity
CREATE OR REPLACE FUNCTION public.is_entity_owner(p_entity_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.entity_members
    WHERE entity_id = p_entity_id AND user_id = p_user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Checks if a user is the assigned advisor for a project
CREATE OR REPLACE FUNCTION public.is_project_advisor(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND assigned_advisor_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if a user can view a project (member of owning entity OR advisor)
CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
BEGIN
  SELECT owner_entity_id INTO v_owner_entity_id FROM public.projects WHERE id = p_project_id;
  RETURN public.is_entity_member(v_owner_entity_id, p_user_id) OR public.is_project_advisor(p_project_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if a user can edit a project (owner of owning entity OR advisor)
CREATE OR REPLACE FUNCTION public.can_edit_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
BEGIN
  SELECT owner_entity_id INTO v_owner_entity_id FROM public.projects WHERE id = p_project_id;
  RETURN public.is_entity_owner(v_owner_entity_id, p_user_id) OR public.is_project_advisor(p_project_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if a user is a participant in a chat thread
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 2. Enable RLS on all tables
-- =============================================================================
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_document_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

-- Profiles
CREATE POLICY "Users can view and manage their own profile" ON public.profiles
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Entities
CREATE POLICY "Members can view their own entities" ON public.entities
FOR SELECT USING (public.is_entity_member(id, auth.uid()));
CREATE POLICY "Owners can update their own entities" ON public.entities
FOR UPDATE USING (public.is_entity_owner(id, auth.uid())) WITH CHECK (public.is_entity_owner(id, auth.uid()));
-- No one can delete entities through the API for safety. This must be done via a trusted server process.

-- Entity Members
CREATE POLICY "Members can view memberships of their own entities" ON public.entity_members
FOR SELECT USING (public.is_entity_member(entity_id, auth.uid()));
CREATE POLICY "Owners can manage memberships of their own entities" ON public.entity_members
FOR ALL USING (public.is_entity_owner(entity_id, auth.uid())) WITH CHECK (public.is_entity_owner(entity_id, auth.uid()));

-- Invites
CREATE POLICY "Owners can manage invites for their entities" ON public.invites
FOR ALL USING (public.is_entity_owner(entity_id, auth.uid())) WITH CHECK (public.is_entity_owner(entity_id, auth.uid()));
CREATE POLICY "Invited users can view their own pending invites" ON public.invites
FOR SELECT USING (invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) AND status = 'pending');

-- Projects
CREATE POLICY "Users can view projects they have access to" ON public.projects
FOR SELECT USING (public.can_view_project(id, auth.uid()));
CREATE POLICY "Owners and advisors can manage projects" ON public.projects
FOR ALL USING (public.can_edit_project(id, auth.uid())) WITH CHECK (public.can_edit_project(id, auth.uid()));

-- Resumes (Borrower & Project)
CREATE POLICY "Users can view resumes for projects they have access to" ON public.borrower_resumes
FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.owner_entity_id = entity_id AND public.can_view_project(p.id, auth.uid())));
CREATE POLICY "Owners and advisors can manage borrower resumes" ON public.borrower_resumes
FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.owner_entity_id = entity_id AND public.can_edit_project(p.id, auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.owner_entity_id = entity_id AND public.can_edit_project(p.id, auth.uid())));

CREATE POLICY "Users can view resumes for projects they have access to" ON public.project_resumes
FOR SELECT USING (public.can_view_project(project_id, auth.uid()));
CREATE POLICY "Owners and advisors can manage project resumes" ON public.project_resumes
FOR ALL USING (public.can_edit_project(project_id, auth.uid())) WITH CHECK (public.can_edit_project(project_id, auth.uid()));

-- Document Permissions
CREATE POLICY "Owners and advisors can manage document permissions" ON public.document_permissions
FOR ALL USING (public.can_edit_project(project_id, auth.uid())) WITH CHECK (public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "Members can view their own document permissions" ON public.document_permissions
FOR SELECT USING (user_id = auth.uid());

-- Lender Document Access
CREATE POLICY "Owners and advisors can manage lender access" ON public.lender_document_access
FOR ALL USING (public.can_edit_project(project_id, auth.uid())) WITH CHECK (public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "Lenders can view access grants for their entity" ON public.lender_document_access
FOR SELECT USING (public.is_entity_member(lender_entity_id, auth.uid()));

-- Chat Threads & Participants
CREATE POLICY "Participants can interact with their chat threads" ON public.chat_threads
FOR ALL USING (EXISTS (SELECT 1 FROM chat_thread_participants ctp WHERE ctp.thread_id = id AND ctp.user_id = auth.uid()));
CREATE POLICY "Participants can see other participants in their threads" ON public.chat_thread_participants
FOR SELECT USING (public.is_thread_participant(thread_id, auth.uid()));

-- Project Messages
CREATE POLICY "Participants can read and write messages in their threads" ON public.project_messages
FOR ALL USING (public.is_thread_participant(thread_id, auth.uid())) WITH CHECK (public.is_thread_participant(thread_id, auth.uid()));

-- Message Attachments (For V1, simple check. V2 would add the 'all participants can view' check)
CREATE POLICY "Participants can manage attachments in their threads" ON public.message_attachments
FOR ALL USING (EXISTS (SELECT 1 FROM project_messages pm WHERE pm.id = message_id AND public.is_thread_participant(pm.thread_id, auth.uid())));

-- Notifications
CREATE POLICY "Users can only see and manage their own notifications" ON public.notifications
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
