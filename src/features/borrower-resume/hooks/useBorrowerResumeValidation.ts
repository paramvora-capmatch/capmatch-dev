"use client";

import { useRef, useEffect, useCallback } from "react";
import type { BorrowerResumeContent } from "@/lib/project-queries";
import { supabase } from "@/lib/supabaseClient";
import { BORROWER_FIELD_DEPENDENCIES } from "@/features/borrower-resume/domain/validationDependencies";

type DebouncedSanityChecker = import("@/lib/debouncedSanityCheck").DebouncedSanityChecker;

export interface UseBorrowerResumeValidationParams {
	formData: Partial<BorrowerResumeContent>;
	fieldMetadata: Record<string, unknown>;
	isEditing: boolean;
	setFieldMetadata: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}

export interface UseBorrowerResumeValidationResult {
	handleBlur: (fieldId: string, value?: unknown) => void;
}

const DEPENDENCY_DEBOUNCE_MS = 1000;

/**
 * Sanity checker ref, handleBlur for single-field checks, and dependency revalidation effect.
 */
export function useBorrowerResumeValidation({
	formData,
	fieldMetadata,
	isEditing,
	setFieldMetadata,
}: UseBorrowerResumeValidationParams): UseBorrowerResumeValidationResult {
	const sanityCheckerRef = useRef<DebouncedSanityChecker | null>(null);
	const prevFormDataRef = useRef<Partial<BorrowerResumeContent>>(formData);
	const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		import("@/lib/debouncedSanityCheck").then(
			({ DebouncedSanityChecker }) => {
				sanityCheckerRef.current = new DebouncedSanityChecker({
					resumeType: "borrower",
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
			if (!isEditing) return;

			const fieldValue =
				value !== undefined ? value : (formData as Record<string, unknown>)[fieldId];
			if (fieldValue === undefined || fieldValue === null) return;

			const currentMeta = (fieldMetadata as Record<string, Record<string, unknown>>)[fieldId] ?? {
				value: fieldValue,
				source: null,
				warnings: [],
				other_values: [],
			};

			const context = { ...formData, [fieldId]: fieldValue };

			supabase.auth.getSession().then(({ data: { session } }) => {
				const authToken = session?.access_token;
				sanityCheckerRef.current?.scheduleCheck(
					fieldId,
					fieldValue,
					context as Record<string, unknown>,
					currentMeta,
					(fid, warnings) => {
						setFieldMetadata((prev) => {
							const p = prev as Record<string, Record<string, unknown>>;
							const existing = p[fid];
							return {
								...prev,
								[fid]: { ...(existing && typeof existing === "object" ? existing : {}), warnings },
							};
						});
					},
					(fid, error) => {
						console.error(`Realtime sanity check failed for ${fid}:`, error);
					},
					authToken ?? undefined
				);
			});
		},
		[formData, fieldMetadata, isEditing, setFieldMetadata]
	);

	// Re-validate dependent fields when relevant fields change
	useEffect(() => {
		if (!isEditing) {
			prevFormDataRef.current = formData;
			return;
		}
		if (!formData || Object.keys(formData).length === 0) {
			prevFormDataRef.current = formData;
			return;
		}

		if (validationTimeoutRef.current) {
			clearTimeout(validationTimeoutRef.current);
		}

		validationTimeoutRef.current = setTimeout(async () => {
			const currentFormData = formData;
			const prevFormData = prevFormDataRef.current;
			const allRelevantFields = new Set([
				...Object.keys(BORROWER_FIELD_DEPENDENCIES),
				...Object.values(BORROWER_FIELD_DEPENDENCIES).flat(),
			]);

			const changedFields = new Set<string>();
			allRelevantFields.forEach((fieldId) => {
				const currentValue = (currentFormData as Record<string, unknown>)[fieldId];
				const prevValue = (prevFormData as Record<string, unknown>)?.[fieldId];
				if (JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
					changedFields.add(fieldId);
				}
			});

			if (changedFields.size === 0) {
				prevFormDataRef.current = currentFormData;
				return;
			}

			const fieldsToRevalidate = new Set<string>();
			changedFields.forEach((fieldId) => {
				const dependentFields = BORROWER_FIELD_DEPENDENCIES[fieldId];
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
						const currentMeta = (fieldMetadata as Record<string, Record<string, unknown>>)[fieldId] ?? {
							value: fieldValue,
							source: null,
							warnings: [],
							other_values: [],
						};
						return {
							fieldId,
							value: fieldValue,
							context: currentFormData,
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
					const { data: { session } } = await supabase.auth.getSession();
					const authToken = session?.access_token;
					const fieldsWithToken = fieldsToCheck.map((f) => ({
						...f,
						authToken,
					}));
					await sanityCheckerRef.current.batchCheck(
						fieldsWithToken,
						(fieldId, warnings) => {
							setFieldMetadata((prev) => {
								const p = prev as Record<string, Record<string, unknown>>;
								const existing = p[fieldId];
								return {
									...prev,
									[fieldId]: {
										...(existing && typeof existing === "object" ? existing : {}),
										warnings,
									},
								};
							});
						},
						(fieldId, error) => {
							console.error(`Batch sanity check failed for ${fieldId}:`, error);
						}
					);
				}
			}

			prevFormDataRef.current = currentFormData;
		}, DEPENDENCY_DEBOUNCE_MS);

		return () => {
			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current);
			}
		};
	}, [formData, fieldMetadata, isEditing, setFieldMetadata]);

	return { handleBlur };
}
