#!/bin/bash

# Script to test the webhook endpoint with a mock Daily.co payload
# Usage: ./scripts/test-webhook-endpoint.sh [ngrok-url]

WEBHOOK_URL=${1:-"http://localhost:3000"}/api/webhooks/daily

echo "Testing webhook endpoint: $WEBHOOK_URL"
echo ""

# Mock payload similar to what Daily.co sends
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript.ready-to-download",
    "payload": {
      "room_name": "test-room-123",
      "id": "test-transcript-id-456",
      "mtg_session_id": "test-session-789",
      "duration": 120
    }
  }'

echo ""
echo ""
echo "Check your Next.js terminal for logs!"
echo "Expected output:"
echo "  - Received Daily.co webhook - Full payload: ..."
echo "  - Transcript ready: { room_name: 'test-room-123', ... }"
echo ""
echo "Note: This test will fail to download actual transcript (test ID doesn't exist)"
echo "But it verifies your webhook endpoint is reachable and processing requests."
