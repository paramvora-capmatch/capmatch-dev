-- Migration: Meeting Reminder System
-- Sends notifications to participants 30 minutes before a meeting starts

-- =============================================================================
-- 1. Table to track which reminders have been sent
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.meeting_reminders_sent (
    id BIGSERIAL PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30min', '15min', '5min')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(meeting_id, user_id, reminder_type)
);

CREATE INDEX idx_meeting_reminders_meeting_id ON public.meeting_reminders_sent(meeting_id);
CREATE INDEX idx_meeting_reminders_sent_at ON public.meeting_reminders_sent(sent_at);

COMMENT ON TABLE public.meeting_reminders_sent IS 
'Tracks which meeting reminders have been sent to prevent duplicates';

-- =============================================================================
-- 2. Helper function to insert meeting_reminder event
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_meeting_reminder_event(
    p_meeting_id UUID,
    p_user_id UUID,
    p_reminder_minutes INTEGER
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
        m.meeting_link,
        m.project_id,
        m.organizer_id
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = p_meeting_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting not found: %', p_meeting_id;
    END IF;

    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        meeting_id,
        payload
    )
    VALUES (
        'meeting_reminder',
        p_user_id,
        v_meeting.project_id,
        p_meeting_id,
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'user_id', p_user_id,
            'meeting_title', v_meeting.title,
            'start_time', v_meeting.start_time,
            'end_time', v_meeting.end_time,
            'meeting_link', v_meeting.meeting_link,
            'reminder_minutes', p_reminder_minutes,
            'organizer_id', v_meeting.organizer_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.insert_meeting_reminder_event IS 
'Creates a domain event for meeting reminders';

-- =============================================================================
-- 3. Function to find meetings needing reminders
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_meetings_needing_reminders(
    p_minutes_before INTEGER DEFAULT 30
)
RETURNS TABLE (
    meeting_id UUID,
    participant_id UUID,
    meeting_title TEXT,
    start_time TIMESTAMPTZ,
    meeting_link TEXT,
    project_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as meeting_id,
        mp.user_id as participant_id,
        m.title as meeting_title,
        m.start_time,
        m.meeting_link,
        m.project_id
    FROM public.meetings m
    INNER JOIN public.meeting_participants mp ON m.id = mp.meeting_id
    WHERE 
        m.status = 'scheduled'
        AND m.start_time > NOW()
        AND m.start_time <= NOW() + (p_minutes_before || ' minutes')::INTERVAL
        AND NOT EXISTS (
            SELECT 1 FROM public.meeting_reminders_sent mrs
            WHERE mrs.meeting_id = m.id
            AND mrs.user_id = mp.user_id
            AND mrs.reminder_type = p_minutes_before || 'min'
        );
END;
$$;

COMMENT ON FUNCTION public.get_meetings_needing_reminders IS 
'Returns meetings that need reminders sent, excluding those already notified';

-- Enable RLS on meeting_reminders_sent
ALTER TABLE public.meeting_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminder records
CREATE POLICY "Users can view their own reminder records"
    ON public.meeting_reminders_sent
    FOR SELECT
    USING (user_id = (select auth.uid()));

-- Grant permissions
GRANT SELECT, INSERT ON public.meeting_reminders_sent TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_meeting_reminder_event TO service_role;
GRANT EXECUTE ON FUNCTION public.get_meetings_needing_reminders TO service_role;
