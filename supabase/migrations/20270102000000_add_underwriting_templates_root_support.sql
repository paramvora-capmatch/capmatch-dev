-- Migration: Add UNDERWRITING_TEMPLATES_ROOT Support
-- Author: Antigravity
-- Date: 2027-01-02
-- Description: Updates resource validation check to allow UNDERWRITING_TEMPLATES_ROOT as a valid root resource type.

-- Redefine validate_resource_insert to include UNDERWRITING_TEMPLATES_ROOT
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    if NEW.parent_id IS NULL THEN
        -- Allow UNDERWRITING_TEMPLATES_ROOT to be a root (null parent)
        IF NEW.resource_type NOT IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'OM', 'UNDERWRITING_DOCS_ROOT', 'UNDERWRITING_TEMPLATES_ROOT') THEN
            RAISE EXCEPTION 'Only root resource types (BORROWER_RESUME, BORROWER_DOCS_ROOT, PROJECT_RESUME, PROJECT_DOCS_ROOT, OM, UNDERWRITING_DOCS_ROOT, UNDERWRITING_TEMPLATES_ROOT) can have null parent_id';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;


-- Drop old constraint
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;

-- Add new constraint with UNDERWRITING_TEMPLATES_ROOT
ALTER TABLE public.resources ADD CONSTRAINT resources_resource_type_check CHECK (
    resource_type IN (
        'FILE', 
        'FOLDER', 
        'BORROWER_RESUME', 
        'BORROWER_DOCS_ROOT', 
        'PROJECT_RESUME', 
        'PROJECT_DOCS_ROOT', 
        'OM', 
        'UNDERWRITING_DOCS_ROOT',
        'UNDERWRITING_TEMPLATES_ROOT'
    )
);

COMMENT ON FUNCTION public.validate_resource_insert() IS 'Validates resource insertions, allowing UNDERWRITING_TEMPLATES_ROOT as a root resource type';
