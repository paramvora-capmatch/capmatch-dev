#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up unread-thread-nudges scheduled job..."

# Create log file
sudo touch /var/log/unread-thread-nudges.log
sudo chown "$USER:$USER" /var/log/unread-thread-nudges.log
echo "✓ Created log file at /var/log/unread-thread-nudges.log"

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/unread-thread-nudges/Dockerfile \
    -t capmatch-unread-thread-nudges:prod \
    gcp-services/scheduled/unread-thread-nudges
echo "✓ Built Docker image: capmatch-unread-thread-nudges:prod"

# Setup cron job (every 15 minutes)
CRON_JOB="*/15 * * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "unread-thread-nudges/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run every 15 minutes"

echo ""
echo "Setup complete!"
echo "The service will run every 15 minutes via cron."
echo "Monitor logs with: tail -f /var/log/unread-thread-nudges.log"
