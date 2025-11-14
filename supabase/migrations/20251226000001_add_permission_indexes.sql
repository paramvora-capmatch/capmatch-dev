-- =============================================================================
-- Migration: Add indexes for faster permission checks
-- =============================================================================
--
-- These indexes optimize the permission validation queries used in chat message
-- sending. They help the recursive CTE queries in get_effective_permission
-- and the batched checks in validate_docs_for_thread run faster.
--
-- Performance impact:
-- - idx_permissions_resource_user: Speeds up permission lookups in recursive queries
-- - idx_resources_org_id: Speeds up org owner checks in get_effective_permission
--

-- Index for permission lookups by resource (used in recursive CTE)
-- This helps when get_effective_permission walks up the resource hierarchy
CREATE INDEX IF NOT EXISTS idx_permissions_resource_user 
ON public.permissions(resource_id, user_id);

COMMENT ON INDEX idx_permissions_resource_user IS 
'Composite index for fast permission lookups by resource and user. Critical for recursive permission queries.';

-- Index for org_id lookups (used in org owner checks)
-- This helps when get_effective_permission checks if user is org owner
CREATE INDEX IF NOT EXISTS idx_resources_org_id 
ON public.resources(org_id);

COMMENT ON INDEX idx_resources_org_id IS 
'Index for fast org_id lookups when checking org owner permissions.';

