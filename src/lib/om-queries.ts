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
 * List of all insight field keys
 */
const INSIGHT_FIELD_KEYS = [
  'supplyStrength1', 'supplyStrength2', 'supplyStrength3',
  'marketOpportunity1', 'marketOpportunity2', 'marketOpportunity3',
  'riskFactor1', 'riskFactor2', 'riskFactor3',
  'demographicStrength1', 'demographicStrength2', 'demographicStrength3',
  'demographicOpportunity1', 'demographicOpportunity2', 'demographicOpportunity3',
  'targetDemographic1', 'targetDemographic2', 'targetDemographic3',
  'employmentStrength1', 'employmentStrength2', 'employmentStrength3',
  'employmentOpportunity1', 'employmentOpportunity2', 'employmentOpportunity3',
  'targetMarket1', 'targetMarket2', 'targetMarket3',
  'returnDriver1', 'returnDriver2', 'returnDriver3',
  'returnRisk1', 'returnRisk2', 'returnRisk3',
  'returnMitigation1', 'returnMitigation2', 'returnMitigation3',
  'sponsorStrength1', 'sponsorStrength2', 'sponsorStrength3',
  'sponsorStrength4', 'sponsorStrength5', 'sponsorStrength6',
  'specialProgramsDescription',
  'riskMitigation1', 'riskMitigation2', 'riskMitigation3',
  'riskMonitoring1', 'riskMonitoring2', 'riskMonitoring3',
  'capitalRisk1', 'capitalRisk2', 'capitalRisk3',
  'capitalMitigant1', 'capitalMitigant2', 'capitalMitigant3',
];

/**
 * Fetches the OM data for a project from the database.
 * Since OM is now a single row per project (no versioning), we fetch directly by project_id.
 * Returns flat data structure (same as project/borrower resumes) with separate insights.
 */
export async function getLatestOM(projectId: string) {
  try {
    // Fetch the single OM row for this project, including insights column
    const { data, error } = await supabase
      .from("om")
      .select("*, insights")
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

    // Extract insights from insights column (excluding metadata)
    const insightsData = data.insights || {};
    const insights: Record<string, any> = {};
    for (const key of INSIGHT_FIELD_KEYS) {
      if (insightsData[key]) {
        insights[key] = insightsData[key];
      }
    }

    // Extract insights metadata
    const insights_metadata = {
      resume_version_id: insightsData.resume_version_id || null,
      generated_at: insightsData.generated_at || null,
    };

    return {
      id: data.id,
      project_id: data.project_id,
      content: content,
      insights: insights,
      insights_metadata: insights_metadata,
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
 * Also checks insights column for insight fields
 */
export function getOMValue(
  content: Record<string, any> | null | undefined, 
  fieldId: string,
  insights?: Record<string, any> | null | undefined
): any {
  // Check if this is an insight field - if so, check insights first
  if (INSIGHT_FIELD_KEYS.includes(fieldId) && insights && insights[fieldId] !== undefined) {
    return insights[fieldId];
  }
  
  // Otherwise, check content
  if (!content) return null;
  const field = content[fieldId];
  if (field && typeof field === "object" && "value" in field) {
    return field.value;
  }
  return field;
}
