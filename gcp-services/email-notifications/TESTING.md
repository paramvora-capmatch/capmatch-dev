# Testing Guide – Email Notifications Service

This guide explains how to test the `email-notifications` service locally and on the VM.

## 1. Prerequisites

1. **Environment variables** – create `.env.local` in `services/email-notifications`:

```bash
cd services/email-notifications
cat > .env.local << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=notifications@capmatch.com
LOG_LEVEL=DEBUG
EMAIL_NOTIFICATIONS_DRY_RUN=true
EOF
```

**Note**: Use `.env.local` for local testing (gitignored). Use `.env` on the VM.

2. **Dependencies (local)**:

```bash
cd services/email-notifications
uv sync
```

3. **Processed table** – run this SQL in Supabase once:

```sql
CREATE TABLE IF NOT EXISTS public.email_notifications_processed (
  event_id bigint NOT NULL,
  kind text NOT NULL,            -- 'hourly' or 'instant'
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_processed_kind
ON public.email_notifications_processed (kind, event_id);
```

## 2. Local Testing

### Option A: Direct Python (Recommended for quick testing)

From `services/email-notifications`:

**Hourly job:**
```bash
uv run --env-file .env.local python main_hourly.py
```

**Instant job:**
```bash
uv run --env-file .env.local python main_instant.py
```

With `EMAIL_NOTIFICATIONS_DRY_RUN=true`, emails will not be sent; payloads are logged instead.

### Option B: Docker (Matches VM environment)

1. **Build the Docker image** (from repo root):
```bash
cd /path/to/capmatch-comms
docker build -f services/email-notifications/Dockerfile -t capmatch-email-notifications:prod .
```

2. **Run the jobs** (from `services/email-notifications`):
```bash
# Hourly
./run-hourly.sh

# Instant
./run-instant.sh
```

**Note**: The scripts use `.env.local` for local testing. Make sure it exists with all required variables.

## 3. Inserting Sample Events

Use the Supabase SQL editor or psql to insert test rows into `public.domain_events`.

### Document uploaded (hourly)

**Note**: If you get a duplicate key error, reset the sequence first:
```sql
SELECT setval('domain_events_id_seq', (SELECT MAX(id) FROM domain_events));
```

**Important**: The hourly job processes events from the **previous hour** (e.g., if it's 15:23, it processes events from 14:00-15:00). To test, insert events with a timestamp in the previous hour:

```sql
-- Insert event in the previous hour (adjust the hour as needed)
INSERT INTO public.domain_events (event_type, project_id, resource_id, occurred_at, payload)
VALUES (
  'document_uploaded',
  'your-project-id',
  'your-resource-id',
  date_trunc('hour', now()) - interval '1 hour' + interval '30 minutes',  -- 30 min into previous hour
  jsonb_build_object('fileName', 'Test Document.pdf')
);
```

Or use a specific time:
```sql
INSERT INTO public.domain_events (event_type, project_id, resource_id, occurred_at, payload)
VALUES (
  'document_uploaded',
  'your-project-id',
  'your-resource-id',
  '2025-12-16 14:30:00+00'::timestamptz,  -- Adjust to previous hour
  jsonb_build_object('fileName', 'Test Document.pdf')
);
```

### Chat message sent (hourly)

**Important**: Insert with a timestamp in the previous hour (see note above):

```sql
INSERT INTO public.domain_events (event_type, project_id, thread_id, occurred_at, payload)
VALUES (
  'chat_message_sent',
  'your-project-id',
  'your-thread-id',
  date_trunc('hour', now()) - interval '1 hour' + interval '30 minutes',  -- Previous hour
  jsonb_build_object('full_content', 'Hello from email-notifications test')
);
```

**Note**: If you get duplicate key errors, see the note above about resetting the sequence.

### Resume nudge (instant)

```sql
INSERT INTO public.domain_events (event_type, project_id, occurred_at, payload)
VALUES (
  'resume_incomplete_nudge',
  'your-project-id',
  now(),
  jsonb_build_object(
    'user_id', 'owner-user-id',
    'resume_type', 'project',
    'completion_percent', 70
  )
);
```

### Invite accepted (instant)

```sql
INSERT INTO public.domain_events (event_type, project_id, occurred_at, payload)
VALUES (
  'invite_accepted',
  'your-project-id',
  now(),
  jsonb_build_object(
    'user_email', 'new.user@example.com'
  )
);
```

### Project member added (instant)

```sql
INSERT INTO public.domain_events (event_type, project_id, occurred_at, payload)
VALUES (
  'project_member_added',
  'your-project-id',
  now(),
  jsonb_build_object(
    'member_id', 'member-user-id'
  )
);
```

## 4. VM Testing

On the VM:

```bash
cd ~/capmatch-comms/services/email-notifications

# Hourly (once)
./run-hourly.sh

# Instant (once)
./run-instant.sh
```

Watch logs:

```bash
tail -f /var/log/email-notifications-hourly.log
tail -f /var/log/email-notifications-instant.log
```

If `EMAIL_NOTIFICATIONS_DRY_RUN=false` and `RESEND_API_KEY` is set, verify emails in your inbox or Resend dashboard.



