"use client";

import { useState, useEffect, useCallback } from "react";
import type { BorrowerResumeContent } from "@/lib/project-queries";

export interface BorrowerDraftPayload {
	projectId: string;
	formData: Partial<BorrowerResumeContent>;
	fieldMetadata: Record<string, unknown>;
	lockedFields: string[];
	updatedAt: number;
}

export interface UseBorrowerResumeDraftParams {
	projectId: string;
	storageKey: string;
	formData: Partial<BorrowerResumeContent>;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
	setFormData: React.Dispatch<React.SetStateAction<Partial<BorrowerResumeContent>>>;
	setFieldMetadata: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	setLockedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	setLastSavedAt: (value: number | null) => void;
}

export interface UseBorrowerResumeDraftResult {
	isRestoring: boolean;
}

const RESTORE_LOG = "[BorrowerResumeForm] Restoring draft from local storage";
const DRAFT_DEBOUNCE_MS = 1000;

/**
 * Handles localStorage restore on mount and debounced draft save.
 * Use with useBorrowerResumePersistence for baseline/save; this hook only does draft I/O.
 */
export function useBorrowerResumeDraft({
	projectId,
	storageKey,
	formData,
	fieldMetadata,
	lockedFields,
	setFormData,
	setFieldMetadata,
	setLockedFields,
	setLastSavedAt,
}: UseBorrowerResumeDraftParams): UseBorrowerResumeDraftResult {
	const [isRestoring, setIsRestoring] = useState(false);

	// Restore from localStorage when project/storageKey change
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (!saved) return;
			const draft: BorrowerDraftPayload = JSON.parse(saved);
			if (draft.projectId !== projectId) return;
			console.log(RESTORE_LOG);
			setIsRestoring(true);
			setFormData(draft.formData ?? {});
			setFieldMetadata(draft.fieldMetadata ?? {});
			if (Array.isArray(draft.lockedFields)) {
				setLockedFields(new Set(draft.lockedFields));
			}
			setLastSavedAt(draft.updatedAt ?? Date.now());
			const t = setTimeout(() => setIsRestoring(false), 100);
			return () => clearTimeout(t);
		} catch (err) {
			console.warn("[BorrowerResumeForm] Failed to restore draft:", err);
		}
	}, [projectId, storageKey, setFormData, setFieldMetadata, setLockedFields, setLastSavedAt]);

	// Debounced save to localStorage
	useEffect(() => {
		if (isRestoring) return;
		const handler = setTimeout(() => {
			if (typeof window === "undefined") return;
			try {
				const draft: BorrowerDraftPayload = {
					projectId,
					formData,
					fieldMetadata,
					lockedFields: Array.from(lockedFields),
					updatedAt: Date.now(),
				};
				localStorage.setItem(storageKey, JSON.stringify(draft));
				setLastSavedAt(draft.updatedAt);
			} catch (err) {
				console.warn("[BorrowerResumeForm] Failed to save draft:", err);
			}
		}, DRAFT_DEBOUNCE_MS);
		return () => clearTimeout(handler);
	}, [
		isRestoring,
		projectId,
		storageKey,
		formData,
		fieldMetadata,
		lockedFields,
		setLastSavedAt,
	]);

	return { isRestoring };
}
