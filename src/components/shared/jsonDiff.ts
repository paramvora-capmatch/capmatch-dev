// Deep JSON comparison utilities for comparing JSONB content directly
// No flattening - works with exact DB schema structure

/**
 * Deep compares two JSON values and returns differences
 * Works with the EXACT JSONB structure from the database
 */
export function deepDiff(
  obj1: any,
  obj2: any,
  path: string = ""
): Array<{ path: string; before: any; after: any }> {
  const differences: Array<{ path: string; before: any; after: any }> = [];

  // Both undefined/null - no difference
  if (obj1 === obj2) {
    return differences;
  }

  // One is null/undefined, other isn't
  if (obj1 == null && obj2 != null) {
    differences.push({ path: path || "root", before: obj1, after: obj2 });
    return differences;
  }
  if (obj1 != null && obj2 == null) {
    differences.push({ path: path || "root", before: obj1, after: obj2 });
    return differences;
  }

  // Different types
  if (typeof obj1 !== typeof obj2) {
    differences.push({ path: path || "root", before: obj1, after: obj2 });
    return differences;
  }

  // Primitive values - direct comparison
  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    obj2 === null ||
    Array.isArray(obj1) ||
    Array.isArray(obj2)
  ) {
    // For arrays and primitives, compare directly
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
      differences.push({ path: path || "root", before: obj1, after: obj2 });
    }
    return differences;
  }

  // Objects - compare recursively
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    const val1 = obj1[key];
    const val2 = obj2[key];

    // Skip reserved metadata fields for now (we'll handle them separately)
    if (key === "_lockedFields" || key === "_fieldStates" || key === "_metadata" || key === "completenessPercent") {
      continue;
    }

    const keyDifferences = deepDiff(val1, val2, newPath);
    differences.push(...keyDifferences);
  }

  return differences;
}

/**
 * Normalizes a value for display comparison
 * Handles boolean/string conversions for display only
 */
export function normalizeForDisplay(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  
  // Handle rich objects with value property
  if (value && typeof value === "object" && "value" in value && !Array.isArray(value)) {
    return normalizeForDisplay((value as any).value);
  }
  
  // Handle boolean string conversions for display
  if (typeof value === "string") {
    const normalizedStr = value.trim().toLowerCase();
    if (normalizedStr === "yes" || normalizedStr === "true") {
      return true;
    }
    if (normalizedStr === "no" || normalizedStr === "false") {
      return false;
    }
  }
  
  return value;
}

/**
 * Extracts field value from JSONB structure following the exact DB schema
 */
export function extractFieldValue(content: any, fieldPath: string): any {
  const parts = fieldPath.split(".");
  let current = content;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }

  // If it's a rich object with value property, extract the value
  if (current && typeof current === "object" && "value" in current) {
    return current.value;
  }

  return current;
}

