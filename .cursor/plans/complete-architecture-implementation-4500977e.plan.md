<!-- 4500977e-1ea3-4005-8b61-f145e30d755d cbed7516-9bfd-4738-8506-02f439e1966e -->
# Complete Architecture Implementation Plan

## Overview

This plan focuses on **project-related functionality only** (borrower features removed for now). The key simplification is that:

1. **Autofill Pipeline** (triggered by "Process Docs" or "View OM"):

   - Processes documents (OCR + extraction)
   - Fetches knowledge base data
   - Runs **forward sanity check** (merges doc/kb, checks divergence)
   - Respects **locked fields** (doesn't overwrite locked values)
   - Runs **backward sanity check** (compares current values vs doc/kb, adds warnings if different)
   - Calculates **derived metrics** (yieldOnCost, ltv, etc.)
   - Syncs to **production table** (creates snapshot)
   - Saves to **staging table** (project_resumes)

2. **View OM**: Simply triggers the autofill pipeline, then navigates to OM page after completion.

3. **OM Pages**: Read exclusively from `projects_prod` table (latest snapshot).

---

## Current State Assessment

### ✅ Completed

1. **Forward Sanity Checks** - Implemented in `Backend/services/sanity_service.py`

   - Merges doc_data and kb_data with waterfall logic
   - Checks divergence between sources
   - Runs LLM business logic validation
   - Returns rich format: `{field: {value, source, warnings}}`

2. **Frontend Display** - Forward sanity check results displayed

   - Metadata stored in rich format in `project_resumes.content`
   - Warnings shown in `ProjectResumeView.tsx`
   - Field metadata tracked in `EnhancedProjectForm.tsx`

3. **Staging Database** - Versioning enabled

   - `project_resumes` table supports multiple rows per project (migration `20251229000000`)
   - Resource pointer system (`resources.current_version_id`)

4. **Document Processing Pipeline** - Partially complete

   - OCR service (`Backend/services/ocr_service.py`)
   - Extraction service (`Backend/services/extraction_service.py`)
   - Artifact storage (markdown/images in versioned folders)
   - Orchestrator (`Backend/services/orchestrator.py`) processes documents

5. **Frontend Autofill** - Hook exists (`Frontend/src/hooks/useAutofill.ts`)

   - Calls `/api/v1/projects/analyze`
   - Polls for completion

### ❌ Missing/Incomplete

1. ~~**Locked Fields in Backend**~~ ✅ **COMPLETED** - Forward sanity check now respects locked fields
2. ~~**Backward Sanity Check**~~ ✅ **COMPLETED** - Implemented and integrated into autofill pipeline
3. ~~**View OM Workflow**~~ ✅ **COMPLETED** - Button now triggers autofill pipeline
4. **Production Tables** - `projects_prod` doesn't exist
5. **Derived Calculations** - No calculation engine for metrics
6. **Manual "Process Docs" Button** - No explicit UI trigger

---

## Implementation Steps

### Phase 1: Locked Fields Support in Backend ✅ COMPLETED

**1.1 Add Locked Fields to Staging Schema** ✅

- **File**: Created migration `Frontend/supabase/migrations/20250130000000_add_locked_fields_to_resumes.sql`
- Added `locked_fields JSONB` column to `project_resumes`
- Stores as `{"fieldId": true}` map
- Added GIN index for querying: `idx_project_resumes_locked_fields`

**1.2 Update Forward Sanity Check Logic** ✅

- **File**: `Backend/services/orchestrator.py` (function `analyze_project`)
- Updated to fetch `locked_fields` from latest resume
- For each field in sanity_result:
  - If field is locked in `locked_fields`, preserve existing value (skip overwrite)
  - If unlocked, apply sanity_result value
- Preserves locked_fields when creating new resume version

**1.3 Update Frontend to Persist Locks** ✅

- **File**: `Frontend/src/types/enhanced-types.ts` - Added `_lockedFields` to ProjectProfile
- **File**: `Frontend/src/lib/project-queries.ts` - Updated to fetch and return `locked_fields`
- **File**: `Frontend/src/components/forms/EnhancedProjectForm.tsx` - Initializes lockedFields from `_lockedFields`, persists on save
- **File**: `Frontend/src/stores/useProjectStore.ts` - Passes `locked_fields` to edge function
- **File**: `Frontend/supabase/functions/update-project/index.ts` - Saves `locked_fields` to database column

---

### Phase 2: Backward Sanity Check Implementation ✅ COMPLETED

**2.1 Create Backward Sanity Check Service** ✅

- **File**: Created `Backend/services/backward_sanity_service.py`
- Function: `async def perform_backward_sanity_check(project_id: str, doc_data: dict, kb_data: dict, current_resume_content: dict) -> dict`
- Logic:

  1. For each field in `current_resume_content`:

     - Get current value from resume (whether locked or unlocked)
     - Get doc/kb value using waterfall: doc_data[field] if exists, else kb_data[field]
     - If current value differs from doc/kb value: Add warning to field metadata
     - Warning format: `"Value differs from document/knowledge base"`

  1. Returns updated resume content with warnings added to existing metadata

- Note: This check is simple - it doesn't care if field is locked or unlocked, just compares current value vs doc/kb

**2.2 Integrate Backward Check into Autofill Pipeline** ✅

- **File**: `Backend/services/orchestrator.py` (function `analyze_project`)
- After forward sanity check and locked field handling:

  1. Calls `backward_sanity_service.perform_backward_sanity_check`
  2. Passes: `project_id`, `doc_data`, `kb_data`, and current `final_data`
  3. Merges backward check warnings into field metadata
  4. Saves updated resume with both forward and backward warnings

**2.3 Update View OM to Trigger Autofill** ✅

- **File**: `Frontend/src/components/project/ProjectWorkspace.tsx`
- Updated View OM button to:

  1. Import and use `useAutofill` hook
  2. Call `handleAutofill()` on button click
  3. Navigate to OM page after triggering autofill
  4. Show loading state while autofill is processing

- No separate API endpoint needed - View OM triggers the same autofill pipeline

---

### Phase 3: Derived Calculations Engine

**3.1 Create Calculation Service**

- **File**: `Backend/services/calculation_service.py` (new file)
- Function: `async def calculate_derived_metrics(project_data: dict) -> dict`
- Calculations (from architecture):
  - **Project Metrics**:
    - `yieldOnCost = noiYear1 / totalDevelopmentCost * 100` (if totalDevelopmentCost > 0)
    - `stabilizedValue = noiYear1 / capRate * 100` (if capRate > 0)
    - `ltv = loanAmountRequested / stabilizedValue * 100` (if stabilizedValue > 0)
    - `debtYield = noiYear1 / loanAmountRequested * 100` (if loanAmountRequested > 0)
    - `dscr = noiYear1 / debtService` (if debtService > 0)
- Return dict with calculated values (only derived fields, not overwriting direct fields)
- Handle division by zero gracefully (return None or 0)

**3.2 Integrate Calculations into Autofill Pipeline**

- **File**: `Backend/services/orchestrator.py` (function `analyze_project`)
- After backward sanity check:

  1. Call `calculation_service.calculate_derived_metrics(final_data)`
  2. Merge calculated metrics into `final_data`
  3. Mark calculated fields with source: `"derived"` in metadata
  4. Save to staging with derived metrics included

---

### Phase 4: Production Tables & Sync

**4.1 Create Production Tables**

- **File**: Create migration `Frontend/supabase/migrations/YYYYMMDDHHMMSS_create_production_tables.sql`
- Create `projects_prod` table:
  ```sql
  CREATE TABLE public.projects_prod (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_projects_prod_project_id ON public.projects_prod(project_id, created_at DESC);
  ```

- Add RLS policies (same as staging tables - copy from `project_resumes` policies)

**4.2 Create Production Sync Service**

- **File**: `Backend/services/production_sync_service.py` (new file)
- Function: `async def sync_to_production(project_id: str, project_data: dict) -> dict`
- Logic:

  1. Project data already includes derived metrics from Phase 3
  2. INSERT new row into `projects_prod` (snapshot)
  3. Return ID of created row

**4.3 Integrate Production Sync into Autofill Pipeline**

- **File**: `Backend/services/orchestrator.py` (function `analyze_project`)
- After calculations and before saving to staging:

  1. Call `production_sync_service.sync_to_production(project_id, final_data)`
  2. This creates a production snapshot with all data + derived metrics
  3. Then save to staging as before

- Note: Production sync happens on every autofill (including when triggered by View OM)

---

### Phase 5: Frontend Updates

**5.1 Add "Process Docs" Button**

- **File**: `Frontend/src/components/project/ProjectWorkspace.tsx`
- Add button in documents section: "Process Documents"
- On click: Call `handleAutofill` from `useAutofill` hook
- Show loading state while processing

**5.2 Update View OM Button**

- **File**: `Frontend/src/components/project/ProjectWorkspace.tsx` (line 567-574)
- Change onClick to trigger autofill pipeline
- Add function: `const handleViewOM = async () => { ... }`
- Call `handleAutofill` from `useAutofill` hook
- After autofill completes (polling detects completion), navigate to OM page
- Show loading state while autofill is processing

**5.3 Update OM Page to Read from Production**

- **File**: `Frontend/src/app/project/om/[id]/dashboard/page.tsx` (and related OM pages)
- Change data fetching to read from `projects_prod` table
- Query: Get latest row by `created_at DESC` for project_id
- Update `Frontend/src/lib/project-queries.ts`:
  - Add function: `getProjectFromProduction(projectId: string)`
  - Use this in OM pages instead of staging tables

**5.4 Update Lock Persistence**

- **File**: `Frontend/src/components/forms/EnhancedProjectForm.tsx`
- When user toggles lock, update `lockedFields` state
- On save, include `locked_fields` in metadata sent to backend
- **File**: `Frontend/src/stores/useProjectStore.ts`
- Include `locked_fields` in `resume_updates` when saving

---

### Phase 6: Testing & Validation

**6.1 Test Forward Sanity Check with Locks**

- Upload document, trigger autofill
- Lock a field, trigger autofill again
- Verify locked field is not overwritten

**6.2 Test Backward Sanity Check**

- Edit a field value in staging (manually change it)
- Trigger autofill
- Verify backward check runs and adds warnings if current value differs from doc/kb
- Verify warnings appear in field metadata

**6.3 Test Derived Calculations**

- Set NOI, TDC, Cap Rate in staging
- Trigger autofill
- Verify calculated metrics (yieldOnCost, stabilizedValue, ltv, etc.) appear in staging resume

**6.4 Test Production Sync**

- Trigger autofill (via Process Docs or View OM)
- Verify new row created in `projects_prod` with all data + derived metrics
- Verify OM page reads from production tables

**6.5 Test View OM Workflow**

- Click "View OM" button
- Verify it triggers autofill pipeline
- Verify after completion, navigates to OM page
- Verify OM page shows data from production table

---

## File Summary

### New Files to Create

1. `Backend/services/backward_sanity_service.py`
2. `Backend/services/calculation_service.py`
3. `Backend/services/production_sync_service.py`
4. `Frontend/supabase/migrations/YYYYMMDDHHMMSS_add_locked_fields_to_resumes.sql`
5. `Frontend/supabase/migrations/YYYYMMDDHHMMSS_create_production_tables.sql`

### Files to Modify

1. `Backend/services/orchestrator.py` - Add locked field checks, backward sanity check, calculations, production sync
2. `Frontend/src/stores/useProjectStore.ts` - Persist locked_fields
3. `Frontend/supabase/functions/update-project/index.ts` - Handle locked_fields
4. `Frontend/src/components/project/ProjectWorkspace.tsx` - Add Process Docs button, update View OM to trigger autofill
5. `Frontend/src/components/forms/EnhancedProjectForm.tsx` - Persist locks on save
6. `Frontend/src/lib/project-queries.ts` - Add production table queries
7. `Frontend/src/app/project/om/[id]/dashboard/page.tsx` - Read from production

---

## Critical Implementation Notes

1. **Locked Fields Format**: Store as `{"fieldId": true}` in JSONB column. Empty object `{}` means no locks.

2. **Versioning**: Production tables use INSERT-only (snapshots). Staging tables support updates in place (via update-project function).

3. **Backward Check Logic**: Simple comparison - checks if current value (locked or unlocked) differs from doc/kb value. If different, adds warning. Doesn't care about lock status.

4. **Sanity Checks Timing**: Both forward and backward sanity checks run on every autofill trigger (Process Docs or View OM). They are part of the same pipeline.

5. **View OM Workflow**: View OM button simply triggers the autofill pipeline. No separate endpoint needed. After autofill completes, navigate to OM page.

6. **Derived Metrics**: Calculated during autofill pipeline and included in both staging and production snapshots.

7. **Production Sync**: Happens on every autofill (creates new snapshot in `projects_prod`). OM pages read from production table.

8. **Error Handling**: All services should log errors and return graceful failures. Frontend should show user-friendly error messages.

9. **Performance**: Autofill is async. Frontend polls for completion via `useAutofill` hook.