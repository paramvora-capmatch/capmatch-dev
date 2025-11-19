-- Add payload column to notifications table
-- This is required for the Aggregation Logic (storing 'count' metadata).

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- Update the increment function to handle cases where payload might be null (safety)
CREATE OR REPLACE FUNCTION public.increment_notification_count(p_notification_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
    v_current_payload JSONB;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT payload INTO v_current_payload
    FROM public.notifications
    WHERE id = p_notification_id
    FOR UPDATE;

    -- Calculate new count (default to 1 if missing)
    v_new_count := COALESCE((v_current_payload->>'count')::INTEGER, 1) + 1;

    -- Update the row
    UPDATE public.notifications
    SET 
        payload = jsonb_set(
            COALESCE(payload, '{}'::jsonb), 
            '{count}', 
            to_jsonb(v_new_count)
        ),
        body = v_new_count || ' new messages in thread',
        created_at = now()
    WHERE id = p_notification_id;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

