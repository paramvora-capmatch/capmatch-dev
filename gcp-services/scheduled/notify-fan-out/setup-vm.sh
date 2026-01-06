#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up notify-fan-out service..."

# Create log file
sudo touch /var/log/notify-fan-out.log
sudo chown "$USER:staff" /var/log/notify-fan-out.log
echo "✓ Created log file at /var/log/notify-fan-out.log"

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/notify-fan-out/Dockerfile \
    -t capmatch-notify-fan-out:prod .
echo "✓ Built Docker image: capmatch-notify-fan-out:prod"

# Setup cron job (every minute)
CRON_JOB="* * * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "notify-fan-out/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run every minute"

echo ""
echo "Setup complete!"
echo "The service will run every minute via cron."
echo "Monitor logs with: tail -f /var/log/notify-fan-out.log"
