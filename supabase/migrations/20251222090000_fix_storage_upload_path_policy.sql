-- =============================================================================
-- Migration: Fix storage upload path policy to support project folder prefixes
-- Date: 2025-12-22
-- =============================================================================
--
-- This migration updates the storage upload policy helper functions so they
-- understand the current storage layout:
--   <project_id>/project-docs/<resource_id>/vX_filename
--   <project_id>/borrower-docs/<resource_id>/vX_filename
-- It also maintains backward compatibility with the original layouts.
--

CREATE OR REPLACE FUNCTION public.can_upload_to_path_for_user(
    p_user_id UUID,
    p_bucket_id TEXT,
    p_path_tokens TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_bucket_uuid UUID;
    v_token_count INT;
    v_first_token TEXT;
    v_second_token TEXT;
    v_project_id UUID;
    v_parent_id UUID;
    v_resource_index INT;
    v_resource_token TEXT;
    v_folder_start_index INT;
    v_target_file_id UUID;
    v_next_parent_id UUID;
    v_current_folder_name TEXT;
    i INT;
BEGIN
    IF p_path_tokens IS NULL THEN
        RETURN FALSE;
    END IF;

    v_token_count := array_length(p_path_tokens, 1);
    IF v_token_count IS NULL OR v_token_count < 2 THEN
        RETURN FALSE;
    END IF;

    v_bucket_uuid := p_bucket_id::UUID;
    v_first_token := p_path_tokens[1];
    v_second_token := CASE WHEN v_token_count >= 2 THEN p_path_tokens[2] ELSE NULL END;

    -- Determine the root resource based on the path structure.
    IF v_first_token IN ('borrower-docs', 'borrower_docs') THEN
        -- Legacy org-scoped borrower documents: bucket/<borrower-docs>/<resource>/<file>
        SELECT id
        INTO v_parent_id
        FROM public.resources
        WHERE org_id = v_bucket_uuid
          AND resource_type = 'BORROWER_DOCS_ROOT'
        LIMIT 1;

        v_resource_index := 2;
        v_folder_start_index := 3;
    ELSE
        -- First token should be a project UUID for project-scoped paths.
        BEGIN
            v_project_id := v_first_token::UUID;
        EXCEPTION
            WHEN invalid_text_representation THEN
                RETURN FALSE;
        END;

        IF v_second_token IN ('borrower-docs', 'borrower_docs') THEN
            -- Project-scoped borrower documents: <project>/<borrower-docs>/...
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'BORROWER_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 3;
            v_folder_start_index := 4;
        ELSIF v_second_token = 'project-docs' THEN
            -- Project documents: <project>/<project-docs>/...
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 3;
            v_folder_start_index := 4;
        ELSE
            -- Backward compatibility: <project>/<resource>/...
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 2;
            v_folder_start_index := 3;
        END IF;
    END IF;

    IF v_parent_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fast path: the segment immediately after the context is a resource UUID.
    IF v_resource_index IS NOT NULL AND v_resource_index <= v_token_count THEN
        v_resource_token := p_path_tokens[v_resource_index];

        BEGIN
            SELECT r.id
            INTO v_target_file_id
            FROM public.resources r
            WHERE r.id = v_resource_token::UUID
              AND (
                    r.parent_id = v_parent_id
                 OR (r.id = v_parent_id AND r.resource_type IN ('FILE', 'FOLDER'))
              )
            LIMIT 1;
        EXCEPTION
            WHEN invalid_text_representation THEN
                v_target_file_id := NULL;
        END;

        IF v_target_file_id IS NOT NULL THEN
            RETURN public.can_edit(p_user_id, v_target_file_id)
                OR public.can_edit(p_user_id, v_parent_id);
        END IF;
    END IF;

    -- Fallback: interpret the remaining path segments (excluding the filename)
    -- as nested folders beneath the computed parent.
    IF v_folder_start_index IS NULL THEN
        v_folder_start_index := 2;
    END IF;

    IF v_token_count > v_folder_start_index THEN
        FOR i IN v_folder_start_index..(v_token_count - 1) LOOP
            v_current_folder_name := p_path_tokens[i];

            SELECT id
            INTO v_next_parent_id
            FROM public.resources
            WHERE parent_id = v_parent_id
              AND name = v_current_folder_name
              AND resource_type = 'FOLDER'
            LIMIT 1;

            IF v_next_parent_id IS NULL THEN
                RETURN FALSE;
            END IF;

            v_parent_id := v_next_parent_id;
        END LOOP;
    END IF;

    RETURN public.can_edit(p_user_id, v_parent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_upload_to_path(
    p_bucket_id TEXT,
    p_path_tokens TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.can_upload_to_path_for_user(auth.uid(), p_bucket_id, p_path_tokens);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


