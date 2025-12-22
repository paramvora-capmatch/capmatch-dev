# Daily.co Webhook Setup Guide

This guide will help you set up Daily.co webhooks for local development using ngrok.

## Overview

The webhook system automatically processes meeting transcripts and generates AI summaries:
1. Meeting ends with transcription enabled
2. Daily.co processes the transcript
3. Daily.co sends webhook to your FastAPI server
4. Your server downloads the transcript
5. Gemini AI generates a structured summary
6. Transcript and summary saved to `meetings` table

## Prerequisites

1. **Daily.co Account & API Key**
   - Sign up at https://dashboard.daily.co/
   - Get your API key from https://dashboard.daily.co/developers
   - Add to `gcp-services/api/.env`: `DAILY_API_KEY=your_key_here`

2. **Google Gemini API Key** (for AI summaries)
   - Get your key from https://makersuite.google.com/app/apikey
   - Add to `gcp-services/api/.env`: `GEMINI_API_KEY=your_key_here`

3. **ngrok** (for local development)
   - Install: `brew install ngrok` (macOS)
   - Or download from https://ngrok.com/download
   - Sign up and get auth token: https://dashboard.ngrok.com/get-started/your-authtoken
   - Configure: `ngrok config add-authtoken YOUR_TOKEN`

## Setup Steps

### 1. Apply Database Migration

```bash
supabase db push
```

This adds the `room_name` field to the `meetings` table.

### 2. Start Your FastAPI Development Server

```bash
cd gcp-services/api
python -m uvicorn main:app --reload --port 8000
```

Your FastAPI server should be running at http://localhost:8000

### 3. Expose Local Server with ngrok

In a **new terminal window**:

```bash
ngrok http 8000
```

You'll see output like:
```
Session Status                online
Account                       YourName (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy the `https://` URL** (e.g., `https://abc123.ngrok-free.app`)

**Important:** Keep this terminal window open! If you close it, ngrok stops and Daily.co can't reach your webhook.

### 4. Export Your Daily API Key

```bash
# Load your .env file
export DAILY_API_KEY=$(grep DAILY_API_KEY gcp-services/api/.env | cut -d '=' -f2)
```

Or manually:
```bash
export DAILY_API_KEY=your_daily_api_key_here
```

### 5. Create the Webhook

```bash
./scripts/create-daily-webhook.sh https://abc123.ngrok-free.app
```

Replace `https://abc123.ngrok-free.app` with your ngrok URL from step 3.

You should see a JSON response with your webhook details:
```json
{
  "uuid": "webhook-uuid-here",
  "url": "https://abc123.ngrok-free.app/webhooks/daily",
  "event_types": ["transcript.ready-to-download"],
  ...
}
```

**Save the `uuid`** - you'll need it to delete the webhook later.

## Testing the Webhook

### 1. Create a Meeting with Transcription

When creating a meeting via Daily.co API, make sure to:
- Set `enable_transcription: true` in room properties
- Store the `room_name` in your `meetings` table

Example:
```typescript
// When creating a Daily.co room
const room = await createDailyRoom({
  name: 'my-unique-room-name',
  properties: {
    enable_transcription: true,
  },
})

// Store in database
await supabase.from('meetings').insert({
  title: 'Project Discussion',
  room_name: room.name,  // Important: matches Daily.co room
  meeting_link: room.url,
  // ... other fields
})
```

### 2. Have a Meeting

- Join the room via the Daily.co link
- Say something (transcript needs audio)
- End the meeting

### 3. Monitor Webhook Activity

**In your FastAPI terminal**, you'll see logs like:
```
INFO:     Received Daily.co webhook - event: transcript.ready-to-download
INFO:     Transcript ready: room_name=my-room, transcript_id=...
INFO:     Generating AI summary for transcript...
INFO:     Successfully generated AI summary
INFO:     Successfully saved transcript and summary for room: my-room
```

**In ngrok's web interface** (http://localhost:4040):
- See all webhook requests
- Inspect request/response payloads
- Replay requests for debugging

### 4. Check the Database

```sql
SELECT
  title,
  room_name,
  status,
  LENGTH(transcript_text) as transcript_length,
  summary::json->>'title' as summary_title
FROM meetings
WHERE room_name = 'my-unique-room-name';
```

## Webhook Management Scripts

### List All Webhooks
```bash
export DAILY_API_KEY=$(grep DAILY_API_KEY gcp-services/api/.env | cut -d '=' -f2)
./scripts/list-daily-webhooks.sh
```

### Delete a Webhook
```bash
export DAILY_API_KEY=$(grep DAILY_API_KEY gcp-services/api/.env | cut -d '=' -f2)
./scripts/delete-daily-webhook.sh <webhook-uuid>
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check ngrok is running**
   - Visit http://localhost:4040 (ngrok web interface)
   - Should show your tunnel is active

2. **Verify webhook URL is correct**
   ```bash
   ./scripts/list-daily-webhooks.sh
   ```
   - URL should match your current ngrok URL
   - If ngrok URL changed (happens on restart), delete old webhook and create new one

3. **Check Daily.co webhook logs**
   - Visit https://dashboard.daily.co/webhooks
   - See delivery attempts and errors

### Webhook Receives Event but No Database Update

1. **Check room_name matches**
   ```sql
   SELECT room_name FROM meetings;
   ```
   - Must exactly match Daily.co room name

2. **Check server logs**
   - Look for errors in FastAPI terminal
   - Check for "Error updating meeting with transcript"

3. **Verify API keys are set**
   ```bash
   cat gcp-services/api/.env | grep DAILY_API_KEY
   cat gcp-services/api/.env | grep GEMINI_API_KEY
   ```

### AI Summary Not Generated

1. **Check Gemini API key**
   ```bash
   cat gcp-services/api/.env | grep GEMINI_API_KEY
   ```

2. **Check server logs for AI errors**
   - Look for "Error generating summary"
   - Common issues: API quota exceeded, invalid key

3. **Transcript may be empty**
   - Meetings need actual speech to generate transcripts
   - Silent meetings won't have content to summarize

## Production Deployment

When deploying to production:

1. **Use your production FastAPI URL instead of ngrok**
   ```bash
   ./scripts/create-daily-webhook.sh https://api.your-domain.com
   ```

2. **Set environment variables on your hosting platform**
   - `DAILY_API_KEY`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Secure your webhook endpoint** (optional but recommended)
   - Verify webhook signatures using `DAILY_WEBHOOK_SECRET`
   - Add IP allowlisting
   - Use webhook secrets

## Resources

- [Daily.co Webhook Documentation](https://docs.daily.co/reference/rest-api/webhooks)
- [Daily.co Webhook Events](https://docs.daily.co/reference/rest-api/webhooks/events)
- [ngrok Documentation](https://ngrok.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)

## Architecture Diagram

```
┌─────────────────┐
│  Daily.co Room  │
│  (with audio)   │
└────────┬────────┘
         │
         │ Meeting ends
         ▼
┌─────────────────────────┐
│ Daily.co Transcription  │
│ Service processes audio │
└────────┬────────────────┘
         │
         │ POST /webhooks/daily
         ▼
┌─────────────────────────┐
│   ngrok Tunnel          │
│   (dev only)            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  FastAPI Server         │
│  /webhooks/daily        │
│  1. Fetch transcript    │
│  2. Parse WebVTT        │
│  3. Call Gemini AI      │
│  4. Update database     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Supabase Database      │
│  meetings table         │
│  - transcript_text      │
│  - summary (JSON)       │
│  - status: completed    │
└─────────────────────────┘
```
