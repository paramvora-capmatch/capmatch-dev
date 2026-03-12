"use client";

import { useRef, useEffect, useCallback } from "react";
import type { ProjectProfile } from "@/types/enhanced-types";

export interface PersistenceSnapshot {
	formData: ProjectProfile;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
}

export type SaveProjectResumeFn = (
	id: string,
	data: ProjectProfile,
	opts: { createNewVersion?: boolean }
) => Promise<unknown>;

export interface UseProjectResumePersistenceParams {
	projectId: string;
	formData: ProjectProfile;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
	storageKey: string;
	clearDraft: () => void;
	saveProjectResume: SaveProjectResumeFn;
	setFormSaved?: (value: boolean) => void;
}

export interface UseProjectResumePersistenceResult {
	setBaselineSnapshot: (snapshot: PersistenceSnapshot) => void;
	hasUnsavedChanges: () => boolean;
	saveToDatabase: (
		dataToSave: ProjectProfile,
		createNewVersion: boolean
	) => Promise<void>;
}

function lockedToArray(s: Set<string>): string[] {
	return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function snapshotsEqual(
	a: PersistenceSnapshot | null,
	b: { formData: ProjectProfile; fieldMetadata: Record<string, unknown>; lockedFields: Set<string> }
): boolean {
	if (!a) return false;
	try {
		const formEqual =
			JSON.stringify(a.formData) === JSON.stringify(b.formData);
		const metaEqual =
			JSON.stringify(a.fieldMetadata) ===
			JSON.stringify(b.fieldMetadata);
		const locksEqual =
			JSON.stringify(lockedToArray(a.lockedFields)) ===
			JSON.stringify(lockedToArray(b.lockedFields));
		return formEqual && metaEqual && locksEqual;
	} catch {
		return false;
	}
}

/**
 * Handles dirty tracking, explicit save, unmount save, and local-save-started event.
 * Does not perform draft localStorage; use useProjectResumeDraft for that.
 */
export function useProjectResumePersistence({
	projectId,
	formData,
	fieldMetadata,
	lockedFields,
	storageKey,
	clearDraft,
	saveProjectResume,
	setFormSaved,
}: UseProjectResumePersistenceParams): UseProjectResumePersistenceResult {
	const initialSnapshotRef = useRef<PersistenceSnapshot | null>(null);
	const lastSavedSnapshotRef = useRef<PersistenceSnapshot | null>(null);
	const stateRef = useRef({
		formData,
		fieldMetadata,
		lockedFields,
	});
	const isSavingRef = useRef(false);

	useEffect(() => {
		stateRef.current = { formData, fieldMetadata, lockedFields };
	}, [formData, fieldMetadata, lockedFields]);

	const setBaselineSnapshot = useCallback((snapshot: PersistenceSnapshot) => {
		initialSnapshotRef.current = snapshot;
		lastSavedSnapshotRef.current = snapshot;
	}, []);

	const hasUnsavedChanges = useCallback((): boolean => {
		const baseline =
			lastSavedSnapshotRef.current ?? initialSnapshotRef.current;
		if (!baseline) return true;
		const current = stateRef.current;
		if (snapshotsEqual(baseline, current)) return false;
		return true;
	}, []);

	const saveToDatabase = useCallback(
		async (finalData: ProjectProfile, createNewVersion: boolean) => {
			if (!hasUnsavedChanges()) {
				clearDraft();
				return;
			}

			setFormSaved?.(true);
			isSavingRef.current = true;

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: { projectId: finalData.id, context: "project" },
					})
				);
			}

			try {
				await saveProjectResume(finalData.id, finalData, {
					createNewVersion,
				});

				const snapshotLocked = new Set(
					Object.keys(finalData._lockedFields || {}).filter(
						(k) => (finalData as any)._lockedFields?.[k]
					)
				);
				const snapshot: PersistenceSnapshot = {
					formData: finalData,
					fieldMetadata: (finalData as any)._metadata || {},
					lockedFields: snapshotLocked,
				};
				lastSavedSnapshotRef.current = snapshot;
				stateRef.current = {
					formData: finalData,
					fieldMetadata: snapshot.fieldMetadata,
					lockedFields: snapshotLocked,
				};
				clearDraft();
			} catch (err) {
				console.error("[EnhancedProjectForm] Save failed:", err);
			} finally {
				isSavingRef.current = false;
				setTimeout(() => setFormSaved?.(false), 1500);
			}
		},
		[hasUnsavedChanges, clearDraft, saveProjectResume, setFormSaved]
	);

	// Save on unmount when dirty
	useEffect(() => {
		return () => {
			if (isSavingRef.current) return;
			if (!hasUnsavedChanges()) return;

			const current = stateRef.current;
			const lockedFieldsObj: Record<string, boolean> = {};
			current.lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...current.formData,
				_metadata: current.fieldMetadata as any,
				_lockedFields: lockedFieldsObj,
			};

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: { projectId: dataToSave.id, context: "project" },
					})
				);
			}

			void saveProjectResume(dataToSave.id, dataToSave, {
				createNewVersion: true,
			})
				.then(() => {
					lastSavedSnapshotRef.current = {
						formData: dataToSave,
						fieldMetadata: current.fieldMetadata,
						lockedFields: current.lockedFields,
					};
					clearDraft();
				})
				.catch((err) =>
					console.error(
						"[EnhancedProjectForm] Unmount save failed",
						err
					)
				);
		};
	}, [hasUnsavedChanges, storageKey, clearDraft, saveProjectResume]);

	// Warn on tab close / refresh when dirty
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges()) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () =>
			window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	return {
		setBaselineSnapshot,
		hasUnsavedChanges,
		saveToDatabase,
	};
}
