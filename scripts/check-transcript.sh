#!/bin/bash

# Script to check if a transcript was saved for a room
# Usage: ./scripts/check-transcript.sh <room-name>

if [ -z "$1" ]; then
  echo "Error: Please provide room name"
  echo "Usage: ./scripts/check-transcript.sh <room-name>"
  echo ""
  echo "Example:"
  echo "  ./scripts/check-transcript.sh capmatch-abc-123456"
  exit 1
fi

ROOM_NAME=$1

echo "Checking transcript for room: $ROOM_NAME"
echo ""

# Use psql to query local Supabase
psql postgresql://postgres:postgres@localhost:54322/postgres <<EOF
SELECT
  id,
  title,
  room_name,
  status,
  LENGTH(transcript_text) as transcript_length,
  LEFT(transcript_text, 100) as transcript_preview,
  summary::text as summary_json
FROM meetings
WHERE room_name = '$ROOM_NAME';
EOF
