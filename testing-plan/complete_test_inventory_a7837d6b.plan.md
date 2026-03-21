---
name: Complete Test Inventory
overview: A hierarchical, top-to-bottom inventory of every testable behavior across the CapMatch platform -- frontend, backend, notifications, and database -- organized by feature domain.
todos:
  - id: unit-tests
    content: Write unit tests for all utilities, data transformations, store logic, and field metadata (Sections 19.1-19.3, 8.4-8.8, all store .test files)
    status: pending
  - id: component-tests
    content: Write component tests for forms, chat UI, document manager, filters, metric cards, notifications (Sections 2.4, 3.1, 4.1-4.3, 7.5, 9.4, 10.1-10.3, 11.1-11.3)
    status: pending
  - id: integration-tests
    content: Write integration tests for API route handlers, autofill hooks, Ask AI hooks, document hooks (Sections 5.1-5.4, 6.1-6.4, 4.5-4.6)
    status: pending
  - id: e2e-tests
    content: "Write Playwright E2E tests for critical user flows: login, project CRUD, document upload+autofill, chat, lender matching, OM dashboard, team management (Sections 1-4, 7-10, 12)"
    status: pending
  - id: backend-tests
    content: Expand pytest coverage for all FastAPI endpoints, repositories, and services (Section 16)
    status: pending
  - id: permission-tests
    content: "Write permission E2E scenarios (11.12: 8 scenarios), permission RPC integration tests (11.3-11.6), permission trigger tests (18.4), and permission notification handler tests (11.11)"
    status: pending
  - id: rls-tests
    content: Write RLS policy tests verifying multi-tenant isolation, role-based access, and permission-specific RLS (Sections 18.1-18.6)
    status: pending
  - id: notification-tests
    content: Write tests for all 14 notify-fan-out event handlers (including 5 permission handlers) and all scheduled jobs (Section 17)
    status: pending
  - id: ci-gate
    content: Create CI workflows that run all test suites and gate deployments on passage
    status: pending
isProject: false
---

# Complete Test Inventory for CapMatch

Every testable behavior across the platform, organized hierarchically by feature domain. Each leaf item is a concrete test case or assertion.

---

## Seed Users Reference

All E2E tests use the users created by `npm run seed:hoque` (`[scripts/seed-hoque-project.ts](scripts/seed-hoque-project.ts)`). **Do not create users in tests.** Run the seed script before the E2E suite (in CI or locally). The seeded data includes:

**Accounts (all use password: `password`):**

- **Advisor:** `cody.field@capmatch.com` (Cody Field) -- role: `advisor`, org: CapMatch Advisors
- **Borrower (owner):** `param.vora@capmatch.com` (Param Vora) -- role: `borrower`, org owner
- **Borrower (co-owner):** `jeff.richmond@capmatch.com` (Jeff Richmond) -- role: `borrower`, org owner in same org as Param
- **Lender:** `lender@capmatch.com` (Capital Lending Group) -- role: `lender`
- **Team members (borrower org):** `aryan.jain@capmatch.com`, `sarthak.karandikar@capmatch.com`, `kabeer.merchant@capmatch.com`, `vatsal.hariramani@capmatch.com` -- all password `password`, role: `borrower` (members)

**Seeded data:**

- Project: "SoGood Apartments" (full project resume, borrower resume, OM data, documents, chat threads)
- Documents: uploaded to project and borrower docs
- Chat: General thread with messages, all members as participants
- Permissions: advisor has edit on underwriting, team members have project access
- Lender: has granted project access

**How to authenticate in Playwright:**

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test'

// Create pre-authenticated contexts for each role
export const test = base.extend({
  borrowerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('param.vora@capmatch.com')
    await page.getByRole('textbox', { name: /password/i }).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard')
    await use(page)
    await ctx.close()
  },
  lenderPage: async ({ browser }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('lender@capmatch.com')
    await page.getByRole('textbox', { name: /password/i }).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/lender/dashboard')
    await use(page)
    await ctx.close()
  },
  advisorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('cody.field@capmatch.com')
    await page.getByRole('textbox', { name: /password/i }).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/advisor/dashboard')
    await use(page)
    await ctx.close()
  },
  memberPage: async ({ browser }, use) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('kabeer.merchant@capmatch.com')
    await page.getByRole('textbox', { name: /password/i }).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard')
    await use(page)
    await ctx.close()
  },
})
```

For DB assertions in E2E tests, use the Supabase service-role client (same one the seed script uses).

---

## 1. Authentication and Authorization

### 1.1 Login

- Email/password login succeeds with valid credentials
- Email/password login fails with wrong password (shows error)
- Email/password login fails with non-existent email
- Google OAuth redirects to Google, returns to `/login`, and completes session
- Session persists across page reload (cookie/token refresh)
- Session expiration triggers re-login prompt
- `TOKEN_REFRESHED` event recovers session silently
- `SIGNED_OUT` event clears session and redirects to `/login`
- Cooldown between recovery attempts (no infinite loops)
- Max recovery attempts (3) then hard logout

#### How to test

**E2E (Playwright):** Create `e2e/tests/auth.spec.ts`. Use the seed user `param.vora@capmatch.com` / `password` (see Seed Users Reference above). Navigate to `/login`, fill email/password fields (`page.getByRole('textbox', { name: /email/i })`), click submit, assert `page.waitForURL('/dashboard')`. For failure cases, assert error text is visible. For session persistence, login -> reload page -> assert still on `/dashboard`. For OAuth, mock the Google redirect or skip in CI (OAuth requires real browser flow). For session recovery and cooldown, test at the store level (see 1.5).

**Backend (pytest):** Test `POST /api/v1/auth/check-email` with existing and non-existing emails. Test `POST /api/v1/users/onboard-borrower` and `onboard-lender` with mock Supabase admin client.

### 1.2 Signup / Onboarding

*Deferred -- not included in the initial test suite. The seed script creates all needed users.*

### 1.3 Role-Based Routing

- Borrower redirected to `/dashboard` after login
- Lender redirected to `/lender/dashboard` after login
- Advisor redirected to `/advisor/dashboard` after login
- Unauthenticated user redirected to `/login` from any protected route
- Borrower cannot access `/lender/dashboard` or `/advisor/dashboard`
- Lender cannot access `/dashboard` (borrower) or `/advisor/dashboard`
- Advisor cannot access `/dashboard` (borrower) or `/lender/dashboard`
- `RoleBasedRoute` blocks access and redirects for unauthorized roles

#### How to test

**E2E (Playwright):** Create three authenticated browser contexts using the seed users: borrower (`param.vora@capmatch.com`), lender (`lender@capmatch.com`), advisor (`cody.field@capmatch.com`) -- use the auth fixture from the Seed Users Reference. For each role, navigate to the two forbidden dashboards and assert redirect to their own dashboard URL. Navigate to `/dashboard` while unauthenticated (no storageState) and assert redirect to `/login`.

**Component (Vitest + RTL):** Render `<RoleBasedRoute roles={['borrower']}>` with a mocked `useAuthStore` returning `user.role = 'lender'`. Assert the component renders nothing and `router.push` was called with the redirect URL. Mock `next/navigation` via `vi.mock('next/navigation', ...)`.

### 1.4 Invite System

- `POST /api/v1/auth/validate-invite` validates token, returns org name and inviter
- `POST /api/v1/auth/validate-invite` rejects expired or used tokens
- `/accept-invite?token=X` page loads and shows invite details
- Accepting invite creates `org_members` entry with correct role
- Accepting invite as new user creates account + profile
- Declining invite sets status to `cancelled`
- Invite acceptance triggers `invite_accepted` domain event
- Org owner can invite with `project_grants` (per-project access)

#### How to test

**Backend (pytest):** Test `POST /api/v1/auth/validate-invite` with valid token (mock invite_repository returns invite), expired token (mock returns expired), used token (mock returns used). Test `POST /api/v1/auth/accept-invite` -- assert it calls `grant_project_access` for each project in the invite, creates `org_members` row, and the mock for `domain_events` INSERT was called with `invite_accepted`. Tests exist in `tests/test_endpoints/test_auth.py` -- extend with domain event assertions.

**E2E (Playwright):** Seed an invite via service client. Navigate to `/accept-invite?token=X`. Assert invite details are shown. Click accept. Assert redirect to dashboard. Query `org_members` via service client to verify row exists.

### 1.5 Auth Store (`useAuthStore`)

- `init()` is singleton (multiple calls do not duplicate listener)
- `isHydrating` starts `true`, becomes `false` after first session check
- `loadOrgMemberships()` loads memberships and sets `activeOrg`
- `activeOrg` set to first org when single membership
- `currentOrgRole` correctly reflects `owner` or `member`
- `logout()` calls `supabase.auth.signOut`, clears state, sets `isManualLogout`

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useAuthStore.test.ts`. Mock `@/lib/supabaseClient` with `vi.mock()` -- return a mock `supabase` with `auth.getSession`, `auth.onAuthStateChange`, `auth.signInWithPassword`, `auth.signOut`. Test `init()` singleton: call twice, assert `onAuthStateChange` registered only once. Test hydration: after `init()` resolves, assert `isHydrating === false`. Test `loadOrgMemberships`: mock `supabase.from('org_members').select()` to return one membership, assert `activeOrg` is set. Test `logout()`: call it, assert `user === null`, `isAuthenticated === false`, `isManualLogout === true`. For session recovery, simulate `TOKEN_REFRESHED` callback and assert state updates. Use `useAuthStore.setState()` to set initial state in `beforeEach`.

---

## 2. Project Lifecycle

### 2.1 Project Creation

- Create project with name, `owner_org_id`, address, deal type
- Project creation assigns `initial_grants` (permissions for members)
- Created project appears in borrower dashboard
- Borrower resume auto-copied from most recent project (if exists)
- Project redirect to `/project/workspace/[id]` after creation

#### How to test

**E2E (Playwright):** Login as borrower. Navigate to `/dashboard`. Click "Create Project". Fill name, address, deal type in the wizard. Submit. Assert `page.waitForURL(/\/project\/workspace\//)`. Assert new project appears on dashboard. For borrower resume copy, seed a project with borrower data first, create a second project, verify the new project's borrower resume content matches.

**Backend (pytest):** Test `POST /api/v1/projects/create` with mock_supabase. Assert it calls `grant_project_access` for the creator, all org owners, and initial grants. Assert `copy-borrower-profile` is called when a previous project exists.

### 2.2 Project Dashboard

- Borrower dashboard lists all projects for the user's org
- Each `ProjectCard` shows name, progress, member count, unread badge
- Delete project removes from list (with confirmation modal)
- `OnboardingProgressCard` shows borrower resume progress
- Empty state shown when no projects

#### How to test

**Component (Vitest + RTL):** Render `<ProjectCard project={mockProject} />`. Assert project name, progress bar, member count are displayed. For delete: render with `showDeleteButton={true}`, click delete button, assert confirmation modal appears, confirm, assert `onDelete` callback called.

**E2E (Playwright):** Login as `param.vora@capmatch.com` (borrower). The seed creates the "SoGood Apartments" project -- assert the ProjectCard is visible with that name. For delete: create a throwaway project at the start of the test, then delete it and assert it disappears. Do NOT delete seeded data. For empty state: skip or test via component test with mocked empty project list.

### 2.3 Project Workspace

- Workspace loads project data, resume, borrower resume, documents
- Tab switching: Resume, Documents, Access Control, Lender Match
- Skeleton shown during loading
- `UnsavedChangesModal` appears when navigating away with unsaved edits

#### How to test

**E2E (Playwright):** Navigate to `/project/workspace/[id]`. Assert skeleton appears then resolves to content. Click each tab (Resume, Documents, Access Control, Lender Match) and assert tab content renders. For unsaved changes: type in a field, then click browser back, assert `UnsavedChangesModal` appears. Click "Stay" and assert still on workspace. Click "Leave" and assert navigation occurs.

**Component (Vitest + RTL):** Render `<ProjectWorkspace projectId="test-id" />` with mocked stores (useProjectStore, useChatStore, usePermissionStore). Assert tab buttons render. Simulate tab click, assert correct content panel mounts.

### 2.4 Project Resume (Edit Mode)

