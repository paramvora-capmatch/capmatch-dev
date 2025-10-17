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
-- Core Helper Functions
-- =============================================================================

-- Note: Most helper functions and all RLS policies from this file have been
-- removed and are now managed in the newer, more explicit RLS rebuild migrations.
-- Only essential, non-RLS-related functions are kept here.

-- Check if a user is an owner of an organization.
-- This function is a core utility and is still used by the new RLS system.
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
