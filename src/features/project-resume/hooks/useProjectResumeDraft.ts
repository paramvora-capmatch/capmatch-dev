"use client";

import { useEffect, useMemo } from "react";
import type { ProjectProfile } from "@/types/enhanced-types";

const DRAFT_STORAGE_PREFIX = "capmatch_resume_draft_";
const DEBOUNCE_MS = 1000;

export interface DraftSnapshot {
	formData: ProjectProfile;
	fieldMetadata: Record<string, unknown>;
	lockedFields: string[];
	updatedAt: number;
}

export interface UseProjectResumeDraftParams {
	projectId: string;
	formData: ProjectProfile;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
	setFormData: React.Dispatch<React.SetStateAction<ProjectProfile>>;
	setFieldMetadata: React.Dispatch<
		React.SetStateAction<Record<string, unknown>>
	>;
	setLockedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	setLastSavedAt: (value: number | null) => void;
	setIsRestoring: (value: boolean) => void;
	isRestoring: boolean;
}

export interface UseProjectResumeDraftResult {
	storageKey: string;
	clearDraft: () => void;
}

/**
 * Handles localStorage restore on mount and debounced draft save.
 * Does not perform DB save; that is handled by useProjectResumePersistence.
 */
export function useProjectResumeDraft({
	projectId,
	formData,
	fieldMetadata,
	lockedFields,
	setFormData,
	setFieldMetadata,
	setLockedFields,
	setLastSavedAt,
	setIsRestoring,
	isRestoring,
}: UseProjectResumeDraftParams): UseProjectResumeDraftResult {
	const storageKey = useMemo(
		() => `${DRAFT_STORAGE_PREFIX}${projectId}`,
		[projectId]
	);

	// Restore from localStorage on mount (once per projectId)
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (!saved) return;
			const draft = JSON.parse(saved) as { projectId: string } & DraftSnapshot;
			if (draft.projectId !== projectId) return;

			console.log("[EnhancedProjectForm] Restoring draft from local storage");
			setIsRestoring(true);
			setFormData(draft.formData);
			setFieldMetadata(draft.fieldMetadata || {});
			if (draft.lockedFields?.length) {
				setLockedFields(new Set(draft.lockedFields));
			}
			setLastSavedAt(draft.updatedAt);
			setTimeout(() => setIsRestoring(false), 100);
		} catch (err) {
			console.warn("[EnhancedProjectForm] Failed to restore draft:", err);
		}
		// Intentionally only on mount / projectId change; do not depend on setters
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId, storageKey]);

	// Debounced save to localStorage
	useEffect(() => {
		if (isRestoring) return;
		const timer = setTimeout(() => {
			if (typeof window === "undefined") return;
			try {
				const draft: { projectId: string } & DraftSnapshot = {
					projectId,
					formData,
					fieldMetadata,
					lockedFields: Array.from(lockedFields),
					updatedAt: Date.now(),
				};
				localStorage.setItem(storageKey, JSON.stringify(draft));
				setLastSavedAt(Date.now());
			} catch (err) {
				console.warn("[EnhancedProjectForm] Failed to save draft:", err);
			}
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		projectId,
		storageKey,
		isRestoring,
		setLastSavedAt,
	]);

	const clearDraft = useMemo(
		() => () => {
			if (typeof window === "undefined") return;
			localStorage.removeItem(storageKey);
			setLastSavedAt(null);
		},
		[storageKey, setLastSavedAt]
	);

	return { storageKey, clearDraft };
}
