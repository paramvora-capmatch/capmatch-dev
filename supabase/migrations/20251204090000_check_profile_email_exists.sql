-- Migration: Add RPC to check if a profile email exists (for signup confirmation)
-- This avoids exposing auth.users directly and does not require an edge function.

-- Signup Confirmation Flow Optimization

CREATE OR REPLACE FUNCTION public.check_profile_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = lower(p_email)
  )
  INTO v_exists;

  RETURN COALESCE(v_exists, FALSE);
END;
$$;

COMMENT ON FUNCTION public.check_profile_email_exists(text) IS
  'Returns true if any profile exists with the given email (case-insensitive). Intended for login/signup flows.';


