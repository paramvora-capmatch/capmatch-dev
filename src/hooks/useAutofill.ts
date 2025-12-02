// src/hooks/useAutofill.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useProjects } from "@/hooks/useProjects";

type AutofillContext = "project" | "borrower";

interface AutofillState {
	projectId: string;
	startTime: string; // ISO timestamp
	isProcessing: boolean;
	context: AutofillContext;
}

const AUTOFILL_STATE_KEY_BASE = "capmatch_autofill_state";
const getAutofillStateKey = (context: AutofillContext) =>
	`${AUTOFILL_STATE_KEY_BASE}_${context}`;
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_TIME = 300000; // Max 5 minutes

interface UseAutofillOptions {
	projectAddress?: string;
	context?: AutofillContext;
}

const getResumeTable = (context: AutofillContext) =>
	context === "borrower" ? "borrower_resumes" : "project_resumes";

const documentPathMatchesContext = (
	context: AutofillContext,
	path?: string
) => {
	if (!path) return false;
	const normalized = path.toLowerCase();
	const patterns =
		context === "borrower"
			? ["borrower-docs", "borrower_docs"]
			: ["project-docs", "project_docs"];
	return patterns.some((pattern) => normalized.includes(pattern));
};

const getEndpointPath = (context: AutofillContext) =>
	context === "borrower"
		? "/api/borrower-resume/autofill"
		: "/api/project-resume/autofill";

const getChannelName = (context: AutofillContext, projectId: string) =>
	`autofill-${context}-${projectId}`;

