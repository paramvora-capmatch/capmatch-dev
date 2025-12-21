# Renew Calendar Watches - Scheduled Job

Renews Google Calendar watch channels before they expire (24 hours before expiry).

## Schedule
Daily at 2 AM UTC (`0 2 * * *`)

## What it does
1. Queries `calendar_connections` for watches expiring within 24 hours
2. For each connection:
   - Stops the old watch channel
   - Refreshes OAuth token if needed
   - Sets up a new 7-day watch channel
   - Updates connection with new watch details

## Local Development

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DRY_RUN=true
LOG_LEVEL=DEBUG
EOF

# Test locally (dry run)
python main.py
```

## Build Docker Image

```bash
docker build -t capmatch-renew-calendar-watches:local .

# Test Docker container
docker run --rm --env-file .env capmatch-renew-calendar-watches:local
```

## Deploy to VM

```bash
# SSH to GCP VM
ssh your-vm

# Pull latest code
cd capmatch
git pull origin main

# Run setup script
cd gcp-services/scheduled/renew-calendar-watches
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep renew-calendar-watches

# Monitor logs
tail -f /var/log/renew-calendar-watches.log
```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (secret)
- `NEXT_PUBLIC_SITE_URL` - Site URL for webhook
- `LOG_LEVEL` - Logging level (default: INFO)
- `DRY_RUN` - If true, logs actions without executing (default: false)

## Migrated From
`supabase/functions/renew-calendar-watches/index.ts`
