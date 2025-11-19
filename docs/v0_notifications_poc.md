## v0 In‑App Notifications PoC

### 1. Goals and scope

- **Primary goal**: Add a minimal, robust in‑app notifications system for CapMatch, starting with the **“document uploaded”** event, while laying foundations for email/push/digests later.
- **Key constraints**
  - Built entirely on **Supabase**: Postgres, RLS, Realtime, edge functions.
  - Must respect the existing **hierarchical permissions** (`resources`, `permissions`, `get_effective_permission`, `can_view`/`can_edit`).
  - Feature should be **incrementally testable** and not destabilize document upload or project flows.
- **Out of scope for v0**
  - Email, push, and SMS delivery.
  - User‑configurable notification preferences and digests.
  - Notifications for every possible event type (we start with one: document upload).

### 2. High‑level architecture

- **Event‑driven core**
  - Introduce a **`domain_events`** table as the single source of truth for “what happened”.
  - Events are **permission‑agnostic** and always **scoped to a project**.
  - Notification fan‑out logic consumes events and decides what each user sees.
- **Per‑user notifications**
  - A separate **`notifications`** table stores user‑specific rows (one row per user per event that should surface in the UI).
  - The UI subscribes to this table via Supabase Realtime and renders a bell dropdown.
- **Permission enforcement**
  - Events carry typed foreign keys such as `project_id` and an optional `resource_id` (for document‑related events).
  - Fan‑out logic uses the existing `can_view(user_id, resource_id)` and project‑level access to decide which users receive notifications.
  - RLS on `notifications` uses `user_id = auth.uid()` and, for safety, can re‑join back to `domain_events` and re‑apply `can_view` when `resource_id` is present.

### 3. Data model (v0)

- **`public.domain_events`** (new)
  - **Purpose**: immutable log of domain events, permission‑agnostic.
  - **Core columns**
    - **`id`**: `bigserial` primary key.
    - **`event_type`**: `text`, e.g. `'document_uploaded'`, `'om_ready'`, `'chat_message_sent'`.
    - **`actor_id`**: `uuid`, `auth.users.id` of the user who caused the event.
    - **`project_id`**: `uuid NOT NULL`, project the event belongs to (everything in CapMatch is project‑scoped).
    - **`resource_id`**: `uuid NULL`, FK to `public.resources(id)` when the event is about a specific document or folder.
    - **`thread_id`**: `uuid NULL`, FK to `public.chat_threads(id)` when applicable.
    - **`payload`**: `jsonb`, arbitrary extra context (file name, sizes, human‑readable labels, etc.).
    - **`occurred_at`**: `timestamptz` default `now()`.
  - **Indexes**
    - `(project_id, occurred_at DESC)` for “activity for project X”.
    - Optional `(resource_id, occurred_at DESC)` for document‑centric queries.

- **`public.notifications`** (repurposed)
  - **Purpose**: per‑user, derived view of events to drive in‑app UI.
  - **Core columns**
    - **`id`**: `bigserial` primary key.
    - **`user_id`**: `uuid`, FK to `public.profiles(id)`; recipient of the notification.
    - **`event_id`**: `bigint`, FK to `public.domain_events(id)`.
    - **`read_at`**: `timestamptz NULL`, null means unread.
    - **`created_at`**: `timestamptz` default `now()`; usually mirrors `occurred_at`.
    - Optional presentation fields:
      - **`title`**: short, pre‑rendered title (e.g. `"New document uploaded"`).
      - **`body`**: optional Richer message string.
      - **`link_url`**: client route to navigate on click (e.g. `/project/workspace/:projectId?file=:resourceId`).
  - **Indexes**
    - `(user_id, created_at DESC)` to list notifications for a user.

### 4. Event and notification flow (document upload)

- **Step 1 – User uploads a document**
  - The existing `useDocumentManagement.uploadFile` hook:
    - Creates a `FILE` resource in `public.resources`.
    - Creates a `document_versions` row.
    - Updates `resources.current_version_id`.
  - After the DB writes succeed, the upload path **adds one extra RPC**:
    - `insert_domain_event('document_uploaded', actor_id, project_id, resource_id, payload JSONB)`.

- **Step 2 – Event creation**
  - A Postgres function (or direct insert) writes a new row into `public.domain_events`:
    - `event_type = 'document_uploaded'`.
    - `project_id` = project of the resource.
    - `resource_id` = the file’s `resources.id`.
    - `payload` includes denormalized context (e.g. file name, mime type, org id, etc.).
  - This write is **permission‑agnostic**: it records the fact that the upload occurred.

- **Step 3 – Notification fan‑out**
  - A fan‑out routine (initially called synchronously after event insert, can move to a worker later) is responsible for:
    - Finding candidate recipients for the event (e.g. project owner, org members with access to the project).
    - For document events, filtering candidates where `can_view(user_id, resource_id)` is true.
    - Inserting one `notifications` row per `(event_id, user_id)` that should see the alert.
  - For v0, this logic can live in a single `notify_document_uploaded(p_event_id bigint)` Postgres function or a small edge function using the service role.

- **Step 4 – In‑app consumption**
  - The frontend subscribes to `public.notifications` for the logged‑in user using Supabase Realtime:
    - Channel name like `notifications-<user_id>`.
    - `postgres_changes` on `INSERT` for `public.notifications` with `filter: user_id=eq.<user_id>`.
  - On initial load, the client reads the latest notifications for the user, and then appends incoming ones from the channel.

