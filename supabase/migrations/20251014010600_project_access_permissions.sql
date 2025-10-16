-- =============================================================================
-- Project Access Permissions
-- =============================================================================

-- Table for explicit project access permissions for members
CREATE TABLE public.project_access_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES public.profiles(id),
    access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_access_permissions_project_id ON public.project_access_permissions(project_id);
CREATE INDEX idx_project_access_permissions_user_id ON public.project_access_permissions(user_id);
CREATE INDEX idx_project_access_permissions_granted_by ON public.project_access_permissions(granted_by);

-- Enable RLS on the new table
ALTER TABLE public.project_access_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project access permissions
CREATE POLICY "Project owners and advisors can manage project access" ON public.project_access_permissions
FOR ALL USING (public.can_edit_project(project_id, auth.uid())) WITH CHECK (public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "Users can view their own project access permissions" ON public.project_access_permissions
FOR SELECT USING (user_id = auth.uid());

-- =============================================================================
-- Update Helper Functions
-- =============================================================================

-- Updated function to check if a user can view a project
CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
  v_is_owner BOOLEAN;
  v_is_advisor BOOLEAN;
  v_has_project_access BOOLEAN;
BEGIN
  -- Get the project's owner entity
  SELECT owner_entity_id INTO v_owner_entity_id FROM public.projects WHERE id = p_project_id;
  
  -- Check if user is owner of the project's entity (grants full access)
  SELECT public.is_entity_owner(v_owner_entity_id, p_user_id) INTO v_is_owner;
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is assigned advisor for the project
  SELECT public.is_project_advisor(p_project_id, p_user_id) INTO v_is_advisor;
  IF v_is_advisor THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit project access permission
  SELECT EXISTS (
    SELECT 1 FROM public.project_access_permissions 
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_has_project_access;
  
  RETURN v_has_project_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to check if a user can edit a project
CREATE OR REPLACE FUNCTION public.can_edit_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
  v_is_owner BOOLEAN;
  v_is_advisor BOOLEAN;
  v_has_edit_access BOOLEAN;
BEGIN
  -- Get the project's owner entity
  SELECT owner_entity_id INTO v_owner_entity_id FROM public.projects WHERE id = p_project_id;
  
  -- Check if user is owner of the project's entity (grants full access)
  SELECT public.is_entity_owner(v_owner_entity_id, p_user_id) INTO v_is_owner;
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is assigned advisor for the project
  SELECT public.is_project_advisor(p_project_id, p_user_id) INTO v_is_advisor;
  IF v_is_advisor THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit edit access permission
  SELECT EXISTS (
    SELECT 1 FROM public.project_access_permissions 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND access_level = 'edit'
  ) INTO v_has_edit_access;
  
  RETURN v_has_edit_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to check if a user can access a specific document
CREATE OR REPLACE FUNCTION public.can_user_access_document(
  p_user_id UUID, 
  p_project_id UUID, 
  p_document_path TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_entity_id UUID;
  v_is_owner BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Get the project's owner entity
  SELECT owner_entity_id INTO v_owner_entity_id 
  FROM public.projects 
  WHERE id = p_project_id;
  
  -- Check if user is owner of the project's entity (grants full access to all documents)
  SELECT public.is_entity_owner(v_owner_entity_id, p_user_id) INTO v_is_owner;
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has specific document permission
  SELECT EXISTS (
    SELECT 1 FROM public.document_permissions 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND (document_path = p_document_path OR document_path = '*')
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
