// src/app/api/auth/check-email/route.ts
//
// Rate-limited server-side wrapper for the check_profile_email_exists RPC.
// Runs behind rate limiting so this endpoint cannot be abused for bulk email
// enumeration. Uses the service-role client since the underlying DB function
// is now restricted to service_role only.

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeErrorResponse } from '@/lib/api-validation';

export async function POST(request: NextRequest) {
  // Rate-limit by IP before doing any DB work
  const rlId = getRateLimitId(request, 'anon');
  const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'check-email');
  if (!rl.allowed) return rl.response;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_profile_email_exists', {
      p_email: email,
    });

    if (error) {
      console.error('[check-email] RPC error:', error.message);
      // Return false on error — do not reveal whether the failure was data-related
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: !!data });
  } catch (err) {
    return safeErrorResponse(err, "Failed to check email");
  }
}
