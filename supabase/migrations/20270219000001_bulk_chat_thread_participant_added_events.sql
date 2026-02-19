-- Migration: Bulk insert chat_thread_participant_added domain events
-- Replaces N sequential calls to insert_chat_thread_participant_added_event with a single RPC.

CREATE OR REPLACE FUNCTION public.insert_chat_thread_participant_added_events_bulk(
    p_actor_id UUID,
    p_project_id UUID,
    p_thread_id UUID,
    p_added_user_ids UUID[],
    p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_ids BIGINT[];
BEGIN
    WITH inserted AS (
        INSERT INTO public.domain_events (
            event_type,
            actor_id,
            project_id,
            thread_id,
            payload
        )
        SELECT
            'chat_thread_participant_added',
            p_actor_id,
            p_project_id,
            p_thread_id,
            COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
                'added_user_id', u_id,
                'thread_id', p_thread_id
            )
        FROM UNNEST(p_added_user_ids) AS u_id
        RETURNING id
    )
    SELECT array_agg(id ORDER BY id) INTO v_event_ids FROM inserted;

    RETURN COALESCE(v_event_ids, ARRAY[]::BIGINT[]);
END;
$$;

COMMENT ON FUNCTION public.insert_chat_thread_participant_added_events_bulk IS
'Creates domain events for multiple users added to a chat thread in one call. Use instead of calling insert_chat_thread_participant_added_event in a loop.';
