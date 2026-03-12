import type { BorrowerResumeContent } from "@/lib/project-queries";
import { borrowerResumeFieldMetadata } from "@/lib/borrower-resume-field-metadata";

/**
 * Sanitize incoming BorrowerResume content: fix legacy booleans in non-Boolean
 * fields, normalize _metadata (sources → source, remove original_value).
 */
export function sanitizeBorrowerProfile(
	profile: Partial<BorrowerResumeContent>
): Partial<BorrowerResumeContent> {
	const next: Record<string, unknown> = { ...profile };

	for (const [fieldId, meta] of Object.entries(borrowerResumeFieldMetadata)) {
		const dataType = (meta as { dataType?: string }).dataType;
		if (!dataType || dataType === "Boolean") continue;

		const current = next[fieldId];
		if (typeof current === "boolean") {
			next[fieldId] = null;
		}
	}

	type MetaRecord = Record<string, Record<string, unknown>>;
	const fixedMeta: MetaRecord =
		next._metadata && typeof next._metadata === "object"
			? { ...(next._metadata as MetaRecord) }
			: {};

	for (const [fieldId, meta] of Object.entries(fixedMeta)) {
		const fieldConfig = borrowerResumeFieldMetadata[fieldId];
		const dataType = (fieldConfig as { dataType?: string })?.dataType;
		if (!dataType || dataType === "Boolean") continue;

		if (meta && typeof meta === "object") {
			if (typeof meta.value === "boolean") {
				meta.value = null;
			}
			if ("original_value" in meta) {
				delete meta.original_value;
			}
			if (
				Array.isArray(meta.sources) &&
				meta.sources.length > 0 &&
				!meta.source
			) {
				meta.source = meta.sources[0];
				delete meta.sources;
			}
		}
	}

	for (const fieldId of Object.keys(borrowerResumeFieldMetadata)) {
		const existingMeta = fixedMeta[fieldId];
		const currentValue = next[fieldId];

		if (!existingMeta) {
			fixedMeta[fieldId] = {
				value: currentValue ?? null,
				source: { type: "user_input" },
				warnings: [],
				other_values: [],
			};
		} else if (!existingMeta.source) {
			existingMeta.source = { type: "user_input" };
		}
	}

	next._metadata = fixedMeta;

	return next as unknown as Partial<BorrowerResumeContent>;
}
