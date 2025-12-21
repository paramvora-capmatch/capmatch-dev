-- Migration: Chat Thread Participant Added Events & Notifications
-- This migration creates a helper function to create chat_thread_participant_added domain events.
-- 
-- Note: Events are created explicitly by application code (e.g., manage-chat-thread function)
-- rather than via database triggers, since most operations use service role which doesn't
-- provide auth context for triggers.

-- =============================================================================
-- Helper function to insert chat_thread_participant_added event
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_chat_thread_participant_added_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_thread_id UUID,
    p_added_user_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        thread_id,
        payload
    )
    VALUES (
        'chat_thread_participant_added',
        p_actor_id,
        p_project_id,
        p_thread_id,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
            'added_user_id', p_added_user_id,
            'thread_id', p_thread_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.insert_chat_thread_participant_added_event IS 
'Creates a domain event when a user is added to a chat thread. Called explicitly by application code (e.g., manage-chat-thread function) to trigger notifications.';

