-- =============================================================================
-- Migration: Consolidate Multiple INSERT Policies on resources
-- =============================================================================
--
-- Fixes performance issue where multiple permissive INSERT policies on resources
-- table cause each policy to be evaluated for every INSERT query.
--
-- Issue: Both "Users can create resources in folders they can edit" and
-- "Allow inserts for authenticated users - validation via trigger" apply to
-- INSERT operations.
--
-- Solution: Drop the "Users can create resources in folders they can edit" policy.
-- The permissive "Allow inserts for authenticated users - validation via trigger"
-- policy is sufficient because validation happens in triggers (validate_resource_insert
-- trigger created in 20251021000001_add_resource_validation_triggers.sql).
--
-- Note: This migration runs AFTER 20251228000002_optimize_rls_auth_uid.sql which
-- creates both policies. We remove the redundant policy that duplicates the validation
-- logic already handled by triggers.
--
-- =============================================================================

-- Drop the redundant INSERT policy - validation is handled by triggers
DROP POLICY IF EXISTS "Users can create resources in folders they can edit" ON public.resources;

-- Note: The "Allow inserts for authenticated users - validation via trigger" policy
-- remains active and is sufficient for INSERT operations. The validate_resource_insert
-- trigger (created in 20251021000001) handles permission checking.

COMMENT ON POLICY "Allow inserts for authenticated users - validation via trigger" ON public.resources IS 
    'Permissive INSERT policy that allows all authenticated users to insert resources. Actual permission validation happens in the validate_resource_insert trigger (created in 20251021000001_add_resource_validation_triggers.sql). This single policy approach avoids redundant policy evaluation.';

