-- Enable RLS on public.underwriting_documents
-- Table was created in 20270122000002_refactor_underwriting_docs.sql without RLS.
-- Access follows resource permissions: view/edit the linked resource implies view/edit the underwriting_document.

ALTER TABLE public.underwriting_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: users who can view the resource can see its underwriting_document row
CREATE POLICY "Users can view underwriting docs for resources they can view"
ON public.underwriting_documents
FOR SELECT
USING (
  public.can_view(public.get_current_user_id(), resource_id)
);

-- INSERT: users who can edit the resource can create underwriting_document rows (e.g. when validation is first set)
CREATE POLICY "Users can create underwriting docs for resources they can edit"
ON public.underwriting_documents
FOR INSERT
WITH CHECK (
  public.can_edit(public.get_current_user_id(), resource_id)
);

-- UPDATE: users who can edit the resource can update validation status/errors
CREATE POLICY "Users can update underwriting docs for resources they can edit"
ON public.underwriting_documents
FOR UPDATE
USING (public.can_edit(public.get_current_user_id(), resource_id))
WITH CHECK (public.can_edit(public.get_current_user_id(), resource_id));

-- DELETE: users who can edit the resource can delete underwriting_document rows
CREATE POLICY "Users can delete underwriting docs for resources they can edit"
ON public.underwriting_documents
FOR DELETE
USING (public.can_edit(public.get_current_user_id(), resource_id));

COMMENT ON POLICY "Users can view underwriting docs for resources they can view" ON public.underwriting_documents IS
'RLS: Users can view underwriting_documents for resources they can view. Uses get_current_user_id() for performance.';

COMMENT ON POLICY "Users can create underwriting docs for resources they can edit" ON public.underwriting_documents IS
'RLS: Users can insert underwriting_documents only for resources they can edit.';

COMMENT ON POLICY "Users can update underwriting docs for resources they can edit" ON public.underwriting_documents IS
'RLS: Users can update underwriting_documents only for resources they can edit.';

COMMENT ON POLICY "Users can delete underwriting docs for resources they can edit" ON public.underwriting_documents IS
'RLS: Users can delete underwriting_documents only for resources they can edit.';
