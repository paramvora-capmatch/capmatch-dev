-- Table for explicit document permissions for internal team members
CREATE TABLE public.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id, document_path)
);
CREATE INDEX idx_doc_permissions_project_id ON public.document_permissions(project_id);
CREATE INDEX idx_doc_permissions_user_id ON public.document_permissions(user_id);

-- Table for explicit document access for external lender entities
CREATE TABLE public.lender_document_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    lender_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    document_path TEXT NOT NULL,
    granted_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, lender_entity_id, document_path)
);
CREATE INDEX idx_lender_access_project_id ON public.lender_document_access(project_id);
CREATE INDEX idx_lender_access_entity_id ON public.lender_document_access(lender_entity_id);

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
    document_path TEXT NOT NULL,
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