- `EnhancedProjectForm` renders all fields from field metadata schema
- Field visibility changes based on deal type (`isFieldVisibleForDealType`)
- Fields organized into collapsible sections
- Typing in a field triggers auto-save (debounced)
- Locked fields cannot be overwritten by autofill
- Lock/unlock a field toggles `locked_fields[]` in content JSONB
- Field validation (Zod) shows inline errors
- Completion percentage updates as fields are filled and locked
- `computeProjectCompletion` returns 0 for empty, 100 for all required locked
- Ask AI button opens AI chat scoped to that field
- Version history: save, view, rollback, label edit, diff comparison
- `saveProjectResume` creates new version row, archives old one
- Rollback restores previous version content

#### How to test

**Unit (Vitest):** `computeProjectCompletion` already has tests in `src/features/project-resume/__tests__/completion.test.ts` -- extend with edge cases. Test `isFieldVisibleForDealType` with each deal type and assert correct fields shown/hidden. Test `saveProjectResume` by mocking supabase: assert it inserts a new version row, archives old, preserves locked fields.

**Component (Vitest + RTL):** Render `<EnhancedProjectForm project={mockProject} />` with mocked project store. Assert sections render. Change deal type, assert fields toggle visibility. Type in a text field, wait for debounce (use `vi.advanceTimersByTime`), assert `onSave` called. Render with `locked_fields: ['loanAmount']`, assert that field has a lock icon and is non-editable. Click "Ask AI" button on a field, assert `StickyChatCard` activates with that field context.

**Integration (Vitest):** Test `saveProjectResume` from `src/lib/project-queries.ts` -- mock supabase, call the function with content + locked fields, assert the upsert includes correct `version_number` increment, `is_active` flags, and locked fields preserved.

### 2.5 Project Resume (View Mode)

- `ProjectResumeView` renders all filled fields in read-only mode
- Sections are collapsible
- "Edit" button visible only when user `canEdit`
- T12 financial table renders correctly

#### How to test

**Component (Vitest + RTL):** Render `<ProjectResumeView project={mockProject} canEdit={true} />`. Assert all non-empty fields are displayed as text (not inputs). Assert "Edit" button is visible. Re-render with `canEdit={false}`, assert "Edit" button is gone. Click a section header, assert section collapses (content hidden). For T12: pass mock T12 data, assert table rows and values render.

### 2.6 Project Store (`useProjectStore`)

- `loadUserProjects()` fetches projects with resumes and resources
- `createProject()` calls API, adds to list, updates progress
- `updateProject()` does optimistic update, rolls back on error
- `refreshProject()` adds project to list if missing
- Store resets on logout
- Store reloads on org membership change

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useProjectStore.test.ts`. Mock `@/lib/project-queries` and `@/lib/supabaseClient`. Test `loadUserProjects`: mock `getProjectsWithResumes` to return 2 projects, call action, assert `projects` state has 2 items with correct IDs. Test `updateProject` optimistic rollback: mock `supabase.from().update()` to throw, call `updateProject`, assert state reverted to original. Test `createProject`: mock API, assert new project added to list. Test store reset: set projects, call `resetProjectState`, assert `projects` is empty.

### 2.7 Project Progress

- `calculateProgress` averages project and borrower completion
- Progress bar colors: red (<33%), yellow (33-66%), green (>66%)
- Progress persists correctly across reload

#### How to test

**Unit (Vitest):** Test `calculateProgress` with edge cases: both 0 (returns 0), both 100 (returns 100), project 60 + borrower 40 (returns 50). Test color thresholds by rendering `<ProjectCard>` with different progress values and asserting the CSS class or style applied.

**E2E (Playwright):** Seed a project with known completion. Navigate to dashboard. Assert progress bar shows correct percentage. Edit a field, lock it, return to dashboard, assert progress increased.

---

## 3. Borrower Resume

### 3.1 Borrower Resume Editing

- `BorrowerResumeForm` renders all borrower fields
- Principals (key people) can be added, edited, removed
- `hasCompletePrincipals` checks for at least one complete principal
- `computeBorrowerCompletion` calculates percentage
- Borrower resume auto-save (debounced)
- Locked fields tracked in `content.locked_fields`
- Sanitize borrower profile strips invalid/empty values

#### How to test

**Unit (Vitest):** Existing tests in `src/features/borrower-resume/__tests__/` cover `hasCompletePrincipals`, `isBorrowerValueProvided`, `lockSelectors`, `sanitizeBorrowerProfile`. Extend `hasCompletePrincipals` with edge cases: zero principals, one incomplete, one complete. Test `computeBorrowerCompletion` with various field states.

**Component (Vitest + RTL):** Render `<BorrowerResumeForm content={mockContent} />`. Assert fields render. Click "Add Principal", assert new principal row appears. Fill principal fields, assert completion updates. Test lock toggle on a field.

### 3.2 Borrower Resume Realtime

- Realtime subscription updates form when another user edits
- Autofill events update borrower resume
- Conflict resolution: `updateContentIfChanged` merges without losing local edits

#### How to test

**Integration (Vitest):** Test `useProjectBorrowerResumeRealtime` hook with `renderHook`. Mock Supabase realtime channel -- simulate an incoming `UPDATE` event with new content. Assert the hook's returned content reflects the update. Simulate a conflict: set local state to have a field edited, fire realtime update with a different field changed, assert both changes are present (merge). Mock autofill event payload, assert borrower fields updated.

### 3.3 Borrower Resume Versioning

- Save version creates archive row
- Rollback to previous version

#### How to test

**Integration (Vitest):** Mock supabase. Call `saveProjectBorrowerResume` with content. Assert it creates a new row with incremented `version_number` and `is_active = true`, and sets the old row to `is_active = false`. For rollback: mock fetching an old version, call rollback, assert the old content is now the active version.

**Backend (pytest):** Test `POST /api/v1/borrower-resume/save-version` -- assert it creates a version row and returns `versionId`.

### 3.4 Copy Borrower Profile

- `POST /api/v1/projects/copy-borrower-profile` copies from source to target
- Copied profile appears in target project

#### How to test

**Backend (pytest):** Call `POST /api/v1/projects/copy-borrower-profile` with `source_project_id` and `target_project_id`. Mock `resume_repository.get_borrower_resume` to return source content. Assert `resume_repository.save_borrower_resume` called with the source content for the target project. Test error case: source project has no borrower resume.

---

## 4. Document Management

### 4.1 Document Upload

- Upload PDF/DOCX/XLSX via dropzone or file picker
- File size validation (reject files exceeding limit)
- MIME type validation (reject unsupported types)
- `sanitizeFilename` removes path traversal and unsafe chars
- Filename follows versioning pattern: `v{n}_user{id}_{filename}`
- Upload creates entry in `resources` table
- Upload triggers `document_uploaded` domain event

#### How to test

**Unit (Vitest):** Test `sanitizeFilename` from `src/utils/fileUploadValidation.ts`: pass `../../etc/passwd`, assert output has no `..`. Pass `my file (1).pdf`, assert spaces and parens handled. Test `validateFile`: pass a 500MB file mock, assert rejection. Pass `.exe` file, assert rejection. Pass valid `.pdf`, assert acceptance.

**E2E (Playwright):** Login, navigate to project workspace, switch to Documents tab. Use `page.setInputFiles` to upload a test PDF. Assert the file appears in the document list. Query `resources` table via service client to assert the row exists with correct `resource_type = 'FILE'`. Query `domain_events` to assert `document_uploaded` event was created.

**Backend (pytest):** Test `POST /api/v1/documents/upload` with a multipart file. Assert storage upload was called, `resources` row created, domain event emitted.

### 4.2 Document Listing

- `DocumentManager` lists files and folders for project
- Grid and list view toggle
- Documents show name, type, upload date, uploader
- Skeleton shown during loading
- Collapsible sections

#### How to test

**Component (Vitest + RTL):** Render `<DocumentManager projectId="test" />` with mocked `useDocumentManagement` returning 3 mock files. Assert file names, types, dates displayed. Click grid/list toggle, assert layout changes (check CSS classes or element structure). Assert skeleton shows when `isLoading = true`.

### 4.3 Document Preview

- `DocumentPreviewModal` opens for PDF (rendered via PDF.js)
- Office documents open in OnlyOffice editor
- Version history dropdown shows all versions
- Diff viewer compares two versions (PDF text, DOCX, Excel)

#### How to test

**Component (Vitest + RTL):** Render `<DocumentPreviewModal resourceId="test" />` with mocked document data (PDF type). Assert PDF viewer container renders. For Office: mock document as `.docx`, assert OnlyOffice iframe/container renders. For version history: mock 3 versions, click dropdown, assert all 3 listed.

**Integration (Vitest):** Test `DocumentDiffViewer` with two mock versions -- for PDF, mock `pdfjs-dist` to return text content, assert diff is displayed. For DOCX, mock `mammoth` to return HTML, assert diff shown.

### 4.4 Document Operations

- Delete document removes from storage and `resources` table
- Download document via signed URL
- Share document: set permissions for org members
- Copy document from existing (`/api/v1/documents/copy-from-existing`)

#### How to test

**Backend (pytest):** Test `DELETE /api/v1/documents/{resource_id}` -- mock storage delete and DB delete, assert both called. Test `POST /api/v1/documents/copy-from-existing` -- mock source resource lookup, assert new resource created with correct project_id and name.

**E2E (Playwright):** Upload a doc, then delete it. Assert it disappears from the list. Query DB to confirm `resources` row deleted. For download: click download button, assert `download` event fires with correct filename (use `page.waitForEvent('download')`).

### 4.5 OnlyOffice Integration

- `POST /api/v1/onlyoffice/config` returns valid editor config with JWT
- `POST /api/v1/onlyoffice/callback` handles save webhook
- Editor loads .docx, .xlsx, .pptx formats
- Collaborative editing: two users editing same document

#### How to test

**Backend (pytest):** Test `POST /api/v1/onlyoffice/config` -- assert response contains `document.key`, `document.url`, `token` (valid JWT). Test `POST /api/v1/onlyoffice/callback` with a mock OnlyOffice save payload (status 2 = save), assert document updated in storage. Test with status 6 (force save). Test with invalid JWT -- assert 403.

### 4.6 Document Hook (`useDocumentManagement`)

- `listDocuments` returns files for project context
- Upload creates version with correct naming
- Delete removes from storage
- Realtime subscription updates file list on changes

#### How to test

**Integration (Vitest):** Use `renderHook(() => useDocumentManagement('project-id'))` with mocked supabase. Assert `listDocuments` calls `supabase.from('resources').select()` with correct project filter. Simulate upload: call the hook's upload function, assert supabase storage `.upload()` called with filename matching `v1_user{id}_{name}`. Simulate realtime event: trigger the mock channel callback with an INSERT event, assert the file list updates.

---

## 5. Autofill (AI Document Extraction)

### 5.1 Project Autofill

- `POST /api/v1/project-resume/autofill` accepts project_id and document_paths
- Returns 202 with `job_id`
- `GET /api/v1/jobs/{job_id}` tracks status (pending -> processing -> completed/failed)
- Completed autofill populates `autofill_results` table
- Extracted fields saved to `project_resumes.content`
- Locked fields NOT overwritten by autofill
- Source attribution tracked per field (`extracted_from_doc`)
- Extraction cache prevents re-processing same document

#### How to test

**Backend (pytest):** Test `POST /api/v1/project-resume/autofill` -- mock extraction service, assert 202 returned with `job_id`. Mock job completion, assert `autofill_results` populated. Test locked field preservation: seed resume with `locked_fields: ['loanAmount']`, run autofill that extracts `loanAmount`, assert it was NOT overwritten. Test extraction cache: call autofill twice with same document, assert extraction service called only once.

**Integration (Vitest):** Test the full flow from frontend perspective: mock the API responses, trigger autofill, assert the project store is updated with new field values and source attribution metadata.

### 5.2 Borrower Autofill

- `POST /api/v1/borrower-resume/autofill` same pattern as project
- Populates borrower resume fields

#### How to test

**Backend (pytest):** Same pattern as 5.1 but for `POST /api/v1/borrower-resume/autofill`. Test that borrower fields are extracted and saved to `borrower_resumes.content`.

### 5.3 Autofill Hook (`useAutofill`)

- Starts polling on job creation (2s interval)
- Timeout after 5 minutes
- Error modal on failure
- `documentPathMatchesContext` validates document context
- localStorage state tracks autofill progress
- UI shows sparkle animation during autofill

#### How to test

**Integration (Vitest):** Use `renderHook` with `vi.useFakeTimers()`. Start autofill, assert polling begins. Advance timers by 2s intervals, mock API returning `status: 'processing'` first, then `status: 'completed'`. Assert hook returns `isAutofilling = false` after completion. Test timeout: advance timers past 5 minutes, assert hook shows error state. Test `documentPathMatchesContext` with matching and non-matching paths.

**E2E (Playwright):** Upload a document, click "Autofill from document". Wait for UI to show "Autofilling..." indicator. Wait (with timeout) for fields to populate. Assert at least some form fields now have values. Assert sparkle animation was visible during the process (check for CSS class or element existence).

### 5.4 Sanity Check

- `POST /api/v1/project-resume/realtime-sanity-check` validates individual field values
- Returns `is_valid`, `warnings` for the field
- Same for borrower resume

#### How to test

**Backend (pytest):** Test with valid values (e.g., loan amount = 5000000) -- assert `is_valid: true`. Test with suspicious values (e.g., loan amount = -1) -- assert `is_valid: false` with warnings. Test with context (existing field data) that contradicts the new value.

---

## 6. AI Q&A (Ask AI)

### 6.1 Project Q&A

- `POST /api/v1/ai/project-qa` accepts question + field context + project context
- Returns SSE stream of AI response
- Response follows Zod schema (`answer_markdown`)
- System prompt is CRE expert, field-aware, recommends from options
- Chat history maintained for follow-up questions

#### How to test

**Backend (pytest):** Test `POST /api/v1/ai/project-qa` with mock LLM client. Assert SSE response stream is returned (check `Content-Type: text/event-stream`). Assert system prompt includes field context. Assert chat history is forwarded to the LLM. Test with empty question -- assert 400. Test with missing fieldContext -- assert graceful handling.

### 6.2 Borrower Q&A

- `POST /api/v1/ai/borrower-qa` same pattern for borrower fields

#### How to test

**Backend (pytest):** Same pattern as 6.1 but for borrower endpoint. Assert borrower-specific system prompt is used.

### 6.3 OM Q&A

- `POST /api/v1/ai/om-qa` answers questions about OM data

#### How to test

**Backend (pytest):** Test `POST /api/v1/ai/om-qa` with mock LLM client and mock OM data. Assert OM data is included in context sent to LLM.

### 6.4 Ask AI Hook (`useAskAI`)

- `activateField` builds context from DOM (data-field-* attributes)
- Streaming updates render incrementally
- Error handling for failed streams
- Preset questions generated per field type

#### How to test

**Integration (Vitest):** Use `renderHook(() => useAskAI({ formData: mockData, contextType: 'project' }))`. Mock the `fetch` API to return an SSE stream (use `ReadableStream` mock). Call `activate('loanAmount')`, then `sendMessage('What should this be?')`. Assert messages array updates incrementally as stream chunks arrive. Test error: mock fetch to reject, assert error state is set. Test preset questions: activate different field types, assert different preset questions returned.

### 6.5 AI Context Builder (`aiContextBuilder`)

- `buildFieldContext` extracts label, type, value, options from DOM
- `buildProjectContext` extracts relevant project data
- `buildBorrowerContext` extracts borrower data
- `generatePresetQuestions` returns relevant questions per field
- DOM lookup retries (field may not be rendered yet)

#### How to test

**Unit (Vitest):** For `buildFieldContext`: create a mock DOM element with `data-field-label="Loan Amount"`, `data-field-type="currency"`, `data-field-value="5000000"`. Call `buildFieldContext('loanAmount')`. Assert returned object has `{ label: 'Loan Amount', type: 'currency', value: '5000000' }`. Use `vi.stubGlobal('document', ...)` or jsdom. For `buildProjectContext`: pass a mock project object, assert it extracts deal type, asset class, location, loan amount. For `generatePresetQuestions`: call with `fieldId = 'assetType'`, assert questions include "What asset type should I select?"

---

## 7. Chat and Collaboration

### 7.1 Thread Management

- Create thread with topic and participant list
- List threads for a project
- Resolve thread (mark as resolved)
- Delete thread

#### How to test

**Backend (pytest):** Test `POST /api/v1/chat/threads` with `action: 'create'`. Assert thread row created with correct `project_id` and `topic`. Assert participants added. Test `action: 'resolve'` -- assert thread status updated. Test `action: 'delete'` -- assert thread deleted. Tests exist in `tests/test_endpoints/test_chat.py` -- extend coverage.

**E2E (Playwright):** Navigate to workspace, open chat. Click "New Channel". Fill topic, select members. Submit. Assert new thread appears in thread list. Click on it, assert it's active. Delete it, assert it's gone.

### 7.2 Messaging

- Send text message: appears immediately (optimistic)
- Message status: `sending` -> `delivered` or `failed`
- Reply to a message (reply chain)
- Send image (paste or upload)
- @mention another user (parsed from rich text)
- Attach project document to message

#### How to test

**E2E (Playwright):** Open a chat thread. Type a message in the input. Press Enter. Assert the message appears in the list immediately (optimistic). Wait for the status to change from sending to delivered (look for a checkmark or status indicator). For reply: hover a message, click reply, type reply text, submit, assert it appears as a reply. For @mention: type `@` in the input, assert autocomplete dropdown appears, select a user, submit, assert message contains mention.

**Backend (pytest):** Test `POST /api/v1/chat/messages` with `thread_id` and `content`. Assert message row created. Assert `chat_message_sent` domain event emitted. Test with `reply_to` -- assert reply chain established. Test with `image_urls` -- assert attachment created.

### 7.3 Realtime

- New message from another user appears without refresh
- Participant added/removed updates in real-time
- Unread count increments when message arrives in inactive thread
- Unread count resets when thread is opened (`markThreadRead`)
- Total unread count aggregates across all threads
- Message deduplication: `client_request_id` prevents duplicates
- Content + timestamp fallback dedup

#### How to test

**Integration (Vitest):** Test at the store level. Set up `useChatStore` with a mock realtime channel. Simulate an incoming message event on the channel. Assert the message appears in `messages` state. Simulate a duplicate (same `client_request_id`), assert it's NOT added twice. Simulate message on inactive thread, assert `threadUnreadCounts` increments. Call `markThreadRead`, assert unread resets to 0.

**E2E (Playwright):** Use two browser contexts (User A, User B). User A sends a message. In User B's browser, assert the message appears without refresh. Assert User B's unread badge incremented before opening the thread.

### 7.4 Chat Store (`useChatStore`)

- `loadThreadsForProject` fetches threads
- `setActiveThread` loads messages, participants, resets unread
- `sendMessage` creates optimistic message, replaces on server confirm
- Message cache: switching threads preserves loaded messages
- `subscribeToMessages` / `unsubscribeFromMessages` manage realtime channel
- `subscribeToProjectUnreadCounts` tracks project-wide unread

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useChatStore.test.ts`. Mock supabase. Test `sendMessage`: call it, assert an optimistic message appears in `messages` with `status: 'sending'`. Resolve the mock API call, assert the message is replaced with `status: 'delivered'`. Reject the mock API call, assert `status: 'failed'`. Test `setActiveThread`: set thread, assert `loadMessages` and `loadParticipants` were called, `markThreadRead` was called. Test message cache: load thread A's messages, switch to thread B, switch back to A, assert A's messages are still there without re-fetching.

