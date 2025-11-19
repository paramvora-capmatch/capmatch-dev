## v0 In‑App Notifications PoC – Implementation Plan

This plan breaks the feature into **small, testable stages**. After each stage you should be able to run through simple checks (and ideally a minimal regression smoke test) before moving on.

---

### Stage 0 – Pre‑checks and scaffolding

- **Goals**
  - Confirm the current project builds and basic workflows (login, project workspace, document upload) work before changes.
  - Decide on migration naming and ensure Supabase migrations are set up correctly.
- **Steps**
  - **Run**: `npm test` / `npm run lint` / `npm run dev` (whichever are standard in this repo) and verify there are no unexpected failures.
  - **Manual smoke test**:
    - Log in as a borrower.
    - Open a project workspace.
    - Upload a document and confirm it appears in the UI and is downloadable.
  - Create a new Supabase migration file for events and notifications (e.g. `20260YYYYHHMM00_domain_events_and_notifications.sql`).
- **Acceptance criteria**
  - Existing flows (login, project workspace, document upload) still work.
  - A blank migration file for this feature exists and is recognized by the Supabase CLI / tooling.

---

### Stage 1 – `domain_events` table (read‑only)

- **Goals**
  - Introduce the `public.domain_events` table in Supabase without wiring it to any application code yet.
  - Ensure it deploys cleanly and is queryable.
- **Steps**
  - In the new migration file, define `public.domain_events` with:
    - `id bigserial primary key`.
    - `event_type text not null`.
    - `actor_id uuid not null references auth.users(id) on delete set null`.
    - `project_id uuid not null references public.projects(id) on delete cascade`.
    - `resource_id uuid references public.resources(id) on delete cascade`.
    - `thread_id uuid references public.chat_threads(id) on delete cascade`.
    - `payload jsonb`.
    - `occurred_at timestamptz not null default now()`.
  - Add indexes:
    - `(project_id, occurred_at desc)`.
    - `(resource_id, occurred_at desc)` (optional but useful).
  - **Do not** enable RLS on `domain_events` for now; it will be consumed via service role / backend only.
  - Apply the migration via Supabase tooling.
  - From the SQL console or `psql`, insert a test row manually and query it back.
- **Acceptance criteria**
  - Migration runs successfully locally (and/or in the Supabase project).
  - A manual insert + select on `domain_events` works.
  - No app code refers to `domain_events` yet, so the running app should behave exactly as before.

---

### Stage 2 – `notifications` schema and RLS

- **Goals**
  - Define or refactor the `public.notifications` table to the new per‑user shape.
  - Add RLS policies so that only the owner of a notification can view/update it.
- **Steps**
  - In the same migration (or a follow‑up migration if preferred), ensure `public.notifications` matches the v0 PoC design:
    - `id bigserial primary key`.
    - `user_id uuid not null references public.profiles(id) on delete cascade`.
    - `event_id bigint not null references public.domain_events(id) on delete cascade`.
    - `title text not null`.
    - `body text`.
    - `link_url text`.
    - `read_at timestamptz`.
    - `created_at timestamptz not null default now()`.
  - Ensure appropriate indexes exist:
    - `(user_id, created_at desc)`.
  - Enable RLS:
    - `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`
  - Add policies:
    - **Select**: `user_id = auth.uid()`.
    - **Update**: `user_id = auth.uid()` (to allow `read_at` updates).
    - Insert is intended to be done by service‑role clients or `SECURITY DEFINER` functions, so we typically do **not** grant generic insert to authenticated users.
  - Apply migrations.
  - From the SQL console, simulate a notification:
    - Manually insert a `domain_events` row and then a `notifications` row for a known user.
    - As that user (via Supabase SQL or PostgREST), confirm you can `select` and `update read_at`.
- **Acceptance criteria**
  - Migrations apply without error.
  - A test user can:
    - See only their own notifications.
    - Update `read_at` on their own notifications.
  - No UI changes yet; app behavior remains unchanged.

---

### Stage 3 – Event creation on document upload

- **Goals**
  - Wire document upload to create a `domain_events` row for `'document_uploaded'`.
  - Keep this change isolated and observable before any notifications exist.
- **Steps**
  - Create a Postgres helper function, e.g. `public.insert_document_uploaded_event(p_actor_id uuid, p_project_id uuid, p_resource_id uuid, p_payload jsonb)` that:
    - Inserts a row into `domain_events` with `event_type = 'document_uploaded'` and returns the `id`.
  - In `useDocumentManagement.uploadFile` (frontend), after the resource + version updates succeed:
    - Call `supabase.rpc('insert_document_uploaded_event', { p_actor_id: user.id, p_project_id: projectId, p_resource_id: resourceId, p_payload: { fileName: file.name, size: file.size, mimeType: file.type } })`.
    - For now, ignore the return value or log it for debugging.
  - Run the app and upload a document as a real user.
  - Check `domain_events`:
    - Confirm one new row is created with the correct `actor_id`, `project_id`, and `resource_id`.
- **Acceptance criteria**
  - Document upload still works exactly as before from the user’s perspective.
  - Each successful upload results in exactly one `domain_events` row with the expected data.
  - No notifications are created yet.

---

### Stage 4 – Synchronous fan‑out for `document_uploaded`

- **Goals**
  - Implement the minimal routing logic from events to notifications for the `'document_uploaded'` event type.
  - Keep it synchronous and simple for v0.
