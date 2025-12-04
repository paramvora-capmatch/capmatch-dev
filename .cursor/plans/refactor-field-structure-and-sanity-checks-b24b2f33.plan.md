<!-- b24b2f33-c731-4c2e-8790-6cebf68299eb ae313681-fa9b-4e06-ad43-b01b321324c8 -->
# Refactor Field Structure - Backend and Frontend

## Overview

Restructure field metadata to use flat format (separate `value` and `source` fields instead of `sources` array), remove `original_value`, ensure only one value per source type, and make backward sanity checks run realtime on user edits. Update frontend to handle new structure and display field states (red/blue/green/white) correctly.

## Backend Changes

### 1. Update Field Structure Format

**Current:** `{value: X, sources: [...], warnings: [...], original_value: Y, other_values: [...]}`
**New:** `{value: X, source: {...}, warnings: [...], other_values: [{value: Y, source: {...}}]}`

**Files to update:**

- `Backend/services/source_metadata.py`:
- Update `format_field_with_source()` to return flat structure with single `source` instead of `sources` array
- Remove `original_value` parameter and logic
- Update `add_other_value()` to replace existing value if same source type exists (ensure one value per source type)
- Remove `get_highest_priority_source()` or simplify since we now have single source

- `Backend/services/sanity_service.py`:
- Update to use single `source` instead of `sources` array
- Remove all `original_value` references
- Ensure only one document value and one KB value are stored in `other_values`
- Update `_check_source_divergence()` to work with single source

- `Backend/services/backward_sanity_service.py`:
- Update to read from `source` instead of `sources`
- Remove `original_value` references
- Create new function `perform_realtime_backward_check()` that:
- Takes user input value and existing field data
- Compares user input against all sources in `other_values`
- Returns warnings for divergences using field-specific rules

- `Backend/services/user_edit_handler.py`:
- Update to use single `source` instead of `sources`
- Remove `original_value` references
- Remove logic that stores previous user_input in other_values (just overwrite)

- `Backend/services/orchestrator.py`:
- Update all field access to use `source` instead of `sources[0]`
- Remove `original_value` preservation logic
- Update to check `source.type` directly instead of `sources[0].type`
- When merging extractions, ensure only one value per source type

- `Backend/services/calculation_service.py`:
- Check and remove `original_value` if present
- Update to use single `source`

### 2. Remove original_value

Remove `original_value` from all field structures and all code that references it.

### 3. One Value Per Source Type

Ensure `other_values` only contains one entry per source type (document, external, user_input). When multiple documents provide values, AI should choose the best one during extraction.

### 4. Remove Previous User Input Storage

When user edits a field, don't store previous user input in `other_values` - just overwrite the current value.

### 5. Backward Sanity Check as Realtime Check

Move backward sanity check to run when user edits a field, comparing user input against all sources in `other_values`.

**Files to update:**

- `Backend/services/backward_sanity_service.py`:
- Create `perform_realtime_backward_check()` function
- Compare user input against all sources in `other_values`
- Use field-specific sanity check rules from config

- `Backend/api/v1/endpoints/project_resume.py`:
- Update `/realtime-sanity-check` endpoint to:
- Call logic checks (existing)
- Call `perform_realtime_backward_check()` for source divergence
- Return combined warnings

- `Backend/api/v1/endpoints/borrower_resume.py`:
- Same updates as project_resume endpoint

- `Backend/services/orchestrator.py`:
- Remove backward sanity check from View OM flow (Step 3.5)

## Frontend Changes

### 1. Update Field Metadata Structure Reading

**Files to update:**

- `Frontend/src/components/forms/EnhancedProjectForm.tsx`:
- Update `handleInputChange()`:
- Use `source` (single object) instead of `sources` array
- Remove `original_value` from metadata updates
- Call realtime sanity check endpoint after updating value
- Update all `meta.sources` checks to `meta.source`:
- `isFieldAutofilled()`: Check `meta.source?.type` instead of `meta.sources[].type`
- `getFieldStylingClasses()`: Check `meta.source` instead of `meta.sources`
- `isFieldBlue()`, `isFieldWhite()`, `isFieldGreen()`: Check `meta.source` instead of `meta.sources`
- Add `isFieldRed()` function:
- Returns `true` if `meta.warnings?.length > 0 && !locked`
- Update `getFieldStylingClasses()` to apply red styling when `isFieldRed()` is true
- Update `sanitizeProjectProfile()` to handle new structure and remove `original_value`

- `Frontend/src/components/forms/BorrowerResumeForm.tsx`:
- Same updates as EnhancedProjectForm.tsx
- Update `sanitizeBorrowerProfile()` to remove `original_value` handling

### 2. Update FieldHelpTooltip Component

**File:** `Frontend/src/components/ui/FieldHelpTooltip.tsx`