export const useAutofill = (
	projectId: string,
	options?: UseAutofillOptions
) => {
	const [isAutofilling, setIsAutofilling] = useState(false);
	const [showSparkles, setShowSparkles] = useState(false);
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const startTimeRef = useRef<string | null>(null);
	const { loadUserProjects, refreshProject } = useProjects();
	const context: AutofillContext = options?.context ?? "project";
	const resumeTable = getResumeTable(context);
	const storageKey = getAutofillStateKey(context);
	const endpointPath = getEndpointPath(context);

	const clearAutofillState = useCallback(() => {
		localStorage.removeItem(storageKey);
		setIsAutofilling(false);
		setShowSparkles(false);
		startTimeRef.current = null;
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
	}, [storageKey]);

	const checkCompletion = useCallback(
		async (projectId: string, startTime: string): Promise<boolean> => {
			try {
				// Check for both new rows (created) and updated rows (updated_at)
				// This handles cases where mock autofill updates existing rows
				// We check updated_at first since it catches both new and updated rows
				const { data, error } = await supabase
					.from(resumeTable)
					.select("id, created_at, updated_at")
					.eq("project_id", projectId)
					.gte("updated_at", startTime)
					.order("updated_at", { ascending: false })
					.limit(1);

				if (error) {
					console.error("Error checking autofill completion:", error);
					return false;
				}

				// If we found a row updated after start time, processing is complete
				// Note: updated_at will equal created_at for new rows, so this catches both cases
				if (data && data.length > 0) {
					const row = data[0];
					const rowUpdatedTime = new Date(row.updated_at);
					const start = new Date(startTime);

					// Ensure the row was updated after we started (with a small buffer for clock skew)
					if (rowUpdatedTime.getTime() > start.getTime() - 1000) {
						return true;
					}
				}

				return false;
			} catch (error) {
				console.error("Error in checkCompletion:", error);
				return false;
			}
		},
		[resumeTable]
	);

	const startPolling = useCallback(
		(projectId: string, startTime: string) => {
			// Clear any existing interval
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}

			const pollStartTime = Date.now();

			pollIntervalRef.current = setInterval(async () => {
				// Check if we've exceeded max poll time
				const elapsed = Date.now() - pollStartTime;
				if (elapsed > MAX_POLL_TIME) {
					console.warn("Autofill polling timeout");
					clearAutofillState();
					alert(
						"Autofill is taking longer than expected. Please check back later or refresh the page."
					);
					return;
				}

				const isComplete = await checkCompletion(projectId, startTime);

				if (isComplete) {
					clearAutofillState();
					// Refresh project data so completion % and OM readiness update without full reload
					try {
						await refreshProject(projectId);

						// Show notification encouraging field locking for non-deterministic fields
						// This will be handled by the component using this hook
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("autofill-completed", {
									detail: { projectId, context },
								})
							);
						}
					} catch (err) {
						console.error(
							"Failed to refresh projects after autofill completion:",
							err
						);
					}
				}
			}, POLL_INTERVAL);
		},
		[checkCompletion, clearAutofillState, context, refreshProject]
	);

	// Load any in-flight autofill state on mount so the UI can resume
	// a previously started autofill (e.g. user refreshed or navigated).
	// NOTE: We intentionally do NOT subscribe to realtime INSERT events here.
	// Treating any new resume row as an "autofill in progress" was causing
	// false positives when users simply edited/saved the resume.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				const state: AutofillState = JSON.parse(stored);
				// Only restore if it's for this project and not too old
				if (
					state.projectId === projectId &&
					state.isProcessing &&
					state.context === context
				) {
					const startTime = new Date(state.startTime);
					const now = new Date();
					const elapsed = now.getTime() - startTime.getTime();

					if (elapsed < MAX_POLL_TIME) {
						setIsAutofilling(true);
						setShowSparkles(true);
						startTimeRef.current = state.startTime;
						startPolling(projectId, state.startTime);
					} else {
						// Clean up stale state
						localStorage.removeItem(storageKey);
					}
				}
			}
		} catch (error) {
			console.error("Error loading autofill state:", error);
		}
	}, [projectId, startPolling, context, storageKey]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	const handleAutofill = useCallback(async () => {
		setShowSparkles(true);
		setIsAutofilling(true);

		try {
			// 1. Fetch FILE resources associated with this project
			const { data: resources, error: filesError } = await supabase
				.from("resources")
				.select("id, current_version_id")
				.eq("project_id", projectId)
				.eq("resource_type", "FILE");

			if (filesError) throw filesError;

			const documentLabel =
				context === "borrower" ? "borrower documents" : "documents";
			if (!resources || resources.length === 0) {
				alert(
					`No ${documentLabel} found to autofill from. Please upload ${documentLabel} first.`
				);
				setIsAutofilling(false);
				setShowSparkles(false);
				return;
			}

			// 2. Collect the version IDs
			const versionIds = resources
				.map((r) => r.current_version_id)
				.filter(Boolean);

			// 3. Get storage paths from document_versions
			const { data: versions, error: versionsError } = await supabase
				.from("document_versions")
				.select("storage_path")
				.in("id", versionIds);

			if (versionsError) throw versionsError;

			const documentPaths =
				versions
					?.map((v) => v.storage_path)
					.filter((path) =>
						documentPathMatchesContext(context, path)
					) || [];

			if (documentPaths.length === 0) {
				alert(`No ${documentLabel} were matched for autofill.`);
				setIsAutofilling(false);
				setShowSparkles(false);
				return;
			}

			// 4. Format project address
			const projectAddress =
				options?.projectAddress || "2300 Hickory St | Dallas TX, 75215";

			const requestStartTime = new Date().toISOString();
			startTimeRef.current = requestStartTime;

			// Store state in localStorage before making request
			const autofillState: AutofillState = {
				projectId,
				startTime: requestStartTime,
				isProcessing: true,
				context,
			};
			localStorage.setItem(storageKey, JSON.stringify(autofillState));

			// 5. Call Next.js API route (which handles mock/backend logic internally)
			const {
				data: { user },
			} = await supabase.auth.getUser();

			const response = await fetch(endpointPath, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					project_id: projectId,
					project_address: projectAddress,
					document_paths: documentPaths,
					user_id: user?.id || "unknown",
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `Autofill failed: ${response.statusText}`
				);
			}

			// 6. Start polling for completion
			startPolling(projectId, requestStartTime);
		} catch (error) {
			console.error("Autofill error:", error);
			alert("Failed to start autofill process.");
			clearAutofillState();
		}
	}, [
		projectId,
		options?.projectAddress,
		startPolling,
		clearAutofillState,
		context,
		storageKey,
		endpointPath,
	]);

	return {
		isAutofilling,
		showSparkles,
		handleAutofill,
		clearAutofillState,
	};
};
