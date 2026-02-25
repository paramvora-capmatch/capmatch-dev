-- Allow project owner (org owner) or assigned advisor to delete a chat thread.
-- Uses get_current_user_id() for RLS consistency.

CREATE POLICY "Project owners and advisors can delete chat threads"
ON public.chat_threads
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = chat_threads.project_id
        AND (
            public.is_org_owner(p.owner_org_id, public.get_current_user_id())
            OR p.assigned_advisor_id = public.get_current_user_id()
        )
    )
);

COMMENT ON POLICY "Project owners and advisors can delete chat threads" ON public.chat_threads IS
'Only the project owner org (org owner role) or assigned advisor can delete a chat thread.';
