#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up renew-calendar-watches scheduled job..."

# Create log file
sudo touch /var/log/renew-calendar-watches.log
sudo chown "$USER:$USER" /var/log/renew-calendar-watches.log
echo "✓ Created log file at /var/log/renew-calendar-watches.log"

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/renew-calendar-watches/Dockerfile \
    -t capmatch-renew-calendar-watches:prod \
    gcp-services/scheduled/renew-calendar-watches
echo "✓ Built Docker image: capmatch-renew-calendar-watches:prod"

# Setup cron job (daily at 2 AM UTC)
CRON_JOB="0 2 * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "renew-calendar-watches/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run daily at 2 AM UTC"

echo ""
echo "Setup complete!"
echo "The service will run daily at 2 AM UTC via cron."
echo "Monitor logs with: tail -f /var/log/renew-calendar-watches.log"
