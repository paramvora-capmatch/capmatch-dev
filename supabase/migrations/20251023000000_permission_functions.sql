-- Function to get permissions for a specific resource
CREATE OR REPLACE FUNCTION get_permissions_for_resource(p_resource_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, permission TEXT)
AS $$
BEGIN
    -- Check if the calling user has 'edit' permission on the resource
    IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT p.user_id, pr.full_name, p.permission
    FROM public.permissions p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.resource_id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set/update a permission for a user on a resource
CREATE OR REPLACE FUNCTION set_permission_for_resource(
    p_resource_id UUID,
    p_user_id UUID,
    p_permission TEXT -- 'view', 'edit', or 'none' (to remove)
)
RETURNS void AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Check if the calling user is an owner of the org this resource belongs to
    SELECT org_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;
    IF NOT public.is_org_owner(v_org_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only owners can manage permissions.';
    END IF;

    -- Upsert the permission. If 'none', it removes the grant effectively.
    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
    VALUES (p_resource_id, p_user_id, p_permission, auth.uid())
    ON CONFLICT (resource_id, user_id)
    DO UPDATE SET
        permission = EXCLUDED.permission,
        granted_by = EXCLUDED.granted_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;