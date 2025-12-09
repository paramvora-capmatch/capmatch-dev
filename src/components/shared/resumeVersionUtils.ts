import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
// Removed imports: isGroupedFormat, ungroupFromSections - storage is now always flat format
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
 * Handles empty strings, null, undefined, rich object formats, and boolean conversions consistently.
 */
export const normalizeValueForComparison = (value: unknown): unknown => {
	// Handle null/undefined
	if (value === undefined || value === null) return null;

	// Handle empty strings - treat as null for comparison
	if (typeof value === "string" && value.trim() === "") return null;

	// Handle rich objects with value property
	if (
		value &&
		typeof value === "object" &&
		"value" in value &&
		!Array.isArray(value)
	) {
		const richValue = (value as any).value;
		// Recursively normalize the inner value
		return normalizeValueForComparison(richValue);
	}

	// Handle boolean string conversions - CRITICAL for data integrity
	if (typeof value === "string") {
		const normalizedStr = value.trim().toLowerCase();
		// Convert "yes"/"no" strings to booleans for consistent comparison
		if (normalizedStr === "yes" || normalizedStr === "true") {
			return true;
		}
		if (normalizedStr === "no" || normalizedStr === "false") {
			return false;
		}
	}

	// Handle actual boolean values (keep as-is)
	if (typeof value === "boolean") {
		return value;
	}

	// Handle arrays - normalize each element
	if (Array.isArray(value)) {
		return value.map(normalizeValueForComparison);
	}

	return value;
};

/**
 * Checks if two values are effectively the same (after normalization).
 * CRITICAL: Must handle boolean false correctly - false is a valid value, not missing!
 * CRITICAL: Normalize FIRST so that undefined (field missing) and null (field empty) are treated as equivalent.
 */
export const valuesAreEqual = (a: unknown, b: unknown): boolean => {
	// Normalize values FIRST - this converts undefined to null and empty strings to null
	// This ensures that undefined (field doesn't exist) and null (field exists but empty) are treated as equivalent
	const normalizedA = normalizeValueForComparison(a);
	const normalizedB = normalizeValueForComparison(b);

	// After normalization, undefined becomes null, so we only need to check for null
	// Both null/empty (after normalization) means they're effectively the same
	if (normalizedA === null && normalizedB === null) return true;

	// One is null, other isn't - they're different
	if (normalizedA === null || normalizedB === null) return false;

	// CRITICAL: Handle boolean values explicitly
	// false === false should return true, true === true should return true
	if (typeof normalizedA === "boolean" && typeof normalizedB === "boolean") {
		return normalizedA === normalizedB;
	}

	// Deep equality for objects/arrays (but not booleans)
	if (
		(typeof normalizedA === "object" && normalizedA !== null) ||
		(typeof normalizedB === "object" && normalizedB !== null)
	) {
		try {
			return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
		} catch {
			return String(normalizedA) === String(normalizedB);
		}
	}

	// Primitive comparison (numbers, strings, etc.)
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

export const flattenResumeContent = (
	rawContent: Record<string, any> | null | undefined
) => {
	if (!rawContent) return {};
	// Content is always flat now, no conversion needed
	const content = rawContent;

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
