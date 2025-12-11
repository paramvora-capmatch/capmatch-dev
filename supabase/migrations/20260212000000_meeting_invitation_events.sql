-- Migration: Meeting Invitation Events & Notifications
-- This migration adds support for meeting invitation notifications by:
-- 1. Adding meeting_id to domain_events table
-- 2. Creating a trigger to automatically log meeting_invited events
-- 3. Creating a helper function to create meeting invitation domain events

-- =============================================================================
-- 1. Add meeting_id to domain_events table
-- =============================================================================

ALTER TABLE public.domain_events
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_domain_events_meeting_id_occurred_at
    ON public.domain_events (meeting_id, occurred_at DESC);

COMMENT ON COLUMN public.domain_events.meeting_id IS 'Reference to the meeting for meeting-related events';

-- =============================================================================
-- 2. Helper function to insert meeting_invited event
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_meeting_invited_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_meeting_id UUID,
    p_invited_user_id UUID,
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
        meeting_id,
        payload
    )
    VALUES (
        'meeting_invited',
        p_actor_id,
        p_project_id,
        p_meeting_id,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
            'invited_user_id', p_invited_user_id,
            'meeting_id', p_meeting_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.insert_meeting_invited_event IS 
'Creates a domain event when a user is invited to a meeting. Used for triggering notifications.';

-- =============================================================================
-- 3. Trigger to automatically create events when participants are added
-- =============================================================================

CREATE OR REPLACE FUNCTION public.on_meeting_participant_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meeting RECORD;
    v_organizer_id UUID;
BEGIN
    -- Fetch meeting details
    SELECT 
        m.id,
        m.organizer_id,
        m.project_id,
        m.title,
        m.start_time,
        m.end_time,
        m.meeting_link
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = NEW.meeting_id;

    -- Only create event if the participant is not the organizer
    -- (organizers don't need to be notified about their own meetings)
    IF NEW.user_id != v_meeting.organizer_id THEN
        -- Create domain event for meeting invitation
        PERFORM public.insert_meeting_invited_event(
            p_actor_id := v_meeting.organizer_id,
            p_project_id := v_meeting.project_id,
            p_meeting_id := NEW.meeting_id,
            p_invited_user_id := NEW.user_id,
            p_payload := jsonb_build_object(
                'meeting_title', v_meeting.title,
                'start_time', v_meeting.start_time,
                'end_time', v_meeting.end_time,
                'meeting_link', v_meeting.meeting_link
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_meeting_participant_invited ON public.meeting_participants;

-- Create trigger that fires after participant insertion
CREATE TRIGGER trigger_meeting_participant_invited
    AFTER INSERT ON public.meeting_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.on_meeting_participant_inserted();

COMMENT ON TRIGGER trigger_meeting_participant_invited ON public.meeting_participants IS 
'Automatically creates a domain event when a participant is added to a meeting, which triggers the notification system.';
