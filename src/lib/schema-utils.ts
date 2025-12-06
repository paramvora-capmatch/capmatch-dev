/**
 * Schema Utilities
 * 
 * Provides utilities to query the enhanced-project-form.schema.json file.
 * This is the single source of truth for all section/subsection/field mappings.
 */

import formSchema from "./enhanced-project-form.schema.json";

export interface SchemaStep {
	id: string;
	title: string;
	icon?: string;
	subsections?: Array<{
		id: string;
		title: string;
		fields: string[];
	}>;
	fields: string[];
}

export interface Schema {
	steps: SchemaStep[];
	fields?: Record<string, any>;
}

const schema = formSchema as Schema;

/**
 * Get all section IDs in order
 */
export function getSectionIds(): string[] {
	return schema.steps.map((step) => step.id);
}

/**
 * Get section by ID
 */
export function getSection(sectionId: string): SchemaStep | undefined {
	return schema.steps.find((step) => step.id === sectionId);
}

/**
 * Get all subsection IDs for a section
 */
export function getSubsectionIds(sectionId: string): string[] {
	const section = getSection(sectionId);
	if (!section?.subsections) {
		return [];
	}
	return section.subsections.map((sub) => sub.id);
}

/**
 * Get subsection by ID within a section
 */
export function getSubsection(
	sectionId: string,
	subsectionId: string
): { id: string; title: string; fields: string[] } | undefined {
	const section = getSection(sectionId);
	if (!section?.subsections) {
		return undefined;
	}
	return section.subsections.find((sub) => sub.id === subsectionId);
}

/**
 * Get all field IDs for a section (including all subsections)
 */
export function getSectionFields(sectionId: string): string[] {
	const section = getSection(sectionId);
	if (!section) {
		return [];
	}
	return section.fields || [];
}

/**
 * Get field IDs for a specific subsection
 */
export function getSubsectionFields(
	sectionId: string,
	subsectionId: string
): string[] {
	const subsection = getSubsection(sectionId, subsectionId);
	return subsection?.fields || [];
}

/**
 * Get the section ID for a given field ID
 */
export function getSectionForField(fieldId: string): string | undefined {
	for (const step of schema.steps) {
		if (step.fields?.includes(fieldId)) {
			return step.id;
		}
	}
	return undefined;
}

/**
 * Get the subsection ID for a given field ID within a section
 * Returns null if the section has no subsections or field is not in any subsection
 */
export function getSubsectionForField(
	fieldId: string,
	sectionId: string
): string | null {
	const section = getSection(sectionId);
	if (!section?.subsections) {
		return null;
	}

	for (const subsection of section.subsections) {
		if (subsection.fields.includes(fieldId)) {
			return subsection.id;
		}
	}

	return null;
}

/**
 * Check if a section has subsections
 */
export function sectionHasSubsections(sectionId: string): boolean {
	const section = getSection(sectionId);
	return Boolean(section?.subsections && section.subsections.length > 0);
}

/**
 * Generate FIELD_TO_SECTION mapping
 */
export function getFieldToSectionMap(): Record<string, string> {
	const mapping: Record<string, string> = {};
	for (const step of schema.steps) {
		for (const fieldId of step.fields || []) {
			mapping[fieldId] = step.id;
		}
	}
	return mapping;
}

/**
 * Generate SECTION_TO_SUBSECTIONS mapping
 */
export function getSectionToSubsectionsMap(): Record<
	string,
	Array<{ id: string; fields: string[] }>
> {
	const mapping: Record<string, Array<{ id: string; fields: string[] }>> = {};
	for (const step of schema.steps) {
		if (step.subsections && step.subsections.length > 0) {
			mapping[step.id] = step.subsections.map((sub) => ({
				id: sub.id,
				fields: sub.fields,
			}));
		}
	}
	return mapping;
}

/**
 * Get all field IDs from the schema
 */
export function getAllFieldIds(): string[] {
	const fieldIds: string[] = [];
	for (const step of schema.steps) {
		fieldIds.push(...(step.fields || []));
	}
	return [...new Set(fieldIds)]; // Remove duplicates
}

/**
 * Validate that a field ID exists in the schema
 */
export function isValidFieldId(fieldId: string): boolean {
	return getAllFieldIds().includes(fieldId);
}

/**
 * Validate that a section ID exists in the schema
 */
export function isValidSectionId(sectionId: string): boolean {
	return getSectionIds().includes(sectionId);
}

/**
 * Get field metadata from schema.fields if available
 */
export function getFieldMetadata(fieldId: string): any {
	return schema.fields?.[fieldId];
}

