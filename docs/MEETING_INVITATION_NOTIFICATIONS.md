# Meeting Invitation Notifications

## Overview

This document describes the meeting invitation notification system, which automatically notifies users when they are invited to a meeting.

## Architecture

### 1. Database Layer

**Migration**: `20260212000000_meeting_invitation_events.sql`

- **domain_events.meeting_id**: New column linking domain events to meetings
- **insert_meeting_invited_event()**: Helper function to create meeting invitation events
- **on_meeting_participant_inserted()**: Trigger that automatically creates domain events when participants are added
- **trigger_meeting_participant_invited**: Trigger that fires after participant insertion

### 2. Event Flow

```
1. Meeting Created (via /api/meetings/create)
   ↓
2. Participants Added to meeting_participants table
   ↓
3. Database Trigger Fires (trigger_meeting_participant_invited)
   ↓
4. Domain Event Created (event_type: 'meeting_invited')
   ↓
5. API Invokes notify-fan-out Edge Function
   ↓
6. Notification Created in notifications table
   ↓
7. Realtime Push to User (Supabase Realtime)
   ↓
8. NotificationBell Component Updates
```

### 3. Edge Function Handler

**Function**: `handleMeetingInvitation()` in `notify-fan-out/index.ts`

**Features**:
- Checks if user already notified (prevents duplicates)
- Respects user notification preferences (muting)
- Extracts meeting details from event payload
- Creates rich notification with meeting title, time, and organizer
- Generates appropriate link URL (to meeting or project meetings tab)

**Notification Content**:
- **Title**: "{Organizer Name} invited you to a meeting - {Project Name}"
- **Body**: Meeting title and formatted start time
- **Link**: Direct link to meeting or meetings tab
- **Payload**: Meeting metadata for frontend use

### 4. User Preferences

Users can mute meeting invitation notifications at different scopes:
- **Global**: Mute all meeting invitations
- **Project**: Mute meeting invitations for a specific project
- **Thread**: Not applicable for meetings

## Notification Data Structure

```typescript
{
  user_id: string;
  event_id: number;
  title: string; // "{Organizer} invited you to a meeting"
  body: string; // "**{Meeting Title}**\n{Formatted Time}"
  link_url: string; // "/project/workspace/{id}?tab=meetings"
  payload: {
    type: "meeting_invitation";
    meeting_id: string;
    meeting_title: string;
    start_time: string;
    organizer_id: string;
    organizer_name: string;
    project_id?: string;
    project_name?: string;
  }
}
```

## Implementation Details

### When Notifications Are Created

- **Automatically**: When a participant is added to a meeting
- **Not sent to**: The organizer (they don't need to be notified about their own meeting)
- **Sent to**: All invited participants (non-organizers)

### Duplicate Prevention

- Each domain event ID is unique
- The system checks for existing notifications before creating new ones
- If a notification already exists for an event + user, no duplicate is created

### Calendar Integration

Meeting invitations are independent of calendar invitations:
- Calendar invites are sent via Google/Outlook APIs
- In-app notifications are always created for all participants
- Both systems work in parallel

## Testing

### Manual Testing

1. **Create a Meeting**:
   ```bash
   POST /api/meetings/create
   {
     "title": "Test Meeting",
     "startTime": "2025-12-15T10:00:00Z",
     "endTime": "2025-12-15T11:00:00Z",
     "participantIds": ["user-id-1", "user-id-2"]
   }
   ```

2. **Check Notifications**:
   - Login as invited user
   - Check notification bell (should show unread count)
   - Click notification to navigate to meeting

3. **Verify Database**:
   ```sql
   -- Check domain events
   SELECT * FROM domain_events 
   WHERE event_type = 'meeting_invited' 
   ORDER BY occurred_at DESC;

   -- Check notifications
   SELECT * FROM notifications 
   WHERE payload->>'type' = 'meeting_invitation'
   ORDER BY created_at DESC;
   ```

### Edge Cases Handled

- ✅ Organizer is not notified about their own meeting
- ✅ Duplicate notifications prevented
- ✅ Respects user muting preferences
- ✅ Handles missing meeting data gracefully
- ✅ Works for both project-specific and general meetings
- ✅ Realtime updates trigger immediately

## Future Enhancements

Potential improvements:
- Meeting reminders (15 min before start)
- Meeting cancellation notifications
- Meeting update notifications (time/location changes)
- Meeting response notifications (who accepted/declined)
- Digest mode for frequent meetings
- Email notifications for meeting invitations

## Related Files

- Migration: `/supabase/migrations/20260212000000_meeting_invitation_events.sql`
- Edge Function: `/supabase/functions/notify-fan-out/index.ts`
- API Route: `/src/app/api/meetings/create/route.ts`
- Hook: `/src/hooks/useNotifications.ts`
- Component: `/src/components/notifications/NotificationBell.tsx`
