import { supabase } from '@/lib/supabaseClient';

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
  
  // Backend handles storing insights in DB via sync_to_om()
  return;
}

