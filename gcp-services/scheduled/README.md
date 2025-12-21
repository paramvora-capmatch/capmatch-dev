# Scheduled Jobs

This directory contains all Python-based scheduled jobs for the CapMatch platform.

## All Services

### Scheduled Jobs
1. **[meeting-reminders/](./meeting-reminders/)** - Every 5 minutes
   - Sends 30-minute meeting reminders to participants
   - Status: ✅ Complete

2. **[renew-calendar-watches/](./renew-calendar-watches/)** - Daily at 2 AM UTC
   - Renews Google Calendar watch channels before expiry
   - Status: ✅ Complete

3. **[unread-thread-nudges/](./unread-thread-nudges/)** - Every 15 minutes
   - Nudges users about stale unread messages
   - Status: ✅ Complete

4. **[resume-incomplete-nudges/](./resume-incomplete-nudges/)** - Every 6 hours
   - Nudges users to complete project/borrower resumes
   - Status: ✅ Complete

### Notification Services
5. **[notify-fan-out/](./notify-fan-out/)** - Every 1 minute
   - Processes domain events and creates in-app notifications + email queue
   - Handles 13 event types (3 implemented, 10 TODO)
   - Status: 🚧 In Progress

### Email Services
6. **[email-notifications/](./email-notifications/)** - Dual mode:
   - **Instant**: Every 1 minute - sends high-priority emails immediately
   - **Hourly**: 6 AM - 6 PM Pacific - sends digest emails in batches
   - Uses Resend API for delivery
   - Status: ✅ Complete

## Architecture

Each scheduled job follows the same structure:

```
job-name/
├── Dockerfile              # Python 3.13-slim base
├── pyproject.toml          # uv dependencies
├── main.py                 # Job entry point
├── config.py               # Environment config
├── run.sh                  # Docker run script
├── setup-vm.sh             # VM deployment script
└── README.md               # Job documentation
```

## Common Patterns

### Environment Variables
All jobs require:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `LOG_LEVEL` - Logging level (default: INFO)
- `DRY_RUN` - If true, logs actions without executing (default: false)

Additional variables per job documented in each README.

### Logging
All jobs use structured logging:
```
2025-01-20 14:30:45 - INFO - job-name - Message here
```

### Dry Run Mode
All jobs support `DRY_RUN=true` for testing:
```bash
DRY_RUN=true python main.py
```

### Domain Events
Jobs create domain events in the `domain_events` table. The `notify-fan-out` GCP service polls and processes these events within 0-60 seconds (avg 30s).

## Deployment

### Local Development
```bash
cd job-name/

# Create .env file with credentials
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_key
DRY_RUN=true
LOG_LEVEL=DEBUG
EOF

# Test locally
python main.py
```

### Build Docker Image
```bash
cd job-name/
docker build -t capmatch-job-name:local .
docker run --rm --env-file .env capmatch-job-name:local
```

### Deploy to VM
```bash
# SSH to GCP VM
ssh your-vm
cd capmatch/gcp-services/scheduled/job-name

# Run setup script (builds image, sets up cron)
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep job-name

# Monitor logs
tail -f /var/log/job-name.log
```

## Cron Schedules

| Service | Schedule | Cron Syntax |
|---------|----------|-------------|
| meeting-reminders | Every 5 minutes | `*/5 * * * *` |
| unread-thread-nudges | Every 15 minutes | `*/15 * * * *` |
| resume-incomplete-nudges | Every 6 hours | `0 */6 * * *` |
| renew-calendar-watches | Daily at 2 AM UTC | `0 2 * * *` |
| notify-fan-out | Every 1 minute | `* * * * *` |
| email-notifications (hourly) | 6 AM - 6 PM Pacific | `0 6-18 * * *` |
| email-notifications (instant) | Every 1 minute | `* * * * *` |

## Migrated From

All services replace corresponding Supabase Edge Functions:
- `supabase/functions/meeting-reminders/` → `meeting-reminders/`
- `supabase/functions/renew-calendar-watches/` → `renew-calendar-watches/`
- `supabase/functions/unread-thread-nudges/` → `unread-thread-nudges/`
- `supabase/functions/resume-incomplete-nudges/` → `resume-incomplete-nudges/`
- Email functionality previously in edge functions now handled by `email-notifications/`
- `notify-fan-out` consolidates notification logic previously scattered across edge functions

## Dependencies

All jobs use:
- Python 3.13-slim
- `uv` package manager
- `supabase` Python SDK
- `python-dotenv` for environment variables
- Additional per-job dependencies in each `pyproject.toml`

## Monitoring

Check job status:
```bash
# View logs
tail -f /var/log/job-name.log

# Check cron execution
grep "job-name" /var/log/syslog

# Verify domain events created
psql -c "SELECT * FROM domain_events WHERE event_type = 'event_type_here' ORDER BY created_at DESC LIMIT 10"
```

## Troubleshooting

### Job not running
```bash
# Check cron job is installed
crontab -l | grep job-name

# Check Docker image exists
docker images | grep job-name

# Manually run job
cd /path/to/job-name
./run.sh
```

### Errors in logs
```bash
# View full logs
tail -100 /var/log/job-name.log

# Test with dry run
DRY_RUN=true python main.py

# Check environment variables
docker run --rm --env-file .env job-name:prod env | grep SUPABASE
```

## Service Organization

All scheduled services are now consolidated under `/gcp-services/scheduled/`:
- **Scheduled Jobs**: Time-based cron jobs (meeting-reminders, unread-thread-nudges, resume-incomplete-nudges, renew-calendar-watches)
- **Notification Services**: Event-driven processing (notify-fan-out)
- **Email Services**: Notification delivery (email-notifications with instant and hourly modes)

## Next Steps

1. Complete notify-fan-out event handlers (10 remaining out of 13)
2. Monitor production for 1 week
3. Delete obsolete Supabase Edge Functions after confirming all functionality works
4. Update deployment documentation with new paths
