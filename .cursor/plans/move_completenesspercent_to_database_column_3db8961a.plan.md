---
name: Move completenessPercent to database column
overview: Move completenessPercent out of the content JSONB column into a dedicated completeness_percent INTEGER column in both project_resumes and borrower_resumes tables. This simplifies the schema and avoids issues with rich format handling.
todos:
  - id: "1"
    content: Create database migration to add completeness_percent column and migrate existing data
    status: completed
  - id: "2"
    content: Update backend orchestrator to save completeness_percent to column instead of content
    status: completed
    dependencies:
      - "1"
  - id: "3"
    content: Update saveProjectResume to write completeness_percent to column
    status: completed
    dependencies:
      - "1"
  - id: "4"
    content: Update saveProjectBorrowerResume to write completeness_percent to column
    status: completed
    dependencies:
      - "1"
  - id: "5"
    content: Update getProjectProfile to read completeness_percent from column
    status: completed
    dependencies:
      - "1"
  - id: "6"
    content: Update getProjectsWithResumes to read completeness_percent from column
    status: completed
    dependencies:
      - "1"
  - id: "7"
    content: Update useProjectBorrowerResumeRealtime to read completeness_percent from column
    status: completed
    dependencies:
      - "1"
  - id: "8"
    content: Update seed scripts to use completeness_percent column
    status: completed
    dependencies:
      - "1"
  - id: "9"
    content: Verify all components display completeness correctly
    status: completed
    dependencies:
      - "2"
      - "3"
      - "4"
      - "5"
      - "6"
      - "7"
---

# Move completenessPercent to Database Column

## Overview

Extract `completenessPercent` from the `content` JSONB column and store it in a dedicated `completeness_percent INTEGER` column in both `project_resumes` and `borrower_resumes` tables. This eliminates schema complexity and rich format handling issues.

## Database Changes

### 1. Create Migration: Add completeness_percent Column

**File**: `Frontend/supabase/migrations/[timestamp]_add_completeness_percent_column.sql`

- Add `completeness_percent INTEGER NOT NULL DEFAULT 0` to `project_resumes` table
- Add `completeness_percent INTEGER NOT NULL DEFAULT 0` to `borrower_resumes` table
- Extract existing `completenessPercent` values from `content` JSONB and populate the new column:
  - Handle both number format: `content->>'completenessPercent'`
  - Handle rich format: `content->'completenessPercent'->>'value'`
  - Default to 0 if not found
- Remove `completenessPercent` from all `content` JSONB objects using `content - 'completenessPercent'`

## Backend Changes

### 2. Update Orchestrator to Save to Column

**File**: `Backend/services/orchestrator.py`

**Around line 1346-1394:**

- Remove logic that adds `completenessPercent` to `final_data_flat` (lines 1350-1353)
- Remove logic that preserves/re-attaches `completenessPercent` after grouping (lines 1360-1394)
- Store `completeness_percent` as a separate variable (calculated value, not in content)
- Update the insert payload (around line 1493-1501) to include `completeness_percent` field in addition to `content`

**Changes needed:**

```python
# After line 1348, store the calculated value separately
completeness_percent = compute_completion_from_flat_content(final_data_flat, locked_fields, resume_label)

# Remove lines 1350-1353 (don't add to final_data_flat)
# Remove lines 1360-1394 (don't preserve/re-attach after grouping)

# Around line 1493, add completeness_percent to resume_payload
resume_payload = {
    'project_id': project_id,
    'content': final_data,  # No completenessPercent in content
    'completeness_percent': completeness_percent  # Add this
}
```

## Frontend Changes

### 3. Update Save Functions

**File**: `Frontend/src/lib/project-queries.ts`

**`saveProjectResume` function (around lines 1000-1080):**

- Remove `contentToSave.completenessPercent = completionPercent` (line 1033)
- Update `.update()` call to include `completeness_percent: completionPercent` in addition to `content`
- For new inserts (around line 1080), add `completeness_percent: completionPercent` to insert payload

**`saveProjectBorrowerResume` function (around lines 1381-1492):**

- Remove all logic that adds `completenessPercent` to `contentToSave` (lines 1401-1416)
- Remove all logic that adds `completenessPercent` to `contentToInsert` (around lines 1422-1433)
- Update `.update()` call (line 1428-1431) to include `completeness_percent` field
- Update `.insert()` call (around line 1489-1492) to include `completeness_percent` field

### 4. Update Read Functions

**File**: `Frontend/src/lib/project-queries.ts`

**`getProjectProfile` function (around lines 500-620):**

- Update query to select `completeness_percent` column: `.select("content, completeness_percent")`
- Read `completeness_percent` from row data instead of `content.completenessPercent`
- Use stored value or recompute if missing (lines 609-619)

**`getProjectsWithResumes` function (around lines 622-787):**

- Update queries to select `completeness_percent` column for both project and borrower resumes
- Read from column instead of content JSONB
- Update logic around lines 762-784 to use column value

### 5. Update Realtime Hook

**File**: `Frontend/src/hooks/useProjectBorrowerResumeRealtime.ts`

**`getProjectBorrowerResumeContent` function (around lines 119-288):**

- Update query (line 124) to select `completeness_percent` column: `.select("id, content, completeness_percent, created_at")`
- Remove logic that extracts/restores `completenessPercent` from content (lines 154, 256-264)
- Add `completeness_percent` to the returned content object (around line 287)

**Update hook return type and state:**

- Ensure `completeness_percent` is included in the returned `BorrowerResumeContent` type

### 6. Update Type Definitions

**File**: `Frontend/src/types/enhanced-types.ts` or relevant type files

- Add `completeness_percent?: number` to `ProjectResumeContent` and `BorrowerResumeContent` types if needed
- Ensure types reflect that completenessPercent is no longer in content JSONB

### 7. Update Components (if needed)

**Files**: Various component files that read completenessPercent

- Most components should continue working if they read from the top-level object
- Verify components like:
  - `Frontend/src/components/project/ProjectCompletionCard.tsx`
  - `Frontend/src/components/dashboard/ProjectCard.tsx`
  - `Frontend/src/stores/useProjectStore.ts`

### 8. Update Supabase Functions

**File**: `Frontend/supabase/functions/update-project/index.ts`

- If this function reads/writes resumes, update to handle `completeness_percent` column
- Check for any other edge functions that interact with resume tables

### 9. Update Seed Scripts

**Files**:

- `Frontend/scripts/seed-demo-data.ts`
- `Frontend/scripts/seed-hoque-project.ts`
- `Frontend/scripts/seed-hoque-project.sql`

- Update to set `completeness_percent` column instead of adding to content JSONB

## Testing Checklist

- [ ] Migration runs successfully and extracts existing values
- [ ] Backend autofill saves completeness_percent to column
- [ ] Frontend manual saves update completeness_percent column
- [ ] Frontend reads completeness_percent from column correctly
- [ ] Realtime updates include completeness_percent
- [ ] Project completion cards display correct percentages
- [ ] Version history shows correct completeness values
- [ ] No completenessPercent remains in content JSONB after migration

## Rollback Plan

If issues arise, create a rollback migration that:

1. Extracts `completeness_percent` from column back into content JSONB
2. Drops the `completeness_percent` column