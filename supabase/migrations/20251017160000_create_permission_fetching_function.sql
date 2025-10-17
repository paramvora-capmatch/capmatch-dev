-- =============================================================================
-- Migration: Create Function to Fetch All Project Permissions
-- =============================================================================
--
-- This migration creates a new database function, `get_all_user_permissions_for_project`,
-- which is designed to be the primary endpoint for the client-side permission system.
--
-- It efficiently calculates and returns all of the current user's effective
-- permissions for every resource within a specified project in a single call.
-- This avoids the need for the client to make multiple round-trips to the database.
--
-- The function returns a JSON array of objects, each containing a resource_id
-- and the corresponding permission level ('view' or 'edit').
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_all_user_permissions_for_project(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'resource_id', r.id,
            'permission', public.get_effective_permission(auth.uid(), r.id)
        )
    )
    INTO v_permissions
    FROM public.resources r
    WHERE r.project_id = p_project_id
      -- We only need to return resources where the user has *some* permission
      AND public.get_effective_permission(auth.uid(), r.id) IS NOT NULL;

    -- Return an empty array if no permissions were found, instead of NULL.
    RETURN COALESCE(v_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_all_user_permissions_for_project IS 'Fetches all effective permissions for the current user for all resources within a specific project.';
