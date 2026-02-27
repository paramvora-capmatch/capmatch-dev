import { supabase } from '@/lib/supabaseClient';

export type OMInsightsJobResult =
  | { status: 'completed' }
  | { status: 'failed'; error_message?: string | null }
  | { status: 'timeout' };

/**
 * Subscribe to an OM insights job via Supabase Realtime.
 * Resolves when the job is completed, failed, or timeout (default 5 min).
 */
export function subscribeToOMInsightsJob(
  jobId: string,
  timeoutMs = 300000
): Promise<OMInsightsJobResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: OMInsightsJobResult) => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (channel) supabase.removeChannel(channel);
      resolve(result);
    };

    const channel = supabase
      .channel(`om-insights-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload: { new: { status: string; error_message?: string | null } }) => {
          const row = payload.new;
          if (row.status === 'completed') finish({ status: 'completed' });
          else if (row.status === 'failed')
            finish({ status: 'failed', error_message: row.error_message ?? null });
        }
      )
      .subscribe();

    const timeoutId = setTimeout(() => finish({ status: 'timeout' }), timeoutMs);
  });
}

export interface GenerateOMInsightsResponse {
  status?: string;
  message?: string;
  job_id?: string;
  /** True when backend used cached insights (no job enqueued). */
  already_has_insights?: boolean;
}

/**
 * Generate OM insights for a project and store them in the database.
 * Returns 202 with job_id; frontend can subscribe to job realtime and redirect when completed.
 *
 * @param projectId - The project ID to generate insights for
 * @returns Response with job_id for status tracking
 * @throws Error if request fails (non-2xx)
 */
export async function generateOMInsights(projectId: string): Promise<GenerateOMInsightsResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/projects/${projectId}/om/generate-insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate insights' }));
    throw new Error(error.error || error.detail || 'Failed to generate insights');
  }

  const data = (await response.json()) as GenerateOMInsightsResponse;

  // Fire-and-forget: trigger underwriting document generation
  try {
    fetch(`/api/v1/underwriting/generate?project_id=${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    }).catch((err) => console.error('Failed to trigger underwriting docs:', err));
  } catch (e) {
    console.error('Failed to initiate underwriting docs generation:', e);
  }

  return data;
}

