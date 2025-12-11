#!/bin/bash
# Test script for meeting notifications
# Make sure you have a valid JWT token and user IDs

# Set your test variables
SUPABASE_URL="http://127.0.0.1:54321"
JWT_TOKEN="your-jwt-token-here"  # Get this from Supabase Studio or browser dev tools
ORGANIZER_ID="your-user-id"
PARTICIPANT_ID="another-user-id"
PROJECT_ID="project-id-optional"

echo "Creating test meeting with notification..."

curl -X POST "${SUPABASE_URL}/functions/v1/meetings/create" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting - Notification Check",
    "description": "Testing meeting invitation notifications",
    "startTime": "'$(date -u -v+1d +"%Y-%m-%dT%H:%M:%SZ")'",
    "endTime": "'$(date -u -v+1d -v+1H +"%Y-%m-%dT%H:%M:%SZ")'",
    "participantIds": ["'${PARTICIPANT_ID}'"],
    "projectId": "'${PROJECT_ID}'"
  }'

echo -e "\n\nNow check:"
echo "1. Supabase Studio -> domain_events table for 'meeting_invited' events"
echo "2. Supabase Studio -> notifications table for new notifications"
echo "3. Login as participant and check notification bell"
