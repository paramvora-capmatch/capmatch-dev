-- Add is_locked column to resources table
ALTER TABLE resources ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
