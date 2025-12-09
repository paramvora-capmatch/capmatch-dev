# Daily.co Webhook Edge Function

This Supabase Edge Function handles webhooks from Daily.co for meeting events, transcripts, and recordings.

## Features

- **Auto-start transcription**: Automatically starts transcription when a meeting begins
- **Transcript processing**: Downloads and stores WebVTT transcripts
- **AI summarization**: Generates structured summaries using Google Gemini
- **Recording management**: Tracks recording URLs
- **Meeting status updates**: Marks meetings as completed
- **Deduplication**: Prevents processing duplicate transcript webhooks

## Webhook Events Handled

- `meeting.started` - Auto-starts transcription
- `transcript.ready-to-download` - Downloads transcript, generates AI summary
- `recording.ready` - Stores recording URL
- `recording.upload-complete` - Stores recording URL
- `meeting.ended` - Updates meeting status

## Environment Variables

Required environment variables (set via Supabase secrets):

```bash
# Daily.co API Key
DAILY_API_KEY=your_daily_api_key_here

# Google Gemini API Key (for AI summarization)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (auto-provided by Supabase)
SUPABASE_URL=auto_provided
SUPABASE_SERVICE_ROLE_KEY=auto_provided
```

### Setting Secrets

```bash
# Set Daily.co API key
supabase secrets set DAILY_API_KEY=your_daily_api_key_here

# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

## Deployment

### 1. Configure Anonymous Access

**IMPORTANT**: The function must be configured to allow anonymous access (no JWT verification) since Daily.co webhooks don't include authorization headers.

Add this to your `supabase/config.toml`:

```toml
[functions.daily-webhook]
# Disable JWT verification for webhooks (Daily.co doesn't send auth headers)
verify_jwt = false
```

### 2. Deploy the Edge Function

```bash
supabase functions deploy daily-webhook --no-verify-jwt
```

### 3. Get the Function URL

After deployment, the function will be available at:
```
https://<project-ref>.supabase.co/functions/v1/daily-webhook
```

Find your project ref in the Supabase dashboard or via:
```bash
supabase status
```

### 4. Configure Daily.co Webhook

1. Go to your Daily.co dashboard: https://dashboard.daily.co
2. Navigate to **Developers** → **Webhooks**
3. Add a new webhook with:
   - **URL**: `https://<project-ref>.supabase.co/functions/v1/daily-webhook`
   - **Events**: Select the following:
     - `meeting.started`
     - `meeting.ended`
     - `transcript.ready-to-download`
     - `recording.ready`
     - `recording.upload-complete`

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve daily-webhook --env-file ./supabase/.env.local

# Test with a sample webhook payload
curl -X POST http://localhost:54321/functions/v1/daily-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meeting.started",
    "event": "meeting.started",
    "payload": {
      "room": "test-room-123"
    }
  }'
```

### Production Testing

```bash
# Test the deployed function
curl -X POST https://<project-ref>.supabase.co/functions/v1/daily-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meeting.started",
    "event": "meeting.started",
    "payload": {
      "room": "test-room-123"
    }
  }'
```

## Database Schema

The function expects the following `meetings` table structure:

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL,
  meeting_link TEXT,
  transcript_text TEXT,
  summary JSONB, -- MeetingSummary type
  recording_url TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Summary Structure

The AI-generated summary is stored as JSONB with this structure:

```typescript
{
  title: string
  description?: string
  executive_summary: string
  key_points: string[]
  important_numbers: string[]
  action_items: string[]
  speaker_insights?: string[]
  questions_raised: string[]
  open_questions: string[]
}
```

## Troubleshooting

### Check Function Logs

```bash
# View logs for the deployed function
supabase functions logs daily-webhook

# View logs with tail (real-time)
supabase functions logs daily-webhook --tail
```

### Common Issues

1. **Transcription not starting**
   - Verify `DAILY_API_KEY` is set correctly
   - Check Daily.co dashboard for API key permissions

2. **AI summary not generating**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check Gemini API quotas in Google Cloud Console

3. **Meeting not found**
   - Ensure `room_name` in meetings table matches Daily.co room name
   - Check that webhook payload contains `room` or `room_name` field

4. **Duplicate processing**
   - The function uses in-memory deduplication (resets on function restart)
   - If duplicates persist, check Daily.co webhook retry settings

## Migration from Vercel

This function replaces the following Vercel API routes:

- `/api/daily/webhook` - Basic recording/transcription handling
- `/api/webhooks/daily` - Transcript processing with AI summarization

### Key Differences

1. **Runtime**: Deno instead of Node.js
2. **Authentication**: Uses Supabase service role key
3. **Secrets**: Managed via Supabase secrets instead of Vercel env vars
4. **Logging**: Uses Deno console, viewable via `supabase functions logs`
5. **CORS**: Handled explicitly with corsHeaders

### Migration Checklist

- [x] Deploy `daily-webhook` edge function
- [ ] Set `DAILY_API_KEY` secret in Supabase
- [ ] Set `GEMINI_API_KEY` secret in Supabase
- [ ] Update Daily.co webhook URL in dashboard
- [ ] Test with a sample meeting
- [ ] Remove old Vercel API routes once confirmed working
- [ ] Update any documentation referencing old webhook URL

## Performance Notes

- **Response Time**: < 1 second for webhook acknowledgment
- **Async Processing**: Transcript processing runs in background
- **Deduplication**: In-memory set prevents duplicate processing
- **Auto-cleanup**: Processed transcript IDs removed after successful save

## Related Files

- `/supabase/functions/_shared/daily-types.ts` - TypeScript types
- `/supabase/functions/_shared/gemini-summarize.ts` - AI summarization logic
- `/supabase/functions/_shared/cors.ts` - CORS headers
