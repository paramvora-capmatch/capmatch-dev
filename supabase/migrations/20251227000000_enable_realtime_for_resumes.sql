-- Enable Realtime for project_resumes and borrower_resumes tables
-- This allows real-time synchronization when multiple users edit the same resume

-- Step 1: Ensure tables have replica identity (required for UPDATE/DELETE events)
ALTER TABLE public.project_resumes REPLICA IDENTITY FULL;
ALTER TABLE public.borrower_resumes REPLICA IDENTITY FULL;

-- Step 2: Add tables to the 'supabase_realtime' publication
-- This tells PostgreSQL to send change events for these tables to Supabase's Realtime service
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_resumes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.borrower_resumes;

COMMENT ON TABLE public.project_resumes IS 'Enable realtime functionality for concurrent editing of project resumes.';
COMMENT ON TABLE public.borrower_resumes IS 'Enable realtime functionality for concurrent editing of borrower resumes.';