### 7.5 Chat UI Components

- `ChatInterface` renders thread selector, message list, input
- `RichTextInput` supports @mentions and image paste
- `CreateChannelModal` creates new thread with selected members
- `ManageChannelMembersModal` add/remove members
- `StickyChatCard` switches between Team / AI / Meet tabs
- Collapse/expand persists in localStorage

#### How to test

**Component (Vitest + RTL):** Render `<ChatInterface projectId="test" />` with mocked `useChatStore` providing mock threads and messages. Assert thread selector shows all threads. Click a thread, assert messages list renders. Render `<StickyChatCard>`, click "AI" tab, assert `AIChatInterface` mounts. Click "Team" tab, assert `ChatInterface` mounts. Test collapse: click collapse button, assert card minimized, check `localStorage.getItem` was called with correct key.

**Component (Vitest + RTL):** Render `<RichTextInput>`. Type `@`, assert mention autocomplete would trigger (mock the callback). Simulate paste event with image data, assert `onImagePaste` callback fires.

---

## 8. Lender Matching

### 8.1 Matchmaking Engine

- `POST /api/v1/matchmaking/run/{project_id}` runs matchmaking
- Returns 202 with `run_id`, `visualization_data`, `scores`
- Scores computed based on asset type, deal type, capital type, debt range, location overlap
- `ensureMinimumGreenDots` boosts top lenders when <2 have green scores

#### How to test

**Backend (pytest):** Test `POST /api/v1/matchmaking/run/{project_id}` -- mock the matchmaking engine, assert 202 with `run_id`. Test the engine directly: pass a project with asset_type=Multifamily and lenders with various asset types, assert scores reflect overlap. Test `ensureMinimumGreenDots`: pass scores where only 1 lender is green, assert a second lender gets boosted.

### 8.2 Match Filters

- `AssetTypeFilter`: multi-select chips filter by asset class
- `DealTypeFilter`: multi-select chips filter by deal type
- `CapitalTypeFilter`: multi-select chips filter by capital type
- `DebtRangeFilter`: multi-select chips filter by debt range
- `LocationFilter`: multi-select chips filter by geography
- Filters update match scores in real-time
- Reset filters restores full list

#### How to test

**Component (Vitest + RTL):** Render `<AssetTypeFilter value={[]} onChange={mockFn} />`. Assert all asset type chips render. Click "Multifamily" chip, assert `onChange` called with `['Multifamily']`. Repeat for each filter type. Test `<FilterSection>` with `filterType='assetType'`, assert it delegates to `AssetTypeFilter`.

**E2E (Playwright):** Navigate to lender matching page. Select "Multifamily" filter. Assert lender list updates (fewer or re-sorted results). Click "Reset", assert full list restored.

### 8.3 Lender Visualization

- `LenderGraph` renders canvas-based force graph with lender nodes
- Node color reflects match score (green/yellow/red)
- Click node shows `lender-detail-card`
- Hover highlights connections
- `MatchExplorer3D` renders 3D match visualization

#### How to test

**Component (Vitest + RTL):** Render `<LenderGraph lenders={mockLenders} formData={mockFormData} />`. Assert canvas element exists. Since canvas internals can't be queried via DOM, focus on: component mounts without error, resize handler attached, `onLenderClick` callback fires when simulated. For `MatchExplorer3D`: assert it mounts without error (dynamic import).

**E2E (Playwright):** Navigate to Lender Match tab. Assert graph canvas is visible. Use Playwright screenshot comparison to assert the graph renders (visual regression). Click on a node area, assert detail card appears.

### 8.4 Lender Store (`useLenderStore`)

