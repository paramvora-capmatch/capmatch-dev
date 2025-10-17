-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table for all organizations (borrower or lender)
CREATE TABLE public.orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('borrower', 'lender', 'advisor'))
);
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON public.orgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orgs_entity_type ON public.orgs(entity_type);

-- Table for user-specific data, including their system-wide role
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    full_name TEXT,
    email TEXT NOT NULL UNIQUE, -- Added unique constraint
    app_role TEXT NOT NULL CHECK (app_role IN ('borrower', 'lender', 'advisor')),
    active_org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL
);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE INDEX idx_profiles_app_role ON public.profiles(app_role);
CREATE INDEX idx_profiles_active_org_id ON public.profiles(active_org_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Table to link users to organizations with a specific role
-- Note: Roles are immutable. To change a role, a user must be removed and re-invited.
-- This is enforced in the application layer.
CREATE TABLE public.org_members (
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'project_manager', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);

-- Table to manage invitations
CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow user to be deleted
    invited_email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'project_manager', 'member')), -- Owners can invite other owners
    token TEXT NOT NULL UNIQUE DEFAULT extensions.uuid_generate_v4()::text,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    -- initial_permissions is removed in favor of the new hierarchical model
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, invited_email, status) -- Prevent duplicate pending invites
);
CREATE INDEX idx_invites_invited_email ON public.invites(invited_email);
CREATE INDEX idx_invites_status ON public.invites(status);
