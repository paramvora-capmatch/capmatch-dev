-- Migration: Add SECURITY DEFINER and validation to insert_document_uploaded_event
-- Reason: domain_events table has RLS enabled with no policies, so regular users
--         cannot insert directly. This function needs SECURITY DEFINER to bypass RLS.
--         Additionally, we add validation to prevent spoofing and abuse.

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
BEGIN
    -- Security: Ensure the caller is authenticated
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Security: Ensure the caller is the actor (prevent actor ID spoofing)
    IF p_actor_id != v_current_user_id THEN
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
    
    -- Security: Validate that the user has view access to the resource
    -- (If they uploaded it, they should have access, but verify anyway)
    IF NOT public.can_view(v_current_user_id, p_resource_id) THEN
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
'Safely inserts a document_uploaded domain event. Uses SECURITY DEFINER to bypass RLS on domain_events. Validates that the caller is authenticated, is the actor, and has access to the resource.';

