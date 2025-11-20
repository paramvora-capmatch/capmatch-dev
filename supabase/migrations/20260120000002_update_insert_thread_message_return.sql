-- Update insert_thread_message to return JSONB containing both message_id and event_id
-- This allows the client to trigger the notification fan-out immediately with the correct event ID.

DROP FUNCTION IF EXISTS public.insert_thread_message(UUID, UUID, TEXT, UUID[], BIGINT);

CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_message_id BIGINT;
    v_event_id BIGINT;
    v_missing RECORD;
    v_project_id UUID;
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
    SELECT ARRAY_AGG(DISTINCT match[1]::UUID)
    INTO v_mentioned_ids
    FROM regexp_matches(p_content, v_user_mention_regex, 'g') AS match;

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
            'full_content', p_content,
            'mentioned_user_ids', COALESCE(v_mentioned_ids, ARRAY[]::UUID[])
        )
    )
    RETURNING id INTO v_event_id;

    -- Return composite result
    RETURN jsonb_build_object(
        'message_id', v_message_id,
        'event_id', v_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

