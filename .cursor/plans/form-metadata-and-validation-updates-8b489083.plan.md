<!-- 8b489083-fae1-417e-a238-14e1761d4c31 4ae36c3e-53da-4dca-bb88-b7c13e7208f4 -->
# Form Metadata and Validation Updates

## Overview

This plan addresses three main issues:

1. Preserve original source in `other_values` when users edit fields
2. Re-validate all dependent fields when any field changes (general solution)
3. Remove "Direct vs Derived" badge from FieldHelpTooltip
4. Ensure all form fields have metadata definitions

## Implementation Steps

### 1. Update `handleInputChange` to Preserve Original Source

**File: `Frontend/src/components/forms/EnhancedProjectForm.tsx`**

- Modify `handleInputChange` (lines 1236-1265) to:
- Check if original source exists and is not `user_input`
- Preserve original value and source in `other_values` array before updating
- Only add to `other_values` if the combination doesn't already exist
- Set new source to `user_input` after preserving original

**File: `Frontend/src/components/forms/BorrowerResumeForm.tsx`**

- Apply the same changes to `handleInputChange` (lines 460-513)
- Ensure the sanity check still runs after metadata update

### 2. Implement Cross-Field Validation System

**File: `Frontend/src/components/forms/EnhancedProjectForm.tsx`**

- Add `fieldDependencies` useMemo after `handleBlur` function (around line 1314):
- Create comprehensive dependency map based on sanity check config
- Include all fields that reference other fields in their logic_checks
- Map both directions where applicable (e.g., buildingType ↔ numberOfStories)
- Add useEffect hook to watch formData changes:
- Debounce validation calls (500ms)
- For each changed field, find dependent fields from the map
- Re-validate dependent fields that have values
- Use `handleBlur` to trigger sanity checks

**File: `Frontend/src/components/forms/BorrowerResumeForm.tsx`**

- Add similar `fieldDependencies` map for borrower-specific dependencies:
- primaryEntityStructure ↔ primaryEntityName
- netWorthRange ↔ liquidityRange
- principals ↔ ownershipPercentage
- Add useEffect with same debounced re-validation logic
- Use inline sanity check call (since BorrowerResumeForm doesn't have separate handleBlur)

### 3. Remove "Direct vs Derived" Badge

**File: `Frontend/src/components/ui/FieldHelpTooltip.tsx`**

- Remove lines 271-294 (the Field Type Badge section)
- Keep the description section (lines 296-301)
- Ensure divider logic still works correctly when source section is shown
- Remove from metadata as well

### 4. Audit and Add Missing Field Metadata

**Files to check:**

- `Frontend/src/lib/project-resume-field-metadata.ts`
- `Frontend/src/lib/borrower-resume-field-metadata.ts`
- `Frontend/src/lib/enhanced-project-form.schema.json`
- `Frontend/src/lib/borrower-resume-form.schema.json`

**Steps:**

1. Extract all field IDs from both schema JSON files (from `fields` arrays in steps and subsections)
2. Compare against existing metadata in both metadata files
3. Identify missing fields
4. For each missing field:

- Add metadata entry with at minimum:
- `fieldId`: field name
- `description`: meaningful description
- `expectedValue`: example or format
- `dataType`: from schema or inferred
- `section`: appropriate section name
- Use similar fields as reference for structure
- Do NOT include `primarySource` or `fieldType` (these are removed in step 3, source comes from Supabase)

**Special cases:**

- Table fields (residentialUnitMix, commercialSpaceMix, drawSchedule, rentComps, principals) may need special handling or can use generic descriptions

## Testing Considerations

1. Test that original source is preserved when editing a field that had AI-extracted data
2. Test that warnings update when dependent fields change (e.g., numberOfStories warning clears when buildingType changes to High-rise)
3. Verify tooltip no longer shows "Direct/Derived" badge
4. Confirm all fields in forms have tooltips (no console errors for missing metadata)

## Dependencies

- Backend sanity check config (`Backend/services/sanity_check_config.py`) - used to build dependency map
- Realtime sanity check API (`Frontend/src/lib/api/realtimeSanityCheck.ts`) - used for validation

### To-dos

- [x] Update EnhancedProjectForm handleInputChange to preserve original source in other_values
- [x] Update BorrowerResumeForm handleInputChange to preserve original source in other_values
- [x] Add fieldDependencies map and cross-field validation useEffect to EnhancedProjectForm
- [x] Add fieldDependencies map and cross-field validation useEffect to BorrowerResumeForm
- [x] Remove 'Direct vs Derived' badge section from FieldHelpTooltip.tsx
- [x] Extract all field IDs from enhanced-project-form.schema.json and borrower-resume-form.schema.json
- [x] Compare extracted field IDs against project-resume-field-metadata.ts and identify missing fields
- [x] Compare extracted field IDs against borrower-resume-field-metadata.ts and identify missing fields
- [x] Add missing metadata entries to project-resume-field-metadata.ts for all identified fields
- [x] Add missing metadata entries to borrower-resume-field-metadata.ts for all identified fields