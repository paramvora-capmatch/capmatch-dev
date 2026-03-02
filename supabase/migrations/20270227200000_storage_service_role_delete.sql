-- Allow backend (service role key) to delete storage objects when deleting projects.
-- If you see "new row violates row-level security policy" on project delete, either:
-- 1. Ensure PLATFORM_SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is the service_role secret from Supabase dashboard.
-- 2. Or this policy allows requests whose JWT has role=service_role to manage storage.

-- storage.buckets: allow service_role full access (backend needs to list/delete)
DROP POLICY IF EXISTS "Service role can manage buckets" ON storage.buckets;
CREATE POLICY "Service role can manage buckets"
  ON storage.buckets
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- storage.objects: allow service_role to delete so project delete can remove files
DROP POLICY IF EXISTS "Service role can manage objects" ON storage.objects;
CREATE POLICY "Service role can manage objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'service_role');
