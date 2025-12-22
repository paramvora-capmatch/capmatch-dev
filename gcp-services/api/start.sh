#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)
fi

# Stop existing container if running
docker stop capmatch-api 2>/dev/null || true
docker rm capmatch-api 2>/dev/null || true

# Run new container
docker run -d \
    --name capmatch-api \
    -p 8080:8080 \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
    -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    -e GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
    -e GEMINI_API_KEY="$GEMINI_API_KEY" \
    -e DAILY_API_KEY="$DAILY_API_KEY" \
    -e DAILY_WEBHOOK_SECRET="$DAILY_WEBHOOK_SECRET" \
    -e CORS_ORIGINS="$CORS_ORIGINS" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    -e ENVIRONMENT="${ENVIRONMENT:-production}" \
    --restart unless-stopped \
    --network host \
    capmatch-api:prod

echo "CapMatch API started successfully"
echo "Container ID: $(docker ps -q -f name=capmatch-api)"
