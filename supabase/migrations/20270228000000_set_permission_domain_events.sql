-- Emit domain events when permissions are set via set_permission_for_resource (e.g. from AccessControlTab or ShareModal).
-- This ensures notify-fan-out can create notifications for document_permission_granted and document_permission_changed.

CREATE OR REPLACE FUNCTION public.set_permission_for_resource(
    p_resource_id UUID,
    p_user_id UUID,
    p_permission TEXT -- 'view', 'edit', or 'none' (explicit deny)
)
RETURNS void AS $$
DECLARE
    v_org_id UUID;
    v_actor_id UUID;
    v_project_id UUID;
    v_resource_name TEXT;
    v_old_permission TEXT;
    v_is_insert BOOLEAN;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if the calling user is an owner of the org this resource belongs to
    SELECT org_id, project_id, name
    INTO v_org_id, v_project_id, v_resource_name
    FROM public.resources
    WHERE id = p_resource_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Resource not found';
    END IF;
    IF NOT public.is_org_owner(v_org_id, v_actor_id) THEN
        RAISE EXCEPTION 'Only owners can manage permissions.';
    END IF;

    -- Capture previous permission for event emission (before upsert)
    SELECT permission INTO v_old_permission
    FROM public.permissions
    WHERE resource_id = p_resource_id AND user_id = p_user_id;
    v_is_insert := (v_old_permission IS NULL);

    -- Upsert the permission
    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
    VALUES (p_resource_id, p_user_id, p_permission, v_actor_id)
    ON CONFLICT (resource_id, user_id)
    DO UPDATE SET
        permission = EXCLUDED.permission,
        granted_by = EXCLUDED.granted_by;

    -- Emit domain event only when permission is granted (none -> view/edit) or upgraded (view -> edit).
    IF v_is_insert AND p_permission IN ('view', 'edit') THEN
        INSERT INTO public.domain_events (event_type, actor_id, project_id, resource_id, payload)
        VALUES (
            'document_permission_granted',
            v_actor_id,
            v_project_id,
            p_resource_id,
            jsonb_build_object(
                'affected_user_id', p_user_id::text,
                'resource_name', COALESCE(v_resource_name, ''),
                'new_permission', p_permission
            )
        );
    ELSIF NOT v_is_insert AND v_old_permission = 'view' AND p_permission = 'edit' THEN
        INSERT INTO public.domain_events (event_type, actor_id, project_id, resource_id, payload)
        VALUES (
            'document_permission_changed',
            v_actor_id,
            v_project_id,
            p_resource_id,
            jsonb_build_object(
                'affected_user_id', p_user_id::text,
                'resource_name', COALESCE(v_resource_name, ''),
                'old_permission', v_old_permission,
                'new_permission', p_permission
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
