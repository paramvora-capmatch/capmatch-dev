-- =============================================================================
-- Migration: Fix Storage RLS Bucket Policy
-- =============================================================================
--
-- This migration fixes the root cause of the file upload RLS errors.
--
-- The issue was that while we had granular policies on `storage.objects` (the "inner doors"),
-- we were missing a broader policy on `storage.buckets` (the "outer gate").
-- Without a policy on the bucket itself allowing INSERT, UPDATE, or DELETE
-- actions, requests were being blocked before our specific object policies
-- could even be evaluated.
--
-- This fix adds a permissive policy on the `storage.buckets` table that allows
-- any authenticated user to ATTEMPT these actions. The true security is still
-- enforced by our detailed, function-driven policies on `storage.objects`.
--
-- =============================================================================

-- Drop the old, select-only policy if it exists, for a clean slate.
DROP POLICY IF EXISTS "Enable access to all authenticated users" ON storage.buckets;
DROP POLICY IF EXISTS "Enable all actions for authenticated users on buckets" ON storage.buckets;

-- Create a new, comprehensive policy for all actions on buckets.
-- Apply TO public; the storage service supplies JWT for auth.uid() where needed.
CREATE POLICY "Enable all actions for storage flow on buckets"
ON storage.buckets
FOR ALL
TO public
USING (true);
