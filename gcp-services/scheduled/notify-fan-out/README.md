# Notify Fan-Out Service

GCP Python service that processes domain events and creates in-app notifications + email queue entries.

## Overview

This service replaces the Supabase Edge Function `notify-fan-out` with a polling-based architecture that runs every 1 minute via cron.

**Trade-off**: Introduces 0-60 second latency (avg 30s) vs Edge Function's <1s, but provides better operational consistency with other GCP services.

## Architecture

```
domain_events table
    ↓
notification_processing table (tracks processing state)
    ↓
Python service (polls every 1 min)
    ↓
├─ notifications table (in-app)
└─ pending_emails table (for email-notifications service)
```

## Files

- **main.py** - Polling loop entry point
- **config.py** - Configuration from environment variables
- **database.py** - Supabase client wrapper + queries
- **handlers.py** - Event type handlers (13 types)
- **helpers.py** - Shared helper functions
- **pyproject.toml** - Python dependencies
- **Dockerfile** - Container build
- **run.sh** - Cron execution script
- **setup-vm.sh** - VM setup script

## Setup

### Local Development

```bash
cd gcp-services/notify-fan-out

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Load environment and run with DRY_RUN=true (logs only, no DB writes)
export $(cat .env.local | grep -v '^#' | xargs)
export NOTIFY_FANOUT_DRY_RUN=true
python main.py

# Or run without DRY_RUN (actually process events)
export $(cat .env.local | grep -v '^#' | xargs)
python main.py
```

### VM Deployment

```bash
# SSH to your GCP VM
gcloud compute ssh your-vm-name

# Clone repo
git clone https://github.com/your-org/capmatch-dev.git
cd capmatch-dev/gcp-services/notify-fan-out

# Create .env file
cp .env.example .env
# Edit .env with production credentials

# Run setup script
./setup-vm.sh

# Monitor logs
tail -f /var/log/notify-fan-out.log
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | - | Supabase project URL (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Service role key (required) |
| `NOTIFY_FANOUT_BATCH_SIZE` | 500 | Max events per batch |
| `NOTIFY_FANOUT_DRY_RUN` | false | Log-only mode (no DB writes) |
| `NOTIFY_FANOUT_MAX_EVENT_AGE_HOURS` | 24 | Only process events newer than this |
| `LOG_LEVEL` | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Event Handlers

Currently implemented (3/13):

- ✅ `document_uploaded` - Document upload notifications
- ✅ `chat_message_sent` - Chat message notifications (with mention support)
- ✅ `thread_unread_stale` - Unread message nudge emails (NO in-app notification)

TODO (10 remaining):

- ⏳ `meeting_invited`
- ⏳ `meeting_updated`
- ⏳ `meeting_reminder`
- ⏳ `resume_incomplete_nudge`
- ⏳ `invite_accepted`
- ⏳ `project_access_granted`
- ⏳ `project_access_changed`
- ⏳ `project_access_revoked`
- ⏳ `document_permission_granted`
- ⏳ `document_permission_changed`

## Database Schema

### notification_processing table

Tracks processing state for each domain event:

```sql
CREATE TABLE notification_processing (
    event_id BIGINT PRIMARY KEY,
    processing_status TEXT,  -- pending | processing | completed | failed
    processor_id TEXT,
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count INT,
    error_message TEXT
);
```

## Testing

### Seed Test Events (Recommended)

Use the provided seed script to create sample events for all 13 event types:

```bash
# Install dependencies first (if not already done)
pip install -r requirements.txt

# Seed test events (uses sample data from your database)
python seed_test_events.py --env-file .env.local

# Or clear existing events first
python seed_test_events.py --env-file .env.local --clear
```

This creates realistic test events for:
- `document_uploaded` (2 events)
- `chat_message_sent` (2 events, one with mention)
- `thread_unread_stale` (1 event)
- `meeting_invited` (1 event)
- `meeting_updated` (1 event)
- `meeting_reminder` (1 event)
- `resume_incomplete_nudge` (2 events)
- `invite_accepted` (1 event)
- `project_access_granted` (1 event)
- `project_access_changed` (1 event)
- `project_access_revoked` (1 event)
- `document_permission_granted` (1 event)
- `document_permission_changed` (1 event)

### Create Test Event Manually

```sql
-- Insert test domain event
INSERT INTO domain_events (event_type, project_id, payload)
VALUES (
    'document_uploaded',
    'your-project-id',
    '{"fileName": "test.pdf"}'::jsonb
);
```

### Run Service

```bash
# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# With DRY_RUN=true (logs only, no DB writes)
export NOTIFY_FANOUT_DRY_RUN=true
python main.py

# With DRY_RUN=false (actually process events)
unset NOTIFY_FANOUT_DRY_RUN
python main.py

# Check logs for processing (if running on VM)
tail -f /var/log/notify-fan-out.log
```

### Verify Results

```sql
-- Check processing status
SELECT
    event_id,
    processing_status,
    completed_at,
    error_message
FROM notification_processing
ORDER BY created_at DESC
LIMIT 20;

-- Check created notifications
SELECT
    user_id,
    title,
    body,
    created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;

-- Check queued emails
SELECT
    user_id,
    event_type,
    delivery_type,
    subject,
    created_at
FROM pending_emails
ORDER BY created_at DESC
LIMIT 20;
```

## Migration Strategy

See `/Users/vatsalhariramani/.claude/plans/luminous-dancing-tome.md` for full migration plan.

**Summary**:
1. **Week 1**: Deploy with `DRY_RUN=true` in staging
2. **Week 2**: Deploy with `DRY_RUN=true` in production (parallel run)
3. **Weekend**: Hard cutover - disable Edge Function, enable GCP service
4. **Week 3**: Monitor and cleanup

## Monitoring

**Key Metrics**:
- Events processed per minute
- Processing latency (occurred_at → completed_at)
- Failed event count
- Notification creation rate

**Logs**:
```bash
# View real-time logs
tail -f /var/log/notify-fan-out.log

# Search for errors
grep ERROR /var/log/notify-fan-out.log

# Check processing stats
grep "Job completed" /var/log/notify-fan-out.log | tail -10
```

## Troubleshooting

### No events being processed

```sql
-- Check for pending events
SELECT * FROM get_pending_notification_events(10);

-- Check processing table
SELECT * FROM notification_processing
ORDER BY created_at DESC
LIMIT 10;
```

### Events stuck in "processing" state

```sql
-- Reset stuck events (manual intervention)
UPDATE notification_processing
SET processing_status = 'pending'
WHERE processing_status = 'processing'
  AND claimed_at < NOW() - INTERVAL '10 minutes';
```

### Cron job not running

```bash
# Check cron is installed
crontab -l | grep notify-fan-out

# Check logs
tail -f /var/log/notify-fan-out.log

# Manual run
./run.sh
```

## Performance

**Expected Load**:
- ~100-200 events/hour (typical)
- ~500 events/batch (max)
- ~1-2 second processing time per batch

**Resource Usage**:
- CPU: <5% (idle), ~20% (processing)
- Memory: ~100MB
- Disk: Minimal (logs only)

## Dependencies

- Python 3.13+
- Docker
- uv (package manager)
- Supabase PostgreSQL database
- Cron (for scheduling)

## Contributing

When adding new event handlers:

1. Add handler function to `handlers.py`
2. Follow pattern: extract payload → check preferences → create notification → queue email
3. Add to `handlers_map` in `main.py`
4. Test with DRY_RUN=true first
5. Update this README with handler status
