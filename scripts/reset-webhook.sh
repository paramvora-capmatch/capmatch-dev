#!/bin/bash

# Script to delete old webhook and create a new one
# Usage: ./scripts/reset-webhook.sh https://your-new-ngrok-url.ngrok-free.app

if [ -z "$1" ]; then
  echo "Error: Please provide your new ngrok URL"
  echo "Usage: ./scripts/reset-webhook.sh https://your-ngrok-url.ngrok-free.app"
  exit 1
fi

NEW_NGROK_URL=$1

# Check if DAILY_API_KEY is set
if [ -z "$DAILY_API_KEY" ]; then
  echo "Error: DAILY_API_KEY environment variable not set"
  echo "Setting it from .env.local..."
  export DAILY_API_KEY=$(grep DAILY_API_KEY .env.local | cut -d '=' -f2)
fi

echo "================================================"
echo "Daily.co Webhook Reset"
echo "================================================"
echo ""

# Get existing webhook ID
echo "1. Fetching existing webhook..."
WEBHOOK_DATA=$(curl -s -X GET https://api.daily.co/v1/webhooks \
  -H "Authorization: Bearer $DAILY_API_KEY")

WEBHOOK_ID=$(echo $WEBHOOK_DATA | jq -r '.data[0].id')

if [ "$WEBHOOK_ID" = "null" ] || [ -z "$WEBHOOK_ID" ]; then
  echo "   No existing webhook found."
else
  echo "   Found webhook: $WEBHOOK_ID"
  OLD_URL=$(echo $WEBHOOK_DATA | jq -r '.data[0].url')
  echo "   Old URL: $OLD_URL"
  echo ""

  # Delete old webhook
  echo "2. Deleting old webhook..."
  curl -s -X DELETE "https://api.daily.co/v1/webhooks/$WEBHOOK_ID" \
    -H "Authorization: Bearer $DAILY_API_KEY" > /dev/null
  echo "   ✓ Deleted"
  echo ""
fi

# Create new webhook
echo "3. Creating new webhook..."
echo "   New URL: $NEW_NGROK_URL/api/webhooks/daily"
echo ""

./scripts/create-daily-webhook.sh $NEW_NGROK_URL

echo ""
echo "================================================"
echo "✓ Webhook reset complete!"
echo "================================================"