- `loadLenders` fetches lender list
- `setFilters` recalculates match scores and sorts
- `saveLender` / `removeSavedLender` persists to localStorage
- No duplicates in saved lenders

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useLenderStore.test.ts`. Mock lender service. Test `loadLenders`: call it, assert `lenders` state populated. Test `setFilters({ assetTypes: ['Multifamily'] })`: assert `filteredLenders` re-sorted by score, `calculateMatchScores` was invoked. Test `saveLender`: save lender A, save lender A again, assert `savedLenders` has only one entry. Test `removeSavedLender`: save then remove, assert empty.

### 8.5 Lender Utilities (`lenderUtils`)

- `parseDebtRange` handles all formats ($0-$5M, $100M+, etc.)
- `calculateMatchScores` computes overlap-based scores
- `deriveDebtRange` from loan amount
- `formatToMillion` formatting

#### How to test

**Unit (Vitest):** Create `src/utils/__tests__/lenderUtils.test.ts`. Test `parseDebtRange('$0-$5M')` -> `{ min: 0, max: 5000000 }`. Test `parseDebtRange('$100M+')` -> `{ min: 100000000, max: Infinity }`. Test `calculateMatchScores` with a project that matches one lender perfectly and another not at all -- assert scores reflect. Test `deriveDebtRange(15000000)` -> correct range string. Test `formatToMillion(5000000)` -> `'$5M'`.

### 8.6 Wishlist

- Add lender to wishlist (`POST /{project_id}/wishlist`)
- Remove lender from wishlist (`DELETE /{project_id}/wishlist/{lei}`)
- List wishlist (`GET /{project_id}/wishlist`)

#### How to test

**Backend (pytest):** Test all three endpoints. Add a lender, then list, assert it's there. Remove it, list again, assert empty. Test adding duplicate -- assert conflict or idempotent behavior.

### 8.7 AI Lender Report

- `POST /api/v1/matchmaking/ai-report/generate` generates AI report for match run
- Report displays in `LenderAIReport` component

#### How to test

**Backend (pytest):** Test `POST /api/v1/matchmaking/ai-report/generate` with mock LLM client. Assert 202 returned. Assert report content is generated and stored.

**Component (Vitest + RTL):** Render `<LenderAIReport projectId="test" project={mockProject} />` with mocked hook that returns a report. Assert report content is displayed. Test loading state. Test error state.

---

## 9. Operational Metrics (OM) Dashboard

### 9.1 OM Data Loading

- `getLatestOM` fetches OM content for project
- `normalizeOMContent` transforms flat JSONB into rich nested structure
- Handles `PGRST116` (no data) gracefully
- Insights extraction from OM content

#### How to test

**Unit (Vitest):** Test `normalizeOMContent` with a flat JSONB input (mock from `mockOMData.ts`). Assert output has nested structure: `marketContextDetails.demographicProfile`, `assetProfileDetails.amenities`, etc. Test with empty input -- assert no crash, returns empty sections. Test `PGRST116` handling: mock supabase to return this error code, assert `getLatestOM` returns null gracefully.

### 9.2 OM Insights Generation

- `POST /api/v1/projects/{project_id}/om/generate-insights` triggers insight generation
- Returns 200 if insights already exist, 202 if job started

#### How to test

**Backend (pytest):** Test `POST /projects/{id}/om/generate-insights` -- mock OM repository. When insights exist, assert 200 with `already_has_insights: true`. When no insights, assert 202 with `job_id`. Test with invalid project_id -- assert 404.

### 9.3 OM Pages (24 pages total)

- **Overview**: quadrant grid, metric cards, AI insights bar, image slideshow, population heatmap
- **Market Context**: demographics, employment, supply-demand, regulatory incentives
- **Asset Profile**: amenities, unit mix, comparables, media, site plan
- **Deal Snapshot**: capital stack, key terms, milestones, risk analysis
- **Financial Sponsor**: returns, sources & uses, borrower info, sponsor profile
- Each page loads data from `useOMData` hook
- Each page renders correct widgets and charts
- Scenario switching (base/upside/downside) updates displayed data

#### How to test

**E2E (Playwright):** Seed a project with OM data. Navigate to `/project/om/[id]/dashboard`. Assert overview loads with metric cards visible. Navigate to each sub-page (market-context, asset-profile, deal-snapshot, financial-sponsor) and assert content renders (no blank pages, no errors). Test scenario switching: click "Upside" scenario, assert displayed values change. Use Playwright screenshots for visual regression on key pages.

**Component (Vitest + RTL):** For each page component, render with mocked `useOMData` returning fixture data. Assert key elements render (metric cards, chart containers, section headings). This gives fast feedback without needing a full browser.

### 9.4 OM Widgets

- `MetricCard` renders value with correct format (currency/percent/number)
- `MetricCard` shows trend indicator (up/down arrow)
- `MiniChart` renders line, bar, or pie chart based on `type` prop
- `QuadrantGrid` lays out children in grid pattern

#### How to test

**Component (Vitest + RTL):** Render `<MetricCard label="NOI" value={1500000} format="currency" />`. Assert text "$1,500,000" or "$1.5M" is displayed. Render with `change={0.05}`, assert up arrow visible. Render with `change={-0.03}`, assert down arrow. Render `<MiniChart type="line" data={mockData} />`, assert SVG or canvas element exists (Recharts renders SVG). Render `<MiniChart type="bar">`, assert bar chart elements.

### 9.5 OM Maps and Visualizations

- `PopulationHeatmap` renders Leaflet map with heatmap overlay
- `EmploymentMap` shows employment data on map
- `SupplyDemandMap` visualizes supply/demand
- `ZoningMap` shows zoning data
- `ReturnsCharts` renders Recharts charts for financial returns
- `ImageSlideshow` cycles through project images

#### How to test

**Component (Vitest + RTL):** Leaflet maps require a DOM container. Mock `leaflet` at the module level (`vi.mock('leaflet')`). Render `<PopulationHeatmap data={mockData} />`, assert the map container div renders and `L.map()` was called. For `ReturnsCharts`: render with mock data, assert Recharts SVG container exists. For `ImageSlideshow`: render with 3 mock image URLs, assert first image displayed, click next, assert second image displayed.

**E2E (Playwright):** Navigate to OM pages with maps. Assert map container is visible and has rendered tiles (check for Leaflet tile class). Take screenshot for visual regression baseline.

### 9.6 OM Chat

- `OMChatCard` / `OMChatSidebar` allows AI Q&A about OM data
- Collapse/expand persists in localStorage

#### How to test

**Component (Vitest + RTL):** Render `<OMChatCard projectId="test" />`. Assert it renders in expanded state by default. Click collapse, assert it minimizes. Mock `localStorage.setItem`, assert collapse state persisted. Re-render with localStorage returning collapsed state, assert it starts collapsed.

### 9.7 OM Field Logging

- `POST /api/v1/projects/{project_id}/om/log-field-access` logs field access
- `GET /api/v1/projects/{project_id}/om/field-access-summary` returns missing/fallback counts

#### How to test

**Backend (pytest):** Test `POST /projects/{id}/om/log-field-access` with a list of field access records. Assert they are stored. Test `GET /projects/{id}/om/field-access-summary` -- assert it returns correct `totalMissing` and `totalFallback` counts based on the logged data.

### 9.8 OM Utilities

- `getNumericValue` / `parseNumeric` handle numeric parsing
- `normalizeScenarioData` normalizes scenario data
- `formatCurrency` / `formatPercentage` format correctly

#### How to test

**Unit (Vitest):** Test `parseNumeric('$1,500,000')` -> `1500000`. Test `parseNumeric('5.5%')` -> `0.055` or `5.5` depending on implementation. Test `formatCurrency(1500000)` -> `'$1,500,000'` or `'$1.5M'`. Test `formatPercentage(0.055)` -> `'5.5%'`. Test `normalizeScenarioData` with base/upside/downside data, assert consistent structure.

---

## 10. Team Management

### 10.1 Members

- Team page lists all org members with roles
- Owner can edit member permissions
- Owner can remove member (except last owner)
- Member can edit their own name (inline edit)
- Member card shows name, email, role

#### How to test

**E2E (Playwright):** Login as org owner. Navigate to `/team`. Assert all members listed with names, emails, roles. Click "Remove" on a member, confirm, assert member disappears from list. Try to remove the last owner -- assert error message. For name edit: login as member, navigate to `/team`, click edit on own name, type new name, save, assert name updates.

**Component (Vitest + RTL):** Render `<MemberCard>` with mock member data. Assert name, email, role displayed. Render `<OwnerView>` with mock members and invites, assert member list and pending invites sections both render.

### 10.2 Invitations

- Owner can invite by email with role selection
- `InviteMemberModal` supports project-level permission grants
- Pending invites shown with cancel option
- `POST /api/v1/users/invite` creates invite with token
- `POST /api/v1/users/cancel-invite/{id}` cancels invite

#### How to test

**E2E (Playwright):** Login as owner, navigate to `/team`. Click "Invite Member". Fill email, select role, optionally set project grants. Submit. Assert pending invite appears in the list. Click "Cancel" on the invite, assert it disappears.

**Backend (pytest):** Test `POST /api/v1/users/invite` -- assert invite row created with correct email, role, token. Assert notification event emitted. Test `POST /api/v1/users/cancel-invite/{id}` -- assert invite status set to cancelled.

**Component (Vitest + RTL):** Render `<InviteMemberModal isOpen={true} />` with `allowProjectInvites={true}`. Assert email input, role selector, and project grant section all render. Fill and submit, assert `onInvite` callback called with correct payload.

### 10.3 Org Store (`useOrgStore`)

- `loadOrg` fetches org, members, invites
- `loadOrg` skips if same org already loaded
- `isOwner` correctly set based on current user role
- `removeMember` blocks removing last owner
- `updateMemberPermissions` calls RPC
- `acceptInvite` triggers auth store reload

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useOrgStore.test.ts`. Mock supabase. Test `loadOrg`: mock org + members + invites queries, call action, assert state populated. Call again with same org ID, assert supabase NOT called again (skip). Test `isOwner`: set current user as owner in members, assert `isOwner === true`. Set as member, assert `false`. Test `removeMember`: mock members with only one owner, call `removeMember` with that owner ID, assert it throws or rejects. Test `updateMemberPermissions`: mock RPC, call action, assert `supabase.rpc('bulk_update_member_permissions')` was called with correct payload.

---

## 11. Permissions (End-to-End)

This is a dedicated section for the complete permission system since it spans UI, RPCs, DB triggers, domain events, and notifications.

### 11.1 Permission Data Model

- `permissions` table stores `(resource_id, user_id, permission)` with values `view`, `edit`, `none`
- `project_access_grants` table links users to projects
- `resources` table forms a tree: `PROJECT_RESUME`, `BORROWER_RESUME`, `PROJECT_DOCS_ROOT`, `BORROWER_DOCS_ROOT`, `UNDERWRITING_TEMPLATES_ROOT`, `FOLDER`, `FILE`
- Permissions are hierarchical: most specific grant wins over ancestors

#### How to test

**RLS (Supabase local):** These are structural assumptions verified by the trigger and RPC tests below. No separate tests needed for the data model itself -- it's tested transitively.

### 11.2 Effective Permission Resolution (`get_effective_permission`)

- Org owner always gets `edit` regardless of explicit grants
- Lender with project access on underwriting docs gets `view`
- Explicit grant on the exact resource wins over parent grants
- Grant of `none` explicitly blocks access (returns NULL)
- No grant at any level returns NULL (no access)
- File-level override beats folder-level, which beats root-level

#### How to test

**RLS (Supabase local):** Spin up local Supabase (`supabase start`) and run `npm run seed:hoque`. Use the seeded users: Param Vora (borrower/owner), Kabeer Merchant (team member), Cody Field (advisor), Capital Lending Group (lender). Use `supabase.rpc('get_effective_permission', { p_user_id: paramId, p_resource_id: resume })` and assert `edit` (owner). Call for Kabeer with existing grants -- assert the seeded permission level. Test permission inheritance: add file-level override `none` on one file for Kabeer, assert NULL for that file but original level for others. Grant `edit` on that file specifically, assert `edit` overrides root level. Test lender: verify lender org's seeded project access grants give `view` on underwriting docs.

### 11.3 Permission Changes via `set_permission_for_resource` (ShareModal)

#### DB-level changes

- INSERT `(resource_id, user_id, 'view')` creates new `view` permission
- INSERT `(resource_id, user_id, 'edit')` creates new `edit` permission
- UPDATE from `none` to `view` grants access
- UPDATE from `none` to `edit` grants access
- UPDATE from `view` to `edit` upgrades access
- UPDATE from `edit` to `view` downgrades access
- UPDATE from `view`/`edit` to `none` revokes access

#### Domain events emitted (trigger: `trg_permission_change_event`)

- INSERT with `view` or `edit` on a FILE/docs root -> emits `document_permission_granted`
- INSERT with `view` or `edit` on a PROJECT_RESUME/BORROWER_RESUME -> emits `resume_permission_granted`
- UPDATE from `none` to `view`/`edit` on docs -> emits `document_permission_granted`
- UPDATE from `view` to `edit` on docs -> emits `document_permission_changed` (with `old_permission: view`, `new_permission: edit`)
- UPDATE from `none` to `view`/`edit` on resume -> emits `resume_permission_granted`
- Docs root permission cascade: when permission set on `PROJECT_DOCS_ROOT`, trigger emits `document_permission_granted` for all FILE descendants without explicit grants
- No event emitted for downgrade (`edit` -> `view`) or revoke (`view`/`edit` -> `none`)

#### Actual access changes

- After `none` -> `view`: user CAN read the resource, CANNOT edit
- After `none` -> `edit`: user CAN read AND edit the resource
- After `view` -> `edit`: user gains edit capability
- After `edit` -> `view`: user loses edit capability but retains read
- After `view`/`edit` -> `none`: user loses all access
- Changes are immediate (RLS evaluates on next query)

#### How to test

**RLS (Supabase local):** For each transition, call the RPC as the org owner and verify:

