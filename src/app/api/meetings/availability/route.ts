// src/app/api/meetings/availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/calendarTokenManager';
import { fetchUserBusyPeriods, findCommonFreeSlots } from '@/services/availabilityService';
import type { AvailabilityRequest, AvailabilityResponse, UserAvailability } from '@/types/availability';

export const dynamic = 'force-dynamic';

/**
 * Find common free time slots across multiple users
 * 
 * POST /api/meetings/availability
 * Body: {
 *   userIds: string[],
 *   startDate: string (ISO 8601),
 *   endDate: string (ISO 8601),
 *   duration?: number (minutes, default: 30),
 *   timeZone?: string (IANA timezone, default: UTC)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin client for fetching calendar connections (requires service role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Parse and validate request body
    const body: AvailabilityRequest = await request.json();
    const { 
      userIds, 
      startDate, 
      endDate, 
      duration = 30,
      timeZone = 'UTC'
    } = body;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    if (duration <= 0 || duration > 480) {
      return NextResponse.json(
        { error: 'duration must be between 1 and 480 minutes' },
        { status: 400 }
      );
    }

    console.log(`[Availability API] Finding availability for ${userIds.length} users from ${startDate} to ${endDate}`);

    // Fetch calendar connections for all users
    const userAvailabilities: UserAvailability[] = [];
    const allBusySlots = [];

    for (const userId of userIds) {
      // Fetch calendar connections for this user using admin client
      // We need admin access because RLS prevents users from seeing others' tokens
      const { data: connections, error: connectionsError } = await supabaseAdmin
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('sync_enabled', true);

      if (connectionsError) {
        console.error(`[Availability API] Error fetching connections for user ${userId}:`, connectionsError);
        // Add user with no calendar connected
        userAvailabilities.push({
          userId,
          hasCalendarConnected: false,
          calendarConnections: 0,
          busySlots: [],
        });
        continue;
      }

      if (!connections || connections.length === 0) {
        console.log(`[Availability API] No calendar connections found for user ${userId}`);
        userAvailabilities.push({
          userId,
          hasCalendarConnected: false,
          calendarConnections: 0,
          busySlots: [],
        });
        continue;
      }

      console.log(`[Availability API] Found ${connections.length} connections for user ${userId}`);

      // Fetch busy periods for this user
      // We pass supabaseAdmin to ensure we can update tokens if they need refreshing
      const busySlots = await fetchUserBusyPeriods(
        userId,
        connections,
        startDate,
        endDate,
        supabaseAdmin
      );

      userAvailabilities.push({
        userId,
        hasCalendarConnected: true,
        calendarConnections: connections.length,
        busySlots,
      });

      allBusySlots.push(...busySlots.map(slot => ({ ...slot, userId })));
    }

    // Calculate common free slots
    const freeSlots = findCommonFreeSlots(
      userAvailabilities,
      startDate,
      endDate,
      duration
    );

    console.log(`[Availability API] Found ${freeSlots.length} free slots of ${duration} minutes`);

    const response: AvailabilityResponse = {
      freeSlots,
      busyPeriods: allBusySlots,
      users: userAvailabilities,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (err) {
    console.error('[Availability API] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