- Update interface: `sources?: SourceMetadata[]` → `source?: SourceMetadata`
- Update to read from `fieldMetadata.source` (single object) instead of `fieldMetadata.sources` (array)
- Display only the current source in tooltip (not other_values sources)
- Remove `original_value` from interface and display logic

### 3. Add Realtime Backward Sanity Check on User Edit

**Files to update:**

- `Frontend/src/lib/api/realtimeSanityCheck.ts` (new file):
- Create function `checkRealtimeSanity()`:
- Takes: `fieldId`, `value`, `resumeType`, `context`
- Calls appropriate endpoint (`/api/v1/project-resume/realtime-sanity-check` or `/api/v1/borrower-resume/realtime-sanity-check`)
- Returns warnings array

- `Frontend/src/components/forms/EnhancedProjectForm.tsx`:
- In `handleInputChange()`, after updating metadata:
- Call `checkRealtimeSanity()` with current field value and form context
- Update field metadata with returned warnings
- If warnings exist and field not locked, field turns red

- `Frontend/src/components/forms/BorrowerResumeForm.tsx`:
- Same updates as EnhancedProjectForm.tsx

### 4. Update Field State Logic

**Files to update:**

- `Frontend/src/components/forms/EnhancedProjectForm.tsx`:
- Update `getFieldStylingClasses()`:
- Red: `warnings.length > 0 && !locked` → `border-red-500 bg-red-50`
- Blue: `source.type === "user_input" && warnings.length === 0 && !locked` → `border-blue-600 bg-blue-50`
- Green: `locked` → `border-emerald-500 bg-emerald-50` (regardless of warnings)
- White: `!hasValue && !source` → `border-gray-200 bg-white`
- Update `isFieldBlue()`: Check `meta.source?.type === "user_input" && !meta.warnings?.length && !locked`
- Update `isFieldGreen()`: Check `locked`
- Update `isFieldWhite()`: Check `!hasValue && !meta.source`

- `Frontend/src/components/forms/BorrowerResumeForm.tsx`:
- Same field state logic updates

### 5. Update Section Color Logic

**Files to update:**

- `Frontend/src/components/forms/EnhancedProjectForm.tsx`:
- Update section color logic: if any field in section has `isFieldRed() === true`, section turns red
- Check `isFieldRed()` for each field in section when determining section state

- `Frontend/src/components/forms/BorrowerResumeForm.tsx`:
- Same section color logic

### 6. Update Data Loading and Sanitization

**Files to update:**

- `Frontend/src/components/forms/EnhancedProjectForm.tsx`:
- Update `sanitizeProjectProfile()`:
- Handle new structure (value + source)
- Remove `original_value` sanitization
- Add backward compatibility: if old format has `sources` array, convert to `source` (take first/highest priority)
- Ensure `other_values` structure is correct

- `Frontend/src/components/forms/BorrowerResumeForm.tsx`:
- Same sanitization updates in `sanitizeBorrowerProfile()`

### 7. Update Type Definitions

**Files to update:**

- `Frontend/src/types/source-metadata.ts` (if exists):
- Update field metadata type to use `source?: SourceMetadata` instead of `sources?: SourceMetadata[]`
- Remove `original_value` from type definitions

## Implementation Order

### Phase 1: Backend Structure Changes

1. Update `source_metadata.py` to use flat structure (value + source)
2. Remove `original_value` from all backend files
3. Update `sanity_service.py` to use single source
4. Update `add_other_value()` to ensure one value per source type
5. Update `user_edit_handler.py` to not store previous user input
6. Update `orchestrator.py` to use new structure

### Phase 2: Backend Sanity Check Changes

7. Create `perform_realtime_backward_check()` in `backward_sanity_service.py`
8. Update realtime sanity check endpoints to call backward check
9. Remove backward sanity check from orchestrator View OM flow
10. Update `backward_sanity_service.py` to use new structure

### Phase 3: Frontend Structure Updates

11. Update field metadata structure reading in both form components
12. Update FieldHelpTooltip to show single source
13. Update data sanitization functions with backward compatibility
14. Update type definitions

### Phase 4: Frontend Field State Logic

15. Add `isFieldRed()` function to both form components
16. Update field state logic (red/blue/green/white) in both components
17. Update section color logic
18. Update field styling classes

### Phase 5: Frontend Realtime Checks

19. Create API client for realtime sanity checks
20. Add realtime backward sanity check calls in `handleInputChange`
21. Test end-to-end flow

## Testing Considerations

- Verify field structure is consistent across backend and frontend
- Test that only one value per source type exists in other_values
- Test that user edits trigger realtime backward sanity checks
- Verify warnings are shown correctly when divergence detected
- Test that locked fields preserve user values correctly
- Test field color states (red/blue/green/white) display correctly
- Test section colors update when fields change state
- Verify tooltip shows only current source
- Test backward compatibility with old data format (sources array → source conversion)
- Test realtime sanity check API endpoints return correct warnings