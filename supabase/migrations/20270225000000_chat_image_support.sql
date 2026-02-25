-- =============================================================================
-- Chat image support: image_urls column on project_messages,
-- path-based storage RLS for chat-images folder in org buckets,
-- and updated insert_thread_message RPC.
-- =============================================================================

-- 1. Add image_urls column to project_messages
ALTER TABLE public.project_messages
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.project_messages.image_urls IS 'Storage paths (within org bucket) for images attached to this message. Path: {projectId}/chat-images/{threadId}/{userId}/{filename}';

-- 2. Helper: true if current user is a participant in the given thread
CREATE OR REPLACE FUNCTION public.is_chat_thread_participant(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = public.get_current_user_id()
  );
$$;

-- 3. Storage RLS policies for chat-images folder within org buckets
-- Path format: {projectId}/chat-images/{threadId}/{userId}/{filename}
-- INSERT/SELECT: user must be participant in thread (path segment 3 = thread_id)
-- DELETE: only uploader (path segment 4 = user_id)
DROP POLICY IF EXISTS "Chat images: participants can upload" ON storage.objects;
CREATE POLICY "Chat images: participants can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  (string_to_array(name, '/'))[2] = 'chat-images'
  AND public.is_chat_thread_participant(((string_to_array(name, '/'))[3])::uuid)
);

DROP POLICY IF EXISTS "Chat images: participants can view" ON storage.objects;
CREATE POLICY "Chat images: participants can view" ON storage.objects
FOR SELECT TO authenticated
USING (
  (string_to_array(name, '/'))[2] = 'chat-images'
  AND public.is_chat_thread_participant(((string_to_array(name, '/'))[3])::uuid)
);

DROP POLICY IF EXISTS "Chat images: uploader can delete" ON storage.objects;
CREATE POLICY "Chat images: uploader can delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  (string_to_array(name, '/'))[2] = 'chat-images'
  AND (string_to_array(name, '/'))[4] = public.get_current_user_id()::text
);

-- 4. Update insert_thread_message to accept and store image_urls
DROP FUNCTION IF EXISTS public.insert_thread_message(UUID, UUID, TEXT, UUID[], BIGINT);

CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL,
    p_image_urls TEXT[] DEFAULT NULL
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
BEGIN
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

    INSERT INTO public.project_messages (thread_id, user_id, content, reply_to, image_urls)
    VALUES (p_thread_id, p_user_id, p_content, p_reply_to, p_image_urls)
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

COMMENT ON FUNCTION public.insert_thread_message IS 'Inserts a chat message with optional doc attachments and image_urls (storage paths in org bucket chat-images folder).';
