-- Add ON CONFLICT (project_id, user_id) DO NOTHING to grant_project_access so that
-- idempotent calls (e.g. advisor grant after project create) do not raise and
-- allow the domain event (project_access_granted) to be emitted.
CREATE OR REPLACE FUNCTION public.grant_project_access(
    p_project_id UUID,
    p_user_id UUID,
    p_granted_by_id UUID,
    p_permissions public.permission_grant[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grant public.permission_grant;
    v_resource_id UUID;
    v_org_id UUID;
BEGIN
    SELECT owner_org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Project not found or has no owner organization.';
    END IF;
    IF NOT public.is_org_owner(v_org_id, p_granted_by_id) THEN
        RAISE EXCEPTION 'Only organization owners can grant project access.';
    END IF;

    INSERT INTO public.project_access_grants (project_id, user_id, granted_by, org_id)
    VALUES (p_project_id, p_user_id, p_granted_by_id, v_org_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    FOREACH v_grant IN ARRAY p_permissions
    LOOP
        SELECT id INTO v_resource_id
        FROM public.resources
        WHERE project_id = p_project_id AND resource_type = v_grant.resource_type;

        IF v_resource_id IS NOT NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (v_resource_id, p_user_id, v_grant.permission, p_granted_by_id)
            ON CONFLICT (resource_id, user_id) DO UPDATE SET
                permission = EXCLUDED.permission,
                granted_by = EXCLUDED.granted_by;
        END IF;
    END LOOP;
END;
$$;
