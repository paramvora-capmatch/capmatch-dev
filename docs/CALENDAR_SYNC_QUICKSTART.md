# Calendar Response Sync - Quick Start

## What Was Implemented

A complete system to automatically sync Google Calendar invite responses back to your `meeting_participants` table in real-time.

## How It Works

```
1. User creates meeting → Calendar invite sent via Google Calendar
2. Attendee responds (accept/decline/tentative) in Google Calendar
3. Google sends webhook to your app
4. App updates meeting_participants.response_status
```

## Files Created/Modified

### Database
- `supabase/migrations/20260210000000_add_calendar_watch_channels.sql` - Adds watch channel fields
- `supabase/migrations/20260210000002_calendar_watch_renewal_cron.sql` - Sets up cron job

### API Routes
- `src/app/api/calendar/webhook/route.ts` - Receives Google Calendar webhooks
- `src/app/api/calendar/disconnect/route.ts` - Cleanup when disconnecting

### Services
- `src/services/calendarSyncService.ts` - Core sync logic
- `src/services/calendarInviteService.ts` - Updated to setup watches

### Edge Functions
- `supabase/functions/renew-calendar-watches/index.ts` - Cron job to renew expiring watches

### Types
- `src/types/calendar-types.ts` - Updated with watch channel fields

### Hooks
- `src/hooks/useCalendarConnections.ts` - Updated disconnect logic

### Documentation
- `docs/CALENDAR_RESPONSE_SYNC.md` - Complete technical documentation
- `docs/LOCAL_CALENDAR_TESTING.md` - Local testing guide
- `docs/CALENDAR_SYNC_QUICKSTART.md` - This file

## Quick Start

### 1. Apply Migrations

```bash
# Reset database (applies all migrations)
npx supabase db reset

# Or just push new migrations
npx supabase db push
```

### 2. Deploy Edge Function (Production)

```bash
npx supabase functions deploy renew-calendar-watches
```

### 3. Environment Variables

Make sure these are set (see `.env.local`):

```bash
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# App URL (must be HTTPS in production)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 4. Test It

1. **Connect Calendar** - Go to Settings → Calendar
2. **Create Meeting** - Create a meeting with participants
3. **Respond in Google Calendar** - Accept/decline/tentative
4. **Check Database**:
   ```sql
   SELECT response_status, responded_at
   FROM meeting_participants
   WHERE meeting_id = 'your-meeting-id';
   ```

## Architecture Overview

```
┌─────────────────┐
│  Google Calendar│
│   (Attendee)    │
└────────┬────────┘
         │ Responds to invite
         │
         ▼
┌─────────────────┐
│ Google Calendar │
│   API Server    │
└────────┬────────┘
         │ Sends push notification
         │
         ▼
┌─────────────────┐
│  /api/calendar  │
│    /webhook     │◄─── Webhook endpoint (HTTPS required)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│calendarSyncServ │
│      ice.ts     │◄─── Fetches event details
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │
│ meeting_partici │
│      pants      │◄─── Updates response_status
└─────────────────┘
```

## Database Schema

### calendar_connections (new fields)
```sql
watch_channel_id TEXT       -- Unique watch channel ID
watch_resource_id TEXT      -- Google's resource identifier
watch_expiration TIMESTAMPTZ -- When watch expires
```

### meeting_participants (existing)
```sql
response_status TEXT        -- 'pending' | 'accepted' | 'declined' | 'tentative'
responded_at TIMESTAMPTZ    -- When user responded
```

## Response Status Mapping

| Google Status | Our Status  |
|---------------|-------------|
| `needsAction` | `pending`   |
| `accepted`    | `accepted`  |
| `declined`    | `declined`  |
| `tentative`   | `tentative` |

## Watch Channel Lifecycle

1. **Creation** - Set up when first calendar event created (7-day expiration)
2. **Notifications** - Google sends webhook when events updated
3. **Renewal** - Cron job runs daily to renew expiring channels
4. **Cleanup** - Stopped when calendar disconnected

## Cron Job (Production Only)

The cron job runs daily at 2 AM UTC:
- Finds watches expiring within 24 hours
- Stops old watch
- Creates new watch with fresh expiration
- Updates database

**For local dev:** Cron job is automatically scheduled if pg_cron is available.

## Common Issues

### "Webhook not receiving notifications"
- **Cause:** Google requires HTTPS
- **Solution:** Use ngrok for local dev, proper SSL in production

### "Watch channel expired"
- **Cause:** Channel wasn't renewed
- **Solution:** Manually trigger renewal edge function

### "Token expired"
- **Cause:** Refresh token invalid
- **Solution:** Disconnect and reconnect calendar in UI

## Monitoring

### Check Active Watches
```sql
SELECT
  provider_email,
  watch_channel_id,
  watch_expiration,
  EXTRACT(EPOCH FROM (watch_expiration - NOW())) / 3600 as hours_remaining
FROM calendar_connections
WHERE watch_channel_id IS NOT NULL;
```

### Check Recent Responses
```sql
SELECT
  m.title,
  p.email,
  mp.response_status,
  mp.responded_at
FROM meeting_participants mp
JOIN meetings m ON m.id = mp.meeting_id
JOIN profiles p ON p.id = mp.user_id
WHERE mp.responded_at IS NOT NULL
ORDER BY mp.responded_at DESC
LIMIT 10;
```

### Edge Function Logs (Production)
```bash
npx supabase functions logs renew-calendar-watches
```

## Security Notes

1. **HTTPS Required** - Google Calendar webhooks only work with HTTPS
2. **Webhook Validation** - We validate by checking channel ID exists in database
3. **Token Encryption** - Access/refresh tokens should be encrypted in database
4. **Service Role Key** - Keep this secret, never expose client-side

## Next Steps

See detailed documentation:
- [CALENDAR_RESPONSE_SYNC.md](./CALENDAR_RESPONSE_SYNC.md) - Technical deep dive
- [LOCAL_CALENDAR_TESTING.md](./LOCAL_CALENDAR_TESTING.md) - Testing guide

## Support

Issues? Check the troubleshooting sections in the full documentation.
