#!/bin/bash
# Test script for daily-webhook edge function

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get function URL from user or use default
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./test-webhook.sh <function-url>${NC}"
    echo -e "${YELLOW}Example: ./test-webhook.sh https://abc123.supabase.co/functions/v1/daily-webhook${NC}"
    echo ""
    echo -e "${YELLOW}Using local development URL...${NC}"
    FUNCTION_URL="http://localhost:54321/functions/v1/daily-webhook"
else
    FUNCTION_URL="$1"
fi

echo -e "${GREEN}Testing Daily.co Webhook Handler${NC}"
echo -e "Function URL: ${FUNCTION_URL}"
echo ""

# Test 1: meeting.started event
echo -e "${YELLOW}Test 1: meeting.started event${NC}"
curl -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meeting.started",
    "event": "meeting.started",
    "payload": {
      "room": "test-room-123"
    }
  }' \
  --silent --show-error --fail | jq '.'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test 1 passed${NC}\n"
else
    echo -e "${RED}✗ Test 1 failed${NC}\n"
fi

sleep 1

# Test 2: transcript.ready-to-download event
echo -e "${YELLOW}Test 2: transcript.ready-to-download event${NC}"
curl -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript.ready-to-download",
    "event": "transcript.ready-to-download",
    "payload": {
      "room_name": "test-room-456",
      "id": "test-transcript-id-789",
      "mtg_session_id": "test-session-123",
      "duration": 300
    }
  }' \
  --silent --show-error --fail | jq '.'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test 2 passed${NC}\n"
else
    echo -e "${RED}✗ Test 2 failed${NC}\n"
fi

sleep 1

# Test 3: recording.ready event
echo -e "${YELLOW}Test 3: recording.ready event${NC}"
curl -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "recording.ready",
    "event": "recording.ready",
    "payload": {
      "room": "test-room-789",
      "recording": {
        "id": "rec-123",
        "room_name": "test-room-789",
        "start_ts": 1234567890,
        "duration_sec": 300,
        "download_link": "https://example.com/recording.mp4"
      }
    }
  }' \
  --silent --show-error --fail | jq '.'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test 3 passed${NC}\n"
else
    echo -e "${RED}✗ Test 3 failed${NC}\n"
fi

sleep 1

# Test 4: meeting.ended event
echo -e "${YELLOW}Test 4: meeting.ended event${NC}"
curl -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meeting.ended",
    "event": "meeting.ended",
    "payload": {
      "room": "test-room-999",
      "duration_sec": 600
    }
  }' \
  --silent --show-error --fail | jq '.'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test 4 passed${NC}\n"
else
    echo -e "${RED}✗ Test 4 failed${NC}\n"
fi

sleep 1

# Test 5: CORS preflight
echo -e "${YELLOW}Test 5: CORS preflight (OPTIONS)${NC}"
curl -X OPTIONS "${FUNCTION_URL}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  --silent --show-error --fail -I

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test 5 passed${NC}\n"
else
    echo -e "${RED}✗ Test 5 failed${NC}\n"
fi

echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo -e "${YELLOW}Note: These are basic connectivity tests.${NC}"
echo -e "${YELLOW}Check function logs for detailed processing:${NC}"
echo -e "  supabase functions logs daily-webhook --tail"
