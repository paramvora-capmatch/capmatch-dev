-- Create extraction_cache table for caching extracted data from documents and KB
CREATE TABLE IF NOT EXISTS extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'knowledge_base')),
    source_identifier TEXT NOT NULL, -- resource_id for documents, 'Census API' for KB
    version_number INTEGER, -- For documents only
    document_name TEXT, -- For documents only
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one KB cache per project
CREATE UNIQUE INDEX IF NOT EXISTS unique_kb_cache 
    ON extraction_cache (project_id, source_type) 
    WHERE source_type = 'knowledge_base';

-- Unique constraint: one cache per document version
CREATE UNIQUE INDEX IF NOT EXISTS unique_doc_version_cache 
    ON extraction_cache (project_id, source_type, source_identifier, version_number)
    WHERE source_type = 'document';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_extraction_cache_project_id ON extraction_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_source_type ON extraction_cache(source_type);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_doc_lookup ON extraction_cache(project_id, source_type, source_identifier, version_number)
    WHERE source_type = 'document';

-- RLS policies
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write cache for projects they have access to
CREATE POLICY "Users can manage extraction cache for their projects"
    ON extraction_cache
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = extraction_cache.project_id
            AND (
                public.is_org_owner(p.owner_org_id, auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.project_access_grants pag
                    WHERE pag.project_id = p.id
                    AND pag.user_id = auth.uid()
                )
            )
        )
    );

COMMENT ON TABLE extraction_cache IS 'Caches extracted data from documents and knowledge base to avoid reprocessing';
COMMENT ON COLUMN extraction_cache.source_type IS 'Type of source: document or knowledge_base';
COMMENT ON COLUMN extraction_cache.source_identifier IS 'Resource ID for documents, source name for KB (e.g., Census API)';
COMMENT ON COLUMN extraction_cache.version_number IS 'Document version number (for documents only)';
COMMENT ON COLUMN extraction_cache.document_name IS 'Human-readable document name (for documents only)';
COMMENT ON COLUMN extraction_cache.extracted_data IS 'JSONB object containing extracted field values';

