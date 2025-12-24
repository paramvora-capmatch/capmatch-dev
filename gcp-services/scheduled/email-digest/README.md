# Email Digest Service

Daily email digest service that aggregates notifications from the previous 24 hours and sends them as a single email to CapMatch users.

## Overview

The email-digest service sends daily digest emails to CapMatch users. It aggregates notifications from the previous 24 hours and sends them as a single email.

## Key Functionality

- **Daily processing**: Runs daily (typically 9 AM PST) via cron
- **Event aggregation**: Collects `domain_events` from the last 24 hours
- **User filtering**: Finds users with digest preferences enabled
- **Preference-based filtering**: Uses a hierarchy (thread > project > global > defaults) to determine which events to include
- **Recipient validation**: Ensures users are recipients (project access, thread participants, resource access)
- **Email generation**: Builds HTML and text emails using React Email templates
- **Email sending**: Sends via Resend API with rate limiting and retries
- **Idempotency**: Tracks processed events in `email_digest_processed` to avoid duplicates

## Main Components

- `main.py`: Orchestrates the workflow
- `database.py`: Queries Supabase for users, events, and preferences
- `preferences.py`: Filters events based on user notification preferences
- `email_builder.py`: Generates HTML/text emails from templates
- `email_sender.py`: Handles Resend API calls with throttling

## Default Behavior

If a user has no preferences set, defaults to digest mode for:

- `chat_message_sent` (including mentions)
- `document_uploaded`

## Schedule

Runs daily at **9 AM PST (17:00 UTC)** via cron.

## Environment Variables

### Required

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `RESEND_API_KEY` - Resend API key for sending emails
- `EMAIL_FROM` - Sender email address (e.g., `notifications@capmatch.com`)

### Optional

- `LOG_LEVEL` - Logging level (default: `INFO`)
- `RESEND_TEST_MODE` - Enable test mode (default: `false`)
- `RESEND_TEST_RECIPIENT` - Override recipient in test mode
- `RESEND_FORCE_TO_EMAIL` - Force all emails to this address (for testing)
- `SKIP_IDEMPOTENCY_CHECK` - Skip idempotency checks (testing only, default: `false`)
- `DIGEST_TEMPLATE_PATH` - Path to digest email template HTML file

## Local Development

### 1. Create `.env` file

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Test locally

```bash
python main.py
```

### 3. Test with Docker

```bash
docker build -t capmatch-email-digest:local .
docker run --rm --env-file .env capmatch-email-digest:local
```

## Deployment

### Build Docker Image

```bash
docker build -t capmatch-email-digest:prod .
```

### Deploy to VM

```bash
# SSH to GCP VM
ssh your-vm
cd capmatch/gcp-services/scheduled/email-digest

# Run setup script (builds image, sets up cron)
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep email-digest

# Monitor logs
tail -f /var/log/email-digest.log
```

## How It Works

1. **Get users**: Finds all users with digest preferences enabled (or users without any email preferences, who get defaults)

2. **Get events**: For each user, fetches unprocessed `domain_events` from the last 24 hours

3. **Filter by preferences**: Uses preference hierarchy to determine which events to include:
   - Thread-level preferences (highest priority)
   - Project-level preferences
   - Global preferences
   - Defaults (if no preferences set)

4. **Validate recipients**: Ensures the user is actually a recipient of each event:
   - Project access grants
   - Thread participants
   - Resource access (for document events)

5. **Build email**: Generates HTML and text versions of the digest email, grouped by project

6. **Send email**: Sends via Resend API with rate limiting (2 requests/second) and retries

7. **Mark processed**: Records events in `email_digest_processed` table to prevent duplicates

## Email Template

The service uses the digest email template from the `email-notifications` service. The template is loaded from:

1. `DIGEST_TEMPLATE_PATH` environment variable (if set)
2. `../email-notifications/email-templates/dist/digest-template.html` (shared template)
3. `email-templates/dist/digest-template.html` (local fallback)

## Idempotency

The service tracks processed events in the `email_digest_processed` table with columns:
- `event_id` - The domain event ID
- `user_id` - The user who received the digest
- `digest_date` - The date of the digest

This ensures events are only included in one digest per user per day.

## Monitoring

Check job status:

```bash
# View logs
tail -f /var/log/email-digest.log

# Check cron execution
grep "email-digest" /var/log/syslog

# Verify processed events
psql -c "SELECT * FROM email_digest_processed ORDER BY digest_date DESC LIMIT 10"
```

## Troubleshooting

### Job not running

```bash
# Check cron job is installed
crontab -l | grep email-digest

# Check Docker image exists
docker images | grep email-digest

# Manually run job
cd /path/to/email-digest
./run.sh
```

### Errors in logs

```bash
# View full logs
tail -100 /var/log/email-digest.log

# Test with dry run (set SKIP_IDEMPOTENCY_CHECK=true)
SKIP_IDEMPOTENCY_CHECK=true python main.py

# Check environment variables
docker run --rm --env-file .env capmatch-email-digest:prod env | grep -E "(SUPABASE|RESEND|EMAIL)"
```

### Template not found

If you see "Digest template HTML not found", ensure the template exists at one of the fallback paths or set `DIGEST_TEMPLATE_PATH` in your `.env` file.

## Related Services

- `email-notifications` - Handles instant and hourly email notifications
- `notify-fan-out` - Processes domain events and creates notifications

