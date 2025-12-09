import { useCallback, useEffect, useState, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
	BorrowerResumeContent,
	saveProjectBorrowerResume,
	getProjectBorrowerResume,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

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

/**
 * Fetches the *current* borrower resume content.
 * Uses the centralized getProjectBorrowerResume function from project-queries.ts
 */
const getProjectBorrowerResumeContent = async (
	projectId: string
): Promise<BorrowerResumeContent | null> => {
	return await getProjectBorrowerResume(projectId);
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
	const lastContentHashRef = useRef<string | null>(null);

	// Helper to update content only if it has actually changed
	const updateContentIfChanged = useCallback(
		(newContent: BorrowerResumeContent | null) => {
			const newHash = newContent ? JSON.stringify(newContent) : null;
			if (lastContentHashRef.current !== newHash) {
				lastContentHashRef.current = newHash;
				setContent(newContent);
			}
		},
		[]
	);

	const load = useCallback(async () => {
		if (!projectId) {
			updateContentIfChanged(null);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			const result = await getProjectBorrowerResumeContent(projectId);
			updateContentIfChanged(result);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load borrower resume"
			);
		} finally {
			setIsLoading(false);
		}
	}, [projectId, updateContentIfChanged]);

	// Listen for autofill state changes and local save events
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleAutofillStart = (e: any) => {
			// Only track autofill for this project
			if (
				e.detail?.projectId === projectId &&
				e.detail?.context === "borrower"
			) {
				isAutofillRunningRef.current = true;
			}
		};

		const handleAutofillComplete = (e: any) => {
			console.log(
				`[useProjectBorrowerResumeRealtime] 📢 autofill-completed event received:`,
				{
					eventProjectId: e.detail?.projectId,
					eventContext: e.detail?.context,
					currentProjectId: projectId,
					matches:
						e.detail?.projectId === projectId &&
						e.detail?.context === "borrower",
				}
			);

			// Only track autofill for this project
			if (
				e.detail?.projectId === projectId &&
				e.detail?.context === "borrower" &&
				projectId
			) {
				console.log(
					`[useProjectBorrowerResumeRealtime] ✅ Handling autofill completion for borrower resume, projectId: ${projectId}`
				);
				// Reset flag immediately
				isAutofillRunningRef.current = false;
				// Reload content with retry logic to handle race conditions
				const retryLoad = async (attempt = 1, maxAttempts = 5) => {
					console.log(
						`[useProjectBorrowerResumeRealtime] 🔄 Reloading borrower resume content (attempt ${attempt}/${maxAttempts})`
					);
					try {
						const result = await getProjectBorrowerResumeContent(
							projectId
						);
						console.log(
							`[useProjectBorrowerResumeRealtime] 📥 Borrower resume content loaded:`,
							{
								hasContent: !!result,
								contentKeys: result
									? Object.keys(result).slice(0, 10)
									: [],
								attempt,
							}
						);
						if (result || attempt >= maxAttempts) {
							updateContentIfChanged(result);
							console.log(
								`[useProjectBorrowerResumeRealtime] ✅ Content updated (attempt ${attempt})`
							);
						} else {
							// Retry after a delay if content is null
							console.log(
								`[useProjectBorrowerResumeRealtime] ⏳ Content is null, retrying in ${
									1000 * attempt
								}ms...`
							);
							setTimeout(
								() => retryLoad(attempt + 1, maxAttempts),
								1000 * attempt
							);
						}
					} catch (err) {
						console.error(
							`[useProjectBorrowerResumeRealtime] ❌ Failed to reload after autofill (attempt ${attempt}):`,
							err
						);
						if (attempt < maxAttempts) {
							setTimeout(
								() => retryLoad(attempt + 1, maxAttempts),
								1000 * attempt
							);
						}
					}
				};
				retryLoad();
			} else {
				console.log(
					`[useProjectBorrowerResumeRealtime] ⏭️ Skipping autofill completion handler - event doesn't match this project/context`
				);
			}
		};

		const handleLocalSaveStart = (e: any) => {
			// Only track local saves for this project
			if (
				e.detail?.projectId === projectId &&
				e.detail?.context === "borrower"
			) {
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
			window.removeEventListener(
				"autofill-completed",
				handleAutofillComplete
			);
			window.removeEventListener(
				"local-save-started",
				handleLocalSaveStart
			);
		};
	}, [projectId, load, updateContentIfChanged]);

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
							updateContentIfChanged(latest);

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
							updateContentIfChanged(latest);
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
					if (
						isLocalSaveRef.current ||
						isAutofillRunningRef.current
					) {
						return;
					}

					// Reload when resource pointer changes (e.g., after autofill creates new version)
					try {
						const latest = await getProjectBorrowerResumeContent(
							projectId
						);
						if (latest) {
							updateContentIfChanged(latest);
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
	}, [projectId, user?.id, updateContentIfChanged]);

	// Initial load
	useEffect(() => {
		void load();
	}, [load]);

	const save = useCallback(
		async (
			updates: Partial<BorrowerResumeContent>,
			lockedFieldsToSave?: Record<string, boolean>,
			lockedSectionsToSave?: Record<string, boolean>,
			createNewVersion: boolean = true
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
				updateContentIfChanged(reloaded);
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
		[projectId, updateContentIfChanged]
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
