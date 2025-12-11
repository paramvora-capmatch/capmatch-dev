/**
 * Calendar Disconnect API
 * Stops watching a calendar when a user disconnects it
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { disconnectCalendar } from '@/services/calendarInviteService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');

    // Try to get user from auth header or cookie
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      // Try to get user from session cookie
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const { data: { user } } = await supabaseAdmin.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId' },
        { status: 400 }
      );
    }

    // Fetch the connection
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    // Stop the watch channel
    await disconnectCalendar(connection);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in disconnect calendar endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
