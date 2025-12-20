#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up meeting-reminders scheduled job..."

# Create log file
sudo touch /var/log/meeting-reminders.log
sudo chown "$USER:$USER" /var/log/meeting-reminders.log
echo "✓ Created log file at /var/log/meeting-reminders.log"

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/meeting-reminders/Dockerfile \
    -t capmatch-meeting-reminders:prod \
    gcp-services/scheduled/meeting-reminders
echo "✓ Built Docker image: capmatch-meeting-reminders:prod"

# Setup cron job (every 5 minutes)
CRON_JOB="*/5 * * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "meeting-reminders/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run every 5 minutes"

echo ""
echo "Setup complete!"
echo "The service will run every 5 minutes via cron."
echo "Monitor logs with: tail -f /var/log/meeting-reminders.log"
