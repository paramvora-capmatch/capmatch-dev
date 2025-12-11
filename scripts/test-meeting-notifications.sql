-- Test script to verify meeting notification system
-- Run this in Supabase Studio SQL Editor or via psql

-- 1. Check if the migration applied correctly
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'domain_events' AND column_name = 'meeting_id';

-- 2. Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_meeting_participant_invited';

-- 3. Check if helper function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'insert_meeting_invited_event';

-- After creating a test meeting, run these queries:

-- 4. Check domain events created
SELECT 
    id,
    event_type,
    actor_id,
    meeting_id,
    project_id,
    payload,
    occurred_at
FROM domain_events 
WHERE event_type = 'meeting_invited'
ORDER BY occurred_at DESC
LIMIT 5;

-- 5. Check notifications created
SELECT 
    n.id,
    n.user_id,
    n.event_id,
    n.title,
    n.body,
    n.link_url,
    n.read_at,
    n.payload,
    p.full_name as recipient_name,
    p.email as recipient_email
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.payload->>'type' = 'meeting_invitation'
ORDER BY n.created_at DESC
LIMIT 5;

-- 6. Full meeting invitation flow check
SELECT 
    m.id as meeting_id,
    m.title as meeting_title,
    m.start_time,
    o.full_name as organizer_name,
    mp.user_id as participant_id,
    p.full_name as participant_name,
    de.id as event_id,
    de.event_type,
    n.id as notification_id,
    n.title as notification_title,
    n.read_at
FROM meetings m
JOIN profiles o ON m.organizer_id = o.id
JOIN meeting_participants mp ON m.id = mp.meeting_id
JOIN profiles p ON mp.user_id = p.id
LEFT JOIN domain_events de ON de.meeting_id = m.id AND de.event_type = 'meeting_invited'
LEFT JOIN notifications n ON n.event_id = de.id AND n.user_id = mp.user_id
WHERE m.created_at > NOW() - INTERVAL '1 hour'
ORDER BY m.created_at DESC;
