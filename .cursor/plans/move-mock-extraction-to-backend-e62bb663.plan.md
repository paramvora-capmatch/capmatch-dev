<!-- e62bb663-334c-4d43-b89e-1dbf4d4cfc6e 689a0df3-ab9a-4fdd-8811-e8c44b5a9e99 -->
# Move Mock Extraction Service from Frontend to Backend

## Overview

Currently, the frontend API routes (`src/app/api/project-resume/autofill/route.ts` and `src/app/api/borrower-resume/autofill/route.ts`) check `shouldUseMockData()` and handle mock extraction locally. This plan moves all mock logic to the backend, where it will be controlled by a `USE_MOCK_EXTRACTION` environment variable.

## Implementation Steps

### 1. Add Environment Variable Configuration

**File:** `Backend/core/config.py`

Add new setting to the `Settings` class:

```python
use_mock_extraction: bool = os.getenv("USE_MOCK_EXTRACTION", "false").lower() in ("true", "1", "t")
```

This follows the same pattern as the existing `use_test_data` flag in the same file.

### 2. Create Mock Extraction Service

**New File:** `Backend/services/mock_extraction_service.py`

Create a new service module that provides mock extraction data for both project and borrower resumes. The service should:

- Provide `get_mock_document_extraction(project_id, document_paths, resume_type)` function
- Provide `get_mock_kb_extraction(project_id, project_address, resume_type)` function
- Return data in the same rich format as real extraction: `{field_id: {value, source, warnings, other_values}}`
- Use `services/source_metadata.py` helpers (`create_document_source`, `create_external_source`, `format_field_with_source`) to match backend format
- Include realistic mock data for key fields (can be simplified versions of frontend mock data)

**Key considerations:**

- Mock data should be in flat format (not section-grouped), as the orchestrator works with flat data and groups it later
- Source metadata should use backend's source format (single `source` object, not `sources` array)
- Include a reasonable subset of fields to keep the mock service maintainable

### 3. Modify Orchestrator to Support Mock Mode

**File:** `Backend/services/orchestrator.py`

Modify the `_analyze_resume` function to check for mock mode early in the execution flow:

1. **Add import at top:**
   ```python
   from core.config import settings
   from services import mock_extraction_service
   ```

2. **Add mock mode check after initial logging** (around line 301, after `logger.info(f"Starting {resume_label} resume analysis...")`):

   - If `settings.use_mock_extraction` is True:
     - Skip all document processing (OCR, markdown extraction, etc.)
     - Skip all KB processing (warehouse data retrieval, RAG graph building, etc.)
     - Call `mock_extraction_service.get_mock_document_extraction()` if `document_paths` provided
     - Call `mock_extraction_service.get_mock_kb_extraction()` if `project_address` provided
     - Still run sanity checks on mock data (important for testing sanity check logic)
     - Continue with the rest of the pipeline (merge, compare, save, OM sync, etc.)

3. **Preserve existing logic** - Wrap the entire existing extraction logic in an `else` block so real extraction still works when mock mode is disabled.

**Location:** The mock check should happen before the `check_and_get_documents()` and `get_kb_data()` async functions are called (around line 377).

### 4. Update Environment Configuration

**File:** `Backend/.env` (or `.env.template`)

Add the new environment variable:

```bash
# Mock extraction mode - when enabled, skips real document/KB extraction
# and uses mock data instead. Useful for development/testing.
USE_MOCK_EXTRACTION=false
```

### 5. Update Frontend API Routes

**Files:**

- `Frontend/src/app/api/project-resume/autofill/route.ts`
- `Frontend/src/app/api/borrower-resume/autofill/route.ts`

Remove mock logic from both files:

1. **Remove imports:**

   - Remove `shouldUseMockData` import from `@/lib/apiConfig`
   - Remove mock extraction imports (`extractProjectFields`, `extractBorrowerFields`)

2. **Simplify POST handler:**

   - Remove the `if (shouldUseMockData())` conditional block
   - Remove all mock data processing logic (lines ~45-272 in project-resume, ~45-312 in borrower-resume)
   - Keep only the backend proxy logic (always proxy to backend)
   - The backend will now handle the mock vs real decision

3. **Result:** Both routes become simple proxies that always forward requests to the backend.

### 6. Optional: Create Mock Data JSON Files

**New Directory:** `Backend/misc/mock_data/`

For easier maintenance, consider storing mock data in JSON files:

- `project_resume_mock.json` - Mock project resume extraction data
- `borrower_resume_mock.json` - Mock borrower resume extraction data

The `mock_extraction_service.py` can load these files and convert them to the proper format. This makes it easier to update mock data without modifying Python code.

### 7. Update Documentation

**File:** `Backend/README.md` (or create if needed)

Document the new `USE_MOCK_EXTRACTION` environment variable:

- When to use it (development, testing)
- How it differs from `USE_TEST_DATA` (which only mocks KB warehouse data)
- What gets mocked (document extraction + KB extraction)

## Testing Checklist

- [ ] Mock mode enabled: Backend returns mock data, skips OCR/RAG/KB calls
- [ ] Mock mode disabled: Backend uses real extraction (existing behavior)
- [ ] Sanity checks run correctly on mock data
- [ ] Processing pipeline (calculations, OM sync, etc.) works with mock data
- [ ] Frontend always calls backend (no frontend mock logic)
- [ ] Both project and borrower resume autofill work in mock mode
- [ ] Locked fields are preserved correctly in mock mode
- [ ] Resource pointer updates work correctly in mock mode

## Migration Notes

- The frontend mock data format uses `sources` (array) while backend uses `source` (single object). The mock service must convert to backend format.
- Frontend mock data is section-grouped, but backend orchestrator works with flat data. Mock service should return flat data.
- Existing `USE_TEST_DATA` flag in `data_retrieval.py` only mocks KB warehouse data, not document extraction. `USE_MOCK_EXTRACTION` will mock both.

## Files to Modify

1. `Backend/core/config.py` - Add `use_mock_extraction` setting
2. `Backend/services/mock_extraction_service.py` - New file with mock extraction functions
3. `Backend/services/orchestrator.py` - Add mock mode check and logic
4. `Backend/.env` - Add `USE_MOCK_EXTRACTION` variable
5. `Frontend/src/app/api/project-resume/autofill/route.ts` - Remove mock logic
6. `Frontend/src/app/api/borrower-resume/autofill/route.ts` - Remove mock logic
7. `Backend/misc/mock_data/` - Optional JSON files for mock data

## Dependencies

- `services/source_metadata.py` - For creating proper source metadata format
- `services/sanity_service.py` - Mock data should still go through sanity checks
- `services/field_constraints.py` - For understanding field structure and types

### To-dos

- [ ] Add USE_MOCK_EXTRACTION environment variable to Backend/core/config.py
- [ ] Create Backend/services/mock_extraction_service.py with mock data functions for project and borrower resumes
- [ ] Modify Backend/services/orchestrator.py to check mock flag and use mock service when enabled
- [ ] Add USE_MOCK_EXTRACTION to Backend/.env file
- [ ] Remove mock logic from Frontend/src/app/api/project-resume/autofill/route.ts and make it always proxy to backend
- [ ] Remove mock logic from Frontend/src/app/api/borrower-resume/autofill/route.ts and make it always proxy to backend
- [ ] Test mock mode: verify backend returns mock data and skips real extraction when USE_MOCK_EXTRACTION=true
- [ ] Test real mode: verify backend uses real extraction when USE_MOCK_EXTRACTION=false