-- Enable realtime for jobs table so frontend can subscribe to status updates (autofill, underwriting, OM).
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

COMMENT ON TABLE public.jobs IS 'Realtime enabled for job status updates';
