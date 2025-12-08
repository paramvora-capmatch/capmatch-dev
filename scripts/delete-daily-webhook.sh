#!/bin/bash

# Script to delete a Daily.co webhook
# Usage: ./scripts/delete-daily-webhook.sh <webhook-uuid>

if [ -z "$1" ]; then
  echo "Error: Please provide webhook UUID"
  echo "Usage: ./scripts/delete-daily-webhook.sh <webhook-uuid>"
  echo ""
  echo "To find webhook UUIDs, run: ./scripts/list-daily-webhooks.sh"
  exit 1
fi

WEBHOOK_UUID=$1

# Check if DAILY_API_KEY is set
if [ -z "$DAILY_API_KEY" ]; then
  echo "Error: DAILY_API_KEY environment variable not set"
  echo "Please set it in your .env.local file and run: source .env.local"
  exit 1
fi

echo "Deleting webhook: $WEBHOOK_UUID"
echo ""

# Delete the webhook
curl -X DELETE "https://api.daily.co/v1/webhooks/$WEBHOOK_UUID" \
  -H "Authorization: Bearer $DAILY_API_KEY"

echo ""
echo "Webhook deleted!"
