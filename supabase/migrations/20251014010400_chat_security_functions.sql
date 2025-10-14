-- =============================================================================
-- Chat Security Functions for "Least Privilege" Document Attachment Model
-- =============================================================================

-- Helper function to check if a user can access a specific document
CREATE OR REPLACE FUNCTION public.can_user_access_document(
  p_user_id UUID, 
  p_project_id UUID, 
  p_document_path TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
  v_is_owner BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Get the project's owner entity
  SELECT owner_entity_id INTO v_owner_entity_id 
  FROM public.projects 
  WHERE id = p_project_id;
  
  -- Check if user is owner of the project's entity (grants full access)
  SELECT public.is_entity_owner(v_owner_entity_id, p_user_id) INTO v_is_owner;
  
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has specific document permission
  SELECT EXISTS (
    SELECT 1 FROM public.document_permissions 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND document_path = p_document_path
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function implementing the "Least Privilege" attachment rule
CREATE OR REPLACE FUNCTION public.can_thread_access_document(
  p_thread_id UUID, 
  p_document_path TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_project_id UUID;
  v_participant RECORD;
  v_can_access BOOLEAN;
BEGIN
  -- Get the project_id for this thread
  SELECT project_id INTO v_project_id 
  FROM public.chat_threads 
  WHERE id = p_thread_id;
  
  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check each participant's access to the document
  FOR v_participant IN 
    SELECT user_id FROM public.chat_thread_participants 
    WHERE thread_id = p_thread_id
  LOOP
    -- Check if this participant can access the document
    SELECT public.can_user_access_document(
      v_participant.user_id, 
      v_project_id, 
      p_document_path
    ) INTO v_can_access;
    
    -- If any participant cannot access the document, return false
    IF NOT v_can_access THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  -- All participants can access the document
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process @mentions in messages and create notifications
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_mention_pattern TEXT := '@(\w+)';
  v_match TEXT;
  v_mentioned_user_id UUID;
  v_mentioned_user_email TEXT;
  v_content TEXT;
BEGIN
  v_content := NEW.content;
  
  -- Extract @mentions using regex
  WHILE v_content ~* v_mention_pattern LOOP
    -- Extract the first @mention
    v_match := (regexp_match(v_content, v_mention_pattern))[1];
    
    -- Look up user by email (assuming @mentions are by email)
    SELECT id, email INTO v_mentioned_user_id, v_mentioned_user_email
    FROM auth.users 
    WHERE email ILIKE '%' || v_match || '%'
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
        'You were mentioned in a chat message',
        '/projects/' || (SELECT project_id FROM public.chat_threads WHERE id = NEW.thread_id) || '/chat/' || NEW.thread_id
      );
    END IF;
    
    -- Remove the processed mention from content to avoid infinite loop
    v_content := regexp_replace(v_content, v_mention_pattern, '', 'g');
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for @mention processing
CREATE TRIGGER process_mentions_trigger
  AFTER INSERT ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.process_message_mentions();

-- =============================================================================
-- Update RLS Policies for Enhanced Chat Security
-- =============================================================================

-- Drop existing message_attachments policy
DROP POLICY IF EXISTS "Participants can manage attachments in their threads" ON public.message_attachments;

-- Create the "Least Privilege" policy for message attachments
CREATE POLICY "Participants can attach files if all members have access"
ON public.message_attachments
FOR INSERT
WITH CHECK (
    -- First, check if the user is even in the thread
    EXISTS (
        SELECT 1 FROM project_messages pm 
        WHERE pm.id = message_id AND public.is_thread_participant(pm.thread_id, auth.uid())
    )
    -- AND then, perform the critical 'Least Privilege' check
    AND public.can_thread_access_document(
        (SELECT thread_id FROM project_messages WHERE id = message_id),
        document_path
    )
);

-- Allow participants to view attachments in their threads
CREATE POLICY "Participants can view attachments in their threads"
ON public.message_attachments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_messages pm 
        WHERE pm.id = message_id AND public.is_thread_participant(pm.thread_id, auth.uid())
    )
);

-- Allow participants to delete attachments they created (optional)
CREATE POLICY "Participants can delete their own attachments"
ON public.message_attachments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM project_messages pm 
        WHERE pm.id = message_id 
          AND public.is_thread_participant(pm.thread_id, auth.uid())
          AND pm.user_id = auth.uid()
    )
);
