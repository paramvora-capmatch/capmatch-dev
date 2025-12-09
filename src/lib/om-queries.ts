// src/lib/om-queries.ts
import { supabase } from "../lib/supabaseClient";

/**
 * Normalize raw OM content from the database.
 * 
 * OM data is stored FLAT in the database (same as project/borrower resumes).
 * This function extracts values from rich format objects ({value, source, warnings, other_values})
 * to ensure all fields are primitives (strings, numbers, arrays, etc.).
 * The OM schema file is used for UI organization only.
 */
function normalizeOMContent(rawContent: Record<string, any>): Record<string, any> {
  if (!rawContent || typeof rawContent !== "object") {
    return rawContent;
  }

  const normalized: Record<string, any> = {};
  
  for (const key in rawContent) {
    // Skip metadata fields
    if (key.startsWith('_') || key === 'completenessPercent') {
      continue;
    }
    
    // Skip legacy nested structures
    if (key === 'projectSections' || key === 'borrowerSections') {
      continue;
    }
    
    const item = rawContent[key];
    
    // Check if this is a rich format object: { value, source, warnings, other_values }
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      "value" in item &&
      ("source" in item || "sources" in item)
    ) {
      // Extract the value from rich format
      normalized[key] = item.value;
    } else {
      // Keep as-is (already a primitive or array)
      normalized[key] = item;
    }
  }
  
  return normalized;
}

/**
 * Fetches the OM data for a project from the database.
 * Since OM is now a single row per project (no versioning), we fetch directly by project_id.
 * Returns flat data structure (same as project/borrower resumes).
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

    // Normalize content - returns flat data (removes any legacy projectSections/borrowerSections)
    let content = data.content || {};
    content = normalizeOMContent(content);

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
export function getOMValue(content: Record<string, any> | null | undefined, fieldId: string): any {
  if (!content) return null;
  const field = content[fieldId];
  if (field && typeof field === "object" && "value" in field) {
    return field.value;
  }
  return field;
}
