<!-- 7979b344-761a-415a-9bbf-6f62ffdf51da c35dee9c-ae7d-4a67-a9ef-957ee465ba25 -->
# Section and Subsection Naming Refactor

## Overview

Replace all generic section names (e.g., "section_1", "section_2") with actual section names (e.g., "basic-info", "property-specs") and nest subsections within their parent sections. The structure will be:

```json
{
  "basic-info": {
    "project-identity": {
      "projectName": {...},
      "propertyAddressStreet": {...}
    },
    "classification": {
      "assetType": {...},
      "projectPhase": {...}
    }
  },
  "property-specs": {
    "physical-structure": {...},
    "amenities-unit-details": {...}
  }
}
```

For sections without subsections, fields go directly in the section:

```json
{
  "section-id": {
    "field1": {...},
    "field2": {...}
  }
}
```

## Implementation Steps

### 1. Backend Section Grouping Service

**File**: `Backend/services/section_grouping.py`

- Remove `SECTION_ID_TO_NUMBER` mapping (lines 101-112)
- Update `get_subsection_field_groups()` to return subsection structure from schema
- Rewrite `group_by_sections()` to:
  - Use actual section IDs (e.g., "basic-info") instead of "section_1"
  - Nest subsections within sections using subsection IDs from schema
  - For sections without subsections, place fields directly in the section
- Update `ungroup_from_sections()` to handle nested subsection structure
- Update `merge_section_grouped_data()` to work with nested structure
- Remove comments referencing "section_1", "section_2" (lines 88-95)

### 2. Backend Orchestrator

**File**: `Backend/services/orchestrator.py`

- Update all references to section grouping to use new nested structure
- Ensure extraction pipeline uses subsection IDs from schema
- Update logging messages to use actual section/subsection names instead of numbers
- Verify mock mode handles nested structure correctly

### 3. Frontend Section Grouping Utility

**File**: `Frontend/src/lib/section-grouping.ts`

- Remove `SECTION_ID_TO_NUMBER` mapping (lines 9-20)
- Update `groupBySections()` to:
  - Use actual section IDs from schema
  - Load subsection structure from schema files
  - Nest subsections within sections
  - Handle sections without subsections
- Update `ungroupFromSections()` to handle nested subsection structure
- Update `isGroupedFormat()` to check for actual section names instead of "section_" prefix

### 4. Frontend Supabase Function

**File**: `Frontend/supabase/functions/update-project/index.ts`

- Remove `SECTION_ID_TO_NUMBER` mapping (lines 63-67)
- Update `groupBySections()` function (lines 69-86) to use actual section IDs and nest subsections
- Update `ungroupFromSections()` function (lines 88+) to handle nested structure
- Ensure all data transformations use new structure

### 5. Frontend Project Queries

**File**: `Frontend/src/lib/project-queries.ts`

- Remove or update any hardcoded section number mappings (lines 353-366 for borrower fields)
- Ensure queries work with new section/subsection structure
- Update any field-to-section mappings to use actual section IDs

### 6. Frontend Version History Component

**File**: `Frontend/src/components/project/ResumeVersionHistory.tsx`

- Remove `SECTION_ID_TO_NUMBER` mapping (lines 570-583)
- Update section key generation to use actual section IDs
- Update display logic to show section and subsection names

### 7. Frontend Borrower Resume View

**File**: `Frontend/src/components/forms/BorrowerResumeView.tsx`

- Update any references to section numbers (line 105 comment mentions section_1 format)
- Ensure data access works with new nested structure

### 8. Schema Consistency Check

**Files**:

- `Frontend/src/lib/enhanced-project-form.schema.json`
- `Frontend/src/lib/borrower-resume-form.schema.json`

- Verify schema files have consistent section and subsection IDs
- Ensure all sections either have subsections defined or are marked as having no subsections
- Document which sections have subsections vs. which don't

### 9. Backend Field Section Mapping

**File**: `Backend/services/field_section_mapping.py`

- Verify `FIELD_TO_SECTION` mapping uses actual section IDs (already correct)
- Ensure all fields map to correct sections
- Add any missing field mappings

### 10. Testing and Validation

- Test data grouping with sections that have subsections
- Test data grouping with sections that have no subsections
- Test ungrouping from nested structure
- Test merging of section-grouped data
- Verify extraction pipeline works with new structure
- Test frontend form rendering with new structure
- Verify database storage/retrieval works correctly

## Key Changes Summary

1. **Remove all `SECTION_ID_TO_NUMBER` mappings** - Use actual section IDs everywhere
2. **Implement nested subsection structure** - Subsections nested within parent sections
3. **Handle sections without subsections** - Fields go directly in section object
4. **Update all grouping/ungrouping functions** - Work with new structure
5. **Update all references** - Replace "section_1" style references with actual names
6. **Maintain schema as source of truth** - Load section/subsection structure from schema files

## Data Structure Examples

**Section with subsections (database format):**

```json
{
  "basic-info": {
    "project-identity": {
      "projectName": {
        "value": null,
        "source": {
          "type": "user_input"
        },
        "warnings": [],
        "other_values": []
      },
      "propertyAddressStreet": {
        "value": "123 Main St",
        "source": {
          "type": "extraction",
          "document": "project_plan.pdf"
        },
        "warnings": [],
        "other_values": []
      }
    },
    "classification": {
      "assetType": {
        "value": "Multifamily",
        "source": {
          "type": "user_input"
        },
        "warnings": [],
        "other_values": []
      }
    }
  }
}
```

**Section without subsections (database format):**

```json
{
  "online-presence": {
    "linkedinUrl": {
      "value": "https://linkedin.com/...",
      "source": {
        "type": "user_input"
      },
      "warnings": [],
      "other_values": []
    },
    "websiteUrl": {
      "value": "https://example.com",
      "source": {
        "type": "user_input"
      },
      "warnings": [],
      "other_values": []
    }
  }
}
```

## Database Storage Format

The database structure follows: **Section → Subsection → Field → Metadata Schema**

Each field in the database must contain the full metadata object with:

- `value`: The actual field value (can be null, string, number, boolean, array, object)
- `source`: Object with `type` (e.g., "user_input", "extraction", "ai_autofill") and optional `document` property
- `warnings`: Array of warning strings (empty array if no warnings)
- `other_values`: Array of alternative values found (empty array if none)

This structure ensures that all field metadata (source tracking, warnings, alternatives) is preserved at the database level within the section/subsection hierarchy.