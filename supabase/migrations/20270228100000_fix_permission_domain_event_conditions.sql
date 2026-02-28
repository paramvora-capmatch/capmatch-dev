-- Fix: set_permission_for_resource was missing domain event emission for
-- existing rows with old_permission = 'none' being upgraded to 'view' or 'edit'.
-- Also adds: early-exit when permission unchanged, and downgrade (edit → view) events.

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

    -- Early-exit: no event when permission is unchanged
    IF NOT v_is_insert AND v_old_permission = p_permission THEN
        RETURN;
    END IF;

    -- Emit domain events based on old → new transition
    IF v_is_insert AND p_permission IN ('view', 'edit') THEN
        -- Brand-new permission row with view/edit
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
    ELSIF NOT v_is_insert AND v_old_permission = 'none' AND p_permission IN ('view', 'edit') THEN
        -- Existing row upgraded from 'none' to view/edit (was missing — Bug #1)
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
        -- Upgrade from view to edit
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
    ELSIF NOT v_is_insert AND v_old_permission = 'edit' AND p_permission = 'view' THEN
        -- Downgrade from edit to view (future-proofing)
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