1. **DB changes:** Query `permissions` table to assert the row was inserted/updated with the correct value.
2. **Domain events:** Query `domain_events` table filtered by `resource_id` and `affected_user_id`. Assert the correct event type (`document_permission_granted`, `document_permission_changed`, `resume_permission_granted`) and payload fields (`old_permission`, `new_permission`). Assert NO event for downgrades and revokes.
3. **Actual access:** Switch to a Supabase client authenticated as User B. Attempt `SELECT` on the resource (e.g., `supabase.from('resources').select().eq('id', resourceId)`). Assert it succeeds for `view`/`edit`, fails for `none`. Attempt `UPDATE` -- assert it succeeds only for `edit`.
4. **Cascade:** Set permission on `PROJECT_DOCS_ROOT`. Query `domain_events` and assert `document_permission_granted` events exist for each FILE descendant that had no explicit grant.

### 11.4 Bulk Permission Changes via `bulk_update_member_permissions` (Team Page)

#### Payload validation

- Accepts array of `{ projectId, permissions: [{ resource_type, permission }], fileOverrides: [{ resource_id, permission }] }`
- Only callable by org owner (SECURITY DEFINER with `is_org_owner()` check)

#### DB-level changes

- Upserts `project_access_grants` for each project in payload
- Upserts root-level `permissions` for each `resource_type` (PROJECT_RESUME, BORROWER_RESUME, PROJECT_DOCS_ROOT, etc.)
- Upserts file-level `permissions` for each `fileOverride`
- File overrides are applied BEFORE root permissions (order matters for trigger behavior)
- Projects NOT in the payload: `project_access_grants` and `permissions` for that user are DELETED (revoked)

#### Domain events emitted

- `project_access_granted` emitted via `trg_project_access_grant_event` on INSERT into `project_access_grants`
- Individual permission triggers fire for each upserted `permissions` row (same events as 11.3)
- Revocation (DELETE) does NOT emit domain events

#### Actual access changes

- User gains access to newly added projects
- User loses access to removed projects
- Per-resource permissions updated atomically
- Lender previously with no access -> granted `view` on PROJECT_RESUME -> can now read resume

#### How to test

**RLS (Supabase local):** As org owner, call `supabase.rpc('bulk_update_member_permissions', { p_org_id, p_user_id: memberB, p_project_grants: [...] })`. Then:

1. Query `project_access_grants` -- assert rows exist for each project in payload.
2. Query `permissions` -- assert root permissions match payload.
3. Query `permissions` for file overrides -- assert file-level grants match.
4. Query `domain_events` -- assert `project_access_granted` for new projects, individual permission events for each resource.
5. Switch to Member B's client. Assert they can access granted resources and CANNOT access non-granted ones.
6. **Revocation test:** Call again WITHOUT Project B in the payload. Assert `project_access_grants` for Project B is DELETED. Assert Member B can no longer query Project B resources. Assert NO domain event for the revocation.

**Security test:** Authenticate as a non-owner member. Call the RPC. Assert it rejects (SECURITY DEFINER + `is_org_owner()` check).

### 11.5 Permission on Project Creation (`grant_project_access`)

- Creator gets `edit` on all root resources
- Org owners get `edit` on all root resources
- Assigned advisor gets appropriate underwriting permissions
- Initial grants from invite (`initial_grants`) applied per-project

#### How to test

**Backend (pytest):** Test `POST /api/v1/projects/create`. Mock the supabase calls. Assert `grant_project_access` is called for: (1) the creator, (2) each org owner, (3) the assigned advisor (if any). Assert initial_grants from the request payload are passed through. Verify the correct `permissions` entries would be created.

**RLS (Supabase local):** Create a project via the API. Switch to the creator's client. Assert they can read and edit all root resources. Switch to another org owner's client. Assert same access. Switch to a non-member. Assert no access.

### 11.6 Permission on Invite Acceptance

- `POST /api/v1/auth/accept-invite` calls `grant_project_access` for projects in invite
- File-level exclusions (from invite `fileOverrides`) applied as `none`
- Domain events: `project_access_granted` for each project, plus individual permission events

#### How to test

**Backend (pytest):** Test `POST /api/v1/auth/accept-invite` with an invite that has project grants. Assert `grant_project_access` called for each project. Assert file-level exclusions (from `fileOverrides` with `none`) are applied. Query `domain_events` mock to assert `project_access_granted` events emitted.

**E2E (Playwright):** Use the seeded team member `kabeer.merchant@capmatch.com` who already has project access. Login as Kabeer, navigate to the "SoGood Apartments" project workspace. Assert resume is visible (based on seeded permission level). Assert documents are accessible. For invite-specific testing: login as `param.vora@capmatch.com` (org owner), create a new invite via the team management UI, then verify the invite row appears in the invites list. Full invite-accept flow requires a fresh email -- defer to integration test level.

### 11.7 Permission Store (`usePermissionStore`)

