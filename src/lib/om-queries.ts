// src/lib/om-queries.ts
import { supabase } from "../lib/supabaseClient";
import { ungroupFromSections, isGroupedFormat } from "./section-grouping";

/**
 * Fetches the OM data for a project from the database.
 * Since OM is now a single row per project (no versioning), we fetch directly by project_id.
 */
export async function getLatestOM(projectId: string) {
  try {
    // Fetch the single OM row for this project
    const { data, error } = await supabase
      .from("om")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        // No OM data exists yet
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    // Process the content - ungroup if needed
    let content = data.content || {};
    if (isGroupedFormat(content)) {
      content = ungroupFromSections(content);
    }

    return {
      id: data.id,
      project_id: data.project_id,
      content: content,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("Error fetching OM data:", error);
    throw error;
  }
}

/**
 * Extracts a value from OM content (handles rich format)
 */
export function getOMValue(content: Record<string, any>, fieldId: string): any {
  const field = content[fieldId];
  if (field && typeof field === "object" && "value" in field) {
    return field.value;
  }
  return field;
}

