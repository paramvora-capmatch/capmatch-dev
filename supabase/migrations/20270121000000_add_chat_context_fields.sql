-- Add context fields to chat_threads
ALTER TABLE public.chat_threads 
ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id),
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active', -- 'active', 'resolved'
ADD COLUMN IF NOT EXISTS stage VARCHAR DEFAULT 'underwriting'; -- 'underwriting', 'closing', etc.

-- Add index for resource_id lookup
CREATE INDEX IF NOT EXISTS idx_chat_threads_resource_id ON public.chat_threads(resource_id);

-- Add index for status lookup (for filtering active threads)
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON public.chat_threads(status);
