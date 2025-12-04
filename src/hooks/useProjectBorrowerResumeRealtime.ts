import { useCallback, useEffect, useState, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
	BorrowerResumeContent,
	saveProjectBorrowerResume,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { ungroupFromSections, isGroupedFormat } from "@/lib/section-grouping";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";

interface UseProjectBorrowerResumeRealtimeResult {
	content: BorrowerResumeContent | null;
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	setLocalContent: (content: BorrowerResumeContent | null) => void;
	reload: () => Promise<void>;
	save: (
		updates: Partial<BorrowerResumeContent>,
		lockedFields?: Record<string, boolean>,
		lockedSections?: Record<string, boolean>,
		createNewVersion?: boolean
	) => Promise<void>;
	isRemoteUpdate: boolean;
}

// Known boolean-only borrower fields
const BOOLEAN_BORROWER_FIELDS: Record<string, true> = {
	bankruptcyHistory: true,
	foreclosureHistory: true,
	litigationHistory: true,
};

// Field ids from the borrower form schema – used to validate content
const BORROWER_FIELD_IDS: string[] = Object.keys(
	((borrowerFormSchema as any).fields || {}) as Record<string, unknown>
);

/**
 * Heuristic to detect a "corrupted" borrower resume row where the core
 * borrower fields have been replaced by bare booleans (e.g. mirrors of
 * _lockedFields), which should not be treated as the active resume.
 */
const isCorruptedBooleanSnapshot = (content: any): boolean => {
	if (!content || typeof content !== "object") return false;

	// Strip metadata/root keys and flatten sections if needed
	const raw = { ...content };
	delete raw._lockedFields;
	delete raw._fieldStates;
	delete raw._metadata;
	delete raw.completenessPercent;

	let flat: Record<string, any>;
	if (isGroupedFormat(raw)) {
		const {
			_lockedFields,
			_fieldStates,
			_metadata,
			completenessPercent,
			...sections
		} = raw;
		flat = ungroupFromSections(sections);
	} else {
		flat = raw;
	}

	// If at least one known borrower field has a non-boolean value (or a rich
	// { value: ... } object with a non-boolean value), we consider the snapshot valid.
	let hasNonBooleanForKnownField = false;

	for (const fieldId of BORROWER_FIELD_IDS) {
		const v = flat[fieldId];
		if (v === undefined) continue;

		// Rich format { value, ... }
		if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) {
			const innerValue = (v as any).value;

			// Treat rich-format booleans for non-boolean fields as suspicious
			if (
				typeof innerValue === "boolean" &&
				!BOOLEAN_BORROWER_FIELDS[fieldId]
			) {
				continue;
			}

			// Otherwise, this looks like a real value
			hasNonBooleanForKnownField = true;
			break;
		}

		// Primitive non-boolean value
		if (typeof v !== "boolean") {
			hasNonBooleanForKnownField = true;
			break;
		}

		// Boolean is fine only for the explicit boolean borrower fields
		if (typeof v === "boolean" && BOOLEAN_BORROWER_FIELDS[fieldId]) {
			hasNonBooleanForKnownField = true;
			break;
		}
	}

	// If *none* of the known fields have a proper value, treat as corrupted.
	return !hasNonBooleanForKnownField;
};

/**
 * Fetches the *current* borrower resume content.
 *
 * Behavior:
 *  - Ignores obviously corrupted "boolean-only" snapshots where core borrower
 *    fields have been replaced by bare booleans.
 *  - Picks the most recent *valid* row for the project.
 */
