-- =============================================================================
-- Migration: Consolidate Multiple INSERT Policies on profiles
-- =============================================================================
--
-- Fixes performance issue where multiple permissive INSERT policies on profiles
-- table cause each policy to be evaluated for every INSERT query.
--
-- Issue: Both "Users can view and manage their own profile" (FOR ALL) and
-- "Users can insert their own profile" (FOR INSERT) apply to INSERT operations.
--
-- Solution: Drop the FOR ALL policy and ensure we have separate policies for
-- each operation type (SELECT, INSERT, UPDATE) to avoid redundant evaluation.
--
-- Note: This migration must run AFTER 20251228000002_optimize_rls_auth_uid.sql
-- if that migration recreates the FOR ALL policy, or we need to update that
-- migration to not recreate it.
--
-- =============================================================================

-- Drop the FOR ALL policy if it exists (it may have been recreated in later migrations)
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON public.profiles;

-- Ensure we have the separate INSERT policy (should already exist from 20251203000000)
-- If it doesn't exist, create it
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Ensure we have the UPDATE policy (should already exist from 20251203000000)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = id);

-- The SELECT policy "Users can view related profiles" should already exist from 20251203000000
-- We don't need to recreate it here

COMMENT ON POLICY "Users can insert their own profile" ON public.profiles IS 
    'Allows users to INSERT their own profile. Separated from FOR ALL policy to avoid redundant evaluation with other operation-specific policies.';

COMMENT ON POLICY "Users can update their own profile" ON public.profiles IS 
    'Allows users to UPDATE their own profile. Separated from FOR ALL policy to avoid redundant evaluation with other operation-specific policies.';

