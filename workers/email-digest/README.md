# Email Digest Worker

Daily email digest worker that sends aggregated notifications to users.

## Overview

This worker runs daily to:
1. Query `domain_events` for events from yesterday
2. Check user preferences for digest emails
3. Aggregate events by user and project
4. Send digest emails via Resend
5. Mark events as processed in `email_digest_processed` table

## Deployment

Deployed to Google Cloud Run via GitHub Actions (when implemented).

### Manual Deployment

```bash
cd workers/email-digest
gcloud run deploy email-digest-worker \
  --source . \
  --region us-central1 \
  --set-env-vars DATABASE_URL=...,RESEND_API_KEY=...,EMAIL_FROM=...
```

## Scheduling

Scheduled via Cloud Scheduler to run daily at 9 AM UTC.

## Environment Variables

- `DATABASE_URL` - Supabase Postgres connection string
- `RESEND_API_KEY` - Resend API key for sending emails
- `EMAIL_FROM` - Email sender address

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run locally
python main.py
```

## Database Schema

Requires these tables:
- `domain_events` - Source of events
- `user_notification_preferences` - User email preferences
- `email_digest_processed` - Tracks processed events (to be created)
- `profiles` - User information

