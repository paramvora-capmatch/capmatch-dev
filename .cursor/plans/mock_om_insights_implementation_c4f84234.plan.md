---
name: Mock OM Insights Implementation
overview: Implement mock mode for OM insights generation, create comprehensive mock insights data covering all insight fields, verify project resume mock data completeness, and compare frontend/backend mock file structures.
todos:
  - id: create-mock-insights-file
    content: Create Backend/misc/mock_data/om_insights_mock.json with all 50+ insight fields from INSIGHT_FIELD_KEYS, referencing project data from project_resume_mock_complete.json
    status: completed
  - id: add-mock-insights-loader
    content: Add get_mock_om_insights() function to Backend/services/mock_extraction_service.py to load and return mock insights data
    status: completed
    dependencies:
      - create-mock-insights-file
  - id: modify-insights-endpoint
    content: Modify Backend/api/v1/endpoints/om_insights.py generate_om_insights() to check USE_MOCK_EXTRACTION and return mock insights when enabled
    status: completed
    dependencies:
      - add-mock-insights-loader
  - id: verify-resume-mock-completeness
    content: Compare Backend/misc/mock_data/project_resume_mock_complete.json against schema to ensure all non-derived fields are present
    status: completed
  - id: compare-frontend-backend-mocks
    content: Document differences between Frontend/src/services/mockOMData.ts and Backend mock files - they serve different purposes (UI vs extraction)
    status: completed
---

# Mock OM Insights Implementation Plan

## Overview

Enable mock mode for OM insights generation when `USE_MOCK_EXTRACTION` is enabled. Create comprehensive mock insights data covering all 50+ insight fields, verify project resume mock data completeness, and document differences between frontend/backend mock files.

## Current State Analysis

### Mock Files Structure

- **Backend**: `Backend/misc/mock_data/project_resume_mock_complete.json` - Resume extraction mock data
- **Frontend**: `Frontend/src/services/mockOMData.ts` - OM display/UI mock data (different purpose)
- **Insights**: Currently no mock data - insights are generated via AI service

### Insights Fields

All insight fields are defined in `Backend/api/v1/endpoints/om_insights.py` (`INSIGHT_FIELD_KEYS`):

- 50+ insight fields across categories (supplyStrength, marketOpportunity, riskFactor, demographicStrength, etc.)
- Metadata fields: `resume_version_id`, `generated_at`

## Implementation Steps

### Step 1: Create Mock Insights Data File

**File**: `Backend/misc/mock_data/om_insights_mock.json`

- Create JSON file with all insight fields from `INSIGHT_FIELD_KEYS`
- Each insight should be a realistic string (1-2 sentences) referencing project data
- Include metadata fields: `resume_version_id` (can be "mock"), `generated_at` (ISO timestamp)
- Insights should reference values from `project_resume_mock_complete.json` for consistency
- Format: Flat object with field keys as strings

**Example structure**:

```json
{
  "supplyStrength1": "Limited supply pipeline of 1,500 units supports strong competitive positioning...",
  "supplyStrength2": "...",
  "marketOpportunity1": "...",
  ...
  "resume_version_id": "mock",
  "generated_at": "2025-01-15T10:00:00Z"
}
```

### Step 2: Add Mock Insights Loader Function

**File**: `Backend/services/mock_extraction_service.py`

- Add function `get_mock_om_insights(project_id: str) -> Dict[str, str]`
- Load `om_insights_mock.json` from `Backend/misc/mock_data/`
- Return insights dict matching format from `OMInsightService.generate_insights()`
- Handle file not found gracefully (return empty dict with warning)

### Step 3: Modify Insights Endpoint to Support Mock Mode

**File**: `Backend/api/v1/endpoints/om_insights.py`

- Import `mock_extraction_service` and `settings` from `core.config`
- In `generate_om_insights()` function, add mock mode check:
  - If `settings.use_mock_extraction` is True, load mock insights instead of calling AI service
  - Return mock insights with same response format (status, insights_count, message)
  - Skip cache validation in mock mode (always return fresh mock data)
- Maintain same response structure for consistency

**Code location**: Around line 108-183 in `generate_om_insights()`

### Step 4: Verify Project Resume Mock Data Completeness

**File**: `Backend/misc/mock_data/project_resume_mock_complete.json`

- Compare against `enhanced-project-form-schema.json`
- Verify all non-derived fields are present
- Derived fields to exclude (calculated, not in mock):
  - `ltv`, `ltc`, `dscr`, `debtYield` (these are calculated from other fields)
  - Any fields marked as `derived: true` in calculation service
- Document any missing fields
- Ensure field names match schema exactly

### Step 5: Compare Frontend/Backend Mock Files

**Files**:

- `Backend/misc/mock_data/project_resume_mock_complete.json`
- `Frontend/src/services/mockOMData.ts`

- **Purpose Analysis**:
  - Backend mock: Resume extraction data (document/KB extraction format)
  - Frontend mock: OM display data (UI component data, different structure)
- **Key Differences**:
  - Backend: Flat field structure matching database schema
  - Frontend: Nested objects for UI display (projectOverview, scenarioData, etc.)
  - Backend: Used for autofill/extraction testing
  - Frontend: Used for UI development/demo purposes
- **Conclusion**: Files serve different purposes - no synchronization needed
- Document findings in plan comments

### Step 6: Update Environment Configuration

**File**: `Backend/.env.template`

- Verify `USE_MOCK_EXTRACTION` documentation mentions insights mock mode
- Add comment: "When enabled, uses mock data for both resume extraction AND OM insights generation"

## Files to Create/Modify

### Create

1. `Backend/misc/mock_data/om_insights_mock.json` - Mock insights data with all 50+ fields

### Modify

1. `Backend/services/mock_extraction_service.py` - Add `get_mock_om_insights()` function
2. `Backend/api/v1/endpoints/om_insights.py` - Add mock mode check in `generate_om_insights()`
3. `Backend/.env.template` - Update documentation (if needed)

### Verify (No Changes)

1. `Backend/misc/mock_data/project_resume_mock_complete.json` - Verify completeness
2. `Frontend/src/services/mockOMData.ts` - Document purpose differences

## Testing Checklist

- [ ] Mock insights file loads correctly
- [ ] All 50+ insight fields present in mock data
- [ ] Mock mode returns insights when `USE_MOCK_EXTRACTION=true`
- [ ] Response format matches real insights endpoint
- [ ] Project resume mock has all non-derived fields
- [ ] Frontend/backend mock file differences documented

## Notes

- Mock insights should reference project data from `project_resume_mock_complete.json` for consistency
- Derived fields (ltv, ltc, dscr, debtYield) are calculated during autofill, not in mock data
- Frontend `mockOMData.ts` serves UI display purposes, not extraction - different from backend mock
- Mock insights can use placeholder `resume_version_id: "mock"` for testing