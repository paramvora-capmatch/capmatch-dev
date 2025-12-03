-- =============================================================================
-- Function: get_effective_permissions_for_resource
-- =============================================================================
-- Returns the effective permission for a set of users on a specific resource,
-- using the hierarchical permission engine (get_effective_permission).
--
-- This is used by the frontend ShareModal to:
-- - Show inherited/blanket permissions (e.g., from PROJECT_DOCS_ROOT)
-- - Distinguish between "no override" and explicit per-file grants
--
-- Security:
-- - Only org owners of the resource's org may call this function.
--

CREATE OR REPLACE FUNCTION public.get_effective_permissions_for_resource(
    p_resource_id UUID,
    p_user_ids UUID[]
)
RETURNS TABLE(user_id UUID, effective_permission TEXT) AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Determine org for the resource
    SELECT org_id INTO v_org_id
    FROM public.resources
    WHERE id = p_resource_id;

    -- Only org owners can inspect effective permissions
    IF NOT public.is_org_owner(v_org_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only owners can view effective permissions.';
    END IF;

    RETURN QUERY
    SELECT u_id AS user_id,
           public.get_effective_permission(u_id, p_resource_id) AS effective_permission
    FROM UNNEST(COALESCE(p_user_ids, ARRAY[]::UUID[])) AS u_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_effective_permissions_for_resource(UUID, UUID[]) IS
'Returns effective permissions for a set of users on a resource, leveraging hierarchical grants; used by the ShareModal to display blanket vs. per-file overrides.';


