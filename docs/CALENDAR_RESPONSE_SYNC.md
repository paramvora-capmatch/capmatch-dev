# Google Calendar Response Sync

This document explains how the CapMatch platform syncs Google Calendar invite responses back to the `meeting_participants` table.

## Overview

When a meeting is created in CapMatch, calendar invites are sent to attendees via Google Calendar. When attendees respond to the invite (accept/decline/tentative), Google Calendar sends push notifications to our webhook, which updates the `meeting_participants` table accordingly.

## Architecture

### Components

1. **Database Tables**
   - `meetings` - Meeting records with `calendar_event_ids` (JSONB array)
   - `meeting_participants` - Participant records with `response_status` field
   - `calendar_connections` - OAuth tokens and watch channel info

2. **API Routes**
   - `POST /api/calendar/webhook` - Receives push notifications from Google
   - `POST /api/calendar/disconnect` - Stops watch channel when disconnecting
   - `POST /api/meetings/create` - Creates meetings and sets up calendar watches

3. **Services**
   - `calendarInviteService.ts` - Creates calendar events and manages watches
   - `calendarSyncService.ts` - Syncs attendee responses from Google Calendar

4. **Edge Functions**
   - `renew-calendar-watches` - Cron job to renew expiring watch channels

### Data Flow

```
1. Meeting Created
   → POST /api/meetings/create
   → Creates meeting record in database
   → Calls sendCalendarInvites()
   → Creates Google Calendar event with attendees
   → Sets up watch channel via setupCalendarWatch()
   → Stores watch_channel_id in calendar_connections

2. Attendee Responds in Google Calendar
   → Google sends push notification to webhook
   → POST /api/calendar/webhook receives notification
   → Looks up calendar_connection by watch_channel_id
   → Calls syncEventAttendeeResponses()
   → Fetches event from Google Calendar API
   → Updates meeting_participants.response_status

3. Watch Channel Renewal (Daily at 2 AM UTC)
   → Cron job triggers renew-calendar-watches edge function
   → Finds connections with expiring watches (< 24 hours)
   → Stops old watch via Google API
   → Sets up new watch with new expiration
   → Updates calendar_connections with new watch info
```

## Database Schema

### calendar_connections table

```sql
ALTER TABLE calendar_connections
ADD COLUMN watch_channel_id TEXT,
ADD COLUMN watch_resource_id TEXT,
ADD COLUMN watch_expiration TIMESTAMPTZ;
```

- `watch_channel_id` - Unique ID for the Google Calendar watch channel
- `watch_resource_id` - Google's resource identifier for the watched calendar
- `watch_expiration` - When the watch expires (max 30 days from creation)

### meeting_participants table

Already has the necessary fields:

- `response_status` - One of: 'pending', 'accepted', 'declined', 'tentative'
- `responded_at` - Timestamp when the participant responded

## Google Calendar API Integration

### Push Notifications

