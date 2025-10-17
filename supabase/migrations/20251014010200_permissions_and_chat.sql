-- =============================================================================
-- Hierarchical Permissions System
-- =============================================================================

-- Core table for all permissionable items in the system.
-- Forms a tree structure.
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Nullable for org-level resources
    parent_id UUID REFERENCES public.resources(id) ON DELETE CASCADE, -- For tree structure
    resource_type TEXT NOT NULL CHECK (
        resource_type IN (
            'BORROWER_RESUME',
            'BORROWER_DOCS_ROOT',
            'PROJECT_RESUME',
            'PROJECT_DOCS_ROOT',
            'FOLDER',
            'FILE'
        )
    ),
    name TEXT NOT NULL,
    storage_path TEXT, -- For FILE types, this is the key in Supabase Storage
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(parent_id, name) -- No two files/folders with the same name in the same folder
);
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_resources_parent_id ON public.resources(parent_id);
CREATE INDEX idx_resources_project_id ON public.resources(project_id);
CREATE INDEX idx_resources_storage_path ON public.resources(storage_path);


-- Access Control List (ACL) table for specific permission grants.
-- This is where overrides and exceptions to role-based permissions are stored.
CREATE TABLE public.permissions (
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (resource_id, user_id) -- A user can only have one permission level per resource
);
CREATE INDEX idx_permissions_user_id ON public.permissions(user_id);


-- =============================================================================
-- Chat System (largely unchanged)
-- =============================================================================

-- Table for chat threads within a project
CREATE TABLE public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    topic TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_threads_project_id ON public.chat_threads(project_id);

