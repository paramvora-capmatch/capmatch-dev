-- =============================================================================
-- Chat Security & Mention Processing
-- =============================================================================

-- The core permission checking is now handled by get_effective_permission.
-- This file is updated to use the new resource model for attachments and mentions.

-- Function to process @mentions in messages and create notifications
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_mention_pattern TEXT := '@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'; -- Regex for emails
  v_match TEXT[];
  v_mentioned_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get project_id for the link_url
  SELECT ct.project_id INTO v_project_id
  FROM public.chat_threads ct WHERE ct.id = NEW.thread_id;

  -- Extract all email mentions using regex
  FOR v_match IN SELECT regexp_matches(NEW.content, v_mention_pattern, 'g') LOOP
    -- Look up user by email
    SELECT p.id INTO v_mentioned_user_id
    FROM public.profiles p
    WHERE p.email = v_match[1]
    LIMIT 1;

    -- If user found and is a participant in the thread, create notification
    IF v_mentioned_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_thread_participants
      WHERE thread_id = NEW.thread_id AND user_id = v_mentioned_user_id
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        content,
        link_url
      ) VALUES (
        v_mentioned_user_id,
        'You were mentioned in a chat message by ' || (SELECT full_name FROM public.profiles WHERE id = NEW.user_id),
        '/projects/' || v_project_id || '/chat/' || NEW.thread_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for @mention processing
DROP TRIGGER IF EXISTS process_mentions_trigger ON public.project_messages;
CREATE TRIGGER process_mentions_trigger
  AFTER INSERT ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.process_message_mentions();

-- =============================================================================
-- Note: RLS Policies for Message Attachments are defined in the earlier migration file
-- =============================================================================
