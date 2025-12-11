-- Migration: Meeting Update Notifications
-- This migration adds support for notifying participants when meeting details change

-- =============================================================================
-- 1. Helper function to insert meeting_updated event
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_meeting_updated_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_meeting_id UUID,
    p_changes JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id BIGINT;
    v_meeting RECORD;
BEGIN
    -- Fetch meeting details
    SELECT 
        m.id,
        m.title,
        m.start_time,
        m.end_time,
        m.meeting_link
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = p_meeting_id;

    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        meeting_id,
        payload
    )
    VALUES (
        'meeting_updated',
        p_actor_id,
        p_project_id,
        p_meeting_id,
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'meeting_title', v_meeting.title,
            'start_time', v_meeting.start_time,
            'end_time', v_meeting.end_time,
            'meeting_link', v_meeting.meeting_link,
            'changes', p_changes
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.insert_meeting_updated_event IS 
'Creates a domain event when a meeting is updated. Used for notifying participants of changes.';