-- Table to explicitly list participants of a chat thread
CREATE TABLE public.chat_thread_participants (
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX idx_chat_participants_user_id ON public.chat_thread_participants(user_id);

-- Table for the chat messages themselves
CREATE TABLE public.project_messages (
    id BIGSERIAL PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- SET NULL so message remains if user is deleted
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_messages_thread_id ON public.project_messages(thread_id);

-- Table to link messages to document references
CREATE TABLE public.message_attachments (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE, -- Changed to reference resources
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);

-- Table for in-app user notifications
CREATE TABLE public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    link_url TEXT, -- e.g., /projects/123/chat/456
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- =============================================================================
-- Core Helper Functions for Hierarchical Permissions
-- =============================================================================

-- Gets a user's base role within an organization.
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID, p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.org_members
  WHERE user_id = p_user_id AND org_id = p_org_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a user is an owner of an organization
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.org_members 
    WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The main permission checking function using a recursive CTE.
-- It finds the highest-precedence permission for a user on a given resource.
CREATE OR REPLACE FUNCTION public.get_effective_permission(p_user_id UUID, p_resource_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_permission TEXT;
    v_org_id UUID;
    v_user_role TEXT;
    v_is_borrower_doc BOOLEAN;
    v_resource_type TEXT;
BEGIN
    -- 1. Check for a direct permission on the resource or its ancestors.
    -- This is the ACL override layer.
    WITH RECURSIVE resource_ancestry AS (
        SELECT id, parent_id, resource_type FROM public.resources WHERE id = p_resource_id
        UNION ALL
        SELECT r.id, r.parent_id, r.resource_type FROM public.resources r
        INNER JOIN resource_ancestry ra ON r.id = ra.parent_id
    )
    SELECT p.permission INTO v_permission
    FROM public.permissions p
    JOIN resource_ancestry ra ON p.resource_id = ra.id
    WHERE p.user_id = p_user_id
    ORDER BY (
        CASE
            WHEN p.resource_id = p_resource_id THEN 0 -- Direct permission has highest precedence
            ELSE 1
        END
    )
    LIMIT 1;

    -- If a direct or inherited permission is found, return it.
    IF v_permission IS NOT NULL THEN
        RETURN v_permission;
    END IF;

    -- 2. If no explicit permission, fall back to the user's base role.
    SELECT org_id, resource_type INTO v_org_id, v_resource_type FROM public.resources WHERE id = p_resource_id;
    v_user_role := public.get_user_role(p_user_id, v_org_id);

    IF v_user_role = 'owner' THEN
        RETURN 'edit'; -- Owners can edit everything by default.
    END IF;

    IF v_user_role = 'member' THEN
        -- Members have specific default rules.
        IF v_resource_type = 'BORROWER_DOCS_ROOT' THEN
             RETURN NULL; -- Members have NO access to Borrower Docs by default.
        END IF;

        -- Check if the resource is a child of "Borrower Docs".
        WITH RECURSIVE resource_ancestry AS (
            SELECT id, parent_id, resource_type FROM public.resources WHERE id = p_resource_id
            UNION ALL
            SELECT r.id, r.parent_id, r.resource_type FROM public.resources r
            INNER JOIN resource_ancestry ra ON r.id = ra.parent_id
        )
        SELECT EXISTS (
            SELECT 1 FROM resource_ancestry WHERE resource_type = 'BORROWER_DOCS_ROOT'
        ) INTO v_is_borrower_doc;

        IF v_is_borrower_doc THEN
            RETURN NULL; -- Members have NO access to Borrower Docs by default.
        ELSE
            RETURN 'view'; -- Members can view all other resources by default.
        END IF;
    END IF;

    -- Default to no access if no role or other rules match.
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience function to check for 'view' or higher permission.
CREATE OR REPLACE FUNCTION public.can_view(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_effective_permission(p_user_id, p_resource_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience function to check for 'edit' permission.
CREATE OR REPLACE FUNCTION public.can_edit(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_effective_permission(p_user_id, p_resource_id) = 'edit';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Helper Functions for Chat System
-- =============================================================================

-- Helper function to check if a user is a participant in a chat thread
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if ALL participants in a thread can view a resource
CREATE OR REPLACE FUNCTION public.can_thread_view_resource(p_thread_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if there is any participant in the thread
    -- who does NOT have view permission on the resource.
    -- If such a participant exists, the function returns FALSE.
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.chat_thread_participants ctp
        WHERE ctp.thread_id = p_thread_id
        AND NOT public.can_view(ctp.user_id, p_resource_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RLS Policies for Chat System
-- =============================================================================

-- Enable RLS on chat tables
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chat Threads
-- Users can see threads of projects they can view.
-- Owners/PMs can manage threads in projects they can edit.
CREATE POLICY "Users can view threads in accessible projects" ON public.chat_threads
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.project_id = chat_threads.project_id AND r.resource_type = 'PROJECT_DOCS_ROOT'
    AND public.can_view(auth.uid(), r.id)
));

CREATE POLICY "Project editors can manage threads" ON public.chat_threads
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.project_id = chat_threads.project_id AND r.resource_type = 'PROJECT_DOCS_ROOT'
    AND public.can_edit(auth.uid(), r.id)
));

-- Chat Thread Participants
CREATE POLICY "Participants can view other participants in their threads" ON public.chat_thread_participants
FOR SELECT USING (public.is_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Project editors can manage participants" ON public.chat_thread_participants
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.chat_threads ct
    JOIN public.resources r ON r.project_id = ct.project_id AND r.resource_type = 'PROJECT_DOCS_ROOT'
    WHERE ct.id = chat_thread_participants.thread_id
    AND public.can_edit(auth.uid(), r.id)
));

-- Project Messages
CREATE POLICY "Participants can view messages in their threads" ON public.project_messages
FOR SELECT USING (public.is_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Participants can create messages in their threads" ON public.project_messages
FOR INSERT WITH CHECK (public.is_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Message authors can update their own messages" ON public.project_messages
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Message authors can delete their own messages" ON public.project_messages
FOR DELETE USING (user_id = auth.uid());

-- Message Attachments
CREATE POLICY "Participants can attach files if all members have access"
ON public.message_attachments
FOR INSERT
WITH CHECK (
    -- Check if the user is in the thread AND all participants can see the attached resource
    EXISTS (
        SELECT 1 FROM project_messages pm
        WHERE pm.id = message_id AND public.is_thread_participant(pm.thread_id, auth.uid())
    ) AND public.can_thread_view_resource((SELECT thread_id FROM project_messages WHERE id = message_id), resource_id)
);

CREATE POLICY "Participants can view attachments in their threads"
ON public.message_attachments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_messages pm
        WHERE pm.id = message_id AND public.is_thread_participant(pm.thread_id, auth.uid())
    )
);

CREATE POLICY "Authors can delete their own attachments"
ON public.message_attachments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM project_messages pm
        WHERE pm.id = message_id AND pm.user_id = auth.uid()
    )
);

-- Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- RLS Policies for Core Tables (Consolidated)
-- =============================================================================

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view and manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Orgs
CREATE POLICY "Members can view their own orgs" ON public.orgs FOR SELECT USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = id AND user_id = auth.uid()));
CREATE POLICY "Owners can update their own orgs" ON public.orgs FOR UPDATE USING (public.is_org_owner(id, auth.uid()));

