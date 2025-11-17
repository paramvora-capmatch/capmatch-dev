-- Migration: Add reply_to column to project_messages table
-- This enables users to reply to specific messages in a thread

-- Add reply_to column (nullable, references project_messages.id)
ALTER TABLE public.project_messages
ADD COLUMN IF NOT EXISTS reply_to BIGINT REFERENCES public.project_messages(id) ON DELETE SET NULL;

-- Add index for efficient lookups of replies
CREATE INDEX IF NOT EXISTS idx_project_messages_reply_to ON public.project_messages(reply_to);

-- Update the insert_thread_message function to accept reply_to parameter
CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_message_id BIGINT;
  v_missing RECORD;
BEGIN
  -- Validate user is a participant
  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User % is not a participant in thread %', p_user_id, p_thread_id;
  END IF;

  -- Validate reply_to message exists and is in the same thread (if provided)
  IF p_reply_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.project_messages
      WHERE id = p_reply_to
        AND thread_id = p_thread_id
    ) THEN
      RAISE EXCEPTION 'Reply target message % does not exist in thread %', p_reply_to, p_thread_id;
    END IF;
  END IF;

  -- Validate document access permissions
  IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
    FOR v_missing IN
      SELECT *
      FROM public.validate_docs_for_thread(p_thread_id, p_resource_ids)
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

  -- Insert the message with reply_to
  INSERT INTO public.project_messages (thread_id, user_id, content, reply_to)
  VALUES (p_thread_id, p_user_id, p_content, p_reply_to)
  RETURNING id INTO v_message_id;

  -- Insert attachments if any
  IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
    INSERT INTO public.message_attachments (message_id, resource_id)
    SELECT DISTINCT v_message_id, r_id
    FROM UNNEST(p_resource_ids) AS r_id;
  END IF;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.project_messages.reply_to IS 'References the message this message is replying to. NULL if not a reply.';

