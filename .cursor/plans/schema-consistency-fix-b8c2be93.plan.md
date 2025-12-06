<!-- b8c2be93-97d9-4598-a74d-010ed212b29a 2b2aedfd-842e-4c39-9c4c-204c18cdfabf -->
# Schema Consistency Fix Plan

## Problem Statement

The project resume schema (sections, subsections, fields) is defined in multiple places with hardcoded mappings that can drift out of sync:

1. **Multiple hardcoded field-to-section mappings**:

- `Backend/services/field_section_mapping.py` (Python dict)
- `Frontend/src/lib/section-grouping.ts` (TypeScript object)
- `Frontend/src/lib/project-resume-field-metadata.ts` (TypeScript metadata)

2. **Schema loading inconsistencies**:

- Backend loads `enhanced-project-form.schema.json` dynamically but has fallbacks
- Frontend imports the same schema but also maintains hardcoded mappings
- No validation that hardcoded mappings match the schema

3. **Format inconsistencies**:

- Legacy format (`section_1`, `section_2`) still supported
- Current format (`basic-info`, `property-specs`) with nested subsections
- Transformations happen in multiple places (orchestrator.py, section_grouping.py, section-grouping.ts)

4. **Type definitions don't match structure**:

- TypeScript `ProjectResumeContent` interface is flat, not nested
- Python has no equivalent type definitions

5. **Mock API** doesn't follow schema structure

## Solution Approach

### Phase 1: Establish Single Source of Truth

1. **Make `enhanced-project-form.schema.json` the authoritative source**

- All section/subsection/field mappings must be derived from this file
- Remove or generate all hardcoded mappings

2. **Create schema utilities** (one in each language):

- `Frontend/src/lib/schema-utils.ts` - TypeScript utilities to query schema
- `Backend/services/schema_utils.py` - Python utilities to query schema
- Both load from the same JSON file and provide consistent APIs

3. **Generate mappings programmatically**:

- Generate `FIELD_TO_SECTION` from schema
- Generate `SECTION_TO_SUBSECTIONS` from schema
- Generate `SUBSECTION_TO_FIELDS` from schema
- Update all code to use generated mappings instead of hardcoded ones

### Phase 2: Standardize Data Structure

1. **Define canonical format**:

- Storage format: Nested structure with sections → subsections → fields
- Rich format: `{value, source, warnings, other_values}` for each field
- Use new section IDs (`basic-info`, not `section_1`)

2. **Update TypeScript types**:

- Update `ProjectResumeContent` in `Frontend/src/lib/project-queries.ts` to match nested structure
- Create generated types from schema JSON

3. **Update Python types**:

- Create Pydantic models that match the nested structure
- Use for validation and serialization

### Phase 3: Consolidate Transformation Logic

1. **Single transformation module per language**:

- `Frontend/src/lib/section-grouping.ts` - Only place for grouping/ungrouping
- `Backend/services/section_grouping.py` - Only place for grouping/ungrouping
- Remove duplicate logic from orchestrator.py and other files

2. **Standardize conversion functions**:

- `flatToNested(data)` - Convert flat to section→subsection→field structure
- `nestedToFlat(data)` - Convert nested to flat structure
- `normalizeFormat(data)` - Convert old format to new format
- All use schema utilities, no hardcoded mappings

### Phase 4: Update All Consumers

1. **Backend updates**:

- `Backend/services/orchestrator.py` - Use schema utilities
- `Backend/services/field_constraints.py` - Use schema utilities
- `Backend/services/sanity_service.py` - Use schema utilities
- Remove all hardcoded section lists

2. **Frontend updates**:

- `Frontend/src/lib/project-queries.ts` - Use schema utilities
- `Frontend/src/components/forms/EnhancedProjectForm.tsx` - Use schema utilities
- `Frontend/src/components/project/ResumeVersionHistory.tsx` - Use schema utilities
- `Frontend/supabase/functions/update-project/index.ts` - Use schema utilities

4. **Mock API updates**:

- `Frontend/lib/mockApiService.ts` - Use schema structure if applicable
- Ensure mock data follows same format

### Phase 5: Validation & Testing

1. **Schema validation**:

- Add validation that all fields in metadata exist in schema
- Add validation that all sections in code exist in schema
- Add CI check to prevent schema drift

## Implementation Files

### Core Schema Files

- `Frontend/src/lib/enhanced-project-form.schema.json` - **Source of truth**
- `Frontend/src/lib/schema-utils.ts` - **NEW** - TypeScript schema utilities
- `Backend/services/schema_utils.py` - **NEW** - Python schema utilities

### Files to Update (Remove Hardcoded Mappings)

- `Backend/services/field_section_mapping.py` - Generate from schema or remove
- `Frontend/src/lib/section-grouping.ts` - Generate from schema, remove legacy handling
- `Frontend/src/lib/project-resume-field-metadata.ts` - Validate against schema
- `Backend/services/section_grouping.py` - Use schema utilities
- `Backend/services/orchestrator.py` - Use schema utilities
- `Frontend/src/lib/project-queries.ts` - Update types and use schema utilities
- `Frontend/supabase/functions/update-project/index.ts` - Use schema utilities

### Files to Create/Update for Types

- `Frontend/src/types/project-resume-schema.ts` - **NEW** - Generated types
- `Backend/schemas/project_resume.py` - **NEW/UPDATE** - Pydantic models

## Key Principles

1. **Single Source of Truth**: `enhanced-project-form.schema.json` is the only place schema is defined
2. **Generated, Not Hardcoded**: All mappings generated from schema
3. **Consistent Format**: Always use new format (`basic-info` with nested subsections)
4. **Type Safety**: TypeScript and Python types match schema structure