-- Org Members
CREATE POLICY "Members can view memberships of their own orgs" ON public.org_members FOR SELECT USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid()));
CREATE POLICY "Owners can manage memberships of their own orgs" ON public.org_members FOR ALL USING (public.is_org_owner(org_id, auth.uid()));

-- Invites
CREATE POLICY "Owners can manage invites for their orgs" ON public.invites FOR ALL USING (public.is_org_owner(org_id, auth.uid()));
CREATE POLICY "Invited users can view their own pending invites" ON public.invites FOR SELECT USING (invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) AND status = 'pending');

-- A helper function is needed for the resource policies below
CREATE OR REPLACE FUNCTION public.get_resource_id_from_fk(p_fk_id UUID, p_resource_type TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.resources WHERE (CASE WHEN p_resource_type = 'PROJECT_RESUME' THEN project_id ELSE org_id END) = p_fk_id AND resource_type = p_resource_type LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Projects
CREATE POLICY "Users can access projects based on resource permissions" ON public.projects FOR ALL USING (public.can_view(auth.uid(), public.get_resource_id_from_fk(id, 'PROJECT_DOCS_ROOT')));

-- Resumes (Borrower & Project)
CREATE POLICY "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes FOR ALL USING (public.can_view(auth.uid(), public.get_resource_id_from_fk(org_id, 'BORROWER_RESUME')));
CREATE POLICY "Users can access project resumes based on resource permissions" ON public.project_resumes FOR ALL USING (public.can_view(auth.uid(), public.get_resource_id_from_fk(project_id, 'PROJECT_RESUME')));

-- Resources
CREATE POLICY "Users can manage resources they have access to" ON public.resources FOR ALL USING (public.can_view(auth.uid(), id)) WITH CHECK (public.can_edit(auth.uid(), id));

-- Permissions (ACL)
CREATE POLICY "Users can manage permissions for resources they can edit" ON public.permissions FOR ALL USING (public.can_edit(auth.uid(), resource_id));


-- =============================================================================
-- Storage RLS Policies (Consolidated)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_resource_by_storage_path(p_storage_path TEXT)
RETURNS UUID AS $$
DECLARE
    v_resource_id UUID;
BEGIN
    SELECT id INTO v_resource_id
    FROM public.resources
    WHERE storage_path = p_storage_path;
    RETURN v_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Enable access to all authenticated users" ON storage.buckets FOR SELECT TO authenticated;

CREATE POLICY "Unified storage access policy" ON storage.objects FOR ALL
USING (
    -- User must have 'view' or 'edit' on the corresponding resource
    public.get_effective_permission(auth.uid(), public.get_resource_by_storage_path(name)) IS NOT NULL
)
WITH CHECK (
    -- User must have 'edit' on the corresponding resource to upload/update
    public.get_effective_permission(auth.uid(), public.get_resource_by_storage_path(name)) = 'edit'
);
