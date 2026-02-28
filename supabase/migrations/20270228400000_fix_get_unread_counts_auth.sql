-- Security fix: get_unread_counts_for_project accepted an arbitrary p_user_id
-- parameter without validating it matched auth.uid(). Any authenticated user
-- could query another user's thread membership and unread counts (information
-- disclosure vulnerability).
--
-- Fix: drop the two-argument version; replace with a single-argument version
-- that always derives the user from the session via auth.uid() internally.

DROP FUNCTION IF EXISTS public.get_unread_counts_for_project(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_unread_counts_for_project(p_project_id UUID)
RETURNS TABLE(thread_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ctp.thread_id,
    COUNT(pm.id) AS unread_count
  FROM chat_thread_participants ctp
  INNER JOIN chat_threads ct ON ct.id = ctp.thread_id
  LEFT JOIN project_messages pm
    ON pm.thread_id = ctp.thread_id
    AND pm.created_at > ctp.last_read_at
    AND pm.user_id != v_user_id  -- don't count own messages as unread
  WHERE ctp.user_id = v_user_id
    AND ct.project_id = p_project_id
  GROUP BY ctp.thread_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_counts_for_project(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_unread_counts_for_project(UUID) TO authenticated;
