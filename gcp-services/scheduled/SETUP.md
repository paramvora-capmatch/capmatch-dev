# Scheduled Services Setup Guide

Quick start guide for setting up environment variables for all scheduled services (jobs, notifications, and email).

## Local Development Setup

### 1. Copy Environment Files

For each job you want to run locally, copy the `.env.example` to `.env`:

```bash
# Method 1: Copy for all services at once
cd gcp-services/scheduled

# Scheduled jobs
cp meeting-reminders/.env.example meeting-reminders/.env
cp renew-calendar-watches/.env.example renew-calendar-watches/.env
cp unread-thread-nudges/.env.example unread-thread-nudges/.env
cp resume-incomplete-nudges/.env.example resume-incomplete-nudges/.env

# Notification services
cp notify-fan-out/.env.example notify-fan-out/.env

# Email services
cp email-notifications/.env.example email-notifications/.env
```

Or use this one-liner:

```bash
# Method 2: One-liner to copy all at once
cd gcp-services/scheduled && for dir in meeting-reminders renew-calendar-watches unread-thread-nudges resume-incomplete-nudges notify-fan-out email-notifications; do cp $dir/.env.example $dir/.env; done
```

### 2. Get Required Credentials

You'll need to fill in these values in each `.env` file:

#### Supabase Credentials (Required for ALL services)

1. **SUPABASE_URL**:
   - Local dev: `http://127.0.0.1:54321`
   - Production: Get from Supabase dashboard → Settings → API

2. **SUPABASE_SERVICE_ROLE_KEY**:
   - Get from Supabase dashboard → Settings → API → service_role key
   - ⚠️ **NEVER** commit this to git or expose publicly

#### Google OAuth (Only for `renew-calendar-watches`)

3. **GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET**:
   - Get from [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)

4. **NEXT_PUBLIC_SITE_URL**:
   - Local dev: `http://localhost:3000`
   - Production: Your production URL

#### Email Service (Only for `email-notifications`)

5. **RESEND_API_KEY**:
   - Get from [Resend Dashboard](https://resend.com/)
   - Sign up and create API key

6. **EMAIL_FROM**:
   - Sender email address (e.g., `notifications@capmatch.com`)
   - Must be verified in Resend dashboard

### 3. Update Environment Files

Edit each `.env` file and replace the placeholder values:

```bash
# Example for meeting-reminders/.env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOG_LEVEL=DEBUG
DRY_RUN=true
```

### 4. Test Locally

Run each service locally to verify configuration:

```bash
# Test scheduled jobs
cd meeting-reminders && python main.py
cd ../renew-calendar-watches && python main.py
cd ../unread-thread-nudges && python main.py
cd ../resume-incomplete-nudges && python main.py

# Test notification service
cd ../notify-fan-out && python main.py

# Test email service
cd ../email-notifications && python main_instant.py
cd ../email-notifications && python main_hourly.py
```

## Production VM Deployment

### 1. Create Production Environment Files

On your production VM, create `.env` files with production credentials:

```bash
# SSH to VM
ssh your-production-vm

# Navigate to each job directory
cd /path/to/capmatch/gcp-services/scheduled/meeting-reminders

# Create production .env
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
LOG_LEVEL=INFO
DRY_RUN=false
EOF

# Secure the file
chmod 600 .env
```

Repeat for all jobs, adjusting job-specific variables as needed.

### 2. Deploy Services

Run the setup script for each service:

```bash
# Deploy all services
cd gcp-services/scheduled

for service in meeting-reminders renew-calendar-watches unread-thread-nudges resume-incomplete-nudges notify-fan-out email-notifications; do
  cd $service
  chmod +x setup-vm.sh run*.sh
  ./setup-vm.sh
  cd ..
done
```

### 3. Verify Cron Jobs

Check that all cron jobs are installed:

```bash
crontab -l
```

You should see all services scheduled:
```
*/5 * * * * /path/to/meeting-reminders/run.sh
0 2 * * * /path/to/renew-calendar-watches/run.sh
*/15 * * * * /path/to/unread-thread-nudges/run.sh
0 */6 * * * /path/to/resume-incomplete-nudges/run.sh
* * * * * /path/to/notify-fan-out/run.sh
0 6-18 * * * /path/to/email-notifications/run-hourly.sh
* * * * * /path/to/email-notifications/run-instant.sh
```

### 4. Monitor Logs

Check logs to verify services are running:

```bash
# View individual logs
tail -f /var/log/meeting-reminders.log
tail -f /var/log/renew-calendar-watches.log
tail -f /var/log/unread-thread-nudges.log
tail -f /var/log/resume-incomplete-nudges.log
tail -f /var/log/notify-fan-out.log
tail -f /var/log/email-notifications-instant.log
tail -f /var/log/email-notifications-hourly.log

# Or monitor all at once with multitail (if installed)
multitail /var/log/meeting-reminders.log /var/log/renew-calendar-watches.log /var/log/unread-thread-nudges.log /var/log/resume-incomplete-nudges.log /var/log/notify-fan-out.log /var/log/email-notifications-instant.log /var/log/email-notifications-hourly.log
```

## Environment Variable Reference

### Common Variables (All Services)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | `http://127.0.0.1:54321` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) | `eyJhbGci...` | ✅ |
| `LOG_LEVEL` | Logging verbosity | `INFO`, `DEBUG` | ❌ (default: INFO) |

### Service-Specific Variables

#### renew-calendar-watches
| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Site URL for webhook | ✅ |

#### unread-thread-nudges
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `THRESHOLD_MINUTES` | Minutes before message is "stale" | 180 (3 hours) | ❌ |

#### email-notifications
| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key | ✅ |
| `EMAIL_FROM` | Sender email address | ✅ |
| `EMAIL_NOTIFICATIONS_DRY_RUN` | Test mode | ❌ (default: false) |
| `RESEND_TEST_MODE` | Resend test mode | ❌ (default: false) |

#### notify-fan-out
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NOTIFY_FANOUT_BATCH_SIZE` | Events per batch | 500 | ❌ |
| `NOTIFY_FANOUT_DRY_RUN` | Test mode | `false` | ❌ |
| `NOTIFY_FANOUT_MAX_EVENT_AGE_HOURS` | Max age for events | 24 | ❌ |

#### meeting-reminders, unread-thread-nudges, resume-incomplete-nudges
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DRY_RUN` | Test mode (no events created) | `false` | ❌ |

## Troubleshooting

### "Missing required environment variables"
- Check that `.env` file exists in the job directory
- Verify all required variables are set (not empty)

### "Permission denied" when running scripts
```bash
chmod +x setup-vm.sh run.sh
```

### Job not running on schedule
```bash
# Check cron job is installed
crontab -l | grep job-name

# Check Docker container exists
docker images | grep capmatch

# Manually run job
cd /path/to/job
./run.sh
```

### Logs not appearing
```bash
# Check log file exists and has correct permissions
ls -la /var/log/job-name.log

# Create log file if missing
sudo touch /var/log/job-name.log
sudo chown $USER:$USER /var/log/job-name.log
```

## Security Best Practices

1. **Never commit `.env` files** - Already handled by `.gitignore`
2. **Use different credentials for dev/prod** - Don't reuse production keys locally
3. **Rotate service role keys periodically** - Update in Supabase dashboard
4. **Restrict file permissions** - Use `chmod 600 .env` on production
5. **Use secrets management** - Consider using VM secret managers for production
