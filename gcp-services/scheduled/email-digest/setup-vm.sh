#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up email-digest scheduled job..."

# Create log file
sudo touch /var/log/email-digest.log
sudo chown "$(id -un):$(id -gn)" /var/log/email-digest.log
echo "✓ Created log file at /var/log/email-digest.log"

# Build Docker image (build context from repo root)
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/email-digest/Dockerfile \
    -t capmatch-email-digest:prod \
    .
echo "✓ Built Docker image: capmatch-email-digest:prod"

# Setup cron job (daily at 9 AM PST = 17:00 UTC)
CRON_JOB="0 17 * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "email-digest/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run daily at 9 AM PST (17:00 UTC)"

echo ""
echo "Setup complete!"
echo "The service will run daily at 9 AM PST via cron."
echo "Monitor logs with: tail -f /var/log/email-digest.log"

