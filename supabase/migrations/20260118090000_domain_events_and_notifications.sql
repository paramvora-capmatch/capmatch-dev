-- =============================================================================
-- Stage 1 – domain_events table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.domain_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    payload JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_project_id_occurred_at
    ON public.domain_events (project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_resource_id_occurred_at
    ON public.domain_events (resource_id, occurred_at DESC);

-- No RLS policies for domain_events; accessed via service role / backend only.

-- =============================================================================
-- Stage 2 – notifications schema + RLS
-- =============================================================================

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    link_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id_created_at
    ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their notifications" ON public.notifications
FOR UPDATE USING (user_id = (select auth.uid()));

-- Insert access is intentionally omitted; service role or SECURITY DEFINER
-- helpers will insert notifications on behalf of users.

-- =============================================================================
-- Stage 3 – helper to log document uploads
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_document_uploaded_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_resource_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_thread_id UUID DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        resource_id,
        thread_id,
        payload
    )
    VALUES (
        'document_uploaded',
        p_actor_id,
        p_project_id,
        p_resource_id,
        p_thread_id,
        COALESCE(p_payload, '{}'::jsonb)
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

