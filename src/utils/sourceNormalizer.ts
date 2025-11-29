// src/utils/sourceNormalizer.ts
/**
 * Utility functions to normalize source names for display
 * Converts source strings to title case for prettier display
 */

/**
 * Normalizes a source string to title case
 * Examples:
 * - "user_input" -> "User Input"
 * - "derived" -> "Derived"
 * - "Sum of Budget" -> "Sum of Budget" (already normalized)
 * - "extract from address" -> "Extract From Address"
 */
export function normalizeSource(source: string | null | undefined): string {
	if (!source) return "";
	
	// If already in title case format (has capitals), return as is
	// This handles cases like "Sum of Budget", "User Input", etc.
	if (source !== source.toLowerCase() && source !== source.toUpperCase()) {
		return source;
	}
	
	// Convert snake_case and kebab-case to title case
	const normalized = source
		.split(/[_\s-]+/)
		.map(word => {
			// Handle special cases
			if (word.toLowerCase() === "api") return "API";
			if (word.toLowerCase() === "egis") return "EGIS";
			if (word.toLowerCase() === "noi") return "NOI";
			if (word.toLowerCase() === "tdc") return "TDC";
			if (word.toLowerCase() === "ltv") return "LTV";
			if (word.toLowerCase() === "dscr") return "DSCR";
			if (word.toLowerCase() === "nrsf") return "NRSF";
			if (word.toLowerCase() === "ami") return "AMI";
			if (word.toLowerCase() === "tif") return "TIF";
			if (word.toLowerCase() === "pfc") return "PFC";
			
			// Capitalize first letter, lowercase rest
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(" ");
	
	return normalized;
}

/**
 * Normalizes an array of source strings
 */
export function normalizeSources(sources: (string | null | undefined)[]): string[] {
	return sources
		.filter((s): s is string => Boolean(s))
		.map(normalizeSource);
}

