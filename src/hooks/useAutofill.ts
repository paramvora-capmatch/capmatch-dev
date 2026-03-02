// src/hooks/useAutofill.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { getBackendUrl } from "@/lib/apiConfig";
import { useProjects } from "@/hooks/useProjects";
import type { RealtimeChannel } from "@supabase/supabase-js";

type AutofillContext = "project" | "borrower";

const MAX_JOB_WAIT_MS = 300000; // 5 minutes - safety timeout if realtime never delivers

interface UseAutofillOptions {
	projectAddress?: string;
	context?: AutofillContext;
}

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
		? `${getBackendUrl()}/api/v1/borrower-resume/autofill`
		: `${getBackendUrl()}/api/v1/project-resume/autofill`;

/** Realtime payload.new row shape for jobs table */
interface JobRow {
	id: string;
	status: string;
	error_message?: string | null;
	metadata?: Record<string, unknown> | null;
}

export interface AutofillErrorModal {
	isOpen: boolean;
	title: string;
	message: string;
}

export const useAutofill = (
	projectId: string,
	options?: UseAutofillOptions
) => {
	const [isAutofilling, setIsAutofilling] = useState(false);
	const [showSparkles, setShowSparkles] = useState(false);
	const [errorModal, setErrorModal] = useState<AutofillErrorModal>({
		isOpen: false,
		title: "",
		message: "",
	});
	const jobChannelRef = useRef<RealtimeChannel | null>(null);
	const jobTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { refreshProject } = useProjects();
	const context: AutofillContext = options?.context ?? "project";
	const endpointPath = getEndpointPath(context);

	const clearAutofillState = useCallback(() => {
		setIsAutofilling(false);
		setShowSparkles(false);
		if (jobChannelRef.current) {
			supabase.removeChannel(jobChannelRef.current);
			jobChannelRef.current = null;
		}
		if (jobTimeoutRef.current) {
			clearTimeout(jobTimeoutRef.current);
			jobTimeoutRef.current = null;
		}
	}, []);

	const clearErrorModal = useCallback(() => {
		setErrorModal((prev) => ({ ...prev, isOpen: false }));
	}, []);

	const showError = useCallback((title: string, message: string) => {
		setErrorModal({ isOpen: true, title, message });
	}, []);

	const startJobRealtime = useCallback(
		(jobId: string) => {
			// Clear any previous subscription/timeout
			if (jobChannelRef.current) {
				supabase.removeChannel(jobChannelRef.current);
				jobChannelRef.current = null;
			}
			if (jobTimeoutRef.current) {
				clearTimeout(jobTimeoutRef.current);
				jobTimeoutRef.current = null;
			}

			const handleTerminal = (status: "completed" | "failed", errorMessage?: string | null) => {
				if (jobChannelRef.current) {
					supabase.removeChannel(jobChannelRef.current);
					jobChannelRef.current = null;
				}
				if (jobTimeoutRef.current) {
					clearTimeout(jobTimeoutRef.current);
					jobTimeoutRef.current = null;
				}
				setIsAutofilling(false);
				setShowSparkles(false);

				if (status === "completed") {
					toast.success("Autofill completed successfully");
					refreshProject(projectId).catch((err) => {
						console.error("[useAutofill] Failed to refresh after completion:", err);
					});
					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("autofill-completed", {
								detail: { projectId, context },
							})
						);
					}
				} else {
					showError(
						"Autofill failed",
						errorMessage || "Autofill failed. Please try again."
					);
				}
			};

			const channel = supabase
				.channel(`autofill-job-${jobId}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "jobs",
						filter: `id=eq.${jobId}`,
					},
					(payload) => {
						const row = payload.new as JobRow;
						if (row.status === "completed") {
							handleTerminal("completed");
							return;
						}
						if (row.status === "failed") {
							handleTerminal("failed", row.error_message ?? undefined);
						}
					}
				)
				.subscribe();

			jobChannelRef.current = channel;

			jobTimeoutRef.current = setTimeout(() => {
				jobTimeoutRef.current = null;
				if (jobChannelRef.current) {
					supabase.removeChannel(jobChannelRef.current);
					jobChannelRef.current = null;
				}
				setIsAutofilling(false);
				setShowSparkles(false);
				showError(
					"Autofill taking too long",
					"Autofill is taking longer than expected. Please check back later or refresh the page."
				);
			}, MAX_JOB_WAIT_MS);
		},
		[projectId, context, refreshProject, showError]
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (jobChannelRef.current) {
				supabase.removeChannel(jobChannelRef.current);
				jobChannelRef.current = null;
			}
			if (jobTimeoutRef.current) {
				clearTimeout(jobTimeoutRef.current);
				jobTimeoutRef.current = null;
			}
		};
	}, []);

	const handleAutofill = useCallback(async () => {
		setShowSparkles(true);
		setIsAutofilling(true);

		try {
			const { data: resources, error: filesError } = await supabase
				.from("resources")
				.select("id, current_version_id")
				.eq("project_id", projectId)
				.eq("resource_type", "FILE");

			if (filesError) throw filesError;

			const documentLabel =
				context === "borrower" ? "borrower documents" : "documents";
			if (!resources || resources.length === 0) {
				showError(
					`No ${documentLabel}`,
					`No ${documentLabel} found to autofill from. Please upload ${documentLabel} first.`
				);
				setIsAutofilling(false);
				setShowSparkles(false);
				return;
			}

			const versionIds = resources
				.map((r) => r.current_version_id)
				.filter(Boolean);

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
				showError(
					`No ${documentLabel} matched`,
					`No ${documentLabel} were matched for autofill.`
				);
				setIsAutofilling(false);
				setShowSparkles(false);
				return;
			}

			const projectAddress = options?.projectAddress ?? "";

		// Call FastAPI endpoint directly (backend derives user from JWT)
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const token = session?.access_token;

			const response = await fetch(endpointPath, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token && { Authorization: `Bearer ${token}` }),
				},
				body: JSON.stringify({
					project_id: projectId,
					project_address: projectAddress,
					document_paths: documentPaths,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				if (response.status === 409) {
					setIsAutofilling(false);
					setShowSparkles(false);
					showError(
						"Autofill already running",
						errorData.detail ||
							"An autofill job is already running for this resume. Please wait for it to complete."
					);
					return;
				}
				throw new Error(
					errorData.error || errorData.detail || `Autofill failed: ${response.statusText}`
				);
			}

			const body = await response.json();
			const jobId = body?.job_id;

			if (jobId) {
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("autofill-started", {
							detail: { projectId, context },
						})
					);
				}
				startJobRealtime(jobId);
			} else {
				// Backend may not return job_id (e.g. old deployment); stop spinner
				setIsAutofilling(false);
				setShowSparkles(false);
				showError(
					"Autofill started",
					"Autofill was started but status tracking is unavailable. Refresh the page to see updates."
				);
			}
		} catch (error) {
			console.error("Autofill error:", error);
			showError(
				"Autofill failed",
				error instanceof Error ? error.message : "Failed to start autofill process."
			);
			clearAutofillState();
		}
	}, [
		projectId,
		options?.projectAddress,
		context,
		endpointPath,
		startJobRealtime,
		showError,
		clearAutofillState,
	]);

	return {
		isAutofilling,
		showSparkles,
		handleAutofill,
		clearAutofillState,
		errorModal,
		clearErrorModal,
	};
};
