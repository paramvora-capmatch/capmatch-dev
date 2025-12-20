#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${HOME}/.capmatch/logs"
LOG_FILE="${LOG_DIR}/unread-thread-nudges.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)
fi

# Run Docker container
docker run --rm \
    --name capmatch-unread-thread-nudges \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    -e DRY_RUN="${DRY_RUN:-false}" \
    -e THRESHOLD_MINUTES="${THRESHOLD_MINUTES:-180}" \
    capmatch-unread-thread-nudges:prod \
    >> "$LOG_FILE" 2>&1
