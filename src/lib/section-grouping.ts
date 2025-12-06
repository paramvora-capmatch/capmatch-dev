/**
 * Section Grouping Utilities
 *
 * Handles conversion between flat field structure and section-grouped structure
 * for storage in the database. Uses schema utilities to derive all mappings
 * from the single source of truth (enhanced-project-form.schema.json).
 */

import {
	getFieldToSectionMap,
	getSubsectionForField,
	getSectionIds,
	sectionHasSubsections,
} from "./schema-utils";
import { projectResumeFieldMetadata } from "./project-resume-field-metadata";

// Generate FIELD_TO_SECTION mapping from schema
export const FIELD_TO_SECTION = getFieldToSectionMap();

// Build a fallback mapping from metadata for fields not in schema
const METADATA_FIELD_TO_SECTION: Record<string, string> = {};
for (const [fieldId, metadata] of Object.entries(projectResumeFieldMetadata)) {
	if (metadata.section && !FIELD_TO_SECTION[fieldId]) {
		METADATA_FIELD_TO_SECTION[fieldId] = metadata.section;
	}
}

/**
 * Converts flat field structure to section-grouped structure with nested subsections.
 * 
 * For sections with subsections:
 *   {"basic-info": {"project-identity": {"projectName": {...}}, "classification": {...}}}
 * 
 * For sections without subsections:
 *   {"online-presence": {"linkedinUrl": {...}, "websiteUrl": {...}}}
 */
export function groupBySections(
	flatData: Record<string, any>
): Record<string, any> {
	const grouped: Record<string, any> = {};

	for (const [fieldId, fieldValue] of Object.entries(flatData)) {
		// Skip special fields
		if (
			fieldId.startsWith("_") ||
			fieldId === "projectSections" ||
			fieldId === "borrowerSections" ||
			fieldId === "completenessPercent"
		) {
			continue;
		}

		// Check schema first, then metadata as fallback
		const sectionId = FIELD_TO_SECTION[fieldId] || METADATA_FIELD_TO_SECTION[fieldId];
		if (sectionId) {
			if (!grouped[sectionId]) {
				grouped[sectionId] = {};
			}
			
			// Check if this section has subsections
			const subsectionId = getSubsectionForField(fieldId, sectionId);
			
			if (subsectionId) {
				// Section has subsections - nest field in subsection
				if (!grouped[sectionId][subsectionId]) {
					grouped[sectionId][subsectionId] = {};
				}
				grouped[sectionId][subsectionId][fieldId] = fieldValue;
			} else {
				// Section has no subsections - place field directly in section
				grouped[sectionId][fieldId] = fieldValue;
			}
		} else {
			// Field doesn't have a section mapping - put in a catch-all section
			if (!grouped["unknown"]) {
				grouped["unknown"] = {};
			}
			grouped["unknown"][fieldId] = fieldValue;
		}
	}

	return grouped;
}

/**
 * Converts section-grouped structure back to flat field structure.
 * Handles both nested subsection structure and sections without subsections.
 */
export function ungroupFromSections(
	groupedData: Record<string, any>
): Record<string, any> {
	const flat: Record<string, any> = {};

	for (const [sectionKey, sectionData] of Object.entries(groupedData)) {
		// Preserve metadata/root keys as-is rather than flattening them.
		// Keys like `_lockedFields`, `_fieldStates`, `_metadata`, and
		// `completenessPercent` should remain at the top level. If we
		// flatten `_lockedFields`, for example, we end up with
		// `{ contactEmail: true, ... }` which can corrupt snapshot content.
		if (
			sectionKey.startsWith("_") ||
			sectionKey === "completenessPercent" ||
			sectionKey === "projectSections" ||
			sectionKey === "borrowerSections"
		) {
			flat[sectionKey] = sectionData;
			continue;
		}

		if (!sectionData || typeof sectionData !== "object" || Array.isArray(sectionData)) {
			// Not a valid section structure - treat as field
			flat[sectionKey] = sectionData;
			continue;
		}

		// Check if this section has subsections using schema utilities
		const hasSubsections = sectionHasSubsections(sectionKey);
		
		if (hasSubsections) {
			// Section has subsections - iterate through subsections
			for (const [subsectionId, subsectionData] of Object.entries(sectionData)) {
				if (subsectionData && typeof subsectionData === "object" && !Array.isArray(subsectionData)) {
					for (const [fieldId, fieldValue] of Object.entries(subsectionData)) {
						flat[fieldId] = fieldValue;
					}
				} else {
					// Invalid subsection structure - treat as field
					flat[subsectionId] = subsectionData;
				}
			}
		} else {
			// Section has no subsections - fields are directly in section
			for (const [fieldId, fieldValue] of Object.entries(sectionData)) {
				flat[fieldId] = fieldValue;
			}
		}
	}

	return flat;
}

/**
 * Checks if data is in section-grouped format.
 * Uses schema utilities to check if keys match known section IDs.
 */
export function isGroupedFormat(data: Record<string, any>): boolean {
	const keys = Object.keys(data);
	const knownSectionIds = getSectionIds();
	return keys.some((key) => knownSectionIds.includes(key));
}
