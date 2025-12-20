#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Setting up resume-incomplete-nudges scheduled job..."

# Create log file
sudo touch /var/log/resume-incomplete-nudges.log
sudo chown "$USER:$USER" /var/log/resume-incomplete-nudges.log
echo "✓ Created log file at /var/log/resume-incomplete-nudges.log"

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/scheduled/resume-incomplete-nudges/Dockerfile \
    -t capmatch-resume-incomplete-nudges:prod \
    gcp-services/scheduled/resume-incomplete-nudges
echo "✓ Built Docker image: capmatch-resume-incomplete-nudges:prod"

# Setup cron job (every 6 hours)
CRON_JOB="0 */6 * * * $SCRIPT_DIR/run.sh"
(crontab -l 2>/dev/null | grep -v "resume-incomplete-nudges/run.sh"; echo "$CRON_JOB") | crontab -
echo "✓ Installed cron job to run every 6 hours"

echo ""
echo "Setup complete!"
echo "The service will run every 6 hours via cron."
echo "Monitor logs with: tail -f /var/log/resume-incomplete-nudges.log"
