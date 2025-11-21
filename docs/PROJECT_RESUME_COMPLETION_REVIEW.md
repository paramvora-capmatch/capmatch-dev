# Project Resume Completion Percentage - Logic Review

## Current Implementation Overview

### 1. **Calculation Logic** (`src/utils/resumeCompletion.ts`)

**Function**: `computeProjectCompletion(project: Partial<ProjectProfile>)`

**Current Required Fields** (only 16 fields):
```typescript
PROJECT_REQUIRED_FIELDS: [
  "projectName",
  "propertyAddressStreet",
  "propertyAddressCity",
  "propertyAddressState",
  "propertyAddressZip",
  "assetType",
  "projectDescription",
  "projectPhase",
  "loanAmountRequested",
  "loanType",
  "targetLtvPercent",
  "targetCloseDate",
  "useOfProceeds",
  "recoursePreference",
  "exitStrategy",
  "businessPlanSummary",
]
```

**How it works**:
1. Counts how many of the 16 required fields have values
2. Returns `(answered / total) * 100`, clamped between 0-100
3. Uses `valueProvided()` helper to check if a field has a valid value (not null/undefined/empty)

**Issues Identified**:
- ❌ Only checks 16 fields, but the form now has 100+ fields across 10 sections
- ❌ Missing important fields we just added:
  - Property Specifications (units, square footage, stories, parking)
  - Development Budget (land acquisition, construction costs)
  - Market Context (demographics, walkability)
  - Special Considerations (opportunity zone, affordable housing)
  - Timeline (groundbreaking, completion dates)
  - Site & Context (acreage, site status)
  - Sponsor Information (entity name, contact info)
- ❌ Completion percentage may show 100% even when new sections are empty

### 2. **Saving Logic** (`src/stores/useProjectStore.ts`)

**Function**: `updateProject(id, updates)`

**Flow**:
1. Merges updates with existing project data
2. Calls `calculateProgress(updatedData)` which:
   - Calculates `completenessPercent` using `computeProjectCompletion`
   - Calculates `borrowerProgress` 
   - Calculates `totalProgress` as average of both
3. Updates local state optimistically
4. Saves to database via edge function:
   - Core updates → `projects` table
   - Resume updates (including `completenessPercent`) → `project_resumes.content` JSONB
5. Reverts on error

**Edge Function** (`supabase/functions/update-project/index.ts`):
- Merges `resume_updates` with existing `project_resumes.content`
- Upserts to `project_resumes` table
- Includes `completenessPercent` in the merged content

**Issues Identified**:
- ✅ Correctly saves `completenessPercent` to JSONB
- ✅ Properly merges with existing content
- ⚠️ But calculation is outdated (only checks 16 fields)

### 3. **Loading Logic** (`src/lib/project-queries.ts`)

**Function**: `getProjectWithResume(projectId)`

**Flow**:
1. Fetches core project from `projects` table
2. Fetches resume content from `project_resumes.content` JSONB
3. Combines both, with `completenessPercent` from JSONB
4. Falls back to `0` if `completenessPercent` is missing

**Issues Identified**:
- ✅ Correctly loads `completenessPercent` from JSONB
- ✅ Proper fallback to 0
- ✅ Also loads from `getProjectsWithResumes` for bulk loading

### 4. **Form Auto-Save** (`src/components/forms/EnhancedProjectForm.tsx`)

**Flow**:
1. Debounced auto-save (2 seconds after field change)
2. Calls `updateProject(formData.id, formData)` on change
3. Store calculates and saves completeness

**Issues Identified**:
- ✅ Auto-saves correctly
- ⚠️ But doesn't explicitly calculate progress (relies on store)
- ⚠️ No visual feedback of completion % in the form

## Recommendations

### Priority 1: Update Required Fields List

Update `PROJECT_REQUIRED_FIELDS` to include critical fields from new sections:

```typescript
export const PROJECT_REQUIRED_FIELDS: (keyof ProjectProfile)[] = [
  // Basic Info (existing)
  "projectName",
  "propertyAddressStreet",
  "propertyAddressCity",
  "propertyAddressState",
  "propertyAddressZip",
  "assetType",
  "projectDescription",
  "projectPhase",
  
  // Loan Info (existing)
  "loanAmountRequested",
  "loanType",
  "targetLtvPercent",
  "targetCloseDate",
  "useOfProceeds",
  "recoursePreference",
  
  // Financials (existing)
  "exitStrategy",
  "businessPlanSummary",
  
  // Property Specs (NEW - critical fields)
  "totalResidentialUnits", // or totalCommercialGRSF for commercial
  "grossBuildingArea",
  "numberOfStories",
  
  // Development Budget (NEW - critical)
  "totalDevelopmentCost", // or totalProjectCost
  "landAcquisition", // for ground-up
  "baseConstruction",
  
  // Timeline (NEW - important)
  "groundbreakingDate", // or "completionDate"
  
  // Sponsor Info (NEW - important)
  "sponsorEntityName",
];
```

**Consideration**: Should we make ALL fields required, or just critical ones? Recommend starting with critical fields and expanding.

### Priority 2: Add Section-Based Completion

Instead of a flat list, consider section-based completion:

```typescript
export const PROJECT_SECTION_WEIGHTS = {
  "basic-info": 20,        // 20% of total
  "loan-info": 20,         // 20%
  "financials": 15,        // 15%
  "property-specs": 15,    // 15%
  "dev-budget": 10,        // 10%
  "market-context": 5,     // 5%
  "special-considerations": 5,  // 5%
  "timeline": 5,           // 5%
  "site-context": 3,       // 3%
  "sponsor-info": 2,       // 2%
};

export const computeProjectCompletionBySection = (project: Partial<ProjectProfile>): number => {
  // Calculate completion per section, then weight by section weights
  // This allows partial credit and more granular tracking
};
```

### Priority 3: Add Progress Display to Form

Add a progress indicator to the form header showing:
- Current completion %
- Fields remaining
- Section completion breakdown

### Priority 4: Recalculate on Field Change

Currently, completion is only recalculated when saving. Consider:
- Recalculating on field change (debounced)
- Showing progress indicator in real-time
- Highlighting incomplete sections

### Priority 5: Validation

Add validation to ensure:
- Critical fields are filled before allowing certain actions
- Derived fields are calculated correctly (e.g., TDC = sum of budget)
- Date fields are logical (completion > groundbreaking)

## Testing Checklist

- [ ] Test with empty project (should be 0%)
- [ ] Test with all old fields filled (should be 100% with old logic, less with new)
- [ ] Test with all new sections filled
- [ ] Test saving and loading completeness
- [ ] Test with partial data (should calculate correctly)
- [ ] Test auto-save updates completeness
- [ ] Test edge cases (null values, empty strings, 0 numbers)

## Current Status

✅ **Working Correctly**:
- Saving `completenessPercent` to database
- Loading `completenessPercent` from database  
- Auto-save mechanism
- Edge function merging logic

⚠️ **Needs Update**:
- Required fields list is outdated (only 16 of 100+ fields)
- Completion calculation doesn't reflect new sections
- May show 100% completion when many sections are empty

🔧 **Recommended Actions**:
1. Update `PROJECT_REQUIRED_FIELDS` to include new critical fields
2. Consider section-based weighting
3. Add progress indicator to form
4. Test thoroughly with new fields

