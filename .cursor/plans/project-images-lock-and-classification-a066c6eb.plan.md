<!-- a066c6eb-9db4-4bb8-9b20-d2c443a7af48 a95ca88a-6e70-4e15-9c79-3318b936c512 -->
# Project Images Lock and Classification Implementation Plan

## Problem Statement

Currently, project images in the site section have two issues:

1. **Not classified as null user input after autofill** - Images aren't in the schema's field list, so the orchestrator's null user_input creation logic (lines 1198-1289 in `orchestrator.py`) doesn't process them
2. **Don't respect locks** - Images are processed separately during document OCR (lines 1649-1756) and bypass the field-level lock checking mechanism

## Architecture Overview

Project images are currently:

- Stored in Supabase storage at `{projectId}/site-images/` and `{projectId}/architectural-diagrams/`
- Also extracted from documents to `{projectId}/project-docs/{resourceId}/artifacts/v{version}/images/{category}/`
- Not tracked in form data JSONB
- Not defined as fields in the schema (project-media subsection has empty `fields` array)

## Solution Design

### 1. Schema Changes

**File:** `Frontend/src/lib/enhanced-project-form.schema.json` and `Backend/schemas/json/enhanced-project-form.schema.json`

- Add field IDs to the project-media subsection:
  - `siteImages` - array field for site images metadata
  - `architecturalDiagrams` - array field for architectural diagrams metadata

**Structure:**

```json
{
  "id": "project-media",
  "title": "7.5 Project Media (Site Images & Plans)",
  "fields": ["siteImages", "architecturalDiagrams"]
}
```

### 2. Image Metadata Structure in JSONB

Store lightweight metadata in form data JSONB (images remain in storage):

```typescript
{
  "siteImages": {
    "value": [
      {
        "storagePath": "{projectId}/site-images/filename.jpg",
        "filename": "filename.jpg",
        "category": "site_images",
        "source": "main_folder" | "artifacts",
        "resourceId": "uuid" (if from artifacts),
        "version": "v1" (if from artifacts),
        "documentName": "Document Name" (if from artifacts)
      }
    ],
    "source": {"type": "user_input" | "document"},
    "warnings": []
  }
}
```

### 3. Backend Changes

#### 3.1 Orchestrator - Null User Input Classification

**File:** `Backend/services/orchestrator.py` (lines 1198-1289)

- The existing logic already loads all fields from schema, so `siteImages` and `architecturalDiagrams` will automatically be included
- Ensure empty image arrays get null user_input classification:
  - If `siteImages` or `architecturalDiagrams` don't exist in `final_data_flat`, create them with `value: []` and `source: {"type": "user_input"}`

#### 3.2 Orchestrator - Lock Checking for Images

**File:** `Backend/services/orchestrator.py` (lines 1135-1185 and 1649-1756)

**Changes needed:**

1. Before processing images during document OCR (line 1649), check if images are locked:

   - Check `locked_fields.get("siteImages", False)` and `locked_fields.get("architecturalDiagrams", False)`
   - If locked, skip image processing for that category
   - Log when skipping due to locks

2. When merging extracted images into `final_data_flat`:

   - Check lock status before overwriting existing image arrays
   - If locked, preserve existing images and merge warnings only
   - If unlocked, replace with new extracted images

**New function needed:**

```python
def should_process_images(category: str, locked_fields: dict) -> bool:
    """Check if images should be processed based on lock status"""
    field_id = "siteImages" if category == "site_images" else "architecturalDiagrams"
    return not locked_fields.get(field_id, False)
```

#### 3.3 Image Processing Integration

**File:** `Backend/services/orchestrator.py` (lines 1649-1756)

- After processing images, create/update image metadata in `final_data_flat`:
  - Build array of image metadata objects
  - Set source to `{"type": "document"}` for extracted images
  - Merge with existing images if field is unlocked
  - Preserve existing images if field is locked

#### 3.4 Field Section Mapping

**File:** `Backend/services/field_section_mapping.py`

- Add mapping for new image fields:
  - `siteImages` → `"site-context"` section
  - `architecturalDiagrams` → `"site-context"` section

### 4. Frontend Changes

#### 4.1 Form Data Structure

**File:** `Frontend/src/components/forms/EnhancedProjectForm.tsx`

- Update `ProjectMediaUpload` component to:
  - Sync image metadata to `formData.siteImages` and `formData.architecturalDiagrams`
  - Track source as `"user_input"` for manually uploaded images
  - Update metadata when images are added/deleted

**Changes:**

1. On image upload (line 440-503):

   - Update `formData.siteImages` or `formData.architecturalDiagrams` with new image metadata
   - Set source to `{"type": "user_input"}`

2. On image delete (line 505-594):

   - Remove image from corresponding array in `formData`
   - Trigger form save to persist changes

3. On load (line 389-438):

   - Load images from storage (existing logic)
   - Sync metadata to `formData` from loaded images
   - Preserve existing source metadata from formData when available

#### 4.2 Lock UI Integration

**File:** `Frontend/src/components/forms/EnhancedProjectForm.tsx`