- `loadPermissionsForProject(projectId)` calls `get_all_user_permissions_for_project` RPC
- Returns `Record<resource_id, 'view' | 'edit'>` for current user
- Skips reload if same project and not forced
- `getPermission(resourceId)` returns `null` for no permission
- `resetPermissions()` clears state on project change

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/usePermissionStore.test.ts`. Mock supabase RPC. Test `loadPermissionsForProject('proj-1')`: mock `get_all_user_permissions_for_project` to return `[{ resource_id: 'r1', permission: 'view' }, { resource_id: 'r2', permission: 'edit' }]`. Assert `permissions` state is `{ r1: 'view', r2: 'edit' }`. Call `getPermission('r1')` -- assert `'view'`. Call `getPermission('unknown')` -- assert `null`. Call `loadPermissionsForProject('proj-1')` again without force -- assert RPC NOT called (skipped). Call with force=true -- assert RPC called. Test `resetPermissions()` -- assert `permissions` is empty.

### 11.8 Permission Hook (`usePermissions`)

- `usePermissions(resourceId)` returns `{ permission, canView, canEdit, isLoading }`
- `canView` is true for `view` OR `edit`
- `canEdit` is true only for `edit`
- Returns `{ canView: false, canEdit: false }` when no permission

#### How to test

**Unit (Vitest):** Use `renderHook`. Mock `usePermissionStore` to return `{ permissions: { r1: 'view' } }`. Call `usePermissions('r1')` -- assert `{ permission: 'view', canView: true, canEdit: false }`. Call `usePermissions('r2')` (missing) -- assert `{ permission: null, canView: false, canEdit: false }`. Mock permission `'edit'`, assert `canView: true, canEdit: true`.

### 11.9 Permission Editor Hook (`useProjectPermissionEditor`)

- Manages `ProjectGrant[]` with per-project and per-file permissions
- `setProjectLevel(projectId, resourceType, permission)` updates root permission
- `setResourcePermission(projectId, resourceId, permission)` sets file override
- `setProjectDocPermission(projectId, resourceId, permission)` sets doc permission
- Loads project docs tree from `resources` table for file override UI

#### How to test

**Integration (Vitest):** Use `renderHook(() => useProjectPermissionEditor(orgId, memberId))`. Mock supabase to return project list with resources. Call `setProjectLevel('proj-1', 'PROJECT_RESUME', 'view')`, assert internal state updated. Call `setResourcePermission('proj-1', 'file-1', 'none')`, assert file override added. Assert the hook's `getProjectGrants()` returns the correct payload shape for `bulk_update_member_permissions`.

### 11.10 Permission UI Components

#### EditMemberPermissionsModal (Team page)

- Loads current permissions for the member being edited
- Displays per-project accordion with root-level + file-level toggles
- Saving calls `bulk_update_member_permissions` RPC
- After save: member's access changes immediately
- After save: domain events emitted for each new/changed grant
- After save: notifications delivered to affected user

**How to test (Component, Vitest + RTL):** Render `<EditMemberPermissionsModal isOpen={true} member={mockMember} orgId="org-1" />`. Mock `useProjectPermissionEditor` hook. Assert project accordion renders with permission toggles. Change a toggle (e.g., PROJECT_RESUME from none to view). Click save. Assert `onUpdate` callback called with the correct `ProjectGrant[]` payload matching what was toggled.

#### ShareModal (Document sharing)

- Shows current permissions per user for the resource
- Distinguishes inherited (from parent) vs explicit (direct) permissions
- Changing permission calls `set_permission_for_resource` RPC
- After change: user gains/loses access immediately
- After change: domain event emitted for grant/upgrade
- `get_effective_permissions_for_resource` shows effective permission per user

**How to test (Component, Vitest + RTL):** Render `<ShareModal resource={mockResource} isOpen={true} projectId="proj-1" />`. Mock `get_effective_permissions_for_resource` RPC to return `[{ user_id: 'u1', permission: 'view', is_inherited: true }, { user_id: 'u2', permission: 'edit', is_inherited: false }]`. Assert User 1 shows "view (inherited)" and User 2 shows "edit (direct)". Change User 1's permission to "edit" via the toggle. Assert `set_permission_for_resource` RPC called with `(resource_id, u1, 'edit')`.

#### AccessControlTab (Project workspace)

- Shows member list with per-member permission levels
- Uses `ProjectPermissionDetailPanel` for detailed per-resource editing
- Supports lender access grants (add/remove lender org)

**How to test (Component, Vitest + RTL):** Render `<AccessControlTab projectId="proj-1" />` with mocked stores. Assert member list renders with permission levels. Click "Add Lender", assert `AddLenderToProjectModal` opens. Mock the modal submission, assert lender access grant API is called.

#### UploadPermissionsModal (Document upload)

- Sets permissions for newly uploaded files
- Permissions applied after upload completes
- Users selected get `view` or `edit` on the new file

**How to test (Component, Vitest + RTL):** Render `<UploadPermissionsModal />` with mock member list. Select two users, set one to "view" and one to "edit". Confirm. Assert `onConfirm` called with `[{ user_id: 'u1', permission: 'view' }, { user_id: 'u2', permission: 'edit' }]`.

#### NewProjectAccessModal (Project creation)

- Sets initial grants for org members on new project
- Grants applied via `grant_project_access` during creation

**How to test (Component, Vitest + RTL):** Render `<NewProjectAccessModal isOpen={true} />` with mock org members. Set permission levels for each member. Submit. Assert the callback receives correct `initial_grants` payload.

### 11.11 Permission Notification Delivery (notify-fan-out)

#### `handle_project_access_granted`

- Creates in-app notification with project name and permission level
- Queues immediate email notification
- Skips if user has muted notifications for that project
- Payload includes: `project_id`, `project_name`, `new_permission`, `granted_by`

#### `handle_project_access_changed`

- Creates in-app notification
- Email queued ONLY for upgrades (view -> edit), NOT downgrades
- Payload includes: `project_id`, `project_name`, `old_permission`, `new_permission`

#### `handle_document_permission_granted`

- Creates in-app notification with document/resource name
- No email (in-app only)
- Payload includes: `resource_id`, `resource_name`, `new_permission`

#### `handle_document_permission_changed`

- Creates in-app notification ONLY for upgrades (view -> edit)
- No email
- Payload includes: `resource_id`, `resource_name`, `old_permission`, `new_permission`

#### `handle_resume_permission_granted`

- Creates in-app notification for resume access
- No email
- Payload includes: `resource_id`, `resource_name`, `new_permission`

#### How to test all 5 handlers

**Notification (pytest in capmatch-notifs-gcp):** For each handler, create a unit test that:

1. Constructs a mock `domain_event` with the correct event type and payload.
2. Calls the handler function directly.
3. Asserts `user_notifications` INSERT was called with correct `user_id`, `notification_type`, and body text.
4. For `handle_project_access_granted`: asserts email was queued (check email_digest_tracking INSERT).
5. For `handle_project_access_changed`: asserts email queued ONLY when `old_permission='view'` and `new_permission='edit'`; NOT queued for downgrade.
6. For `handle_document_permission_changed`: asserts notification created ONLY for upgrade (view->edit), NOT for downgrade.
7. Tests user preference: mock user with muted project, assert handler skips notification.
8. Tests `DRY_RUN` mode: assert handler processes but does NOT insert into `user_notifications`.

### 11.12 Permission E2E Scenarios (Playwright)

#### Scenario A: Grant document access via ShareModal

1. Owner opens ShareModal for a document
2. Sets permission for Member B from (none) -> `view`
3. Assert: `permissions` row created with `view`
4. Assert: `domain_events` has `document_permission_granted` event
5. Assert: Member B receives in-app notification
6. Assert: Member B can now view the document
7. Assert: Member B CANNOT edit the document

#### Scenario B: Upgrade document access via ShareModal

1. Member B already has `view` on a document
2. Owner upgrades to `edit` via ShareModal
3. Assert: `permissions` row updated to `edit`
4. Assert: `domain_events` has `document_permission_changed` (old: view, new: edit)
5. Assert: Member B receives in-app notification
6. Assert: Member B can now edit the document

#### Scenario C: Revoke document access via ShareModal

1. Member B has `edit` on a document
2. Owner sets to `none` via ShareModal
3. Assert: `permissions` row updated to `none`
4. Assert: NO domain event emitted (revocation is silent)
5. Assert: Member B CANNOT view or edit the document

#### Scenario D: Bulk permission update via Team page

1. Owner opens EditMemberPermissionsModal for Member B
2. Grants `view` on Project Resume, `edit` on Project Docs, file override `none` on sensitive doc
3. Saves via `bulk_update_member_permissions`
4. Assert: `project_access_grants` row created
5. Assert: `permissions` rows match payload
6. Assert: `domain_events` has `project_access_granted` + individual permission events
7. Assert: Member B can view resume, edit docs, CANNOT see sensitive doc
8. Assert: Member B receives notifications for each grant

#### Scenario E: Remove project from member's grants

1. Member B has access to Project A and Project B
2. Owner edits permissions, removes Project B from payload
3. Assert: `project_access_grants` for Project B deleted
4. Assert: `permissions` for Project B resources deleted
5. Assert: Member B can no longer access Project B
6. Assert: NO domain event for revocation

#### Scenario F: Invite with project grants

1. Owner invites new member with specific project grants (PROJECT_RESUME: view, PROJECT_DOCS_ROOT: edit)
2. New member accepts invite
3. Assert: `project_access_grants` created
4. Assert: `permissions` match invite grants
5. Assert: `domain_events` has `project_access_granted`
6. Assert: New member has correct access levels

#### Scenario G: Permission inheritance (docs root -> file descendants)

1. Owner grants `view` on `PROJECT_DOCS_ROOT` for Member B
2. Assert: Member B can view all files under that root (inherited)
3. Owner sets file override `none` on one specific file
4. Assert: Member B CANNOT view that specific file
5. Assert: Member B CAN still view all other files under the root

#### Scenario H: Lender project access

1. Admin grants lender org access to project (`POST /admin/grant-lender-project-access`)
2. Assert: Lender can view project on their dashboard
3. Assert: Lender has `view` on underwriting docs
4. Admin revokes access (`POST /admin/revoke-lender-project-access`)
5. Assert: Lender can no longer see the project

#### How to test all 8 E2E scenarios

**Playwright setup:** Create `e2e/tests/permissions.spec.ts`. The seed script (`npm run seed:hoque`) provides all the data. No seeding needed in `beforeAll`.

- **Owner:** `param.vora@capmatch.com` (or `jeff.richmond@capmatch.com` -- both are borrower org owners)
- **Member:** `kabeer.merchant@capmatch.com` (team member with project access)
- **Advisor:** `cody.field@capmatch.com` (has edit on underwriting docs)
- **Lender:** `lender@capmatch.com` (has project access grants)
- **Project:** "SoGood Apartments" with full resources tree (resume, docs root, files)

**DB assertions in E2E:** Use a Supabase service-role client (`createClient(url, serviceRoleKey)`) within the Playwright test to query `permissions`, `project_access_grants`, and `domain_events` tables directly after each UI action.

**Two-browser pattern (Scenarios A-C, G):** Use `browser.newContext()` for Owner (`param.vora`) and `browser.newContext()` for Member (`kabeer.merchant`) with separate auth sessions. Owner performs the action in their browser. Assert DB state via service client. Then switch to Member's browser to verify access (e.g., navigate to the document URL and check if the document appears in the list or is editable).

**Notification assertion:** After a permission change, either:

- Query `user_notifications` via service client and assert a row exists for Member B with correct type, OR
- In Member B's browser, check the notification bell for a new notification (click bell, assert notification text matches).

**Timing:** Permission changes are immediate at the DB level, but notifications go through `notify-fan-out` (1-min cron). In E2E, either:

- Trigger fan-out manually via a test endpoint, OR
- Query `domain_events` directly (faster, confirms the event was created -- the fan-out is tested separately in Section 17).

---

## 12. Notifications (renumbered from 11)

### 12.1 In-App Notifications

- `NotificationBell` shows unread count badge
- Dropdown lists recent notifications
- Click notification navigates to relevant page
- Mark notification as read (individual or bulk)
- Realtime: new notification appears without refresh

#### How to test

**Component (Vitest + RTL):** Render `<NotificationBell isOpen={true} />` with mocked `useNotifications` returning 5 unread notifications. Assert badge shows "5". Assert dropdown lists all 5 with titles. Click one, assert `onNavigate` called with correct URL. Click "Mark all read", assert all marked.

**E2E (Playwright):** Trigger a domain event (e.g., send a chat message to a user). Wait briefly. Assert the notification bell badge appears. Click it, assert notification in the dropdown. Click the notification, assert navigation to the correct page.

### 12.2 Toast Notifications

- `NotificationToast` appears for new events
- Progress bar shows auto-dismiss timer
- Pause on hover
- Click to navigate
- Dismiss button

#### How to test

**Component (Vitest + RTL):** Render `<NotificationToast notification={mockNotification} duration={5000} />` with `vi.useFakeTimers()`. Assert toast visible. Advance timer by 5s, assert `onDismiss` called. Re-render, hover on the toast (`fireEvent.mouseEnter`), advance timer by 10s, assert `onDismiss` NOT called (paused). Mouse leave, advance timer, assert dismissed. Click toast, assert `onNavigate` called. Click dismiss button, assert `onDismiss` called immediately.

### 12.3 Notification Preferences

- `NotificationSettingsPanel` shows global + per-project toggles
- Mute all notifications for a project
- Load/save preferences

#### How to test

**Component (Vitest + RTL):** Render `<NotificationSettingsPanel />` with mocked `useNotificationPreferences` returning current prefs. Assert global toggle and per-project toggles render. Toggle mute for a project, assert save callback called with updated prefs.

### 12.4 Notification Hook (`useNotifications`)

- Fetch notifications list
- Mark read (optimistic update)
- Realtime subscription for INSERT/UPDATE events
- Reconnect on connection loss

#### How to test

**Integration (Vitest):** Use `renderHook(() => useNotifications())`. Mock supabase. Assert initial fetch returns notification list. Call `markRead(notifId)` -- assert state immediately updates (optimistic), then assert supabase UPDATE was called. Simulate realtime INSERT event, assert new notification added to list. Simulate channel error, assert reconnection attempt.

---

## 12. Calendar and Meetings

### 13.1 Calendar OAuth

- `GET /api/v1/calendar/oauth/authorize` returns Google/Microsoft OAuth URL
- `GET /api/v1/calendar/oauth/callback` exchanges code for tokens
- `POST /api/v1/calendar/disconnect` removes connection
- Tokens stored encrypted in `calendar_connections`

#### How to test

**Backend (pytest):** Test `GET /calendar/oauth/authorize` -- assert redirect URL contains correct client_id, scopes, redirect_uri. Test `GET /callback` with mock authorization code -- mock token exchange, assert `calendar_connections` row created with encrypted tokens. Test `POST /disconnect` -- assert connection row deleted. Tests exist in `tests/test_endpoints/test_calendar.py` -- extend with token encryption assertions.

### 13.2 Meeting CRUD

- `POST /api/v1/meetings` creates meeting with participants
- `PUT /api/v1/meetings/{id}/update` updates meeting details
- `POST /api/v1/meetings/{id}/cancel` cancels meeting and calendar events
- `POST /api/v1/calendar/update-response` updates RSVP status

#### How to test

**Backend (pytest):** Test `POST /meetings` -- mock calendar_invite_service, assert meeting row created, participants added, calendar events sent. Test `PUT /meetings/{id}/update` -- assert meeting updated, calendar events updated. Test `POST /meetings/{id}/cancel` -- assert meeting cancelled, calendar events deleted. Test `POST /calendar/update-response` -- assert participant response updated.

### 13.3 Meeting Scheduling

- `POST /api/v1/meetings/availability` finds free slots across participants
- `MeetInterface` shows schedule modal with time slots
- Meeting appears in upcoming/past lists

#### How to test

**Backend (pytest):** Test `POST /meetings/availability` with mock busy periods for 3 users. Assert returned `freeSlots` are correct (gaps between busy periods). Test with no free slots -- assert empty array.

**E2E (Playwright):** Navigate to workspace, open Meet tab. Click "Schedule Meeting". Assert time slot picker renders. Select a slot, add participants, submit. Assert meeting appears in upcoming list.

### 13.4 Daily.co Video

- `POST /api/v1/daily/meeting-token` creates room token
- `GET /api/v1/daily/room/{name}` returns room details
- `DailyVideoCall` component loads Daily.co iframe
- `POST /api/v1/webhooks/daily` handles recording/transcript webhooks

#### How to test

**Backend (pytest):** Test `POST /daily/meeting-token` -- mock Daily.co API, assert token returned. Test `POST /webhooks/daily` with recording-completed payload -- assert transcript stored, `meeting-summary` triggered. Test duplicate webhook -- assert idempotent handling.

### 13.5 Meeting Summaries

- `POST /api/v1/ai/meeting-summary` generates summary from transcript
- Summary includes title, description, executive summary

#### How to test

**Backend (pytest):** Test `POST /ai/meeting-summary` with mock transcript text and mock LLM client. Assert response contains `title`, `description`, `executive_summary` fields. Test with empty transcript -- assert graceful handling.

### 13.6 Calendar Settings

- `CalendarSettingsPanel` shows connected calendars
- Connect/disconnect Google or Microsoft calendar

#### How to test

**Component (Vitest + RTL):** Render `<CalendarSettingsPanel />` with mocked `useCalendarConnections` returning one Google connection. Assert "Google Calendar - Connected" displayed. Click "Disconnect", assert disconnect callback called. Assert "Connect Microsoft" button visible.

---

## 13. Underwriting

### 14.1 Underwriting Chat

- Create thread (`POST /api/v1/underwriting/threads`)
- List threads (`GET /api/v1/underwriting/projects/{id}/threads`)
- Send message and get AI response (`POST /api/v1/underwriting/threads/{id}/messages`)
- Delete thread
- Tool output display (expand/collapse)

#### How to test

**Backend (pytest):** Test `POST /underwriting/threads` -- assert thread created. Test `POST /threads/{id}/messages` -- mock LLM client, assert AI response returned alongside user message. Test `DELETE /threads/{id}` -- assert deleted.

**E2E (Playwright):** Navigate to document editor with underwriting chat. Create a thread. Type a message. Wait for AI response (long timeout). Assert response appears. Assert tool output sections are expandable/collapsible.

### 14.2 Document Generation

- `GET /api/v1/underwriting/templates` lists available templates
- `POST /api/v1/underwriting/generate-single` generates document from template
- Generated document available for download
- Generated document correct in content and format

#### How to test

**Backend (pytest):** Test `GET /templates` -- assert template list returned. Test `POST /generate-single` -- mock `financial_generator_service`, assert document generated. Use `pdf-parse` (Python equivalent: `PyPDF2`) to assert the generated PDF contains expected text/structure.

**E2E (Playwright):** Navigate to underwriting. Select a template. Click generate. Wait for completion (use `page.waitForResponse` matching the generate endpoint, with long timeout). Assert download becomes available. Download the file (`page.waitForEvent('download')`). Assert file is non-empty and has correct extension.

### 14.3 Excel Region Extraction

- `POST /api/v1/underwriting/extract-excel-region` extracts region from Excel
- Returns data with indentation levels
- `ExcelRegionSelectorModal` lets user select sheet + range

#### How to test

**Backend (pytest):** Test `POST /extract-excel-region` with a test Excel file. Assert returned `data` matches expected cells. Assert `indentation_levels` reflect the Excel formatting.

**Component (Vitest + RTL):** Render `<ExcelRegionSelectorModal />`. Assert sheet selector and range input render. Fill in sheet name and range (e.g., "A1:D10"), submit. Assert callback called with correct params.

### 14.4 Underwriting Vault

- `UnderwritingVault` shows documents organized by stage
- Stages with accordion expand/collapse
- Add document from resume
- Copy document from existing

#### How to test

**Component (Vitest + RTL):** Render `<UnderwritingVault projectId="test" orgId="org" />` with mocked documents across 3 stages. Assert stage accordions render. Click to expand a stage, assert documents listed. Click "Add from resume", assert modal opens.

### 14.5 Underwriting Store (`useUnderwritingStore`)

- `loadThreads` fetches threads for project
- `sendMessage` creates optimistic message, replaces with server response
- `setActiveThread` loads messages
- Permission errors handled (empty threads, no error)

#### How to test

**Unit (Vitest):** Create `src/stores/__tests__/useUnderwritingStore.test.ts`. Mock API client. Test `sendMessage`: assert optimistic message in state, then mock server response, assert replaced. Test `loadThreads` with permission error (403) -- assert `threads` is empty and `error` is null (graceful). Test `setActiveThread` -- assert `loadMessages` called for that thread.

---

## 14. Lender Dashboard

### 15.1 Lender Project Access

- `POST /api/v1/users/admin/grant-lender-project-access` grants access
- `POST /api/v1/users/admin/revoke-lender-project-access` revokes access
- Lender dashboard lists only projects with granted access
- `LenderProjectWorkspace` shows read-only project data

#### How to test

**Backend (pytest):** Test `POST /admin/grant-lender-project-access` -- assert `project_access_grants` row and `permissions` rows created for lender org. Test `POST /admin/revoke-lender-project-access` -- assert rows deleted.

**E2E (Playwright):** Grant lender access via API. Login as lender. Assert project appears on `/lender/dashboard`. Navigate to project. Assert data is visible but NOT editable (no edit buttons, form fields are read-only). Revoke access. Refresh lender dashboard. Assert project is gone.

---

## 15. Advisor

### 16.1 Advisor Dashboard

- Advisor dashboard lists assigned projects
- Navigate to project workspace

#### How to test

**E2E (Playwright):** Login as advisor. Assert `/advisor/dashboard` shows assigned projects. Click a project, assert navigation to `/advisor/project/[id]`.

### 16.2 Advisor Resume

- `AdvisorResumeForm` edits advisor profile
- `AdvisorResumeView` read-only display
- `computeAdvisorCompletion` tracks progress

#### How to test

**Unit (Vitest):** Test `computeAdvisorCompletion` with various field states. Assert 0 for empty, 100 for complete.

**Component (Vitest + RTL):** Render `<AdvisorResumeForm />` with mock data. Assert fields render. Edit a field, assert onChange fires. Render `<AdvisorResumeView />`, assert read-only display.

### 16.3 Advisor Project View

- Advisor can view project workspace with `showAdvisorOnlySections`
- AI Underwriter available in document editor

#### How to test

**E2E (Playwright):** Login as advisor, navigate to assigned project. Assert advisor-only sections are visible. Navigate to document editor. Assert AI Underwriter chat is available.

---

## 16. Backend Services (FastAPI)

### 17.1 Repositories (data access)

- `user_repository`: get/create user, get profiles
- `org_repository`: get/create org, get members
- `invite_repository`: create/validate/cancel invite
- `project_repository`: CRUD projects, get with resume
- `resume_repository`: save/load project and borrower resumes, versioning
- `chat_repository`: thread CRUD, messages, participants
- `calendar_repository`: connections, events, watches
- `document_repository`: CRUD resources, versions
- `job_repository`: create/update/get background jobs
- `om_repository`: OM data access
- `underwriting_repository`: threads, messages, templates

#### How to test

**Backend (pytest):** Each repository already has test files in `tests/test_repositories/`. The pattern: mock the Supabase client (from `conftest.py`'s `mock_supabase`), call a repository method, assert the correct Supabase query was built (table, select, filters, inserts). Extend coverage for missing methods. Focus on:

- `resume_repository`: version creation, active flag management, locked fields preservation
- `chat_repository`: message dedup logic, participant management
- `document_repository`: version naming, storage path construction

### 17.2 Services (business logic)

- `extraction_service`: document extraction pipeline
- `extraction_cache`: cache hit/miss/eviction
- `unified_extraction_service`: orchestrates extraction
- `financial_generator_service`: financial document generation
- `sanity_check_config`: field validation rules
- `llm_client`: LLM calls (chat, streaming, JSON mode)
- `om_sync_service`: sync OM from resume changes
- `availability_service`: busy period calculation, free slot finding
- `calendar_invite_service`: send/update/cancel calendar invites
- `calendar_sync_service`: watch setup, attendee response sync
- `matchmaking/engine`: scoring engine
- `matchmaking/profiler`: lender profiling
- `matchmaking/deal_parser`: deal parameter extraction
- `matchmaking/visualization`: visualization data generation

#### How to test

**Backend (pytest):** For each service, mock its dependencies (repositories, external APIs) and test the business logic:

- `extraction_service`: pass a mock PDF/DOCX, assert extracted fields match expected. Test with corrupted file -- assert graceful error.
- `extraction_cache`: test cache hit (same document hash), cache miss (new document), cache eviction (if implemented).
- `financial_generator_service`: pass mock project data, assert generated document structure is correct.
- `llm_client`: mock the LLM API (litellm), test `chat()`, `stream()`, `json_mode()` methods. Assert correct prompt construction and response parsing.
- `availability_service`: pass mock busy periods for 3 users, assert `find_free_slots` returns correct gaps. Test with overlapping busy periods.
- `matchmaking/engine`: pass a project profile and 10 lender profiles, assert scores are computed correctly. This is the most critical service to test -- scores drive lender matching.
- `matchmaking/deal_parser`: pass various deal descriptions, assert extracted parameters (deal type, asset class, loan amount) are correct.

### 17.3 Health Checks

- `GET /api/v1/health` returns status, services, version
- `GET /api/v1/health/live` returns alive
- `GET /api/v1/health/ready` checks DB connection

#### How to test

**Backend (pytest):** Test `GET /health` -- assert 200 with `status`, `services`, `version` fields. Test `GET /health/live` -- assert `{ status: 'alive' }`. Test `GET /health/ready` with mock DB connected -- assert 200. Mock DB disconnected -- assert 503 with error. Tests exist in `tests/test_endpoints/test_health.py`.

---

## 17. GCP Notification Services (capmatch-notifs-gcp)

### 18.1 notify-fan-out (every 1 min)

- Polls unprocessed `domain_events`
- Atomic claim via `notification_processing` (no double-processing)
- All 14 event handlers:
  - `document_uploaded` -> in-app + email
  - `chat_message_sent` -> in-app only
  - `thread_unread_stale` -> email only
  - `meeting_invited` -> in-app
  - `meeting_updated` -> in-app
  - `meeting_reminder` -> in-app
  - `resume_incomplete_nudge` -> in-app + email
  - `invite_accepted` -> in-app + email
  - `project_access_granted` -> in-app + email
  - `project_access_changed` -> in-app + email (view->edit)
  - `document_permission_granted` -> in-app
  - `document_permission_changed` -> in-app
  - `chat_thread_participant_added` -> in-app + email
  - `resume_permission_granted` -> in-app
- User preference handling (muted users don't get notifications)
- `DRY_RUN` mode processes but doesn't persist

#### How to test

**Notification (pytest in capmatch-notifs-gcp):** Create `tests/test_notify_fan_out.py`. For each of the 14 handlers:

1. Construct a mock `domain_event` dict with correct `event_type` and `payload`.
2. Mock the Supabase client (for `user_notifications` INSERT and `email_digest_tracking` INSERT).
3. Call the handler function directly.
4. Assert `user_notifications` INSERT was called with correct fields (user_id, type, body).
5. For handlers that queue email: assert `email_digest_tracking` INSERT called. For in-app-only handlers: assert it was NOT called.
6. Test with muted user: mock `user_notification_preferences` to return muted for the project, assert handler skips.
7. Test `DRY_RUN=true`: assert handler processes but no DB inserts.

**Integration test for atomic claim:** Insert 3 domain events. Run fan-out twice concurrently (threading). Assert each event processed exactly once (check `notification_processing` table has 3 rows, not 6).

### 18.2 meeting-reminders (every 5 min)

- Creates reminder for meetings starting in 30 minutes
- Does not duplicate reminders
- Creates `domain_events` entry

#### How to test

**Notification (pytest):** Mock current time. Insert a meeting starting in 25 minutes. Run the reminder job. Assert `domain_events` row created with `event_type: 'meeting_reminder'`. Run again -- assert NO duplicate event. Insert a meeting starting in 2 hours -- assert no reminder created.

### 18.3 resume-incomplete-nudges (every 6 hours)

- Nudges for projects under completion threshold
- Tier-based nudging (different messages by completion level)
- Deduplication: don't nudge same tier twice

#### How to test

**Notification (pytest):** Seed a project at 30% completion. Run nudge job. Assert `domain_events` row with `resume_incomplete_nudge` and correct tier. Run again -- assert NOT duplicated (same tier). Update project to 60%, run again -- assert new nudge with higher tier. Update to 100% -- assert no nudge.

### 18.4 unread-thread-nudges (every 15 min)

- Detects threads with stale unread messages
- Creates `thread_unread_stale` event

#### How to test

**Notification (pytest):** Seed a thread with `unread_count > 0` and `last_message_at` older than threshold. Run nudge job. Assert `domain_events` row with `thread_unread_stale`. Seed a thread with recent messages -- assert no nudge.

### 18.5 renew-calendar-watches (daily 2 AM UTC)

- Renews Google Calendar push notification watches
- Handles token refresh

#### How to test

**Notification (pytest):** Seed a `calendar_connections` row with Google token. Mock Google Calendar API. Run renewal job. Assert Google API called with correct watch parameters. Test with expired refresh token -- assert token refresh attempted.

### 18.6 email-notifications

- Instant emails sent within 1 minute
- Hourly digest (6 AM - 6 PM Pacific)
- Daily digest
- Template rendering correct
- Resend API integration

#### How to test

**Notification (pytest):** Seed `email_digest_tracking` rows with various delivery modes (instant, hourly, daily). Mock Resend API. Run email job. Assert Resend API called with correct recipient, subject, and rendered HTML body. Assert `email_digest_tracking` rows updated to `sent`. Test template rendering: pass mock notification data, assert HTML contains expected text (project name, user name, action).

---

## 18. Database and RLS Policies

### 19.1 Multi-Tenant Isolation

- User A cannot read User B's profile (different org)
- User A cannot read projects from another org
- User A cannot read chat threads they're not a participant of
- User A cannot read documents without permission grant
- User A cannot read another org's invites
- User A cannot read another user's notifications
- User A cannot read `permissions` rows for resources they don't own/manage
- User A cannot read `project_access_grants` for projects in another org

#### How to test

**RLS (Supabase local):** Create `tests/rls/test_multi_tenant.ts` (or `.sql` scripts). Spin up local Supabase and run `npm run seed:hoque`. Use the seeded data: Param Vora's borrower org (owner: Param + Jeff, members: Aryan/Sarthak/Kabeer/Vatsal), Cody Field's advisor org (separate entity), Capital Lending Group's lender org (separate entity). The seeded "SoGood Apartments" project, its chat threads, and documents provide the multi-tenant test fixtures.

For each assertion: create a Supabase client authenticated as the "unauthorized" user and attempt the query. Assert the result is empty or throws a policy violation.

```
// Example pattern (pseudocode):
const clientB = createClient(url, anonKey, { headers: { Authorization: `Bearer ${userB1Token}` } })
const { data, error } = await clientB.from('projects').select().eq('id', orgAProjectId)
assert(data.length === 0)  // RLS blocks cross-org access
```

Repeat for each table: `profiles`, `projects`, `chat_threads`, `resources`, `invites`, `user_notifications`, `permissions`, `project_access_grants`.

### 19.2 Role-Based Access

- Org owner can CRUD all org resources
- Org member can read but not delete org resources
- Project creator has full access to project
- Granted lender can read (not edit) project data
- Advisor can read assigned projects

#### How to test

**RLS (Supabase local):** Authenticate as org owner, assert INSERT/UPDATE/DELETE on org resources all succeed. Authenticate as member, assert SELECT succeeds but DELETE fails. Authenticate as lender with project access, assert SELECT succeeds but UPDATE fails on project data. Authenticate as advisor, assert SELECT on assigned project succeeds.

### 19.3 Permission-Specific RLS

- `permissions` table: only org owners can INSERT/UPDATE/DELETE
- `project_access_grants` table: only org owners can INSERT/DELETE
- `set_permission_for_resource` RPC rejects calls from non-owners
- `bulk_update_member_permissions` RPC rejects calls from non-owners
- `get_effective_permissions_for_resource` RPC rejects calls from non-owners
- `get_all_user_permissions_for_project` returns ONLY current user's permissions
- User with `view` permission: `SELECT` succeeds, `UPDATE` blocked by RLS
- User with `edit` permission: `SELECT` and `UPDATE` both succeed
- User with `none` permission: `SELECT` blocked by RLS
- User with no permission row: `SELECT` blocked by RLS
- File-level `none` override blocks access even when parent has `view`/`edit`
- `get_effective_permission` returns NULL for `none` (not the string 'none')

#### How to test

**RLS (Supabase local):** For RPC security: authenticate as a non-owner member, call each RPC (`set_permission_for_resource`, `bulk_update_member_permissions`, `get_effective_permissions_for_resource`), assert each rejects with permission error.

For access level enforcement: use a seeded team member (e.g., Kabeer Merchant) who has specific permission levels on resources. Authenticate as Kabeer. Run `SELECT` on a resource with `view` permission -- assert success. Run `UPDATE` -- assert RLS blocks it. Via service role, change permission to `edit`, re-query as Kabeer, run `UPDATE` -- assert success. Change to `none`, run `SELECT` -- assert blocked. Delete the permission row, run `SELECT` -- assert blocked.

For inheritance with file override: grant `view` on docs root. Assert all child files are readable. Add `none` override on one file. Assert that file is blocked but others are still readable.

### 19.4 Permission Trigger Integrity

- INSERT into `permissions` with `view`/`edit` fires `trg_permission_change_event`
- INSERT into `permissions` with `none` does NOT fire trigger
- UPDATE `permissions` from `none` -> `view` fires trigger
- UPDATE `permissions` from `view` -> `edit` fires trigger
- UPDATE `permissions` from `edit` -> `view` does NOT fire trigger (downgrade)
- UPDATE `permissions` from `view`/`edit` -> `none` does NOT fire trigger (revoke)
- INSERT into `project_access_grants` fires `trg_project_access_grant_event` (DEFERRED)
- Domain event payload contains correct `affected_user_id`, `resource_id`, `old_permission`, `new_permission`
- Docs root cascade: trigger creates `document_permission_granted` for all FILE descendants

#### How to test

**RLS (Supabase local, service role):** Use the service role client to manipulate `permissions` directly and then query `domain_events` to verify trigger behavior.

For each trigger test:

1. Count `domain_events` rows before the action.
2. Perform the INSERT or UPDATE on `permissions`.
3. Count `domain_events` rows after.
4. Assert the count increased by the expected amount (1 for single grant, 0 for downgrade/revoke, N for cascade).
5. Read the new `domain_events` row(s) and assert `event_type`, `payload.affected_user_id`, `payload.resource_id`, `payload.old_permission`, `payload.new_permission` are all correct.

For cascade: seed a docs root with 5 child FILEs, none with explicit permissions. Grant `view` on the root. Assert 6 domain events (1 for root + 5 for children). Then grant `view` on one child explicitly and re-grant on root -- assert the explicitly-granted child does NOT get a duplicate cascade event.

### 19.5 RLS Performance

- All policies use `public.get_current_user_id()` (not `auth.uid()`)
- No sequential scan on large tables

#### How to test

**RLS (Supabase local):** Run `EXPLAIN ANALYZE` on key queries (SELECT from `projects`, `resources`, `permissions` with RLS active). Assert no sequential scans on tables with >1000 rows. Grep migration files for `auth.uid()` usage -- assert all replaced with `public.get_current_user_id()` (already done in optimization migrations, but verify no regressions).

### 19.6 Realtime Subscriptions

- Tables with realtime enabled: chat messages, resumes, notifications, resources
- Realtime respects RLS (user only receives events they're authorized for)

#### How to test

**RLS (Supabase local):** Subscribe as User A to `chat_messages` channel. Insert a message in a thread User A is NOT a participant of (using service role). Assert User A does NOT receive the event. Insert a message in User A's thread. Assert User A receives the event. Repeat pattern for `resources`, `user_notifications`.

---

## 19. Cross-Cutting Concerns

### 20.1 Utilities

- `cn()` merges Tailwind classes correctly
- `formatDate` / `formatDateShort` handle valid/invalid dates
- `isInviteExpired` checks expiration correctly
- `extractOriginalFilename` handles both old and new versioning patterns
- `formatStoreError` extracts message from Error/string/object
- `parseLocalStorage` handles malformed JSON gracefully
- `isValidUuid` validates UUID format
- `toSourceObject` normalizes legacy string/array/object formats

#### How to test

**Unit (Vitest):** Create `src/utils/__tests__/` test files for each utility. These are pure functions -- no mocking needed.

- `cn('px-4', 'px-2')` -> assert Tailwind merge resolves to `'px-2'`.
- `formatDate(new Date('2026-03-18'))` -> assert formatted string. `formatDate('invalid')` -> assert fallback.
- `isInviteExpired({ expires_at: '2025-01-01' })` -> assert `true`. With future date -> assert `false`.
- `extractOriginalFilename('v1_user123_report.pdf')` -> assert `'report.pdf'`. Test old format `v1_report.pdf` -> assert `'report.pdf'`.
- `formatStoreError(new Error('fail'))` -> `'fail'`. `formatStoreError('string')` -> `'string'`. `formatStoreError({ message: 'obj' })` -> `'obj'`.
- `parseLocalStorage('{"key":"value"}')` -> assert parsed. `parseLocalStorage('not json')` -> assert fallback returned.
- `isValidUuid('550e8400-e29b-41d4-a716-446655440000')` -> `true`. `isValidUuid('not-a-uuid')` -> `false`.

### 20.2 Data Transformations

- `projectProfileToDbProject` maps UI fields to DB columns
- `projectProfileToResumeContent` strips metadata and locked fields
- `processResumeContent` reconstructs profile from flat content
- `buildProjectProfile` computes completeness and progress
- `FIELD_TO_SECTION` maps every field to its section

#### How to test

**Unit (Vitest):** Test `projectProfileToDbProject` with a mock profile containing `projectName`, `loanAmountRequested`, etc. Assert output has `name`, `loan_amount`, etc. Test `projectProfileToResumeContent` with a profile that has `locked_fields` and metadata fields -- assert output excludes both. Test `processResumeContent` round-trip: pass DB content through it, assert profile matches original. Test `FIELD_TO_SECTION`: iterate all known field IDs, assert each maps to a valid section.

### 20.3 Deal Type Visibility

- `isFieldVisibleForDealType` returns correct visibility
- `filterFieldsForDealType` filters field list
- `countVisibleFieldsForDealType` counts correctly

#### How to test

**Unit (Vitest):** Test `isFieldVisibleForDealType('ltvRatio', 'Acquisition')` -> assert `true`. Test with a field that's only visible for 'Refinance' and deal type 'Acquisition' -> assert `false`. Test `filterFieldsForDealType(allFields, 'Construction')` -> assert only construction-visible fields returned. Test `countVisibleFieldsForDealType` for each deal type -> assert count matches filtered list length.

### 20.4 Error Handling

- API 400 errors show user-friendly message
- API 500 errors show generic error with retry
- Network errors detected and reported
- Zustand store actions all have try/catch with error state

#### How to test

**Unit (Vitest):** For each store action that calls an API: mock the API to throw a 400 error, call the action, assert `error` state is set with a user-friendly message. Mock 500 error, assert generic message. Mock network error (`TypeError: Failed to fetch`), assert network error message.

**E2E (Playwright):** Use `page.route()` to intercept an API call and return 500. Perform the action. Assert an error message/toast appears in the UI.

### 20.5 Loading States

- Every page has skeleton or loading state
- `SplashScreen` shown during initial hydration
- `isHydrating` gates entire app render

#### How to test

**E2E (Playwright):** Navigate to `/dashboard` with a slow network (use `page.route` to add delay to API calls). Assert skeleton elements are visible before data loads. For SplashScreen: navigate to a protected route, assert splash visible during hydration, then resolves to content.

**Component (Vitest + RTL):** For each page component, render with `isLoading=true` in the mocked store. Assert skeleton component renders. Set `isLoading=false` with data, assert real content renders.

### 20.6 Responsive / Accessibility

- All pages render correctly on mobile viewport
- Modals trap focus and close on Escape
- Buttons and links have accessible names
- Form inputs have labels

#### How to test

**E2E (Playwright):** Run key pages with mobile viewport (`{ viewport: { width: 375, height: 812 } }`). Assert no horizontal scroll. Assert navigation is accessible (hamburger menu or similar). Take screenshots for visual regression.

**Component (Vitest + RTL):** Render modals and press Escape, assert `onClose` called. Assert all buttons have accessible text (`getByRole('button', { name: /.../ })`). Assert form inputs have associated labels (`getByRole('textbox', { name: /.../ })`).

**Playwright accessibility:** Use `@axe-core/playwright` for automated a11y audits:

```typescript
import AxeBuilder from '@axe-core/playwright'
const results = await new AxeBuilder({ page }).analyze()
expect(results.violations).toEqual([])
```

---

## 20. Public / Marketing Pages

### 21.1 Homepage (`/`)

- Hero section renders
- How It Works section with steps
- Case Studies section with links
- Borrowers and Lenders section
- Security section with logos
- Lender marquee scrolls
- Header navigation works
- Footer links work

#### How to test

**E2E (Playwright):** Navigate to `/`. Assert hero heading is visible. Scroll down, assert each section renders (use `getByText` or `data-testid`). Click a case study link, assert navigation works. Click header nav links, assert they navigate correctly. Take screenshot for visual regression baseline.

**Component (Vitest + RTL):** Render individual section components (`<HowItWorksSection />`, `<CaseStudiesSection />`, etc.) and assert they render without error. These are simple display components -- smoke tests suffice.

### 21.2 About Page (`/about`)

- Leadership section renders
- Team section renders

#### How to test

**E2E (Playwright):** Navigate to `/about`. Assert leadership and team sections render with names/images.

### 21.3 Borrowers / RefiRadar / Resources

- `/borrowers` renders LenderLine marketing content
- `/refi-radar` renders RefiRadar content
- `/resources` lists case studies
- `/resources/[slug]` renders specific case study

#### How to test

**E2E (Playwright):** Navigate to each page. Assert content renders (heading, key sections). For `/resources/[slug]`: navigate to each slug (lasalle, marshall, sogood), assert case study content is visible. These are static pages -- smoke tests with screenshot baselines are sufficient.

---

## Summary by Test Type

**Unit tests** (Vitest, fast, ~200+ tests):

- Stores: 1.5, 2.6, 7.4, 8.4, 10.3, 11.7-11.8, 14.5
- Utilities: 8.5, 9.8, 20.1-20.3
- Context builders: 6.5

**Component tests** (Vitest + React Testing Library, ~100+ tests):

- Forms: 2.4-2.5, 3.1
- Documents: 4.2-4.3
- Chat: 7.5
- Filters and visualization: 8.2-8.3, 8.7
- OM widgets: 9.4-9.6
- Team: 10.1-10.2
- Permissions UI: 11.10
- Notifications: 12.1-12.3
- Calendar: 13.6
- Underwriting: 14.3-14.4

**Integration tests** (Vitest, hooks + RPCs, ~60+ tests):

- Autofill: 5.1-5.3
- AI Q&A: 6.1-6.4
- Documents: 4.6
- Realtime: 3.2, 7.3
- Permission hooks: 11.9
- Notification hook: 12.4

**E2E tests** (Playwright, critical flows, ~50+ tests):

- Auth: 1.1-1.4
- Projects: 2.1-2.3, 2.7
- Documents: 4.1, 4.4
- Autofill: 5.3
- Chat: 7.1-7.2
- Lender matching: 8.2
- OM dashboard: 9.3
- Team: 10.1-10.2
- Permissions (8 scenarios): 11.12
- Meetings: 13.3
- Lender access: 15.1
- Advisor: 16.1, 16.3
- Public pages: 21.1-21.3
- Accessibility: 20.6

**Backend tests** (pytest, ~80+ tests):

- Repositories: 17.1
- Services: 17.2
- Health: 17.3
- All API endpoints from sections 1-16

**RLS + Permission tests** (Supabase local, ~30+ tests):

- Multi-tenant: 19.1
- Role-based: 19.2
- Permission-specific RLS: 19.3
- Trigger integrity: 19.4
- Performance: 19.5
- Realtime: 19.6

**Notification tests** (pytest in capmatch-notifs-gcp, ~30+ tests):

- Fan-out handlers (14 handlers): 18.1
- Scheduled jobs: 18.2-18.5
- Email: 18.6
- Permission notification handlers: 11.11

