-- Resume nudges (abandonment reminders)
-- Creates an append-only log to dedupe and throttle per project/user.
--
-- IMPORTANT: This migration must run AFTER domain_events exists.
-- (domain_events is created in 20260118090000_domain_events_and_notifications.sql)
--
-- We intentionally store anchor_activity_at so a new edit session (new activity)
-- can restart the nudge cadence without colliding with past sessions.

CREATE TABLE IF NOT EXISTS public.resume_nudge_log (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 'in_app' or 'email'
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),

    -- Stage for the cadence relative to anchor_activity_at.
    -- t45m: 45-60 minutes after inactivity (in-app only)
    -- t24h/t3d/t7d: follow-up reminders
    stage TEXT NOT NULL CHECK (stage IN ('t45m', 't24h', 't3d', 't7d')),

    -- Which resume is the primary focus of the nudge message
    resume_focus TEXT NOT NULL CHECK (resume_focus IN ('borrower', 'project', 'both')),

    -- The inactivity anchor used to compute the stage (usually last_resume_activity_at)
    anchor_activity_at TIMESTAMPTZ NOT NULL,

    -- Optional linkage to a domain event used to create notifications / emails
    event_id BIGINT REFERENCES public.domain_events(id) ON DELETE SET NULL,

    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency / dedupe: if the cron reruns, don't duplicate the same stage for the same session.
CREATE UNIQUE INDEX IF NOT EXISTS ux_resume_nudge_log_dedupe
    ON public.resume_nudge_log (project_id, user_id, channel, stage, resume_focus, anchor_activity_at);

CREATE INDEX IF NOT EXISTS idx_resume_nudge_log_user_sent_at
    ON public.resume_nudge_log (user_id, sent_at DESC);

COMMENT ON TABLE public.resume_nudge_log IS
'Append-only log of resume abandonment nudges (in-app + email), used to dedupe and throttle. anchor_activity_at allows cadence reset after new resume activity.';