const getProjectBorrowerResumeContent = async (
	projectId: string
): Promise<BorrowerResumeContent | null> => {
	// Fetch the latest few rows and pick the first valid one.
	const { data, error } = await supabase
		.from("borrower_resumes")
		.select("id, content, created_at")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false })
		.limit(5);

	if (error && error.code !== "PGRST116") {
		throw new Error(
			`[useProjectBorrowerResumeRealtime] Failed to load borrower resume: ${error.message}`
		);
	}

	if (!data || data.length === 0) return null;

	// Find the first non-corrupted snapshot
	const chosen = data.find((row) => !isCorruptedBooleanSnapshot(row.content));
	const contentRaw = (chosen ?? data[0]).content as any;

	if (!contentRaw) return null;

	// Preserve locked fields and field states before processing
	const _lockedFields =
		(contentRaw._lockedFields as Record<string, boolean> | undefined) || {};
	const _fieldStates = (contentRaw._fieldStates as any) || {};

	// Make a copy and remove metadata fields for processing
	let working = { ...contentRaw };
	delete working._lockedFields;
	delete working._fieldStates;
	delete working._metadata;
	delete working.completenessPercent;

	// Convert section-wise format to flat format for form/view consumption
	if (isGroupedFormat(working)) {
		working = ungroupFromSections(working);
	}

	// Extract metadata from rich format fields and create _metadata object
	const flatContent: any = {};
	const metadata: Record<string, any> = {};

	// Process all fields
	for (const [key, value] of Object.entries(working)) {
		// Skip if already processed
		if (key.startsWith("_")) {
			continue;
		}

		// Handle principals specially - it can be an array or in rich format
		if (key === "principals") {
			// Check if it's in rich format
			if (
				value &&
				typeof value === "object" &&
				!Array.isArray(value) &&
				"value" in value
			) {
				// Extract the array from rich format
				const principalsValue = (value as any).value;
				flatContent[key] = Array.isArray(principalsValue)
					? principalsValue
					: [];

				// Store metadata (new schema: value + source + warnings + other_values)
				const anyVal: any = value;
				let primarySource = anyVal.source;
				if (!primarySource && Array.isArray(anyVal.sources) && anyVal.sources.length > 0) {
					primarySource = anyVal.sources[0];
				}

				metadata[key] = {
					value: principalsValue,
					source: primarySource ?? null,
					warnings: anyVal.warnings || [],
					other_values: anyVal.other_values || [],
				};
			} else {
				// It's already an array or null/undefined
				flatContent[key] = Array.isArray(value) ? value : [];
			}
			continue;
		}

		// Check if value is in rich format { value, source, warnings, other_values }
		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			"value" in value
		) {
			const anyVal: any = value;

			// Extract the actual value
			flatContent[key] = anyVal.value;

			// Determine primary source (new schema prefers `source`, but we keep
			// backward compat for legacy `sources` arrays).
			let primarySource = anyVal.source;
			if (!primarySource && Array.isArray(anyVal.sources) && anyVal.sources.length > 0) {
				primarySource = anyVal.sources[0];
			}

			// Store metadata aligned with new FieldMetadata type
			metadata[key] = {
				value: anyVal.value,
				source: primarySource ?? null,
				warnings: anyVal.warnings || [],
				other_values: anyVal.other_values || [],
			};
		} else {
			// Flat value - preserve as-is
			flatContent[key] = value;
		}
	}

	// Add metadata if we have any
	if (Object.keys(metadata).length > 0) {
		flatContent._metadata = metadata;
	}

	// Restore locked fields and other metadata from original content
	flatContent._lockedFields = _lockedFields;
	flatContent._fieldStates = _fieldStates;

	// Restore completenessPercent from original content
	if (
		contentRaw &&
		typeof (contentRaw as any).completenessPercent === "number"
	) {
		flatContent.completenessPercent = (
			contentRaw as any
		).completenessPercent;
	}

	// Final pass: ensure any remaining rich objects are unwrapped to their `.value`
	// property for UI consumption, while preserving metadata containers and section data.
	const unwrappedContent: any = {};
	for (const [key, val] of Object.entries(flatContent)) {
		if (
			val &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			"value" in val &&
			key !== "_metadata" &&
			key !== "_lockedFields" &&
			key !== "_fieldStates" &&
			key !== "borrowerSections" &&
			key !== "projectSections"
		) {
			unwrappedContent[key] = (val as any).value;
		} else {
			unwrappedContent[key] = val;
		}
	}

	return unwrappedContent as BorrowerResumeContent;
};

