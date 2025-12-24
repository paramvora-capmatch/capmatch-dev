#!/bin/bash

# Script to list all Daily.co webhooks
# Usage: ./scripts/list-daily-webhooks.sh

# Check if DAILY_API_KEY is set, if not try to read from .env.local
if [ -z "$DAILY_API_KEY" ]; then
  if [ -f .env.local ]; then
    export DAILY_API_KEY=$(grep DAILY_API_KEY .env.local | cut -d '=' -f2)
  fi
fi

# Check again if DAILY_API_KEY is set
if [ -z "$DAILY_API_KEY" ]; then
  echo "Error: DAILY_API_KEY environment variable not set"
  echo "Please set it in your .env.local file"
  exit 1
fi

echo "Fetching all webhooks..."
echo ""

# List all webhooks
curl -X GET https://api.daily.co/v1/webhooks \
  -H "Authorization: Bearer $DAILY_API_KEY" | jq '.'

echo ""
