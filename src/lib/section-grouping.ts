/**
 * Section Grouping Utilities
 *
 * Provides utilities for mapping fields to sections and subsections.
 * Uses schema utilities to derive all mappings from the single source of truth
 * (enhanced-project-form.schema.json).
 * 
 * Note: Storage is always flat format. These utilities are used for UI organization
 * and extraction pipeline organization only.
 */

import {
	getFieldToSectionMap,
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
