-- =============================================================================
-- Fix mutable search_path on public functions
-- =============================================================================
-- Sets search_path = public on functions that were created without it to prevent
-- search_path injection. Resolves "Function Search Path Mutable" advisor warning.
-- =============================================================================

-- From 20260115000000_lender_access.sql
ALTER FUNCTION public.get_user_org_ids(UUID) SET search_path = public;
ALTER FUNCTION public.is_lender_with_project_access(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.grant_lender_project_access(UUID, UUID, UUID) SET search_path = public;
ALTER FUNCTION public.revoke_lender_project_access(UUID, UUID) SET search_path = public;

-- From 20261230000002_fix_chat_rls_recursion.sql
ALTER FUNCTION public.get_thread_project_id_safe(UUID) SET search_path = public;

-- From 20270120000006_update_advisor_grant_function.sql
ALTER FUNCTION public.grant_advisor_project_permissions(UUID, UUID, UUID) SET search_path = public;

-- From 20260212000000_meeting_invitation_events.sql
ALTER FUNCTION public.insert_meeting_invited_event(UUID, UUID, UUID, UUID, JSONB) SET search_path = public;
ALTER FUNCTION public.on_meeting_participant_inserted() SET search_path = public;

-- From 20270101000000_add_underwriting_root_support.sql (trigger functions)
ALTER FUNCTION public.validate_resource_insert() SET search_path = public;
ALTER FUNCTION public.validate_resource_delete() SET search_path = public;

-- From 20270102000000_add_underwriting_templates_root_support.sql (redefines validate_resource_insert)
-- Already covered by validate_resource_insert() above.