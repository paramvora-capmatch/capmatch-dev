#!/bin/bash

# Script to create Daily.co webhook for local development
# Usage: ./scripts/create-daily-webhook.sh https://your-ngrok-url.ngrok-free.app

if [ -z "$1" ]; then
  echo "Error: Please provide your ngrok URL"
  echo "Usage: ./scripts/create-daily-webhook.sh https://your-ngrok-url.ngrok-free.app"
  exit 1
fi

NGROK_URL=$1
WEBHOOK_URL="${NGROK_URL}/api/webhooks/daily"

# Check if DAILY_API_KEY is set
if [ -z "$DAILY_API_KEY" ]; then
  echo "Error: DAILY_API_KEY environment variable not set"
  echo "Please set it in your .env.local file and run: source .env.local"
  exit 1
fi

echo "Creating webhook for URL: $WEBHOOK_URL"
echo ""

# Create the webhook
curl -X POST https://api.daily.co/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"eventTypes\": [
      \"meeting.started\",
      \"transcript.ready-to-download\"
    ]
  }"

echo ""
echo ""
echo "Webhook created! Daily.co will now send transcript events to: $WEBHOOK_URL"
