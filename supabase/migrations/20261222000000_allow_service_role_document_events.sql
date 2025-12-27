-- Migration: Allow service role to insert document_uploaded events for seeding
-- Reason: Seed scripts use service role key but insert_document_uploaded_event
--         requires authentication. We need to allow service role access while
--         maintaining security for regular users.

CREATE OR REPLACE FUNCTION public.insert_document_uploaded_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_resource_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_thread_id UUID DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
    v_current_user_id UUID;
    v_is_service_role BOOLEAN;
BEGIN
    -- Get current user ID
    v_current_user_id := auth.uid();

    -- Check if this is a service role call (auth.uid() is NULL but we have a valid JWT)
    -- Service role can bypass authentication checks for seeding
    v_is_service_role := (v_current_user_id IS NULL AND current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

    -- Security: Ensure either authenticated user OR service role
    IF v_current_user_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Security: For regular users, ensure the caller is the actor (prevent actor ID spoofing)
    -- Service role can specify any actor for seeding
    IF NOT v_is_service_role AND p_actor_id != v_current_user_id THEN
        RAISE EXCEPTION 'Actor ID must match authenticated user';
    END IF;

    -- Security: Validate that the resource exists and belongs to the project
    IF NOT EXISTS (
        SELECT 1 FROM public.resources
        WHERE id = p_resource_id
          AND project_id = p_project_id
          AND resource_type = 'FILE'
    ) THEN
        RAISE EXCEPTION 'Resource does not exist or does not belong to the specified project';
    END IF;

    -- Security: For regular users, validate that they have view access to the resource
    -- Service role bypasses this check for seeding
    IF NOT v_is_service_role AND NOT public.can_view(v_current_user_id, p_resource_id) THEN
        RAISE EXCEPTION 'User does not have access to this resource';
    END IF;

    -- Now safe to insert the event
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        resource_id,
        thread_id,
        payload
    )
    VALUES (
        'document_uploaded',
        p_actor_id,
        p_project_id,
        p_resource_id,
        p_thread_id,
        COALESCE(p_payload, '{}'::jsonb)
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.insert_document_uploaded_event IS
'Safely inserts a document_uploaded domain event. Uses SECURITY DEFINER to bypass RLS on domain_events. Validates that the caller is authenticated OR service role, is the actor (unless service role), and has access to the resource (unless service role).';
