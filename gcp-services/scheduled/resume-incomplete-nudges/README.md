# Resume Incomplete Nudges - Scheduled Job

Nudges project owners to complete their project and borrower resumes using a tiered notification system.

## Schedule
Every 6 hours (`0 */6 * * *`)

## What it does
1. Queries all projects with workspace activity
2. For each project owner:
   - Checks project resume completion percentage
   - Checks borrower resume completion percentage
   - Determines appropriate nudge tier based on time since last edit
   - Creates domain events for incomplete resumes

## Nudge Tier System

The job uses a 4-tier nudging system based on time since last edit:

- **Tier 1**: 1 day after last edit
- **Tier 2**: 3 days after last edit
- **Tier 3**: 5 days after last edit
- **Tier 4**: 7 days after last edit

### Tier Reset Logic

If a user edits their resume after receiving a nudge, all previous nudges for that resume are deleted and the tier counter resets. This ensures users only get fresh reminders if they become inactive again.

## Local Development

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LOG_LEVEL=DEBUG
EOF

# Test locally
python main.py
```

## Build Docker Image

```bash
docker build -t capmatch-resume-incomplete-nudges:local .

# Test Docker container
docker run --rm --env-file .env capmatch-resume-incomplete-nudges:local
```

## Deploy to VM

```bash
# SSH to GCP VM
ssh your-vm

# Pull latest code
cd capmatch
git pull origin main

# Run setup script
cd gcp-services/scheduled/resume-incomplete-nudges
chmod +x setup-vm.sh run.sh
./setup-vm.sh

# Verify cron job
crontab -l | grep resume-incomplete-nudges

# Monitor logs
tail -f /var/log/resume-incomplete-nudges.log
```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `LOG_LEVEL` - Logging level (default: INFO)

## Migrated From
`supabase/functions/resume-incomplete-nudges/index.ts`

## Key Features

- **Tier-based nudging**: Progressive reminders at 1d, 3d, 5d, 7d intervals
- **Tier reset**: Editing a resume deletes old nudges and resets the counter
- **Dual resume tracking**: Handles both project and borrower resumes independently
- **Owner-only notifications**: Only project owners receive nudges
- **Completion tracking**: Uses `completeness_percent` field from resumes
- **Activity tracking**: Uses `project_workspace_activity` to determine last edit time
