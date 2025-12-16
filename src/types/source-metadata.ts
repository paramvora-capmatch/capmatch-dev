// src/types/source-metadata.ts
/**
 * Unified source metadata schema for field extraction responses
 * Used by both mock API and backend API to provide consistent source information
 * 
 * This is the ONLY format - no legacy string support
 */

export type SourceType = "document" | "external" | "derived" | "user_input";

/**
 * Source metadata structure
 * All sources must use this format - no string sources allowed
 */
export interface SourceMetadata {
	type: SourceType;
	// For document sources: the document name (e.g., "ALTA Survey", "Term Sheet")
	// For external sources: the API/service name (e.g., "Google Maps API", "CoStar")
	// For derived sources: the derivation method (e.g., "Sum of Budget", "NOI / TDC")
	// For user_input: name is optional
	name?: string;
	// For derived sources: the derivation description
	derivation?: string;
}

/**
 * Field extraction response structure
 * Each field can have a value with associated source metadata
 */
export interface FieldExtractionData {
	value: any;
	source?: SourceMetadata; // Single source object (not array)
	warnings?: string[];
	other_values?: Array<{ value: any; source: SourceMetadata }>; // Alternative values from other sources
}

/**
 * Format source metadata for display in tooltip
 */
export function formatSourceForDisplay(source: SourceMetadata): string {
	// Helper to normalize document names coming from storage (e.g. v1_userXYZ_original.pdf)
	const normalizeDocumentName = (name?: string): string | undefined => {
		if (!name) return name;

		// Drop any directory components
		const base = name.split("/").pop() || name;

		const parts = base.split("_");
		// Heuristic: v1_<uploaderId>_<original_filename>
		if (/^v\d+/.test(parts[0]) && parts.length >= 3) {
			return parts.slice(2).join("_"); // preserve underscores inside original filename
		}

		return base;
	};

	switch (source.type) {
		case "document": {
			const cleanName = normalizeDocumentName(source.name);
			return cleanName ? `Document (${cleanName})` : "Document";
		}
		case "external":
			return source.name ? `External (${source.name})` : "External";
		case "derived":
			return source.derivation ? `Derived (${source.derivation})` : "Derived";
		case "user_input":
			return "User Input";
		default:
			return "Unknown";
	}
}

