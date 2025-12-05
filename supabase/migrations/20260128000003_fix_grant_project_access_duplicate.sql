-- Fix grant_project_access to handle duplicate project_access_grants gracefully
-- This prevents errors when granting access to the same project multiple times
-- (e.g., when granting view access and then edit access on project resume)

CREATE OR REPLACE FUNCTION public.grant_project_access(
    p_project_id UUID,
    p_user_id UUID,
    p_granted_by_id UUID,
    p_permissions public.permission_grant[]
)
RETURNS void AS $$
DECLARE
    v_grant public.permission_grant;
    v_resource_id UUID;
    v_org_id UUID;
BEGIN
    -- First, verify the granter has owner permissions on the project's org.
    SELECT owner_org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Project not found or has no owner organization.';
    END IF;
    IF NOT public.is_org_owner(v_org_id, p_granted_by_id) THEN
        RAISE EXCEPTION 'Only organization owners can grant project access.';
    END IF;

    -- Create the top-level access grant record. This is the "entry ticket".
    -- If it already exists (e.g., re-inviting or duplicate grant), do nothing.
    INSERT INTO public.project_access_grants (project_id, user_id, granted_by, org_id)
    VALUES (p_project_id, p_user_id, p_granted_by_id, v_org_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Loop through the requested granular permissions and create them.
    FOREACH v_grant IN ARRAY p_permissions
    LOOP
        -- Find the corresponding resource_id based on the project and resource type.
        -- This relies on the initial creation of these root resources.
        SELECT id INTO v_resource_id
        FROM public.resources
        WHERE project_id = p_project_id AND resource_type = v_grant.resource_type;

        -- If a resource is found, insert or update the permission.
        IF v_resource_id IS NOT NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (v_resource_id, p_user_id, v_grant.permission, p_granted_by_id)
            -- If the permission already exists (e.g., re-inviting), update it.
            ON CONFLICT (resource_id, user_id) DO UPDATE SET
                permission = EXCLUDED.permission,
                granted_by = EXCLUDED.granted_by;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grant_project_access IS 'Grants a user access to a project and sets their initial permissions in a single transaction. Handles duplicate grants gracefully.';

