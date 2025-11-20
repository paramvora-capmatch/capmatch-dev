-- Migration: Chat Notifications & Preferences
-- 1. User Notification Preferences (Flexible Schema)
-- 2. Chat Thread Read Status
-- 3. Update Message Insertion for Events & Mentions

-- =============================================================================
-- 1. User Notification Preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Scope: 'global', 'project', 'thread'
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'project', 'thread')),
    -- ID of the project or thread (NULL for global)
    scope_id UUID, 
    
    -- Event Type: 'chat_message', 'document_uploaded', or '*'
    event_type TEXT NOT NULL,
    
    -- Channel: 'in_app', 'email', or '*'
    channel TEXT NOT NULL DEFAULT 'in_app',
    
    -- Status: 'muted', 'digest', 'immediate'
    status TEXT NOT NULL DEFAULT 'immediate',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique preference per scope/event/channel
    UNIQUE(user_id, scope_type, scope_id, event_type, channel)
);

CREATE INDEX idx_user_notif_prefs_user ON public.user_notification_preferences(user_id);
CREATE INDEX idx_user_notif_prefs_lookup ON public.user_notification_preferences(user_id, scope_type, scope_id);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- 2. Chat Thread Read Status
-- =============================================================================

-- Add last_read_at to participants
ALTER TABLE public.chat_thread_participants 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Function to mark a thread as read
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id UUID)
RETURNS void AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Update the participant's last_read_at
    UPDATE public.chat_thread_participants
    SET last_read_at = now()
    WHERE thread_id = p_thread_id AND user_id = v_user_id;

    -- 2. Mark related in-app notifications as read (Sync Gap Fix)
    -- We look for notifications that have this thread_id in their payload
    -- OR are linked to an event that has this thread_id.
    -- Since checking the event join is expensive, we rely on the payload logic 
    -- if we store thread_id in notification metadata, or we join domain_events.
    
    -- Efficient approach: Join to domain_events
    UPDATE public.notifications n
    SET read_at = now()
    FROM public.domain_events e
    WHERE n.event_id = e.id
      AND n.user_id = v_user_id
      AND n.read_at IS NULL
      AND e.thread_id = p_thread_id;
      
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. Update insert_thread_message (Events & Mentions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_message_id BIGINT;
    v_missing RECORD;
    v_project_id UUID;
    v_preview TEXT;
    v_mentioned_ids UUID[];
    v_user_mention_regex TEXT := '@\[[^\]]+\]\(user:([0-9a-fA-F-]{36})\)';
BEGIN
    -- 1. Basic Validations (Existing)
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_thread_participants
        WHERE thread_id = p_thread_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User % is not a participant in thread %', p_user_id, p_thread_id;
    END IF;

    IF p_reply_to IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.project_messages
            WHERE id = p_reply_to AND thread_id = p_thread_id
        ) THEN
            RAISE EXCEPTION 'Reply target message % does not exist in thread %', p_reply_to, p_thread_id;
        END IF;
    END IF;

    -- Doc permissions check
    IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
        FOR v_missing IN
            SELECT * FROM public.validate_docs_for_thread(p_thread_id, p_resource_ids)
        LOOP
            IF v_missing.missing_user_ids IS NOT NULL AND array_length(v_missing.missing_user_ids, 1) > 0 THEN
                RAISE EXCEPTION 'DOC_ACCESS_DENIED'
                USING ERRCODE = 'P0001',
                      DETAIL = jsonb_build_object(
                          'resource_id', v_missing.resource_id,
                          'missing_user_ids', v_missing.missing_user_ids
                      )::TEXT;
            END IF;
        END LOOP;
    END IF;

    -- 2. Insert Message
    INSERT INTO public.project_messages (thread_id, user_id, content, reply_to)
    VALUES (p_thread_id, p_user_id, p_content, p_reply_to)
    RETURNING id INTO v_message_id;

    -- 3. Insert Attachments
    IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
        INSERT INTO public.message_attachments (message_id, resource_id)
        SELECT DISTINCT v_message_id, r_id
        FROM UNNEST(p_resource_ids) AS r_id;
    END IF;
    
    -- 4. Event Logging Logic
    
    -- Get Project ID for the event
    SELECT project_id INTO v_project_id FROM public.chat_threads WHERE id = p_thread_id;
    
    -- Extract User Mentions using Regex
    -- Finds all UUIDs inside @[Name](user:UUID)
    SELECT ARRAY_AGG(DISTINCT match[1]::UUID)
    INTO v_mentioned_ids
    FROM regexp_matches(p_content, v_user_mention_regex, 'g') AS match;

    -- Create Preview (First 100 chars)
    v_preview := substring(p_content from 1 for 100);
    IF length(p_content) > 100 THEN
        v_preview := v_preview || '...';
    END IF;

    -- Insert Event
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        thread_id,
        payload
    ) VALUES (
        'chat_message_sent',
        p_user_id,
        v_project_id,
        p_thread_id,
        jsonb_build_object(
            'message_id', v_message_id,
            'preview', v_preview,
            'mentioned_user_ids', COALESCE(v_mentioned_ids, ARRAY[]::UUID[])
        )
    );

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