#### Stage 3 verification checklist

- Apply migration `20260118090000_domain_events_and_notifications.sql` to ensure the helper function exists.
- Upload a document via the project workspace (any borrower role is fine).
- Inspect `public.domain_events` for a new row with `event_type = 'document_uploaded'`, matching `actor_id`, `project_id`, and `resource_id`.
- Confirm the RPC did not block the upload even if it fails (errors are logged in the browser console for debugging).
- (Optional) Manually call `select * from domain_events order by occurred_at desc limit 5;` to verify payload contents (file name, size, mime type).

#### Stage 4 – fan-out via edge function

- Edge function: `supabase/functions/notify-document-uploaded`
  - Uses the service-role client to read `domain_events`, `project_access_grants`, and `org_members`.
  - Filters candidates with `public.can_view` when a `resource_id` is present.
  - Inserts `public.notifications` rows (title/body/link) for each authorized recipient.
- Client flow:
  - `useDocumentManagement.uploadFile` calls `supabase.rpc('insert_document_uploaded_event', …)`.
  - When that RPC returns an `eventId`, it immediately invokes `supabase.functions.invoke('notify-document-uploaded', { body: { eventId } })`.
- Verification checklist:
  - Deploy the edge function (or run locally via `supabase functions serve notify-document-uploaded`).
  - Upload a document.
  - Query `public.notifications` for that `event_id`; expect one row per user in `project_access_grants` plus org owners who can view the resource (uploader excluded).
  - Sign in as one of those users and confirm the bell dropdown shows the new notification via Realtime and marks it read upon navigation.

### 5. Permission model for notifications

- **Event level**
  - Events remain permission‑agnostic; they carry `project_id` and optional `resource_id`, but do not decide who sees them.
  - This makes `domain_events` reusable for:
    - In‑app notifications.
    - Email/push/digests.
    - Analytics and audit logs.

- **Fan‑out level**
  - Notification routing decisions are made in the fan‑out layer:
    - Fetch candidate user IDs from project and org context:
      - `project_access_grants`, `org_members`, advisor assignments, etc.
    - For doc events, keep only users where `public.can_view(user_id, resource_id)` returns non‑null.
    - Later, user preferences (e.g. mute, digest) can live in `user_notification_preferences` and be checked here.

- **RLS on `notifications`**
  - RLS ensures users can only read their own notifications:
    - `USING (user_id = auth.uid())`.
  - Optional “belt and suspenders”:
    - Join back to `domain_events` and re‑apply `can_view` when `resource_id` is present, so revoking document access can retroactively hide old notifications.
  - Users can update their own notifications to mark them as read via an `UPDATE` policy.

### 6. UI: dashboard bell and dropdown

- **Placement**
  - In `DashboardLayout`, add a bell icon next to the existing gear (settings) button in the top‑right of the header.
  - Use a small component like `NotificationBell` for clarity and reuse.

- **Behavior**
  - **Badge**: shows count of unread notifications (or a dot when count > 0).
  - **Dropdown**: clicking the bell opens a panel listing the most recent notifications:
    - Clear distinction between unread (`read_at IS NULL`) and read.
    - Each item shows `title`, optional `body`, and friendly time (e.g. “5 min ago”).
    - Clicking an item:
      - Marks it as read.
      - Navigates to `link_url` if present (e.g. the project workspace focused on a file).

- **Client‑side hook**
  - Create a hook like `useNotifications` that:
    - Fetches initial notifications for the logged‑in user.
    - Subscribes to realtime `INSERT`s on `public.notifications`.
    - Exposes `notifications`, `unreadCount`, `isLoading`, `markAsRead`, and `markAllAsRead`.
  - This hook will be the single source of truth for notification state across the dashboard.

### 7. Evolution path beyond v0

- **Additional event types**
  - OM ready / summary generated.
  - Chat messages (possibly batched by inactivity windows to avoid notification spam).
  - Project stage transitions (e.g. from “collecting docs” to “underwriting in progress”).

- **Channels**
  - Email and mobile push can be implemented as additional workers consuming `domain_events` or `notifications`:
    - Immediate emails for high‑value events (e.g. OM ready).
    - Digest emails built from recent events for each user.

- **User preferences**
  - Add a `user_notification_preferences` table that maps `(user_id, event_type, channel)` to modes like `off`, `immediate`, `digest`.
  - Fan‑out logic consults preferences before inserting `notifications` or delivery tasks.

### 8. Design tradeoffs and rationale

- **Why event‑driven?**
  - Clean separation between “what happened” (`domain_events`) and “who should see what” (`notifications`), enabling:
    - Multiple channels and delivery strategies.
    - Reprocessing or changing rules without losing event history.
    - Easier debugging and analytics.

- **Why project‑scoped events?**
  - Matches CapMatch’s domain: everything (borrower resume, project docs, chat, stages) is attached to a project.
  - Simplifies queries and scaling by treating project as the primary partition key.

- **Why typed `resource_id` (nullable) instead of only JSONB?**
  - Strong typing and foreign keys support integrity and easier maintenance.
  - Efficient indexing for document‑centric queries.
  - Stable, simple permission logic (`can_view(user_id, resource_id)`) instead of brittle JSON path casts.


