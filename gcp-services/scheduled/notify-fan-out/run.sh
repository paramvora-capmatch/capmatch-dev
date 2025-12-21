#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
LOG_FILE="/var/log/notify-fan-out.log"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

docker run --rm \
  --env-file "$ENV_FILE" \
  capmatch-notify-fan-out:prod \
  python main.py >> "$LOG_FILE" 2>&1

echo "Job completed at $(date)" >> "$LOG_FILE"
