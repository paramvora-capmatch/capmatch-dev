"use client";

import { useRef, useEffect, useCallback } from "react";
import type { ProjectProfile } from "@/types/enhanced-types";
import { FIELD_DEPENDENCIES } from "../domain/validationDependencies";

export interface UseProjectResumeValidationParams {
	formData: ProjectProfile;
	fieldMetadata: Record<string, unknown>;
	setFieldMetadata: React.Dispatch<
		React.SetStateAction<Record<string, unknown>>
	>;
}

export interface UseProjectResumeValidationResult {
	handleBlur: (fieldId: string, value?: unknown) => void;
	fieldDependencies: Record<string, string[]>;
}

/**
 * Encapsulates sanity checker init, blur validation, and dependency revalidation.
 */
export function useProjectResumeValidation({
	formData,
	fieldMetadata,
	setFieldMetadata,
}: UseProjectResumeValidationParams): UseProjectResumeValidationResult {
	const sanityCheckerRef = useRef<{
		scheduleCheck: (
			fieldId: string,
			value: unknown,
			context: Record<string, unknown>,
			existingFieldData: Record<string, unknown>,
			onComplete: (fieldId: string, warnings: string[]) => void,
			onError?: (fieldId: string, error: Error) => void
		) => void;
		batchCheck: (
			fields: Array<{
				fieldId: string;
				value: unknown;
				context: Record<string, unknown>;
				existingFieldData: Record<string, unknown>;
			}>,
			onComplete: (fieldId: string, warnings: string[]) => void,
			onError?: (fieldId: string, error: Error) => void
		) => Promise<void>;
		cancelAll: () => void;
	} | null>(null);

	useEffect(() => {
		import("@/lib/debouncedSanityCheck").then(
			({ DebouncedSanityChecker }) => {
				sanityCheckerRef.current = new DebouncedSanityChecker({
					resumeType: "project",
					debounceMs: 1500,
					batchDebounceMs: 2500,
				});
			}
		);
		return () => {
			sanityCheckerRef.current?.cancelAll();
		};
	}, []);

	const handleBlur = useCallback(
		(fieldId: string, value?: unknown) => {
			const fieldValue =
				value !== undefined ? value : (formData as Record<string, unknown>)[fieldId];
			if (fieldValue === undefined || fieldValue === null) return;

			const currentMeta = (fieldMetadata[fieldId] as Record<string, unknown>) || {
				value: fieldValue,
				source: null,
				warnings: [],
				other_values: [],
			};
			const context = { ...formData, [fieldId]: fieldValue } as Record<string, unknown>;

			sanityCheckerRef.current?.scheduleCheck(
				fieldId,
				fieldValue,
				context,
				currentMeta,
				(fid, warnings) => {
					setFieldMetadata((prev) => ({
						...prev,
						[fid]: {
							...(prev[fid] as object),
							warnings,
						},
					}));
				},
				(fid, error) => {
					console.error(`Realtime sanity check failed for ${fid}:`, error);
				}
			);
		},
		[formData, fieldMetadata, setFieldMetadata]
	);

	const prevFormDataRef = useRef<ProjectProfile>(formData);
	const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (validationTimeoutRef.current) {
			clearTimeout(validationTimeoutRef.current);
		}

		validationTimeoutRef.current = setTimeout(async () => {
			const currentFormData = formData;
			const prevFormData = prevFormDataRef.current;
			const allRelevantFields = new Set([
				...Object.keys(FIELD_DEPENDENCIES),
				...Object.values(FIELD_DEPENDENCIES).flat(),
			]);

			const changedFields = new Set<string>();
			allRelevantFields.forEach((fieldId) => {
				const currentValue = (currentFormData as Record<string, unknown>)[fieldId];
				const prevValue = (prevFormData as Record<string, unknown>)[fieldId];
				if (
					JSON.stringify(currentValue) !== JSON.stringify(prevValue)
				) {
					changedFields.add(fieldId);
				}
			});

			if (changedFields.size === 0) {
				prevFormDataRef.current = currentFormData;
				return;
			}

			const fieldsToRevalidate = new Set<string>();
			changedFields.forEach((fieldId) => {
				const dependentFields = FIELD_DEPENDENCIES[fieldId];
				if (dependentFields) {
					dependentFields.forEach((depFieldId) => {
						const depValue = (currentFormData as Record<string, unknown>)[depFieldId];
						if (
							depValue !== undefined &&
							depValue !== null &&
							depValue !== ""
						) {
							fieldsToRevalidate.add(depFieldId);
						}
					});
				}
			});

			if (fieldsToRevalidate.size > 0 && sanityCheckerRef.current) {
				const fieldsToCheck = Array.from(fieldsToRevalidate)
					.map((fieldId) => {
						const fieldValue = (currentFormData as Record<string, unknown>)[fieldId];
						const currentMeta = (fieldMetadata[fieldId] as Record<string, unknown>) || {
							value: fieldValue,
							source: null,
							warnings: [],
							other_values: [],
						};
						return {
							fieldId,
							value: fieldValue,
							context: currentFormData as Record<string, unknown>,
							existingFieldData: currentMeta,
						};
					})
					.filter(
						(field) =>
							field.value !== undefined &&
							field.value !== null &&
							field.value !== ""
					);

				if (fieldsToCheck.length > 0) {
					await sanityCheckerRef.current.batchCheck(
						fieldsToCheck,
						(fid, warnings) => {
							setFieldMetadata((prev) => ({
								...prev,
								[fid]: {
									...(prev[fid] as object),
									warnings,
								},
							}));
						},
						(fid, error) => {
							console.error(`Batch sanity check failed for ${fid}:`, error);
						}
					);
				}
			}

			prevFormDataRef.current = currentFormData;
		}, 1000);

		return () => {
			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current);
			}
		};
	}, [formData, fieldMetadata, setFieldMetadata]);

	return { handleBlur, fieldDependencies: FIELD_DEPENDENCIES };
}
