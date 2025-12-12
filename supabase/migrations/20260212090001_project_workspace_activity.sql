-- Track last visited + last step for a borrower in a project workspace
-- This powers abandonment detection and deep links back to the exact step.

CREATE TABLE IF NOT EXISTS public.project_workspace_activity (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- When the user last opened/visited the workspace (heartbeat)
    last_visited_at TIMESTAMPTZ,

    -- Step identifier to deep-link back (we store a namespaced value like 'project:financial-details')
    last_step_id TEXT,

    -- When the user last made a meaningful resume edit (save/version or other persisted edit)
    last_resume_edit_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (project_id, user_id)
);

CREATE TRIGGER update_project_workspace_activity_updated_at
BEFORE UPDATE ON public.project_workspace_activity
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_workspace_activity_user
    ON public.project_workspace_activity (user_id, last_visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_workspace_activity_project
    ON public.project_workspace_activity (project_id, last_visited_at DESC);

ALTER TABLE public.project_workspace_activity ENABLE ROW LEVEL SECURITY;

-- Borrower-only: allow the owner of the borrower org for the project to upsert/select their own activity row.
DROP POLICY IF EXISTS "Owners can manage their project workspace activity" ON public.project_workspace_activity;
CREATE POLICY "Owners can manage their project workspace activity"
ON public.project_workspace_activity
FOR ALL
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.org_members om
      ON om.org_id = p.owner_org_id
    WHERE p.id = project_workspace_activity.project_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.org_members om
      ON om.org_id = p.owner_org_id
    WHERE p.id = project_workspace_activity.project_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

COMMENT ON TABLE public.project_workspace_activity IS
'Per-user per-project workspace activity used for resume abandonment detection (last_visited_at) and deep linking (last_step_id). Borrower-only via org owner RLS.';


