-- Security fix: check_profile_email_exists was callable by unauthenticated
-- (anon) users, enabling email enumeration attacks with no rate limiting.
--
-- The check is now performed server-side via /api/auth/check-email which
-- applies rate limiting before calling this function with the service role.
-- The function itself is restricted to service_role only.

REVOKE EXECUTE ON FUNCTION public.check_profile_email_exists(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_profile_email_exists(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_profile_email_exists(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.check_profile_email_exists(text) TO service_role;
