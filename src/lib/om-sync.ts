import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";

export async function syncOMContent(projectId: string): Promise<boolean> {
  if (!projectId) {
    return false;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(
      `${getBackendUrl()}/api/v1/projects/${projectId}/om/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OM sync failed with status ${response.status}`);
    }

    return true;
  } catch (error) {
    console.warn("OM sync skipped:", error);
    return false;
  }
}
