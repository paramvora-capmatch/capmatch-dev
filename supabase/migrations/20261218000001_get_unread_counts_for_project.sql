-- Function to get unread message counts per thread for a user in a project
CREATE OR REPLACE FUNCTION get_unread_counts_for_project(p_project_id UUID, p_user_id UUID)
RETURNS TABLE(thread_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ctp.thread_id,
    COUNT(pm.id) as unread_count
  FROM 
    chat_thread_participants ctp
  INNER JOIN 
    chat_threads ct ON ct.id = ctp.thread_id
  LEFT JOIN 
    project_messages pm ON pm.thread_id = ctp.thread_id 
      AND pm.created_at > ctp.last_read_at
      AND pm.user_id != p_user_id  -- Don't count own messages as unread
  WHERE 
    ctp.user_id = p_user_id
    AND ct.project_id = p_project_id
  GROUP BY 
    ctp.thread_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_counts_for_project(UUID, UUID) TO authenticated;
