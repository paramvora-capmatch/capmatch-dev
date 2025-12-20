#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)
fi

# Run Docker container
docker run --rm \
    --name capmatch-resume-incomplete-nudges \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    capmatch-resume-incomplete-nudges:prod \
    >> /var/log/resume-incomplete-nudges.log 2>&1
