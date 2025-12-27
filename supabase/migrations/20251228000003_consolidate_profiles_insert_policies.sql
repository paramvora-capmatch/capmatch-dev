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
-- Note: This migration runs AFTER 20251228000002_optimize_rls_auth_uid.sql which
-- creates both the FOR ALL policy AND the separate INSERT/UPDATE policies.
-- This migration removes the conflicting FOR ALL policy, leaving only the
-- operation-specific policies for optimal performance.
--
-- =============================================================================

-- Drop the FOR ALL policy that was created in 20251228000002_optimize_rls_auth_uid.sql
-- This policy conflicts with the separate INSERT/UPDATE policies that were also created in that migration
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON public.profiles;

-- Note: The separate INSERT and UPDATE policies ("Users can insert their own profile" and
-- "Users can update their own profile") are already created in 20251228000002_optimize_rls_auth_uid.sql
-- The SELECT policy "Users can view related profiles" already exists from 20251203000000
-- We don't need to recreate any of them - we just need to remove the conflicting FOR ALL policy

