/**
 * Characterization copy of sanitizeProjectProfile for tests.
 * Commit 2 will have EnhancedProjectForm import from here.
 */
import type { ProjectProfile } from "@/types/enhanced-types";
import {
	projectResumeFieldMetadata,
	type FieldMetadata as ProjectFieldMeta,
} from "@/lib/project-resume-field-metadata";
import { isProjectValueProvided } from "./isProjectValueProvided";

export function sanitizeProjectProfile(profile: ProjectProfile): ProjectProfile {
	const next: Record<string, unknown> = { ...profile };

	// Fix flat field values
	for (const [fieldId, meta] of Object.entries(projectResumeFieldMetadata)) {
		const dataType = (meta as ProjectFieldMeta).dataType;
		if (!dataType || dataType === "Boolean") continue;

		const current = next[fieldId];
		if (typeof current === "boolean") {
			next[fieldId] = null;
		}
	}

	const fixedMeta: Record<string, unknown> =
		next._metadata && typeof next._metadata === "object"
			? { ...(next._metadata as Record<string, unknown>) }
			: {};

	for (const [fieldId, meta] of Object.entries(fixedMeta)) {
		const fieldConfig = projectResumeFieldMetadata[fieldId];
		const dataType = fieldConfig?.dataType;
		if (!dataType || dataType === "Boolean") continue;

		if (meta && typeof meta === "object") {
			const metaObj = meta as Record<string, unknown>;
			if (typeof metaObj.value === "boolean") {
				metaObj.value = null;
			}
			if ("original_value" in metaObj) {
				delete metaObj.original_value;
			}
			if (
				Array.isArray(metaObj.sources) &&
				metaObj.sources.length > 0 &&
				!metaObj.source
			) {
				metaObj.source = metaObj.sources[0];
				delete metaObj.sources;
			}
		}
	}

	for (const fieldId of Object.keys(projectResumeFieldMetadata)) {
		const existingMeta = fixedMeta[fieldId] as Record<string, unknown> | undefined;
		const currentValue = next[fieldId];

		if (existingMeta) {
			if (!existingMeta.source) {
				existingMeta.source = { type: "user_input" };
			}
			continue;
		}

		const hasValue = isProjectValueProvided(currentValue);
		if (hasValue) {
			fixedMeta[fieldId] = {
				value: currentValue,
				source: { type: "user_input" },
				warnings: [],
				other_values: [],
			};
		}
	}

	next._metadata = fixedMeta;

	return next as ProjectProfile;
}
