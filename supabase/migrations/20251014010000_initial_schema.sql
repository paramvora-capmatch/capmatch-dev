-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table for all organizations (borrower or lender)
CREATE TABLE public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('borrower', 'lender'))
);
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_entities_entity_type ON public.entities(entity_type);

-- Table for user-specific data, including their system-wide role
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    full_name TEXT,
    app_role TEXT NOT NULL CHECK (app_role IN ('borrower', 'lender', 'advisor')),
    active_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL
);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_profiles_app_role ON public.profiles(app_role);
CREATE INDEX idx_profiles_active_entity_id ON public.profiles(active_entity_id);

-- Table to link users to entities with a specific role
CREATE TABLE public.entity_members (
    entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (entity_id, user_id)
);
CREATE INDEX idx_entity_members_user_id ON public.entity_members(user_id);

-- Table to manage invitations
CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    token TEXT NOT NULL UNIQUE DEFAULT extensions.uuid_generate_v4()::text,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    initial_permissions JSONB,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_id, invited_email) -- Prevent inviting the same email to the same entity twice if the invite is pending
);
CREATE INDEX idx_invites_invited_email ON public.invites(invited_email);
CREATE INDEX idx_invites_status ON public.invites(status);
