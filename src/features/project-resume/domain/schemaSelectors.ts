/**
 * Schema-derived selectors: field labels and warning message mapping.
 */
const FORM_SCHEMA_FIELDS_KEY = "fields";

export interface FormSchemaLike {
	fields?: Record<string, { label?: string }>;
}

/** Build fieldId -> label map from form schema. */
export function buildFieldLabelMap(
	formSchema: FormSchemaLike | null | undefined
): Record<string, string> {
	const cfg = formSchema?.[FORM_SCHEMA_FIELDS_KEY as keyof FormSchemaLike];
	if (!cfg || typeof cfg !== "object") return {};
	const map: Record<string, string> = {};
	for (const [fid, def] of Object.entries(cfg as Record<string, { label?: string }>)) {
		if (def?.label) {
			map[fid] = String(def.label);
		}
	}
	return map;
}

/** Replace raw field IDs in warning strings with user-friendly labels. */
export function mapWarningsToLabels(
	warnings: string[] | null | undefined,
	fieldLabelMap: Record<string, string>
): string[] | undefined {
	if (!warnings || warnings.length === 0) return undefined;
	return warnings.map((w) => {
		let result = w;
		for (const [fid, label] of Object.entries(fieldLabelMap)) {
			const pattern = new RegExp(`\\b${fid}\\b`, "g");
			result = result.replace(pattern, label);
		}
		return result;
	});
}
