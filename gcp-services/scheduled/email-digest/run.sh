#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${HOME}/.capmatch/logs"
LOG_FILE="${LOG_DIR}/email-digest.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)
fi

# Run Docker container
# Use tee to show output in terminal AND log to file
docker run --rm \
    --name capmatch-email-digest \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e RESEND_API_KEY="$RESEND_API_KEY" \
    -e EMAIL_FROM="${EMAIL_FROM:-notifications@capmatch.com}" \
    -e RESEND_TEST_MODE="${RESEND_TEST_MODE:-false}" \
    -e RESEND_TEST_RECIPIENT="$RESEND_TEST_RECIPIENT" \
    -e RESEND_FORCE_TO_EMAIL="$RESEND_FORCE_TO_EMAIL" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    -e SKIP_IDEMPOTENCY_CHECK="${SKIP_IDEMPOTENCY_CHECK:-false}" \
    capmatch-email-digest:prod \
    2>&1 | tee -a "$LOG_FILE"

