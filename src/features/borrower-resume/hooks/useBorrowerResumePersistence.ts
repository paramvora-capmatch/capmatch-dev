"use client";

import { useRef, useEffect, useCallback } from "react";
import type { BorrowerResumeContent } from "@/lib/project-queries";
import { computeBorrowerCompletion } from "@/utils/resumeCompletion";

export interface BorrowerPersistenceSnapshot {
	formData: Partial<BorrowerResumeContent>;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
}

export type SaveBorrowerResumeFn = (
	updates: Partial<BorrowerResumeContent>,
	lockedFields?: Record<string, boolean>,
	lockedSections?: Record<string, boolean>,
	createNewVersion?: boolean
) => Promise<unknown>;

export interface UseBorrowerResumePersistenceParams {
	projectId: string;
	formData: Partial<BorrowerResumeContent>;
	fieldMetadata: Record<string, unknown>;
	lockedFields: Set<string>;
	storageKey: string;
	clearDraft: () => void;
	saveBorrowerResume: SaveBorrowerResumeFn;
	setFormSaved?: (value: boolean) => void;
	reloadBorrowerResume: () => Promise<void>;
}

export interface UseBorrowerResumePersistenceResult {
	setBaselineSnapshot: (snapshot: BorrowerPersistenceSnapshot) => void;
	hasUnsavedChanges: () => boolean;
	saveToDatabase: (
		dataToSave: Partial<BorrowerResumeContent>,
		createNewVersion: boolean
	) => Promise<void>;
	stateRef: React.MutableRefObject<{
		formData: Partial<BorrowerResumeContent>;
		fieldMetadata: Record<string, unknown>;
		lockedFields: Set<string>;
	}>;
}

function lockedToArray(s: Set<string>): string[] {
	return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/** Stable stringify so key order and undefined handling don't cause false dirty. */
function stableStringify(obj: unknown): string {
	if (obj === null || typeof obj !== "object") {
		return JSON.stringify(obj);
	}
	if (Array.isArray(obj)) {
		return "[" + obj.map((item) => stableStringify(item)).join(",") + "]";
	}
	const keys = Object.keys(obj as Record<string, unknown>).sort();
	const pairs = keys.map(
		(k) =>
			JSON.stringify(k) +
			":" +
			stableStringify((obj as Record<string, unknown>)[k])
	);
	return "{" + pairs.join(",") + "}";
}

function snapshotsEqual(
	a: BorrowerPersistenceSnapshot | null,
	b: {
		formData: Partial<BorrowerResumeContent>;
		fieldMetadata: Record<string, unknown>;
		lockedFields: Set<string>;
	}
): boolean {
	if (!a) return false;
	try {
		const formEqual =
			stableStringify(a.formData) === stableStringify(b.formData);
		const metaEqual =
			stableStringify(a.fieldMetadata) ===
			stableStringify(b.fieldMetadata);
		const locksEqual =
			JSON.stringify(lockedToArray(a.lockedFields)) ===
			JSON.stringify(lockedToArray(b.lockedFields));
		return formEqual && metaEqual && locksEqual;
	} catch {
		return false;
	}
}

/**
 * Handles dirty tracking and save to database for borrower resume.
 * Does not perform draft localStorage; use useBorrowerResumeDraft for that.
 */
export function useBorrowerResumePersistence({
	projectId,
	formData,
	fieldMetadata,
	lockedFields,
	storageKey,
	clearDraft,
	saveBorrowerResume,
	setFormSaved,
	reloadBorrowerResume,
}: UseBorrowerResumePersistenceParams): UseBorrowerResumePersistenceResult {
	const initialSnapshotRef = useRef<BorrowerPersistenceSnapshot | null>(null);
	const lastSavedSnapshotRef = useRef<BorrowerPersistenceSnapshot | null>(null);
	const stateRef = useRef({
		formData,
		fieldMetadata,
		lockedFields,
	});
	const isSavingRef = useRef(false);

	useEffect(() => {
		stateRef.current = { formData, fieldMetadata, lockedFields };
	}, [formData, fieldMetadata, lockedFields]);

	const setBaselineSnapshot = useCallback(
		(snapshot: BorrowerPersistenceSnapshot) => {
			initialSnapshotRef.current = snapshot;
			lastSavedSnapshotRef.current = snapshot;
			// Sync stateRef immediately so hasUnsavedChanges() is false on the same render
			stateRef.current = {
				formData: snapshot.formData,
				fieldMetadata: snapshot.fieldMetadata,
				lockedFields: snapshot.lockedFields,
			};
		},
		[]
	);

	const hasUnsavedChanges = useCallback((): boolean => {
		const baseline =
			lastSavedSnapshotRef.current ?? initialSnapshotRef.current;
		// No baseline yet = still loading or not initialized; don't treat as dirty
		if (!baseline) return false;
		const current = stateRef.current;
		if (snapshotsEqual(baseline, current)) return false;
		return true;
	}, []);

	const saveToDatabase = useCallback(
		async (
			finalData: Partial<BorrowerResumeContent>,
			createNewVersion: boolean
		) => {
			if (!hasUnsavedChanges()) {
				clearDraft();
				return;
			}

			const dataToProcess =
				Object.keys(finalData).length > 3
					? finalData
					: stateRef.current.formData;

			setFormSaved?.(true);
			isSavingRef.current = true;

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: { projectId, context: "borrower" },
					})
				);
			}

			try {
				const lockedFieldsObj: Record<string, boolean> = {};
				stateRef.current.lockedFields.forEach(
					(id) => (lockedFieldsObj[id] = true)
				);

				const completenessPercent = computeBorrowerCompletion(
					dataToProcess,
					lockedFieldsObj
				);

				const dataToSave = {
					...dataToProcess,
					_metadata: stateRef.current.fieldMetadata,
					_lockedFields: lockedFieldsObj,
					completenessPercent,
				};

				await saveBorrowerResume(
					dataToSave as Parameters<SaveBorrowerResumeFn>[0],
					lockedFieldsObj,
					undefined,
					createNewVersion
				);

				await reloadBorrowerResume();

				const snapshot: BorrowerPersistenceSnapshot = {
					formData: dataToSave as Partial<BorrowerResumeContent>,
					fieldMetadata: stateRef.current.fieldMetadata,
					lockedFields: stateRef.current.lockedFields,
				};
				lastSavedSnapshotRef.current = snapshot;
				stateRef.current = {
					formData: dataToSave as Partial<BorrowerResumeContent>,
					fieldMetadata: stateRef.current.fieldMetadata,
					lockedFields: stateRef.current.lockedFields,
				};
				clearDraft();
			} catch (err) {
				console.error("[BorrowerResumeForm] Save failed:", err);
			} finally {
				isSavingRef.current = false;
				setTimeout(() => setFormSaved?.(false), 1500);
			}
		},
		[
			hasUnsavedChanges,
			clearDraft,
			saveBorrowerResume,
			projectId,
			setFormSaved,
			reloadBorrowerResume,
		]
	);

	// Warn on tab close when dirty
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
		stateRef,
	};
}
