-- =============================================================================
-- Consolidate duplicate UPDATE policies on public.notifications
-- =============================================================================
-- Table had two permissive UPDATE policies: "Users can update their notifications"
-- and "Users can update their own notifications". Keep a single UPDATE policy.
-- =============================================================================

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (user_id = public.get_current_user_id())
WITH CHECK (user_id = public.get_current_user_id());