- Add lock buttons for image fields:
  - Lock/unlock buttons for `siteImages` and `architecturalDiagrams` fields
  - Disable image upload/delete when locked
  - Show lock status visually (green border/indicator)

**Implementation:**

- Use existing `isFieldLocked`, `toggleFieldLock` functions
- Add lock button in ProjectMediaUpload component header
- Disable upload/delete actions when locked

#### 4.3 Field Metadata Display

**File:** `Frontend/src/components/forms/EnhancedProjectForm.tsx`

- Ensure image fields show proper source classification:
  - Blue for user_input (manually uploaded)
  - Green for document (autofilled)
  - White for null/empty

- Use existing `isFieldAutofilled` function to determine color

#### 4.4 Field Metadata Initialization

**File:** `Frontend/src/lib/project-resume-field-metadata.ts`

- Add metadata definitions for new fields:
  ```typescript
  siteImages: {
    label: "Site Images",
    tooltip: "Photos of the building, exterior, interior, street view, aerial photos",
    // ... other metadata
  },
  architecturalDiagrams: {
    label: "Architectural Diagrams", 
    tooltip: "Floor plans, site plans, blueprints, maps, zoning maps, elevations",
    // ... other metadata
  }
  ```


### 5. Edge Cases and Considerations

#### 5.1 Image Sources

- **User uploads**: Source = `"user_input"`, stored in main folders
- **Document extraction**: Source = `"document"`, stored in artifacts folders
- **Mixed sources**: Array can contain both types

#### 5.2 Lock Behavior

- Locking applies to entire array (all images in category)
- When locked, prevent:
  - New image uploads
  - Image deletions
  - Autofill overwrites
- When unlocked, allow all operations

#### 5.3 Autofill Behavior

- If images are locked, skip image extraction/processing for that category
- If unlocked, extract and replace existing images
- Always preserve user-uploaded images unless explicitly deleted

#### 5.4 Performance

- Metadata is lightweight (paths, not image data)
- Images remain in storage, only metadata in JSONB
- No impact on existing image loading/display

#### 5.5 Completeness Calculation

- Image fields should contribute to completeness percentage
- Consider images "provided" if array length > 0
- Update `compute_completion_from_flat_content` to handle array fields

### 6. Testing Considerations

1. **Lock functionality:**

   - Lock images, run autofill, verify images aren't overwritten
   - Unlock images, run autofill, verify images are updated
   - Lock images, try to upload/delete, verify actions are blocked

2. **Classification:**

   - Run autofill with no images, verify null user_input entries created
   - Upload images manually, verify user_input classification
   - Extract images from documents, verify document classification

3. **Edge cases:**

   - Projects with no images
   - Projects with only user-uploaded images
   - Projects with only extracted images
   - Projects with mixed sources

## Implementation Order

1. **Schema updates** - Add field IDs to project-media subsection
2. **Backend lock checking** - Add lock checks to image processing pipeline
3. **Backend null classification** - Ensure empty image arrays get null user_input
4. **Frontend metadata sync** - Sync image metadata to formData
5. **Frontend lock UI** - Add lock buttons and disable actions when locked
6. **Testing** - Verify all scenarios work correctly

## Files to Modify

**Backend:**

- `Backend/services/orchestrator.py` - Lock checking, null classification, image metadata creation
- `Backend/services/field_section_mapping.py` - Add field mappings
- `Backend/schemas/json/enhanced-project-form.schema.json` - Add field IDs

**Frontend:**

- `Frontend/src/components/forms/EnhancedProjectForm.tsx` - Metadata sync, lock UI
- `Frontend/src/lib/enhanced-project-form.schema.json` - Add field IDs
- `Frontend/src/lib/project-resume-field-metadata.ts` - Add field metadata definitions

## Risks and Mitigations

1. **Risk:** Performance impact from metadata sync

   - **Mitigation:** Metadata is lightweight, sync only on load/save

2. **Risk:** Lock conflicts between user uploads and autofill

   - **Mitigation:** Clear lock behavior - locked = no changes, unlocked = allow all

3. **Risk:** Schema changes breaking frontend

   - **Mitigation:** Update both frontend and backend schemas together, test thoroughly

### To-dos

- [ ] Add siteImages and architecturalDiagrams field IDs to project-media subsection in both frontend and backend schema files
- [ ] Add lock checking to image processing pipeline in orchestrator.py - skip processing if images are locked
- [ ] Ensure empty image arrays get null user_input classification in orchestrator.py (lines 1198-1289)
- [ ] Create/update image metadata in final_data_flat after image processing, respecting locks
- [ ] Add siteImages and architecturalDiagrams to field_section_mapping.py
- [ ] Sync image metadata to formData in ProjectMediaUpload component - update on upload/delete/load
- [ ] Add lock buttons for image fields and disable upload/delete when locked
- [ ] Add metadata definitions for siteImages and architecturalDiagrams in project-resume-field-metadata.ts
- [ ] Update completeness calculation to handle image array fields (consider provided if length > 0)