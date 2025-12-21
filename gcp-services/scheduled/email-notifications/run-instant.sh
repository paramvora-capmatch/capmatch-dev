#!/usr/bin/env bash
# Email notifications - instant runner
# Usage: ./run-instant.sh
#
# This script runs the email-notifications instant job in a Docker container.
# Ensure you have:
# - Docker installed and your user in the docker group
# - .env file in this directory with required environment variables
# - Docker image built: docker build -f services/email-notifications/Dockerfile -t capmatch-email-notifications:prod .

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="${EMAIL_NOTIFICATIONS_INSTANT_LOG:-/var/log/email-notifications-instant.log}"

if [ ! -f "$LOG_FILE" ]; then
  touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/dev/stdout"
fi

DOCKER_BIN="$(command -v docker || true)"
if [ -z "$DOCKER_BIN" ]; then
  echo "Error: docker binary not found in PATH." >&2
  exit 1
fi

# Check if Docker image exists
if ! "$DOCKER_BIN" image inspect capmatch-email-notifications:prod >/dev/null 2>&1; then
  echo "Error: Docker image 'capmatch-email-notifications:prod' not found." >&2
  echo "Build it with:" >&2
  echo "  docker build -f gcp-services/email-notifications/Dockerfile -t capmatch-email-notifications:prod ." >&2
  echo "  (run from the repo root directory)" >&2
  exit 1
fi

# Check if .env.local file exists (for local) or .env (for VM)
if [ -f .env.local ]; then
  ENV_FILE=".env.local"
elif [ -f .env ]; then
  ENV_FILE=".env"
else
  echo "Error: Neither .env.local nor .env file found in $SCRIPT_DIR" >&2
  exit 1
fi

"$DOCKER_BIN" run --rm \
  --env-file "$ENV_FILE" \
  capmatch-email-notifications:prod \
  uv run python main_instant.py >> "$LOG_FILE" 2>&1



