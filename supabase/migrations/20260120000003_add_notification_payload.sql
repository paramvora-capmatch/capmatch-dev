-- Add payload column to notifications table
-- This is required for the Aggregation Logic (storing 'count' metadata).

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- Ensure the increment function uses payload metadata for thread/project names.
CREATE OR REPLACE FUNCTION public.increment_notification_count(p_notification_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
    v_current_payload JSONB;
    v_thread_name TEXT;
    v_project_name TEXT;
    v_thread_label TEXT;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT payload INTO v_current_payload
    FROM public.notifications
    WHERE id = p_notification_id
    FOR UPDATE;

    -- Calculate new count (default to 1 if missing)
    v_new_count := COALESCE((v_current_payload->>'count')::INTEGER, 1) + 1;
    v_thread_name := COALESCE(v_current_payload->>'thread_name', 'thread');
    v_project_name := COALESCE(v_current_payload->>'project_name', 'project');
    v_thread_label := CASE 
        WHEN v_thread_name LIKE '#%' THEN v_thread_name 
        ELSE '#' || v_thread_name 
    END;

    -- Update the row
    UPDATE public.notifications
    SET 
        payload = jsonb_set(
            jsonb_set(
                COALESCE(payload, '{}'::jsonb), 
                '{count}', 
                to_jsonb(v_new_count)
            ),
            '{thread_name}',
            to_jsonb(v_thread_name)
        ),
        title = 'New messages in ' || v_project_name,
        body = v_new_count || ' new message' ||
            CASE WHEN v_new_count = 1 THEN '' ELSE 's' END ||
            ' in **' || v_thread_label || '**',
        created_at = now()
    WHERE id = p_notification_id;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