- **Steps**
  - Create a Supabase Edge Function `supabase/functions/notify-document-uploaded` that:
    - Authenticates the caller (borrower uploading the document).
    - Loads `domain_events` and ensures `event_type = 'document_uploaded'`.
    - Fetches candidate recipients:
      - Org owners of the relevant org (`org_members.role = 'owner'`).
      - Users with explicit access via `project_access_grants`.
    - When `resource_id` is present, calls `public.can_view(candidate, resource_id)` via RPC and keeps only those users.
    - Inserts one row into `public.notifications` per `(user_id, event_id)` with the synthesized title/body/link.
  - Update the upload flow (`useDocumentManagement.uploadFile`) so that after `insert_document_uploaded_event` resolves, it invokes the edge function with the returned `eventId`.
  - Upload a document in the app.
  - Inspect `notifications`:
    - Confirm notifications exist only for users who should see the doc.
    - Confirm no notifications exist for users without permission.
- **Acceptance criteria**
  - Document upload still succeeds with no perceivable delay.
  - Correct notification rows appear for the expected users in the database.
  - Users without doc access do not get notifications (verified via SQL/RLS).

---

### Stage 5 – Client‑side notifications hook

- **Goals**
  - Implement a reusable client hook to read and subscribe to notifications for the logged‑in user.
  - Keep this stage UI‑minimal: just log notifications to the console.
- **Steps**
  - Create a new hook, e.g. `src/hooks/useNotifications.ts`, that:
    - Uses `useAuth` / `useAuthStore` to get the current user.
    - On mount (when user is present):
      - Fetches the latest N notifications:
        - `from('notifications').select('*').order('created_at', { ascending: false }).limit(50)`.
      - Subscribes to a realtime channel:
        - `supabase.channel('notifications-' + user.id).on('postgres_changes', { schema: 'public', table: 'notifications', event: 'INSERT', filter: 'user_id=eq.' + user.id }, handler)`.
    - Maintains local state: `notifications`, `unreadCount`, `isLoading`.
    - Exposes `markAsRead(id)` that:
      - Performs an `update` on `notifications` setting `read_at = new Date().toISOString()`.
      - Optimistically updates local state.
  - Temporarily use this hook in a test page or console:
    - Render the count and log each notification to ensure realtime works.
  - Manually upload a document, verify:
    - The hook loads existing notifications.
    - A new notification is appended when the event is created.
- **Acceptance criteria**
  - The hook correctly fetches and maintains notification state for the authenticated user.
  - Realtime `INSERT` events are handled (no duplicate or missing items).
  - `markAsRead` updates both DB and local state.

---

### Stage 6 – Bell icon and dropdown in `DashboardLayout`

- **Goals**
  - Integrate notifications into the primary dashboard header with a bell icon and dropdown.
  - Ensure that adding the bell does not break existing layout or navigation.
- **Steps**
  - Create a `NotificationBell` component under `src/components` that:
    - Uses `useNotifications`.
    - Shows a bell icon (`lucide-react`’s `Bell`) with:
      - A small badge when `unreadCount > 0`.
    - Uses a `<details>` / `<summary>` pattern (similar to the existing settings dropdown) to show a panel containing:
      - Recent notifications.
      - Visual distinction between unread and read (e.g. background color or font weight).
      - Click handler on each item:
        - Calls `markAsRead`.
        - Uses `router.push(link_url)` when available.
  - Insert `NotificationBell` into `DashboardLayout` alongside the existing settings gear:
    - Keep the DOM structure and spacing consistent (flexbox gap).
  - Run the app, log in as a user who receives document notifications, and verify:
    - Bell appears only when authenticated.
    - Dropdown lists notifications.
    - Clicking an item navigates correctly and marks it as read.
- **Acceptance criteria**
  - Header layout looks correct on desktop and mobile.
  - Bell dropdown shows real data and responds to realtime updates.
  - No regressions in existing header functionality (email pill, team button, settings dropdown, logout).

---

### Stage 7 – Regression hardening and cleanup

- **Goals**
  - Ensure the notifications PoC is stable and does not regress existing flows.
  - Document the behavior and any known limitations.
- **Steps**
  - **Automated checks**
    - Run linting and tests.
    - Add (or extend) a small set of tests around:
      - `useNotifications` (at least basic behavior via a mocked Supabase client).
      - The event/notification functions if you have a way to test SQL/edge functions.
  - **Manual regression**
    - Log in as:
      - Borrower.
      - Member of borrower org.
      - Advisor (if applicable).
    - For each:
      - Upload a document they are allowed to see → verify they get a notification.
      - Upload a document they explicitly cannot see (e.g. a file with `none` permission) → verify they do **not** get the notification.
      - Ensure document uploads, downloads, and other project workspace actions still work.
  - Review logs for unexpected errors (e.g. Supabase RPC or Realtime failures).
  - Update `v0_notifications_poc.md` with any implementation notes or deviations from the original design.
- **Acceptance criteria**
  - No new errors in CI or console for the core paths.
  - Permissions behave as expected for document notifications.
  - The docs reflect the actual implementation and any known edge cases.

---

### Stage 8 – Ready for next iterations (email, digests, more events)

- **Goals**
  - Confirm the v0 PoC is ready to serve as a foundation for upcoming work.
- **Steps**
  - Identify the next 1–2 event types to support (e.g. “OM ready”, “chat mentions”).
  - Sketch small follow‑up migrations and edge functions that reuse:
    - `domain_events` as the source of truth.
    - The existing fan‑out structure and `useNotifications` hook.
  - Optionally capture this roadmap in a short follow‑up doc or a section at the end of `v0_notifications_poc.md`.
- **Acceptance criteria**
  - Clear understanding of how to extend the system without modifying core tables.
  - Agreement on the next prioritized event types and channels.


