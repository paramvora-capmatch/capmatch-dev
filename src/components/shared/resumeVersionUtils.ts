import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
import { isGroupedFormat, ungroupFromSections } from "@/lib/section-grouping";
import formSchema from "@/lib/enhanced-project-form.schema.json";

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

/**
 * Normalizes a value for comparison to avoid false positives.
 * Handles empty strings, null, undefined, and rich object formats consistently.
 */
export const normalizeValueForComparison = (value: unknown): unknown => {
  // Handle null/undefined
  if (value === undefined || value === null) return null;
  
  // Handle empty strings - treat as null for comparison
  if (typeof value === "string" && value.trim() === "") return null;
  
  // Handle rich objects with value property
  if (value && typeof value === "object" && "value" in value) {
    const richValue = (value as any).value;
    // Recursively normalize the inner value
    return normalizeValueForComparison(richValue);
  }
  
  // Handle arrays - normalize each element
  if (Array.isArray(value)) {
    return value.map(normalizeValueForComparison);
  }
  
  return value;
};

/**
 * Checks if two values are effectively the same (after normalization).
 */
export const valuesAreEqual = (a: unknown, b: unknown): boolean => {
  const normalizedA = normalizeValueForComparison(a);
  const normalizedB = normalizeValueForComparison(b);
  
  // Both null/undefined/empty
  if (normalizedA === null && normalizedB === null) return true;
  
  // One is null, other isn't
  if (normalizedA === null || normalizedB === null) return false;
  
  // Deep equality for objects/arrays
  if (typeof normalizedA === "object" || typeof normalizedB === "object") {
    try {
      return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
    } catch {
      return String(normalizedA) === String(normalizedB);
    }
  }
  
  // Primitive comparison
  return normalizedA === normalizedB;
};

export const stringifyValue = (value: unknown): string => {
  const normalized = normalizeValueForComparison(value);
  
  if (normalized === null || normalized === undefined) return "—";
  
  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return "—";
    // For arrays, show a summary
    try {
      return JSON.stringify(normalized, null, 2);
    } catch {
      return "[Array]";
    }
  }
  
  if (typeof normalized === "object") {
    try {
      return JSON.stringify(normalized, null, 2);
    } catch {
      return String(normalized);
    }
  }
  
  if (typeof normalized === "boolean") {
    return normalized ? "Yes" : "No";
  }
  
  return String(normalized);
};

export const getFieldLabel = (fieldId: string): string => {
  // First, try to get the label from the form schema (matches form exactly)
  const schemaFields = (formSchema as any)?.fields || {};
  const schemaField = schemaFields[fieldId];
  if (schemaField?.label) {
    return schemaField.label;
  }
  
  // Fall back to metadata description (first sentence)
  const metadata = projectResumeFieldMetadata[fieldId];
  if (metadata) {
    return metadata.description.split(".")[0] || metadata.fieldId;
  }
  
  // Last resort: return fieldId
  return fieldId;
};

export const flattenResumeContent = (rawContent: Record<string, any> | null | undefined) => {
  if (!rawContent) return {};
  let content = rawContent;
  if (isGroupedFormat(content)) {
    content = ungroupFromSections(content);
  }

  const flat: Record<string, unknown> = {};
  Object.entries(content).forEach(([key, value]) => {
    if (key.startsWith("_")) return;
    let normalized: unknown;

    if (value && typeof value === "object" && "value" in value) {
      normalized = (value as any).value;
    } else {
      normalized = value;
    }

    // Defensive fix: if a field is defined in project resume metadata as a
    // non-Boolean type, but the stored value is a bare boolean (e.g. `true`),
    // treat it as missing instead of showing "true" in diffs (legacy bug).
    const fieldMeta = projectResumeFieldMetadata[key];
    if (
      fieldMeta &&
      fieldMeta.dataType &&
      fieldMeta.dataType !== "Boolean" &&
      typeof normalized === "boolean"
    ) {
      normalized = null;
    }

    flat[key] = normalized;
  });
  return flat;
};


