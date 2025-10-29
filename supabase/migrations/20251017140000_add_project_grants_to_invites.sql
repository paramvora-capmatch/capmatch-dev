-- =============================================================================
-- Migration: Add Project Grants to Invites Table
-- =============================================================================
--
-- This migration enhances the invitations system to support the new project
-- access control feature.
--
-- 1.  It adds a `project_grants` JSONB column to the `public.invites` table.
--
-- This column will store an array of project IDs and their corresponding
-- granular permissions that should be granted to a user when they accept
-- an invitation. This allows the UI to specify project access at invite-time.
--
-- Example structure for the JSONB column:
-- [
--   {
--     "projectId": "uuid-of-project-1",
--     "permissions": [
--       { "resource_type": "PROJECT_RESUME", "permission": "view" },
--       { "resource_type": "PROJECT_DOCS_ROOT", "permission": "view" }
--     ]
--   },
--   {
--     "projectId": "uuid-of-project-2",
--     "permissions": [
--       { "resource_type": "PROJECT_RESUME", "permission": "edit" }
--     ]
--   }
-- ]
-- =============================================================================

ALTER TABLE public.invites
ADD COLUMN project_grants JSONB,
ADD COLUMN org_grants JSONB;

COMMENT ON COLUMN public.invites.project_grants IS 'Stores an array of projects and permissions to be granted upon invite acceptance.';
COMMENT ON COLUMN public.invites.org_grants IS 'Stores org-level permissions (BORROWER_RESUME, BORROWER_DOCS_ROOT) and optional exclusions upon invite acceptance.';
