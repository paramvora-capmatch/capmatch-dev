-- Allow document_catalogue as a source_type in extraction_cache for document catalogue caching.
-- Catalogue is keyed by (project_id, signature, resume_label) and stored in extracted_data JSONB.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'extraction_cache' AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%source_type%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE extraction_cache DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE extraction_cache
  ADD CONSTRAINT extraction_cache_source_type_check
  CHECK (source_type IN ('document', 'knowledge_base', 'document_catalogue'));

COMMENT ON COLUMN extraction_cache.source_type IS 'Type of source: document, knowledge_base, or document_catalogue';
