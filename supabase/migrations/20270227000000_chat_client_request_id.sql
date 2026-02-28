-- =============================================================================
-- Chat idempotency: client_request_id on project_messages for deduplication
-- =============================================================================
-- Frontend sends a UUID per message send attempt. Realtime handler matches
-- incoming messages to optimistic messages by client_request_id (no timing windows).
-- Unique constraint allows DB to reject duplicate sends (retries with same id).

ALTER TABLE public.project_messages
ADD COLUMN IF NOT EXISTS client_request_id UUID DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_messages_client_request_id
ON public.project_messages (client_request_id)
WHERE client_request_id IS NOT NULL;

COMMENT ON COLUMN public.project_messages.client_request_id IS 'Idempotency key: client-generated UUID per send attempt. Used for dedup and matching optimistic messages in realtime.';

-- Update insert_thread_message to accept and store client_request_id (idempotent: if client_request_id already exists, return existing message_id)
DROP FUNCTION IF EXISTS public.insert_thread_message(UUID, UUID, TEXT, UUID[], BIGINT, TEXT[]);

CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL,
    p_image_urls TEXT[] DEFAULT NULL,
    p_client_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id BIGINT;
    v_event_id BIGINT;
    v_missing RECORD;
    v_project_id UUID;
    v_mentioned_ids UUID[];
    v_user_mention_regex TEXT := '@\[[^\]]+\]\(user:([0-9a-fA-F-]{36})\)';
    v_existing_id BIGINT;
BEGIN
    -- Idempotency: if client_request_id provided and already exists, return existing message_id
    IF p_client_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM public.project_messages
        WHERE client_request_id = p_client_request_id
        LIMIT 1;
        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'message_id', v_existing_id,
                'event_id', NULL,
                'idempotent', true
            );
        END IF;
    END IF;

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

    INSERT INTO public.project_messages (thread_id, user_id, content, reply_to, image_urls, client_request_id)
    VALUES (p_thread_id, p_user_id, p_content, p_reply_to, p_image_urls, p_client_request_id)
    RETURNING id INTO v_message_id;

    IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
        INSERT INTO public.message_attachments (message_id, resource_id)
        SELECT DISTINCT v_message_id, r_id
        FROM UNNEST(p_resource_ids) AS r_id;
    END IF;

    SELECT project_id INTO v_project_id FROM public.chat_threads WHERE id = p_thread_id;

    SELECT ARRAY_AGG(DISTINCT match[1]::UUID)
    INTO v_mentioned_ids
    FROM regexp_matches(p_content, v_user_mention_regex, 'g') AS match;

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

    RETURN jsonb_build_object(
        'message_id', v_message_id,
        'event_id', v_event_id
    );
END;
$$;

COMMENT ON FUNCTION public.insert_thread_message IS 'Inserts a chat message with optional doc attachments, image_urls, and client_request_id (idempotency key). If client_request_id is repeated, returns existing message_id.';
