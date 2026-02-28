-- Security fix: set_permission_for_resource and get_permissions_for_resource
-- were SECURITY DEFINER functions without SET search_path = public, making them
-- vulnerable to search_path hijacking attacks in the SECURITY DEFINER context.

CREATE OR REPLACE FUNCTION public.get_permissions_for_resource(p_resource_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, permission TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT p.user_id, pr.full_name, p.permission
  FROM public.permissions p
  JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p.resource_id = p_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_permission_for_resource(
    p_resource_id UUID,
    p_user_id UUID,
    p_permission TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;
  IF NOT public.is_org_owner(v_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can manage permissions.';
  END IF;

  INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
  VALUES (p_resource_id, p_user_id, p_permission, auth.uid())
  ON CONFLICT (resource_id, user_id)
  DO UPDATE SET
    permission = EXCLUDED.permission,
    granted_by = EXCLUDED.granted_by;
END;
$$;
