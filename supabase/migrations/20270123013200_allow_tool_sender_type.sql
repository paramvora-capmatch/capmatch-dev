-- Migration: Allow tool sender type in underwriting chat messages
-- ID: 20270123013200_allow_tool_sender_type

-- Drop the existing constraint if it exists
ALTER TABLE public.underwriting_chat_messages 
DROP CONSTRAINT IF EXISTS underwriting_chat_messages_sender_type_check;

-- Add the updated constraint including 'tool'
ALTER TABLE public.underwriting_chat_messages 
ADD CONSTRAINT underwriting_chat_messages_sender_type_check 
CHECK (sender_type IN ('user', 'ai', 'tool'));

-- Comment on why this was changed
COMMENT ON CONSTRAINT underwriting_chat_messages_sender_type_check ON public.underwriting_chat_messages 
IS 'Ensures sender_type is user, ai, or tool (for autonomous agent output)';
