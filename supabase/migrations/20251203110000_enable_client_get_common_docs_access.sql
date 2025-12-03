-- =============================================================================
-- Migration: Enable direct client access to common thread documents
-- =============================================================================
--
-- Goal:
-- - Allow authenticated users (chat participants) to call
--   get_common_file_resources_for_thread directly via RPC from the client
--   instead of going through the get-common-documents-for-thread edge function.
--
-- Notes:
-- - The function is SECURITY DEFINER and already enforces document access
--   via public.can_view for every participant in the thread.
-- - We only need to ensure that the authenticated role has EXECUTE privileges.
--

-- Restrict default EXECUTE on the function to avoid over-exposure
REVOKE EXECUTE ON FUNCTION public.get_common_file_resources_for_thread(UUID)
FROM PUBLIC;

-- Grant EXECUTE to authenticated users so they can call the RPC directly
GRANT EXECUTE ON FUNCTION public.get_common_file_resources_for_thread(UUID)
TO authenticated;

COMMENT ON FUNCTION public.get_common_file_resources_for_thread(UUID) IS
'Returns all FILE resources (project-level or org-level, including borrower docs) that EVERY participant in the thread can view. Exposed to authenticated clients via RPC so the frontend no longer needs the get-common-documents-for-thread edge function.';


