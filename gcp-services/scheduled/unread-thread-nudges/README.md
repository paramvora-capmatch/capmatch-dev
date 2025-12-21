# Unread Thread Nudges - Scheduled Job

Finds chat threads with stale unread messages (3+ hours old) and creates domain events to nudge users.

## Schedule
Every 15 minutes (`*/15 * * * *`)

## What it does
1. Queries all chat threads
2. For each thread:
   - Finds the latest message
   - Checks if it's older than threshold (default: 3 hours)
   - For each participant (except sender):
     - Checks if they have unread messages
     - Checks dedupe log to prevent duplicate notifications
     - Checks user notification preferences for muting
     - Creates domain event for notify-fan-out to process
     - Inserts into dedupe log

## Local Development

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
THRESHOLD_MINUTES=180
DRY_RUN=true
LOG_LEVEL=DEBUG
EOF

# Test locally (dry run)
python main.py
```

## Build Docker Image

```bash
docker build -t capmatch-unread-thread-nudges:local .

# Test Docker container
docker run --rm --env-file .env capmatch-unread-thread-nudges:local
```

## Deploy to VM

```bash
# SSH to GCP VM
ssh your-vm

# Pull latest code
cd capmatch
git pull origin main

# Run setup script
cd gcp-services/scheduled/unread-thread-nudges
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep unread-thread-nudges

# Monitor logs
tail -f /var/log/unread-thread-nudges.log
```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `THRESHOLD_MINUTES` - Stale threshold in minutes (default: 180 = 3 hours)
- `LOG_LEVEL` - Logging level (default: INFO)
- `DRY_RUN` - If true, logs actions without executing (default: false)

## Migrated From
`supabase/functions/unread-thread-nudges/index.ts`