export const useProjectBorrowerResumeRealtime = (
	projectId: string | null
): UseProjectBorrowerResumeRealtimeResult => {
	const { user } = useAuth();
	const [content, setContent] = useState<BorrowerResumeContent | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

	const channelRef = useRef<RealtimeChannel | null>(null);
	const isLocalSaveRef = useRef(false);
	const remoteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isAutofillRunningRef = useRef(false);

	const load = useCallback(async () => {
		if (!projectId) {
			setContent(null);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			const result = await getProjectBorrowerResumeContent(projectId);
			setContent(result);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load borrower resume"
			);
		} finally {
			setIsLoading(false);
		}
	}, [projectId]);

	// Listen for autofill state changes and local save events
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleAutofillStart = (e: any) => {
			// Only track autofill for this project
			if (e.detail?.projectId === projectId && e.detail?.context === "borrower") {
				isAutofillRunningRef.current = true;
			}
		};

		const handleAutofillComplete = (e: any) => {
			// Only track autofill for this project
			if (e.detail?.projectId === projectId && e.detail?.context === "borrower") {
				// Keep flag true for a bit longer to catch any delayed database updates
				setTimeout(() => {
					isAutofillRunningRef.current = false;
				}, 5000);
			}
		};

		const handleLocalSaveStart = (e: any) => {
			// Only track local saves for this project
			if (e.detail?.projectId === projectId && e.detail?.context === "borrower") {
				isLocalSaveRef.current = true;
				// Clear any pending timeout
				if (localSaveTimeoutRef.current) {
					clearTimeout(localSaveTimeoutRef.current);
				}
				// Reset flag after a delay to catch any delayed events
				localSaveTimeoutRef.current = setTimeout(() => {
					isLocalSaveRef.current = false;
				}, 3000);
			}
		};

		window.addEventListener("autofill-started", handleAutofillStart);
		window.addEventListener("autofill-completed", handleAutofillComplete);
		window.addEventListener("local-save-started", handleLocalSaveStart);

		return () => {
			window.removeEventListener("autofill-started", handleAutofillStart);
			window.removeEventListener("autofill-completed", handleAutofillComplete);
			window.removeEventListener("local-save-started", handleLocalSaveStart);
		};
	}, [projectId]);

	// Subscribe to realtime changes
	useEffect(() => {
		if (!projectId || !user?.id) return;

		const channel = supabase
			.channel(`borrower-resume-${projectId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "borrower_resumes",
					filter: `project_id=eq.${projectId}`,
				},
				async (payload) => {
					// Ignore our own updates
					if (isLocalSaveRef.current) {
						// Clear any pending timeout
						if (localSaveTimeoutRef.current) {
							clearTimeout(localSaveTimeoutRef.current);
						}
						// Reset flag after a delay to catch any delayed events
						localSaveTimeoutRef.current = setTimeout(() => {
							isLocalSaveRef.current = false;
						}, 3000);
						return;
					}

					// Ignore updates during autofill (triggered by current user)
					if (isAutofillRunningRef.current) {
						return;
					}

					setIsRemoteUpdate(true);

					// Clear any existing timeout
					if (remoteUpdateTimeoutRef.current) {
						clearTimeout(remoteUpdateTimeoutRef.current);
					}

					// Fetch the latest content from server
					try {
						const latest = await getProjectBorrowerResumeContent(
							projectId
						);
						if (latest) {
							setContent(latest);

							// Reset remote update flag after 3 seconds
							remoteUpdateTimeoutRef.current = setTimeout(() => {
								setIsRemoteUpdate(false);
							}, 3000);
						}
					} catch (err) {
						console.error(
							"[useProjectBorrowerResumeRealtime] Failed to reload after remote update:",
							err
						);
						setIsRemoteUpdate(false);
					}
				}
			)
			// Also listen for INSERTs (new versions created)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "borrower_resumes",
					filter: `project_id=eq.${projectId}`,
				},
				async (payload) => {
					if (isLocalSaveRef.current) {
						// Clear any pending timeout
						if (localSaveTimeoutRef.current) {
							clearTimeout(localSaveTimeoutRef.current);
						}
						// Reset flag after a delay to catch any delayed events
						localSaveTimeoutRef.current = setTimeout(() => {
							isLocalSaveRef.current = false;
						}, 3000);
						return;
					}

					// Ignore inserts during autofill (triggered by current user)
					if (isAutofillRunningRef.current) {
						return;
					}

					setIsRemoteUpdate(true);
					// Add a small delay to ensure resource pointer is updated
					await new Promise((resolve) => setTimeout(resolve, 500));
					try {
						const latest = await getProjectBorrowerResumeContent(
							projectId
						);
						if (latest) {
							setContent(latest);
							if (remoteUpdateTimeoutRef.current)
								clearTimeout(remoteUpdateTimeoutRef.current);
							remoteUpdateTimeoutRef.current = setTimeout(() => {
								setIsRemoteUpdate(false);
							}, 3000);
						}
					} catch (err) {
						console.error("Failed to reload after insert", err);
						setIsRemoteUpdate(false);
					}
				}
			)
			// Also listen for resource pointer updates
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "resources",
					filter: `project_id=eq.${projectId},resource_type=eq.BORROWER_RESUME`,
				},
				async (payload) => {
					// Ignore resource updates during autofill or local saves
					if (isLocalSaveRef.current || isAutofillRunningRef.current) {
						return;
					}

					// Reload when resource pointer changes (e.g., after autofill creates new version)
					try {
						const latest = await getProjectBorrowerResumeContent(
							projectId
						);
						if (latest) {
							setContent(latest);
						}
					} catch (err) {
						console.error(
							"Failed to reload after resource update",
							err
						);
					}
				}
			)
			.subscribe();

		channelRef.current = channel;

		return () => {
			if (remoteUpdateTimeoutRef.current) {
				clearTimeout(remoteUpdateTimeoutRef.current);
			}
			if (localSaveTimeoutRef.current) {
				clearTimeout(localSaveTimeoutRef.current);
			}
			channelRef.current?.unsubscribe();
			channelRef.current = null;
		};
	}, [projectId, user?.id]);

	// Initial load
	useEffect(() => {
		void load();
	}, [load]);

	const save = useCallback(
		async (
			updates: Partial<BorrowerResumeContent>,
			lockedFieldsToSave?: Record<string, boolean>,
			lockedSectionsToSave?: Record<string, boolean>,
			createNewVersion: boolean = false
		) => {
			if (!projectId) {
				throw new Error(
					"Project ID is required to save borrower resume"
				);
			}

			setIsSaving(true);
			setError(null);
			isLocalSaveRef.current = true;

			try {
				// Fetch latest before merging to avoid conflicts (optional but safer)
				const latest = await getProjectBorrowerResumeContent(projectId);
				const mergedContent = { ...(latest || {}), ...updates } as any;

				// Pass options to save function
				const options = {
					lockedFields: lockedFieldsToSave,
					lockedSections: lockedSectionsToSave,
					createNewVersion,
				};

				await saveProjectBorrowerResume(
					projectId,
					mergedContent,
					options
				);

				// Reload to get the properly formatted content back
				const reloaded = await getProjectBorrowerResumeContent(
					projectId
				);
				setContent(reloaded);
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Failed to save borrower resume";
				setError(message);
				throw err;
			} finally {
				setIsSaving(false);
				// Reset flag after a delay to allow realtime event to process
				// Clear any pending timeout first
				if (localSaveTimeoutRef.current) {
					clearTimeout(localSaveTimeoutRef.current);
				}
				localSaveTimeoutRef.current = setTimeout(() => {
					isLocalSaveRef.current = false;
				}, 3000);
			}
		},
		[projectId]
	);

	return {
		content,
		isLoading,
		isSaving,
		error,
		setLocalContent: setContent,
		reload: load,
		save,
		isRemoteUpdate,
	};
};
