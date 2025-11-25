// src/lib/om-queries.ts
import { supabase } from "../lib/supabaseClient";
import { ungroupFromSections, isGroupedFormat } from "./section-grouping";

/**
 * Fetches the latest OM data for a project from the database
 */
export async function getLatestOM(projectId: string) {
  try {
    // Get the OM resource to find the current version
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("current_version_id")
      .eq("project_id", projectId)
      .eq("resource_type", "OM")
      .single();

    if (resourceError && resourceError.code !== "PGRST116") {
      // PGRST116 is "not found" - that's okay, we'll fetch latest by date
      console.error("Error fetching OM resource:", resourceError);
    }

    let omData;

    if (resource?.current_version_id) {
      // Fetch by current_version_id (points to latest OM row)
      const { data, error } = await supabase
        .from("om")
        .select("*")
        .eq("id", resource.current_version_id)
        .single();

      if (error) {
        console.error("Error fetching OM by version ID:", error);
        // Fallback to latest by date
        const { data: latestData, error: latestError } = await supabase
          .from("om")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestError) {
          throw latestError;
        }
        omData = latestData;
      } else {
        omData = data;
      }
    } else {
      // No resource pointer, fetch latest by date
      const { data, error } = await supabase
        .from("om")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No OM data exists yet
          return null;
        }
        throw error;
      }
      omData = data;
    }

    if (!omData) {
      return null;
    }

    // Process the content - ungroup if needed
    let content = omData.content || {};
    if (isGroupedFormat(content)) {
      content = ungroupFromSections(content);
    }

    return {
      id: omData.id,
      project_id: omData.project_id,
      content: content,
      created_at: omData.created_at,
      updated_at: omData.updated_at,
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

