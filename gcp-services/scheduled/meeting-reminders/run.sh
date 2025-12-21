#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${HOME}/.capmatch/logs"
LOG_FILE="${LOG_DIR}/meeting-reminders.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)
fi

# Run Docker container
docker run --rm \
    --name capmatch-meeting-reminders \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    -e DRY_RUN="${DRY_RUN:-false}" \
    capmatch-meeting-reminders:prod \
    >> "$LOG_FILE" 2>&1
