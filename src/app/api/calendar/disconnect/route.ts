/**
 * Calendar Disconnect API
 * Stops watching a calendar when a user disconnects it
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { stopCalendarWatch } from '@/services/calendarSyncService';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { getSecureCookieOptions } from '@/lib/cookie-options';
import { safeErrorResponse } from '@/lib/api-validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Create server-side Supabase client with cookie access
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return cookieStore.get(name)?.value;
          },
          set: (name: string, value: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value, ...getSecureCookieOptions(options) });
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
          remove: (name: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value: '', ...getSecureCookieOptions(options) });
            } catch {
              // The `delete` method was called from a Server Component.
            }
          },
        },
      }
    );

    // Get the current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'calendar-disconnect');
    if (!rl.allowed) return rl.response;

    const userId = user.id;

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
      .select('id, user_id, provider, provider_account_id, provider_email, access_token, refresh_token, token_expires_at, calendar_list, sync_enabled, last_synced_at, watch_channel_id, watch_resource_id, watch_expiration, created_at, updated_at')
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
    try {
      await stopCalendarWatch(connection, supabaseAdmin);
    } catch (watchError) {
      return safeErrorResponse(watchError, 'Failed to disconnect calendar');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to disconnect calendar');
  }
}
