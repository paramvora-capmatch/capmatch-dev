/**
 * Server-side helper to verify the current user has access to a project.
 * Uses the user-scoped Supabase client so RLS applies (project_access_grants + lender_project_access).
 * Returns true if the user can access the project, false otherwise.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();
  return !error && data != null;
}
