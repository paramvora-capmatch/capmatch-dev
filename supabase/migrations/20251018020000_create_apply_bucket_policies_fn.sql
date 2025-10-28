-- =============================================================================
-- Migration: Create per-bucket storage policy applicator
-- =============================================================================
-- Creates a function that (idempotently) installs storage.objects policies scoped
-- to a specific bucket_id, using unique policy names per bucket.
-- This matches the behavior of the Supabase Storage UI "bucket policies" and
-- fixes uploads for dynamically created buckets.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_bucket_storage_policies(p_bucket_id TEXT)
RETURNS void AS $$
DECLARE
    v_bucket_id TEXT := p_bucket_id;
    v_up_name TEXT := format('allow_upload_%s', v_bucket_id);
    v_sel_name TEXT := format('allow_select_%s', v_bucket_id);
    v_upd_name TEXT := format('allow_update_%s', v_bucket_id);
    v_del_name TEXT := format('allow_delete_%s', v_bucket_id);
    v_bkt_name TEXT := format('allow_bucket_%s', v_bucket_id);
BEGIN
    -- Bucket policy (outer gate) - optional but keeps UI parity
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.buckets', v_bkt_name);
    EXECUTE format('CREATE POLICY "%s" ON storage.buckets FOR ALL TO public USING (id = %L)', v_bkt_name, v_bucket_id);

    -- INSERT (upload) policy scoped to this bucket
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_up_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
            bucket_id = %L AND public.can_upload_to_path_for_user(auth.uid(), bucket_id, string_to_array(name,''/''))
        )',
        v_up_name, v_bucket_id
    );

    -- SELECT (download) policy scoped to this bucket
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_sel_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR SELECT TO authenticated USING (
            bucket_id = %L AND public.can_view(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_sel_name, v_bucket_id
    );

    -- UPDATE (overwrite) policy scoped to this bucket
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_upd_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR UPDATE TO authenticated USING (
            bucket_id = %L AND public.can_edit(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_upd_name, v_bucket_id
    );

    -- DELETE policy scoped to this bucket
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_del_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR DELETE TO authenticated USING (
            bucket_id = %L AND public.can_edit(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_del_name, v_bucket_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.apply_bucket_storage_policies IS 'Installs per-bucket storage RLS policies with unique names, scoped by bucket_id.';

-- This function is administrative and should not be callable by clients.
REVOKE EXECUTE ON FUNCTION public.apply_bucket_storage_policies(TEXT) FROM PUBLIC;
