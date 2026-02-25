-- =============================================================================
-- Cleanup on project access revoked: when a user loses project_access_grants,
-- remove them from chat threads, meetings, pending emails, and unread
-- notifications for that project. Uses DEFERRED trigger so update-member-
-- permissions' delete-then-reinsert pattern does not trigger cleanup for
-- renewed access.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_on_project_access_revoked()
RETURNS TRIGGER AS $$
BEGIN
    -- If a replacement grant was inserted in the same transaction, skip cleanup
    IF EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE user_id = OLD.user_id AND project_id = OLD.project_id
    ) THEN
        RETURN OLD;
    END IF;

    -- Remove from chat threads belonging to this project
    DELETE FROM public.chat_thread_participants
    WHERE user_id = OLD.user_id
      AND thread_id IN (
          SELECT id FROM public.chat_threads WHERE project_id = OLD.project_id
      );

    -- Remove from meetings belonging to this project
    DELETE FROM public.meeting_participants
    WHERE user_id = OLD.user_id
      AND meeting_id IN (
          SELECT id FROM public.meetings WHERE project_id = OLD.project_id
      );

    -- Cancel unsent emails for this user+project
    DELETE FROM public.pending_emails
    WHERE user_id = OLD.user_id
      AND project_id = OLD.project_id
      AND status = 'pending';

    -- Delete unread in-app notifications for this project
    DELETE FROM public.notifications
    WHERE user_id = OLD.user_id
      AND read_at IS NULL
      AND event_id IN (
          SELECT id FROM public.domain_events
          WHERE project_id = OLD.project_id
      );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE CONSTRAINT TRIGGER trg_cleanup_project_access_revoked
    AFTER DELETE ON public.project_access_grants
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_on_project_access_revoked();
