// Utility to get the exact field order from the form schema
// This ensures the diff viewer matches the form structure exactly (sections + subsections)

import formSchema from "@/lib/enhanced-project-form.schema.json";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";

export interface FormFieldOrder {
	sectionId: string;
	sectionName: string;
	subsectionId?: string;
	subsectionName?: string;
	fieldId: string;
	fieldIndex: number;
}

type SchemaType = typeof formSchema | typeof borrowerFormSchema;

/**
 * Gets the exact field order from a form schema, including subsections.
 * This matches the order fields appear in the form.
 * @param schema - Optional schema to use. If not provided, defaults to project form schema for backward compatibility.
 */
export function getFormFieldOrder(schema?: SchemaType): FormFieldOrder[] {
	const targetSchema = schema || formSchema; // Default to project schema for backward compatibility
	const schemaSteps = (targetSchema as any).steps || [];
	const fieldOrder: FormFieldOrder[] = [];

	for (const step of schemaSteps) {
		const sectionId = step.id;
		const sectionName = step.title;

		// Check if step has subsections
		if (step.subsections && Array.isArray(step.subsections)) {
			// Has subsections - use subsection order
			for (const subsection of step.subsections) {
				const subsectionId = subsection.id;
				const subsectionName = subsection.title;

				if (subsection.fields && Array.isArray(subsection.fields)) {
					subsection.fields.forEach(
						(fieldId: string, index: number) => {
							fieldOrder.push({
								sectionId,
								sectionName,
								subsectionId,
								subsectionName,
								fieldId,
								fieldIndex: index,
							});
						}
					);
				}
			}
		} else if (step.fields && Array.isArray(step.fields)) {
			// No subsections - use step.fields order
			step.fields.forEach((fieldId: string, index: number) => {
				fieldOrder.push({
					sectionId,
					sectionName,
					fieldId,
					fieldIndex: index,
				});
			});
		}
	}

	return fieldOrder;
}

/**
 * Creates a map of fieldId -> order information for fast lookup
 * @param schema - Optional schema to use. If not provided, defaults to project form schema for backward compatibility.
 */
export function getFieldOrderMap(
	schema?: SchemaType
): Map<
	string,
	{ sectionId: string; subsectionId?: string; fieldIndex: number }
> {
	const fieldOrder = getFormFieldOrder(schema);
	const map = new Map();

	for (const item of fieldOrder) {
		map.set(item.fieldId, {
			sectionId: item.sectionId,
			subsectionId: item.subsectionId,
			fieldIndex: item.fieldIndex,
		});
	}

	return map;
}

/**
 * Gets subsection groupings for a section
 * @param sectionId - The section ID to get subsections for
 * @param schema - Optional schema to use. If not provided, defaults to project form schema for backward compatibility.
 */
export function getSubsectionsForSection(
	sectionId: string,
	schema?: SchemaType
): Array<{ id: string; name: string; fields: string[] }> {
	const targetSchema = schema || formSchema;
	const schemaSteps = (targetSchema as any).steps || [];
	const step = schemaSteps.find((s: any) => s.id === sectionId);

	if (!step || !step.subsections) {
		return [];
	}

	return step.subsections.map((subsection: any) => ({
		id: subsection.id,
		name: subsection.title,
		fields: subsection.fields || [],
	}));
}

/**
 * Gets field label from schema
 * @param fieldId - The field ID to get the label for
 * @param schema - Optional schema to use. If not provided, defaults to project form schema for backward compatibility.
 */
export function getFieldLabelFromSchema(
	fieldId: string,
	schema?: SchemaType
): string {
	const targetSchema = schema || formSchema;
	const schemaFields = (targetSchema as any)?.fields || {};
	const schemaField = schemaFields[fieldId];
	if (schemaField?.label) {
		return schemaField.label;
	}
	return fieldId;
}
