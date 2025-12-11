
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdateCalendarResponse() {
  console.log('Testing update-calendar-response function...');

  // 1. You need a valid meeting ID and user ID from your local database.
  // Replace these with actual IDs from your local Supabase instance.
  // You can find these in the Table Editor in the Supabase Dashboard (http://127.0.0.1:54323)
  const MEETING_ID = 'REPLACE_WITH_MEETING_ID'; 
  const USER_ID = 'REPLACE_WITH_USER_ID';
  const STATUS = 'accepted'; // 'accepted', 'declined', 'tentative'

  if (MEETING_ID === 'REPLACE_WITH_MEETING_ID' || USER_ID === 'REPLACE_WITH_USER_ID') {
    console.error('Please replace MEETING_ID and USER_ID with valid UUIDs from your local database in scripts/test-calendar-sync.ts');
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('update-calendar-response', {
      body: {
        meeting_id: MEETING_ID,
        user_id: USER_ID,
        status: STATUS,
      },
    });

    if (error) {
      console.error('Function invocation failed:', error);
    } else {
      console.log('Function response:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testUpdateCalendarResponse();
