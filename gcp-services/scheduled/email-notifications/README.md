# Email Notifications Service

VM-based worker that sends:
- **Immediate delivery emails** (polled every minute):
  - Resume nudge at 1d/3d/7d (to owner)
  - New user (owner/member) accepts invite (to owner)
  - Member added to project (to the member)
  - Project access granted/changed notifications
- **Aggregated delivery emails** (polled hourly):
  - Project doc added (to project owner)
  - Unread thread messages (to all participants)

This service reads from the Supabase `pending_emails` table and sends emails via Resend.

## Architecture

The email service uses a **queue-based architecture** with clean separation of concerns:

1. **notify-fan-out** edge function creates entries in `pending_emails` table
   - Determines recipients for each event
   - Pre-builds email data (subject, body_data JSONB)
   - Marks delivery type ('immediate' or 'aggregated')

2. **Email service** (this service) polls `pending_emails` table
   - Fetches pending emails by delivery type
   - Renders emails from pre-built body_data
   - Sends via Resend API
   - Updates status (pending → processing → sent/failed)

### Processing State Lifecycle

```
pending → processing → sent (or failed)
```

- **pending**: Created by notify-fan-out, ready to send
- **processing**: Claimed by email service (atomic update prevents duplicates)
- **sent**: Successfully delivered via Resend
- **failed**: Delivery failed (retry logic TBD)

## Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Email / Resend:
- `RESEND_API_KEY`
- `EMAIL_FROM` (default: `notifications@capmatch.com`)
- `RESEND_TEST_MODE` (default: `true`)
- `RESEND_TEST_RECIPIENT`
- `RESEND_FORCE_TO_EMAIL`
- `EMAIL_NOTIFICATIONS_DRY_RUN` (default: `true` – log only)
- `LOG_LEVEL` (default: `INFO`)

## Deployment on VM

1. **Clone repo on VM** (if not already):
```bash
git clone https://github.com/ajcapmatch/capmatch-comms.git -b feat/vatsal-migration-to-gcp
cd capmatch-comms/services/email-notifications
```

2. **Create `.env` file**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=notifications@capmatch.com
LOG_LEVEL=INFO
EMAIL_NOTIFICATIONS_DRY_RUN=true
```

3. **Run VM setup** (installs Docker, builds image, sets up cron):
```bash
chmod +x setup-vm.sh
./setup-vm.sh
```

4. **After setup, test manually**:
```bash
./run-hourly.sh
./run-instant.sh
```

Logs:
- Hourly: `/var/log/email-notifications-hourly.log`
- Instant: `/var/log/email-notifications-instant.log`

## Database Schema

### `pending_emails` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `user_id` | UUID | Recipient user ID |
| `event_id` | BIGINT | Source domain event ID |
| `event_type` | TEXT | Event type (e.g., 'resume_incomplete_nudge') |
| `delivery_type` | TEXT | 'immediate' or 'aggregated' |
| `project_id` | UUID | Associated project (if applicable) |
| `project_name` | TEXT | Project name (denormalized for rendering) |
| `subject` | TEXT | Email subject line |
| `body_data` | JSONB | Structured data for email template |
| `status` | TEXT | 'pending', 'processing', 'sent', or 'failed' |
| `created_at` | TIMESTAMPTZ | When email was queued |
| `processed_at` | TIMESTAMPTZ | When email was sent/failed |

**Unique Constraint**: `(event_id, user_id)` prevents duplicate emails per event/user

**Indexes**:
- `(status, delivery_type, created_at)` - For efficient polling
- `(user_id, delivery_type, status)` - For aggregated digest queries

## Notes

- **DEPRECATED**: `email_notifications_processed` table is no longer used. Status is now tracked in `pending_emails.status`.
- **Race Condition Protection**: Atomic status updates with `WHERE status = 'pending'` prevent concurrent jobs from sending duplicates.
- **No Database Lookups During Send**: All email data is pre-built in `body_data` by notify-fan-out, making sends fast and efficient.
- **Audit Trail**: Sent/failed emails remain in table for debugging (cleanup job TBD).
- See `TESTING.md` (to be added) for details on inserting sample emails and verifying delivery.