Google Calendar supports push notifications via the [Calendar API Watch endpoint](https://developers.google.com/calendar/api/guides/push).

**Setup a Watch:**
```http
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch
```

**Request Body:**
```json
{
  "id": "capmatch-{connection_id}-{timestamp}",
  "type": "web_hook",
  "address": "https://your-domain.com/api/calendar/webhook",
  "expiration": 1234567890000
}
```

**Webhook Notifications:**

Google sends POST requests to your webhook URL with these headers:
- `x-goog-channel-id` - The channel ID you provided
- `x-goog-resource-id` - Google's resource identifier
- `x-goog-resource-state` - 'sync' | 'exists' | 'not_exists'

### Fetching Event Details

When a notification is received, fetch the event details to get attendee responses:

```http
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
```

**Response includes:**
```json
{
  "id": "event_id",
  "attendees": [
    {
      "email": "user@example.com",
      "responseStatus": "accepted" | "declined" | "tentative" | "needsAction"
    }
  ]
}
```

## Environment Variables

Required environment variables:

```bash
# Google OAuth (for creating calendar events)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Webhook URL (must be HTTPS in production)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Supabase (for database access)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Setup Instructions

### 1. Apply Database Migrations

```bash
supabase db push
```

This applies the following migrations:
- `20260210000000_add_calendar_watch_channels.sql` - Adds watch channel fields
- `20260210000001_calendar_watch_renewal_cron.sql` - Sets up cron job

### 2. Deploy Edge Function

```bash
supabase functions deploy renew-calendar-watches
```

### 3. Configure Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `https://your-domain.com/api/calendar/callback`
   - `http://localhost:3000/api/calendar/callback` (for development)
5. Add authorized JavaScript origins:
   - `https://your-domain.com`
   - `http://localhost:3000` (for development)

### 4. Set Up Webhook Endpoint

**Important:** Google Calendar webhooks require HTTPS in production. For local development, you can use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start your Next.js dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

Then update `NEXT_PUBLIC_SITE_URL` to your ngrok URL.

### 5. Test the Integration

1. **Connect a Calendar:**
   - Go to Settings → Calendar Integrations
   - Click "Connect Google Calendar"
   - Authorize the app

2. **Create a Meeting:**
   - Create a new meeting with participants
   - Check that calendar event was created
   - Verify watch channel was set up:
     ```sql
     SELECT watch_channel_id, watch_expiration
     FROM calendar_connections
     WHERE user_id = 'your_user_id';
     ```

3. **Respond to Invite:**
   - Open the calendar invite in Google Calendar
   - Accept/decline/tentative
   - Check webhook logs for notification
   - Verify participant status was updated:
     ```sql
     SELECT response_status, responded_at
     FROM meeting_participants
     WHERE meeting_id = 'your_meeting_id';
     ```

## Response Status Mapping

Google Calendar response statuses are mapped to our `ParticipantResponseStatus`:

| Google Status | Our Status  |
|---------------|-------------|
| `accepted`    | `accepted`  |
| `declined`    | `declined`  |
| `tentative`   | `tentative` |
| `needsAction` | `pending`   |

## Watch Channel Lifecycle

### Creation
- Watch channels are created when calendar events are sent
- Maximum expiration: 30 days from creation
- We set expiration to 7 days for more frequent renewals

### Renewal
- Cron job runs daily at 2 AM UTC
- Finds watches expiring within 24 hours
- Stops old watch via Google API
- Creates new watch with new expiration
- Updates `calendar_connections` table

### Cleanup
- When a calendar connection is disconnected:
  - Hook calls `/api/calendar/disconnect`
  - API calls `stopCalendarWatch()`
  - Google API stops the watch
  - Watch fields cleared from database

## Error Handling

### Webhook Processing
- If connection not found: Returns 404 (Google will retry)
- If sync fails: Logs error but returns 200 (prevents retries)
- Invalid headers: Returns 400

### Watch Renewal
- If renewal fails: Logs error and continues with next connection
- If token refresh fails: Skips that connection
- Edge function returns summary with success/failure counts

### Token Refresh
- Access tokens are refreshed automatically before API calls
- If refresh token is invalid: Manual re-authorization required
- Token expiration checked before each Google API call

## Monitoring

### Check Active Watches

```sql
SELECT
  c.id,
  c.user_id,
  c.provider_email,
  c.watch_channel_id,
  c.watch_expiration,
  EXTRACT(EPOCH FROM (c.watch_expiration - NOW())) / 3600 as hours_until_expiration
FROM calendar_connections c
WHERE watch_channel_id IS NOT NULL
ORDER BY watch_expiration ASC;
```

### Check Recent Responses

```sql
SELECT
  mp.meeting_id,
  m.title,
  p.email,
  mp.response_status,
  mp.responded_at
FROM meeting_participants mp
JOIN meetings m ON m.id = mp.meeting_id
JOIN profiles p ON p.id = mp.user_id
WHERE mp.responded_at IS NOT NULL
ORDER BY mp.responded_at DESC
LIMIT 20;
```

### Edge Function Logs

```bash
# View logs for watch renewal function
supabase functions logs renew-calendar-watches --tail
```

## Troubleshooting

### Webhook Not Receiving Notifications

1. **Check webhook URL is HTTPS:**
   ```bash
   echo $NEXT_PUBLIC_SITE_URL
   # Should be https:// in production
   ```

2. **Verify watch is active:**
   ```sql
   SELECT watch_channel_id, watch_expiration
   FROM calendar_connections
   WHERE user_id = 'your_user_id';
   ```

3. **Check Google Cloud Console logs:**
   - Go to Google Cloud Console
   - Navigate to Logs Explorer
   - Filter by "calendar.googleapis.com"

### Responses Not Updating

1. **Check webhook received notification:**
   ```bash
   # View Next.js logs
   npm run dev
   # Look for "Calendar webhook received" messages
   ```

2. **Verify event ID matches:**
   ```sql
   SELECT calendar_event_ids
   FROM meetings
   WHERE id = 'your_meeting_id';
   ```

3. **Check participant email matches profile:**
   ```sql
   SELECT p.email
   FROM profiles p
   JOIN meeting_participants mp ON mp.user_id = p.id
   WHERE mp.meeting_id = 'your_meeting_id';
   ```

### Watch Renewal Failing

1. **Check cron job is scheduled:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'renew-calendar-watches';
   ```

2. **Manually trigger renewal:**
   ```bash
   # Call the edge function directly
   curl -X POST https://your-project.supabase.co/functions/v1/renew-calendar-watches \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

3. **Check token validity:**
   ```sql
   SELECT
     id,
     user_id,
     token_expires_at,
     CASE
       WHEN token_expires_at < NOW() THEN 'EXPIRED'
       ELSE 'VALID'
     END as token_status
   FROM calendar_connections;
   ```

## Security Considerations

1. **Webhook Authentication:**
   - Google doesn't sign webhook requests
   - We verify by looking up the channel ID in our database
   - Only process notifications for known watch channels

2. **Token Storage:**
   - Access and refresh tokens should be encrypted in database
   - Service role key must be kept secret
   - Never expose tokens in client-side code

3. **HTTPS Required:**
   - Google requires HTTPS for webhook URLs
   - Use ngrok or similar for local development
   - SSL certificate required in production

4. **Rate Limiting:**
   - Google Calendar API has rate limits
   - Our sync is event-driven (not polling)
   - Watch renewal happens once daily

## Future Enhancements

1. **Microsoft Calendar Support:**
   - Add Microsoft Graph API webhook support
   - Similar push notification pattern
   - Store provider-specific watch info

2. **Retry Logic:**
   - Implement exponential backoff for failed syncs
   - Queue system for webhook processing
   - Dead letter queue for permanent failures

3. **Real-time Updates:**
   - Add Supabase Realtime subscriptions
   - Push updates to connected clients
   - Update UI immediately when response changes

4. **Analytics:**
   - Track response rates
   - Monitor webhook delivery success
   - Alert on watch renewal failures

## References

- [Google Calendar API - Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Google Calendar API - Events: watch](https://developers.google.com/calendar/api/v3/reference/events/watch)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
