import { supabase } from '@/lib/supabaseClient';
import { getBackendUrl } from '@/lib/apiConfig';

/**
 * Generate OM insights for a project and store them in the database.
 * This function calls the backend API to generate insights using Gemini.
 * 
 * @param projectId - The project ID to generate insights for
 * @throws Error if insight generation fails
 */
export async function generateOMInsights(projectId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const base = getBackendUrl();

  const response = await fetch(`${base}/api/v1/projects/${projectId}/om/generate-insights`, {
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

  // Also trigger underwriting document generation (fire and forget / non-blocking)
  // We don't await this to avoid delaying the UI response, or we await it but don't block on error.
  // User requested "generation ... to also happen".
  try {
      fetch(`${base}/api/v1/underwriting/generate?project_id=${projectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
      }).catch(err => console.error("Failed to trigger underwriting docs:", err));
  } catch (e) {
      console.error("Failed to initiate underwriting docs generation:", e);
  }
  
  // Backend handles storing insights in DB via sync_to_om()
  return;
}

