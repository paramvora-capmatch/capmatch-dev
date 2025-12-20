# Meeting Reminders - Scheduled Job

Sends 30-minute meeting reminders to participants.

## Schedule
Every 5 minutes (`*/5 * * * *`)

## What it does
1. Calls RPC `get_meetings_needing_reminders` to find participants needing 30-min reminders
2. For each participant, calls RPC `insert_meeting_reminder_event` to create a domain event
3. The `notify-fan-out` GCP service polls and processes these events (within 0-60 seconds)
4. Marks reminder as sent in `meeting_reminders_sent` table

## Local Development

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DRY_RUN=true
LOG_LEVEL=DEBUG
EOF

# Test locally (dry run)
python main.py
```

## Build Docker Image

```bash
docker build -t capmatch-meeting-reminders:local .

# Test Docker container
docker run --rm --env-file .env capmatch-meeting-reminders:local
```

## Deploy to VM

```bash
# SSH to GCP VM
ssh your-vm

# Pull latest code
cd capmatch
git pull origin main

# Run setup script
cd gcp-services/scheduled/meeting-reminders
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep meeting-reminders

# Monitor logs
tail -f /var/log/meeting-reminders.log
```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `LOG_LEVEL` - Logging level (default: INFO)
- `DRY_RUN` - If true, logs actions without executing (default: false)

## Migrated From
`supabase/functions/meeting-reminders/index.ts`
