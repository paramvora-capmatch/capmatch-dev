-- Fix overly permissive RLS policies (security hardening).
-- Note: calendar_events and its "System can manage calendar events" policy were already
-- removed when the table was dropped in 20260208000002_drop_calendar_events.sql.

-- 1. storage.buckets: Replace permissive "TO public" policy with authenticated-only gate.
--    Object-level policies still enforce who can access which objects.
DROP POLICY IF EXISTS "Enable all actions for storage flow on buckets" ON storage.buckets;
CREATE POLICY "Authenticated users can access buckets"
  ON storage.buckets
  FOR ALL
  TO authenticated
  USING (true);

-- 2. calendar_connections: Optimize RLS to use get_current_user_id() for performance.
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON calendar_connections;
CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections FOR SELECT
  USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users can insert their own calendar connections" ON calendar_connections;
CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own calendar connections" ON calendar_connections;
CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users can delete their own calendar connections" ON calendar_connections;
CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections FOR DELETE
  USING (user_id = public.get_current_user_id());
