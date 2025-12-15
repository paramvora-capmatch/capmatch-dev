"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useRef,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { motion, AnimatePresence } from "framer-motion";

import { ProjectResumeView } from "./ProjectResumeView"; // New component for viewing
import { ProjectSummaryCard } from "./ProjectSummaryCard"; // Borrower progress
import { ProjectCompletionCard } from "./ProjectCompletionCard"; // Project progress moved below docs
import { ProjectSummaryCardSkeleton } from "./ProjectSummaryCardSkeleton";
import { ProjectCompletionCardSkeleton } from "./ProjectCompletionCardSkeleton";
import { ProjectResumeViewSkeleton } from "./ProjectResumeViewSkeleton";
import { DocumentManagerSkeleton } from "../documents/DocumentManagerSkeleton";
import EnhancedProjectForm from "../forms/EnhancedProjectForm";
import { Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { ProjectProfile } from "@/types/enhanced-types";
import { Button } from "../ui/Button"; // Import Button
import { useAuthStore } from "@/stores/useAuthStore";
import { AskAIProvider } from "../ui/AskAIProvider";
import { StickyChatCard } from "@/components/chat/StickyChatCard";
import { DocumentManager } from "../documents/DocumentManager";
import { BorrowerResumeForm } from "../forms/BorrowerResumeForm";
import { BorrowerResumeView } from "../forms/BorrowerResumeView";
import { useAskAI } from "@/hooks/useAskAI";
import { useProjectBorrowerResume } from "@/hooks/useProjectBorrowerResume";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { supabase } from "../../../lib/supabaseClient";
import {
	BorrowerResumeContent,
	getProjectWithResume,
} from "@/lib/project-queries";
import { computeBorrowerCompletion } from "@/utils/resumeCompletion";

import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";
import { useAutofill } from "@/hooks/useAutofill";
import { useChatStore } from "@/stores/useChatStore";
import { usePermissionStore } from "@/stores/usePermissionStore";
import { usePermissions } from "@/hooks/usePermissions";
import { generateOMInsights } from "@/lib/om-insights";

const unwrapValue = (val: any) => {
	if (val && typeof val === "object" && "value" in val) {
		return (val as any).value;
	}
	if (val && typeof val === "object" && "original_value" in val) {
		return (val as any).original_value;
	}
	return val;
};

const clampPercentage = (value: unknown): number => {
	const unwrapped = unwrapValue(value);
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.max(0, Math.min(100, Math.round(value)));
	}
	if (typeof value === "string") {
		const parsed = parseFloat(value);
		if (Number.isFinite(parsed)) {
			return Math.max(0, Math.min(100, Math.round(parsed)));
		}
	}
	return 0;
};
interface ProjectWorkspaceProps {
	projectId: string;
	isBorrowerEditing?: boolean;
	onBorrowerEditingChange?: (value: boolean) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
	projectId,
	isBorrowerEditing,
	onBorrowerEditingChange,
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const {
		projects,
		activeProject,
		setActiveProject,
		isLoading: projectsLoading,
		getProject,
		loadUserProjects,
	} = useProjects();
	const templateOptions = useMemo(
		() =>
			projects
				.filter(
					(proj) =>
						proj.id !== projectId &&
						proj.owner_org_id === activeProject?.owner_org_id
				)
				.map((proj) => ({
					value: proj.id,
					label:
						(unwrapValue(proj.projectName) as string) ||
						"Untitled Project",
				})),
		[projects, projectId, activeProject?.owner_org_id]
	);
	const searchParams = useSearchParams();
	const { loadOrg, isOwner } = useOrgStore();
	const user = useAuthStore((state) => state.user);
	const authLoading = useAuthStore((state) => state.isLoading);
	const { setActiveThread, loadThreadsForProject } = useChatStore();
	const loadPermissionsForProject = usePermissionStore(
		(state) => state.loadPermissionsForProject
	);

	const [isEditing, setIsEditing] = useState(false);
	const [initialProjectStepId, setInitialProjectStepId] = useState<string | null>(null);
	const [initialBorrowerStepId, setInitialBorrowerStepId] = useState<string | null>(null);
	const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
	const [chatTab, setChatTab] = useState<"team" | "ai" | "meet">("team");
	const [shouldExpandChat, setShouldExpandChat] = useState(false);
	const [internalBorrowerEditing, setInternalBorrowerEditing] =
		useState(false);
	const borrowerEditing = isBorrowerEditing ?? internalBorrowerEditing;
	const setBorrowerEditing = useCallback(
		(value: boolean) => {
			onBorrowerEditingChange?.(value);
			if (isBorrowerEditing === undefined) {
				setInternalBorrowerEditing(value);
			}
		},
		[isBorrowerEditing, onBorrowerEditingChange]
	);
	const [borrowerProgress, setBorrowerProgress] = useState(0);
	const [borrowerResumeSnapshot, setBorrowerResumeSnapshot] =
		useState<Partial<BorrowerResumeContent> | null>(null);
	const [permissionsLoadedForProject, setPermissionsLoadedForProject] =
		useState(false);
	const [copyModalOpen, setCopyModalOpen] = useState(false);
	const [copySourceProjectId, setCopySourceProjectId] = useState<string>("");
	const [isCopyingBorrower, setIsCopyingBorrower] = useState(false);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [borrowerDocsRefreshKey, setBorrowerDocsRefreshKey] = useState(0);

	const [previewingResourceId, setPreviewingResourceId] = useState<
		string | null
	>(null);
	const [highlightedResourceId, setHighlightedResourceId] = useState<
		string | null
	>(null);

	const [currentFormData, setCurrentFormData] =
		useState<ProjectProfile | null>(null);
	const [resumeRefreshKey, setResumeRefreshKey] = useState(0);
	const [isProjectResumeRemoteUpdate, setIsProjectResumeRemoteUpdate] =
		useState(false);
	const projectResumeChannelRef = useRef<RealtimeChannel | null>(null);
	const isLocalProjectSaveRef = useRef(false);

	// Right column chat is handled by StickyChatCard
	// Centralize AskAI logic here; StickyChatCard is presentation-only
	// Separate hooks for project and borrower contexts to ensure correct API endpoints and isolated chat history
	const projectAskAi = useAskAI({
		formData: (currentFormData as unknown as Record<string, unknown>) || {},
		apiPath: "/api/project-qa",
		contextType: "project",
	});

	const borrowerAskAi = useAskAI({
		formData:
			(borrowerResumeSnapshot as unknown as Record<string, unknown>) ||
			{},
		apiPath: "/api/borrower-qa",
		contextType: "borrower",
	});

	// Use the appropriate hook based on which form is being edited
	const activeAskAi = borrowerEditing ? borrowerAskAi : projectAskAi;

	const {
		content: borrowerResumeData,
		isLoading: borrowerResumeLoading,
		reload: reloadBorrowerResume,
		setLocalContent: setBorrowerResumeLocalContent,
	} = useProjectBorrowerResume(projectId);

	// Autofill hook for View OM functionality
	const projectAddress =
		activeProject?.propertyAddressStreet &&
		activeProject?.propertyAddressCity &&
		activeProject?.propertyAddressState
			? `${activeProject.propertyAddressStreet} | ${
					activeProject.propertyAddressCity
			  } ${activeProject.propertyAddressState}, ${
					activeProject.propertyAddressZip || ""
			  }`.trim()
			: undefined;
	const { isAutofilling, handleAutofill } = useAutofill(projectId, {
		projectAddress,
	});
	const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

	// Calculate if we're still in initial loading phase
	// We only show full loader if we don't have the project data yet
	// If we have data and are just refreshing, we keep the UI mounted
	const hasActiveProject = activeProject && activeProject.id === projectId;
	// Show loader only if we are loading AND we don't have the project data yet
	const shouldShowLoader =
		(authLoading || projectsLoading) && !hasActiveProject;

	useEffect(() => {
		if (borrowerResumeData) {
			// Prefer stored completenessPercent from DB column (fetched fresh)
			// Fall back to calculation only if stored value is missing
			const storedPercent = (borrowerResumeData as any)
				?.completenessPercent;
			const percent =
				storedPercent !== undefined &&
				storedPercent !== null &&
				typeof storedPercent === "number"
					? clampPercentage(storedPercent)
					: computeBorrowerCompletion(borrowerResumeData);
			setBorrowerProgress(percent);
			setBorrowerResumeSnapshot(borrowerResumeData || null);
		} else {
			setBorrowerProgress(
				clampPercentage(activeProject?.borrowerProgress ?? 0)
			);
			setBorrowerResumeSnapshot(null);
		}
	}, [borrowerResumeData, activeProject?.borrowerProgress]);

	useEffect(() => {
		const step = searchParams?.get("step");
		if (!step) return;

		// Deep-link format:
		// - borrower / project / documents (legacy)
		// - borrower:<sectionId> or project:<sectionId> (new)
		if (step.startsWith("borrower:")) {
			const sectionId = step.slice("borrower:".length).trim();
			setInitialBorrowerStepId(sectionId || null);
			setBorrowerEditing(true);
			setIsEditing(false);
		} else if (step.startsWith("project:")) {
			const sectionId = step.slice("project:".length).trim();
			setInitialProjectStepId(sectionId || null);
			setIsEditing(true);
			setBorrowerEditing(false);
		} else if (step === "borrower") {
			setBorrowerEditing(true);
			setIsEditing(false);
		} else if (step === "project") {
			setIsEditing(true);
			setBorrowerEditing(false);
		} else if (step === "documents") {
			setIsEditing(false);
			setBorrowerEditing(false);
			const documentsSection = document.getElementById(
				"project-documents-section"
			);
			if (documentsSection) {
				documentsSection.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}
		}

		const params = new URLSearchParams(searchParams.toString());
		params.delete("step");
		const nextPath = params.toString() ? `${pathname}?${params}` : pathname;
		router.replace(nextPath);
	}, [pathname, router, searchParams, setBorrowerEditing]);

	// Workspace heartbeat for accurate abandonment detection (visit-based)
	useEffect(() => {
		let intervalId: number | null = null;
		let cancelled = false;

		const upsertHeartbeat = async (lastStepId?: string | null) => {
			if (!user?.id || !projectId) return;
			const nowIso = new Date().toISOString();
			const payload: Record<string, any> = {
				project_id: projectId,
				user_id: user.id,
				last_visited_at: nowIso,
			};
			if (lastStepId) payload.last_step_id = lastStepId;

			await supabase
				.from("project_workspace_activity")
				.upsert(payload, { onConflict: "project_id,user_id" });
		};

		const touch = (stepId?: string | null) => {
			if (cancelled) return;
			void upsertHeartbeat(stepId ?? null);
		};

		// Initial touch
		touch(null);

		// Heartbeat every 60s while mounted/active
		intervalId = window.setInterval(() => touch(null), 60_000);

		// Best-effort flush on tab hide
		const onVisibility = () => {
			if (document.visibilityState === "hidden") {
				touch(null);
			}
		};
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			cancelled = true;
			if (intervalId) window.clearInterval(intervalId);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [projectId, user?.id]);

	// Handle tab=chat, thread, and resourceId query parameters (for notification links)
	useEffect(() => {
		const tab = searchParams?.get("tab");
		const threadId = searchParams?.get("thread");
		const resourceId = searchParams?.get("resourceId");

		if (!tab && !threadId && !resourceId) return;

		// Only process if we have an active project loaded
		if (!activeProject || activeProject.id !== projectId) return;

		if (tab === "chat") {
			// Switch to team chat tab and expand chat
			setChatTab("team");
			setShouldExpandChat(true);
			// Reset expand flag after a short delay
			setTimeout(() => setShouldExpandChat(false), 100);
		}

		if (threadId) {
			// Ensure threads are loaded for the project, then set active thread
			void loadThreadsForProject(projectId).then(() => {
				setActiveThread(threadId);
			});
		}

		if (resourceId) {
			// Open the resource preview modal and highlight the resource
			setPreviewingResourceId(resourceId);
			setHighlightedResourceId(resourceId);
			// Scroll to documents section if it exists
			setTimeout(() => {
				const documentsSection = document.getElementById(
					"project-documents-section"
				);
				if (documentsSection) {
					documentsSection.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				}
			}, 100);
		}

		// Clean up query params after handling them
		const params = new URLSearchParams(searchParams.toString());
		params.delete("tab");
		params.delete("thread");
		params.delete("resourceId");
		const nextPath = params.toString() ? `${pathname}?${params}` : pathname;
		router.replace(nextPath);
	}, [
		searchParams,
		pathname,
		router,
		setActiveThread,
		loadThreadsForProject,
		activeProject,
		projectId,
	]);

	// Load org data when we have a project
	// Note: Advisors may not have access to borrower orgs, so we handle errors gracefully
	useEffect(() => {
		const loadOrgData = async () => {
			if (!activeProject?.owner_org_id) return;

			// Skip org loading for advisors - they don't need org member data
			if (user?.role === "advisor") {
				console.log(
					`[ProjectWorkspace] Skipping org load for advisor user`
				);
				return;
			}

			const { currentOrg } = useOrgStore.getState();
			// Only load if we haven't loaded this org yet
			if (currentOrg?.id !== activeProject.owner_org_id) {
				console.log(
					`[ProjectWorkspace] Loading org data for: ${activeProject.owner_org_id}`
				);
				try {
					await loadOrg(activeProject.owner_org_id);
				} catch (error) {
					// Log but don't throw - org loading is optional for some users
					console.warn(
						`[ProjectWorkspace] Failed to load org (non-fatal):`,
						error
					);
				}
			}
		};
		loadOrgData();
	}, [activeProject?.owner_org_id, loadOrg, user?.role]);

	const handleResumeVersionChange = useCallback(async () => {
		try {
			// Preserve borrower resource IDs before loading
			const currentActive = activeProject;
			const preservedBorrowerResumeResourceId = (currentActive as any)
				?.borrowerResumeResourceId;
			const preservedBorrowerDocsResourceId = (currentActive as any)
				?.borrowerDocsResourceId;

			await loadUserProjects();
			// Reload borrower resume to get fresh completeness_percent from column
			await reloadBorrowerResume();
			const updatedProject = getProject(projectId);
			if (updatedProject) {
				// Preserve borrower resource IDs when setting active project
				const projectWithPreservedIds = {
					...updatedProject,
					borrowerResumeResourceId:
						preservedBorrowerResumeResourceId ??
						(updatedProject as any)?.borrowerResumeResourceId ??
						null,
					borrowerDocsResourceId:
						preservedBorrowerDocsResourceId ??
						(updatedProject as any)?.borrowerDocsResourceId ??
						null,
				};
				setActiveProject(projectWithPreservedIds);
				setResumeRefreshKey((prev) => prev + 1);
			}
		} catch (error) {
			console.error(
				"[ProjectWorkspace] Failed to refresh project after version change:",
				error
			);
		}
	}, [
		projectId,
		setActiveProject,
		loadUserProjects,
		getProject,
		activeProject,
		reloadBorrowerResume,
	]);

	// Listen for autofill completion to refresh borrower resume data
	useEffect(() => {
		const handleAutofillCompleted = async (event: CustomEvent) => {
			const { projectId: eventProjectId, context } = event.detail || {};
			// Refresh borrower resume if autofill was for this project
			// Refresh for both project and borrower autofills since they might affect each other
			if (eventProjectId === projectId) {
				console.log(
					`[ProjectWorkspace] Autofill completed for ${context}, refreshing borrower resume...`
				);
				try {
					await reloadBorrowerResume();
					await loadUserProjects(); // Also refresh project store
				} catch (error) {
					console.error(
						"[ProjectWorkspace] Failed to refresh after autofill:",
						error
					);
				}
			}
		};

		window.addEventListener(
			"autofill-completed",
			handleAutofillCompleted as unknown as EventListener
		);
		return () => {
			window.removeEventListener(
				"autofill-completed",
				handleAutofillCompleted as unknown as EventListener
			);
		};
	}, [projectId, reloadBorrowerResume, loadUserProjects]);

	// useEffect for loading and setting active project
	// Always fetch the latest project + resume snapshot for this workspace on mount
	// so that users never see stale resume content after background saves.
	useEffect(() => {
		const loadProjectData = async () => {
			if (!projectId) return;

			// Avoid running while auth is still resolving
			if (authLoading) {
				return;
			}

			try {
				console.log(
					`[ProjectWorkspace] 🔄 loadProjectData starting for projectId: ${projectId}`
				);

				// Always fetch a fresh project with its current resume version
				const fetchedProject = await getProjectWithResume(projectId);
				console.log(
					`[ProjectWorkspace] 📥 Fetched project from getProjectWithResume:`,
					{
						projectId: fetchedProject.id,
						projectResumeResourceId:
							fetchedProject.projectResumeResourceId,
					}
				);

				// Also fetch resources for the project so we can attach IDs needed by other components
				const { data: resourcesData } = await supabase
					.from("resources")
					.select("id, resource_type")
					.eq("project_id", projectId);

				console.log(`[ProjectWorkspace] 📦 Fetched resources:`, {
					count: resourcesData?.length || 0,
					resources: resourcesData?.map((r: any) => ({
						id: r.id,
						type: r.resource_type,
					})),
				});

				const projectDocsResource = resourcesData?.find(
					(r: any) => r.resource_type === "PROJECT_DOCS_ROOT"
				);
				const projectResumeResource = resourcesData?.find(
					(r: any) => r.resource_type === "PROJECT_RESUME"
				);
				const borrowerResumeResource = resourcesData?.find(
					(r: any) => r.resource_type === "BORROWER_RESUME"
				);
				const borrowerDocsResource = resourcesData?.find(
					(r: any) => r.resource_type === "BORROWER_DOCS_ROOT"
				);

				const projectWithResources = {
					...fetchedProject,
					projectDocsResourceId: projectDocsResource?.id || null,
					projectResumeResourceId:
						projectResumeResource?.id ||
						fetchedProject.projectResumeResourceId ||
						null,
					borrowerResumeResourceId:
						borrowerResumeResource?.id || null,
					borrowerDocsResourceId: borrowerDocsResource?.id || null,
				};

				console.log(
					`[ProjectWorkspace] ✅ Project with resource IDs:`,
					{
						projectDocsResourceId:
							projectWithResources.projectDocsResourceId,
						projectResumeResourceId:
							projectWithResources.projectResumeResourceId,
						borrowerResumeResourceId:
							projectWithResources.borrowerResumeResourceId,
						borrowerDocsResourceId:
							projectWithResources.borrowerDocsResourceId,
					}
				);

				// Load org data for permission checks (skip for advisors)
				if (
					projectWithResources.owner_org_id &&
					user?.role !== "advisor"
				) {
					try {
						await loadOrg(projectWithResources.owner_org_id);
					} catch (error) {
						console.warn(
							`[ProjectWorkspace] Failed to load org (non-fatal):`,
							error
						);
					}
				}

				// Load permissions for the project BEFORE setting active project
				// This ensures permissions are loaded before setActiveProject triggers its own load
				try {
					await loadPermissionsForProject(projectId);
					setPermissionsLoadedForProject(true);
				} catch (error) {
					console.warn(
						`[ProjectWorkspace] Failed to load permissions (non-fatal):`,
						error
					);
					// Even if loading fails, mark as loaded so we don't get stuck
					setPermissionsLoadedForProject(true);
				}

				// Update active project for this workspace
				// Note: setActiveProject also calls loadPermissionsForProject, but since we already loaded,
				// it will just update the store with the same data
				setActiveProject(projectWithResources);

				// Keep the project list in sync so other views see the same data
				const { projects, isLoading } = useProjectStore.getState();
				const stateUpdates: {
					projects?: ProjectProfile[];
					isLoading?: boolean;
				} = {};

				if (!projects.find((p) => p.id === projectId)) {
					stateUpdates.projects = [...projects, projectWithResources];
				}

				// Ensure isLoading is set to false after successfully loading the project
				// This fixes the issue where isLoading can get stuck if loadUserProjects() wasn't called
				if (isLoading) {
					stateUpdates.isLoading = false;
				}

				if (Object.keys(stateUpdates).length > 0) {
					useProjectStore.setState(stateUpdates);
				}
			} catch (error) {
				console.error(
					`[ProjectWorkspace] Failed to fetch project ${projectId}:`,
					error
				);
				router.push("/dashboard");
			}
		};

		loadProjectData();

		// Reset permissions loaded flag when projectId changes
		return () => {
			setPermissionsLoadedForProject(false);
		};
	}, [
		projectId,
		authLoading,
		setActiveProject,
		router,
		loadOrg,
		user?.role,
		loadPermissionsForProject,
	]);

	// Subscribe to realtime changes for project resume
	useEffect(() => {
		if (!projectId || !user?.id) return;

		const channel = supabase
			.channel(`project-resume-workspace-${projectId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "project_resumes",
					filter: `project_id=eq.${projectId}`,
				},
				async (payload) => {
					// Ignore our own updates (handled by EnhancedProjectForm via store)
					if (isLocalProjectSaveRef.current) {
						isLocalProjectSaveRef.current = false;
						return;
					}

					// Don't reload if user is editing (preserves their work)
					if (isEditing) {
						return;
					}

					setIsProjectResumeRemoteUpdate(true);

					// Defer state update to avoid updating during render
					setTimeout(async () => {
						console.log(
							`[ProjectWorkspace] 🔄 Realtime UPDATE received for project_resumes, projectId: ${projectId}`
						);
						console.log(
							`[ProjectWorkspace] 📦 Current activeProject resource IDs before update:`,
							{
								projectDocsResourceId:
									activeProject?.projectDocsResourceId,
								projectResumeResourceId:
									activeProject?.projectResumeResourceId,
								borrowerResumeResourceId: (activeProject as any)
									?.borrowerResumeResourceId,
								borrowerDocsResourceId: (activeProject as any)
									?.borrowerDocsResourceId,
							}
						);

						// Reload only the specific project, not all projects
						try {
							const updatedProject = await getProjectWithResume(
								projectId
							);
							console.log(
								`[ProjectWorkspace] 📥 Updated project from getProjectWithResume:`,
								{
									projectResumeResourceId:
										updatedProject.projectResumeResourceId,
									hasProjectResumeResourceId:
										!!updatedProject.projectResumeResourceId,
								}
							);

							if (updatedProject) {
								// Preserve resource IDs from current activeProject before updating
								// getProjectWithResume doesn't return borrower resource IDs
								const projectWithPreservedIds = {
									...updatedProject,
									projectDocsResourceId:
										activeProject?.projectDocsResourceId ??
										updatedProject.projectDocsResourceId ??
										null,
									borrowerResumeResourceId:
										(activeProject as any)
											?.borrowerResumeResourceId ?? null,
									borrowerDocsResourceId:
										(activeProject as any)
											?.borrowerDocsResourceId ?? null,
									// projectResumeResourceId IS returned by getProjectWithResume, so prefer new one, fallback to existing
									projectResumeResourceId:
										updatedProject.projectResumeResourceId ||
										activeProject?.projectResumeResourceId ||
										null,
								};

								console.log(
									`[ProjectWorkspace] ✅ Project with preserved resource IDs:`,
									{
										projectDocsResourceId:
											projectWithPreservedIds.projectDocsResourceId,
										projectResumeResourceId:
											projectWithPreservedIds.projectResumeResourceId,
										borrowerResumeResourceId: (
											projectWithPreservedIds as any
										).borrowerResumeResourceId,
										borrowerDocsResourceId: (
											projectWithPreservedIds as any
										).borrowerDocsResourceId,
									}
								);

								// Update active project if it's the current one
								if (activeProject?.id === projectId) {
									console.log(
										`[ProjectWorkspace] 🔄 Updating activeProject with preserved IDs`
									);
									setActiveProject(projectWithPreservedIds);
								}
								// Note: We don't update the projects array here to avoid full refresh
								// The next time loadUserProjects is called, it will get the latest data
							}
						} catch (error) {
							console.error(
								"[ProjectWorkspace] ❌ Error reloading project after remote update:",
								error
							);
							// Fallback to full reload if specific reload fails
							await loadUserProjects();
						}

						// Reset notification after 3 seconds
						setTimeout(() => {
							setIsProjectResumeRemoteUpdate(false);
						}, 3000);
					}, 0);
				}
			)
			.subscribe();

		projectResumeChannelRef.current = channel;

		return () => {
			projectResumeChannelRef.current?.unsubscribe();
			projectResumeChannelRef.current = null;
		};
	}, [
		projectId,
		user?.id,
		isEditing,
		activeProject,
		setActiveProject,
		loadUserProjects,
	]);

	// Check permissions for PROJECT_RESUME, PROJECT_DOCS_ROOT, and BORROWER_RESUME resources
	// IMPORTANT: These must be called before any conditional returns to follow Rules of Hooks
	const projectResumeResourceId =
		activeProject?.projectResumeResourceId || null;
	const {
		canView: canViewProjectResume,
		canEdit: canEditProjectResume,
		isLoading: isLoadingProjectResumePermissions,
	} = usePermissions(projectResumeResourceId);

	const projectDocsResourceId = activeProject?.projectDocsResourceId || null;
	const {
		canView: canViewProjectDocs,
		isLoading: isLoadingProjectDocsPermissions,
	} = usePermissions(projectDocsResourceId);

	const borrowerResumeResourceId =
		(activeProject as any)?.borrowerResumeResourceId || null;
	const {
		canView: canViewBorrowerResume,
		canEdit: canEditBorrowerResume,
		isLoading: isLoadingBorrowerResumePermissions,
	} = usePermissions(borrowerResumeResourceId);

	const borrowerDocsResourceId =
		(activeProject as any)?.borrowerDocsResourceId || null;
	const {
		canView: canViewBorrowerDocs,
		isLoading: isLoadingBorrowerDocsPermissions,
	} = usePermissions(borrowerDocsResourceId);

	// Get global loading state and permissions from permission store
	const isPermissionStoreLoading = usePermissionStore(
		(state) => state.isLoading
	);

	// Determine if we're still waiting for resource IDs or permissions to load
	// We show loading if:
	// 1. We don't have an active project yet (initial load)
	// 2. OR resourceId is null AND permissions haven't been loaded for this project yet
	// Note: If permissions are already loaded, we don't show loading even if resource IDs
	// are temporarily missing (they'll be restored by loadProjectData useEffect)
	const hasProject = activeProject && activeProject.id === projectId;
	const isWaitingForBorrowerResume =
		!hasProject ||
		(!borrowerResumeResourceId &&
			!permissionsLoadedForProject &&
			isPermissionStoreLoading);
	const isWaitingForBorrowerDocs =
		!hasProject ||
		(!borrowerDocsResourceId &&
			!permissionsLoadedForProject &&
			isPermissionStoreLoading);
	const isWaitingForProjectResume =
		!hasProject ||
		(!projectResumeResourceId &&
			!permissionsLoadedForProject &&
			isPermissionStoreLoading);
	const isWaitingForProjectDocs =
		!hasProject ||
		(!projectDocsResourceId &&
			!permissionsLoadedForProject &&
			isPermissionStoreLoading);

	// Log resource IDs and loading states for debugging
	useEffect(() => {
		console.log(`[ProjectWorkspace] 📊 Resource IDs and loading states:`, {
			projectId,
			hasProject,
			activeProjectId: activeProject?.id,
			resourceIds: {
				projectDocsResourceId,
				projectResumeResourceId,
				borrowerResumeResourceId,
				borrowerDocsResourceId,
			},
			loadingStates: {
				isWaitingForBorrowerResume,
				isWaitingForBorrowerDocs,
				isWaitingForProjectResume,
				isWaitingForProjectDocs,
			},
			permissions: {
				permissionsLoadedForProject,
				isPermissionStoreLoading,
				canViewBorrowerResume,
				canViewBorrowerDocs,
				canViewProjectResume,
				canViewProjectDocs,
			},
		});
	}, [
		projectId,
		hasProject,
		activeProject?.id,
		projectDocsResourceId,
		projectResumeResourceId,
		borrowerResumeResourceId,
		borrowerDocsResourceId,
		isWaitingForBorrowerResume,
		isWaitingForBorrowerDocs,
		isWaitingForProjectResume,
		isWaitingForProjectDocs,
		permissionsLoadedForProject,
		isPermissionStoreLoading,
		canViewBorrowerResume,
		canViewBorrowerDocs,
		canViewProjectResume,
		canViewProjectDocs,
	]);

	// Reload permissions when switching to borrower editing mode to ensure fresh data
	useEffect(() => {
		if (
			borrowerEditing &&
			projectId &&
			activeProject?.id === projectId &&
			!isPermissionStoreLoading
		) {
			// Check if we have the borrower resource IDs but permissions might be missing
			const currentPermissions =
				usePermissionStore.getState().permissions;
			const needsReload =
				(borrowerResumeResourceId &&
					currentPermissions[borrowerResumeResourceId] ===
						undefined) ||
				(borrowerDocsResourceId &&
					currentPermissions[borrowerDocsResourceId] === undefined);

			if (needsReload) {
				console.log(
					"[ProjectWorkspace] Reloading permissions for borrower view"
				);
				loadPermissionsForProject(projectId).catch((error) => {
					console.warn(
						"[ProjectWorkspace] Failed to reload permissions:",
						error
					);
				});
			}
		}
	}, [
		borrowerEditing,
		projectId,
		activeProject?.id,
		borrowerResumeResourceId,
		borrowerDocsResourceId,
		isPermissionStoreLoading,
		loadPermissionsForProject,
	]);

	// Instead of showing a full-page loader, we'll show skeleton components
	// This provides better UX by showing the page structure immediately
	const isInitialLoad = shouldShowLoader || !activeProject || activeProject.id !== projectId;

	const projectResumeProgress = clampPercentage(
		activeProject?.completenessPercent ?? 0
	);
	const borrowerResumeProgress = borrowerResumeData
		? borrowerProgress
		: clampPercentage(
				activeProject?.borrowerProgress ?? borrowerProgress ?? 0
		  );
	const isProjectComplete = projectResumeProgress === 100;

	const projectForProgress = activeProject
		? {
				...activeProject,
				completenessPercent: projectResumeProgress,
				borrowerProgress: borrowerResumeProgress,
		  }
		: null;

	const handleMentionClick = (resourceId: string) => {
		setPreviewingResourceId(resourceId); // Open the preview modal
		setPreviewingResourceId(resourceId);
		setHighlightedResourceId(resourceId);
		// Clear the highlight after a short delay
		setTimeout(() => {
			setHighlightedResourceId(null);
		}, 3000);
	};

	const handleCopyBorrowerProfile = async () => {
		if (!copySourceProjectId) {
			setCopyError("Select a project to copy from");
			return;
		}

		setIsCopyingBorrower(true);
		setCopyError(null);
		try {
			const { data, error } = await supabase.functions.invoke(
				"copy-borrower-profile",
				{
					body: {
						source_project_id: copySourceProjectId,
						target_project_id: projectId,
					},
				}
			);

			if (error) {
				throw new Error(
					error.message || "Failed to copy borrower profile"
				);
			}

			const copiedResume = (data?.borrowerResumeContent ??
				{}) as BorrowerResumeContent;
			const nextProgress = computeBorrowerCompletion(copiedResume);

			setBorrowerProgress(nextProgress);
			setBorrowerResumeSnapshot(copiedResume || null);
			setBorrowerResumeLocalContent(copiedResume || null);

			if (activeProject) {
				const updatedProject = {
					...activeProject,
					borrowerProgress: nextProgress,
					borrowerSections: copiedResume,
				};
				void setActiveProject(updatedProject);
			}

			await reloadBorrowerResume();
			void loadUserProjects();
			setBorrowerDocsRefreshKey((prev) => prev + 1);
			setCopyModalOpen(false);
			setCopySourceProjectId("");
			setBorrowerEditing(false);
		} catch (err) {
			setCopyError(
				err instanceof Error
					? err.message
					: "Failed to copy borrower resume"
			);
		} finally {
			setIsCopyingBorrower(false);
		}
	};

	const renderBorrowerDocumentsSection = () => (
		<div className="overflow-visible">
			<DocumentManager
				key={`borrower-docs-${borrowerDocsRefreshKey}`}
				projectId={projectId}
				resourceId="BORROWER_ROOT"
				title="Borrower Documents"
				orgId={activeProject?.owner_org_id ?? null}
				canUpload={true}
				canDelete={true}
				context="borrower"
			/>
		</div>
	);

	const renderBorrowerResumeSection = () => (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-full">
			<BorrowerResumeForm
				projectId={projectId}
				progressPercent={borrowerProgress}
				onProgressChange={(percent) => setBorrowerProgress(percent)}
				onFormDataChange={(data) => setBorrowerResumeSnapshot(data)}
				initialStepId={initialBorrowerStepId}
				onComplete={(profile) => {
					setBorrowerResumeSnapshot(profile || null);
					void reloadBorrowerResume();
					// Refresh project store to update progress in dashboard and project cards
					void loadUserProjects();
				}}
				onAskAI={(fieldId) => {
					setActiveFieldId(fieldId);
					void borrowerAskAi.activateField(fieldId, {
						autoSend: true,
					});
					setChatTab("ai");
					setShouldExpandChat(true);
					setTimeout(() => setShouldExpandChat(false), 100);
				}}
				onCopyBorrowerResume={() => {
					setCopyError(null);
					setCopyModalOpen(true);
				}}
				copyDisabled={templateOptions.length === 0 || isCopyingBorrower}
				copyLoading={isCopyingBorrower}
				canEdit={canEditBorrowerResume}
			/>
		</div>
	);

	return (
		<div className="relative min-h-screen w-full flex flex-row animate-fadeIn bg-gray-200">
			<AskAIProvider
				onFieldAskAI={(fieldId: string) => {
					setActiveFieldId(fieldId); // This will be passed to the chat widget
				}}
			>
				{/* Global page background (grid + blue tint) behind both columns */}
				<div className="pointer-events-none absolute inset-0 z-0">
					<div className="absolute inset-0 opacity-[0.5]">
						<svg
							className="absolute inset-0 h-full w-full text-blue-500"
							aria-hidden="true"
						>
							<defs>
								<pattern
									id="borrower-grid-pattern"
									width="24"
									height="24"
									patternUnits="userSpaceOnUse"
								>
									<path
										d="M 24 0 L 0 0 0 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="0.5"
									/>
								</pattern>
							</defs>
							<rect
								width="100%"
								height="100%"
								fill="url(#borrower-grid-pattern)"
							/>
						</svg>
					</div>
				</div>
				{/* Left Column: Scrollable content */}
				<div className="flex-1 relative z-[1] min-w-0">
					{/* Content with padding */}
					<div className="relative p-6 min-w-0">
						<AnimatePresence mode="wait">
							{borrowerEditing ? (
								<motion.div
									key="borrower-view"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="space-y-6"
								>
									{/* Borrower Documents - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForBorrowerDocs ||
									isLoadingBorrowerDocsPermissions ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.1,
											}}
										>
											<DocumentManagerSkeleton title="Borrower Documents" />
										</motion.div>
									) : canViewBorrowerDocs ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.1,
											}}
										>
											{renderBorrowerDocumentsSection()}
										</motion.div>
									) : null}
									{/* Borrower Resume - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForBorrowerResume ||
									isLoadingBorrowerResumePermissions ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.2,
											}}
										>
											<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-full">
												<div className="p-6 space-y-4">
													<div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
													<div className="space-y-3">
														{[1, 2, 3, 4].map((i) => (
															<div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
														))}
													</div>
												</div>
											</div>
										</motion.div>
									) : canViewBorrowerResume ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.2,
											}}
										>
											{renderBorrowerResumeSection()}
										</motion.div>
									) : null}
								</motion.div>
							) : (
								<motion.div
									key="project-view"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="space-y-6"
								>
									{/* Project Title */}
									<motion.h1
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.3 }}
										className="text-3xl font-bold text-gray-900 mb-5"
									>
										{isInitialLoad ? (
											<div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
										) : (
											(unwrapValue(
												activeProject?.projectName
											) as string) || "Project"
										)}
									</motion.h1>

									{/* Project Progress Card - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForBorrowerResume ||
									isWaitingForBorrowerDocs ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.1,
											}}
											className="relative"
										>
											<ProjectSummaryCardSkeleton />
										</motion.div>
									) : canViewBorrowerResume ||
									  canViewBorrowerDocs ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.1,
											}}
											className="relative"
										>
											<ProjectSummaryCard
												project={projectForProgress}
												isLoading={projectsLoading}
												onEdit={() =>
													setIsEditing(true)
												}
												onBorrowerClick={() => {
													setIsEditing(false);
													setActiveFieldId(null);
													setChatTab("team");
													setShouldExpandChat(false);
													setBorrowerEditing(true);
												}}
												borrowerProgress={
													borrowerResumeProgress
												}
											/>
										</motion.div>
									) : null}

									{/* Section for OM Link - Only show if project is complete */}
									{isProjectComplete && (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.2,
											}}
											className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
										>
											{/* Animated background pattern */}
											<div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-transparent to-green-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

											{/* Success pulse effect */}
											<div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-green-200 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse" />

											<div className="relative z-10">
												<h3 className="text-base font-semibold text-emerald-800 flex items-center">
													<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
													Project Ready!
												</h3>
												<p className="text-sm text-emerald-700">
													This project profile is
													complete. You can view the
													generated Offering
													Memorandum.
												</p>
											</div>
											<Button
												variant="outline"
												onClick={async () => {
													try {
														// Generate insights first before navigating
														setIsGeneratingInsights(
															true
														);
														await generateOMInsights(
															projectId
														);
														// Navigate to OM dashboard after insights are generated and stored
														router.push(
															`/project/om/${projectId}/dashboard`
														);
													} catch (error) {
														console.error(
															"Failed to generate insights:",
															error
														);
														// Show error but still allow navigation
														alert(
															"Failed to generate insights. You can still view the OM."
														);
														router.push(
															`/project/om/${projectId}/dashboard`
														);
													} finally {
														setIsGeneratingInsights(
															false
														);
													}
												}}
												disabled={isGeneratingInsights}
												className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 hover:border-emerald-400 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isGeneratingInsights ? (
													<>
														<Loader2 className="mr-2 h-5 w-5 animate-spin" />
														Generating Insights...
													</>
												) : (
													<>
														<FileSpreadsheet className="mr-2 h-5 w-5" />
														View OM
													</>
												)}
											</Button>
										</motion.div>
									)}

									{/* Project Documents - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForProjectDocs ||
									isLoadingProjectDocsPermissions ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.3,
											}}
											id="project-documents-section"
											className="overflow-visible"
										>
											<DocumentManagerSkeleton title="Project Documents" />
										</motion.div>
									) : canViewProjectDocs ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.3,
											}}
											id="project-documents-section"
											className="overflow-visible"
										>
											<DocumentManager
												projectId={projectId}
												resourceId="PROJECT_ROOT"
												title="Project Documents"
												orgId={
													activeProject?.owner_org_id ??
													null
												}
												canUpload={true}
												canDelete={true}
												highlightedResourceId={
													highlightedResourceId
												}
												context="project"
											/>
										</motion.div>
									) : null}

									{/* Project completion progress - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForProjectResume ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.4,
											}}
										>
											<ProjectCompletionCardSkeleton />
										</motion.div>
									) : canViewProjectResume ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.4,
											}}
										>
											<ProjectCompletionCard
												project={projectForProgress}
												isLoading={projectsLoading}
												onEdit={() =>
													setIsEditing(true)
												}
											/>
										</motion.div>
									) : null}

									{/* Project Resume (View or Edit) - Show skeleton or content based on loading state */}
									{isInitialLoad || isWaitingForProjectResume ||
									isLoadingProjectResumePermissions ? (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.5,
											}}
										>
											<ProjectResumeViewSkeleton />
										</motion.div>
									) : canViewProjectResume ? (
										<>
											{isEditing ? (
												<motion.div
													initial={{
														opacity: 0,
														y: 10,
													}}
													animate={{
														opacity: 1,
														y: 0,
													}}
													transition={{
														duration: 0.3,
														delay: 0.5,
													}}
												>
													<EnhancedProjectForm
														key={`enhanced-form-${resumeRefreshKey}`}
														existingProject={
															activeProject
														}
														initialStepId={initialProjectStepId}
														onComplete={() =>
															setIsEditing(false)
														}
														onAskAI={(fieldId) => {
															setActiveFieldId(
																fieldId
															);
															void projectAskAi.activateField(
																fieldId,
																{
																	autoSend:
																		true,
																}
															);
															setChatTab("ai");
															setShouldExpandChat(
																true
															);
															setTimeout(
																() =>
																	setShouldExpandChat(
																		false
																	),
																100
															);
														}}
														onFormDataChange={
															setCurrentFormData
														}
														onVersionChange={
															handleResumeVersionChange
														}
													/>
												</motion.div>
											) : (
												<>
													{/* Remote update notification */}
													{isProjectResumeRemoteUpdate && (
														<motion.div
															initial={{
																opacity: 0,
																y: 10,
															}}
															animate={{
																opacity: 1,
																y: 0,
															}}
															transition={{
																duration: 0.3,
															}}
															className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 mx-6 mb-4 rounded-md flex items-center gap-2"
														>
															<AlertCircle className="h-4 w-4 flex-shrink-0" />
															<span className="text-sm font-medium">
																This project
																resume was
																updated by
																another user.
																Your view has
																been refreshed.
															</span>
														</motion.div>
													)}
													<motion.div
														initial={{
															opacity: 0,
															y: 10,
														}}
														animate={{
															opacity: 1,
															y: 0,
														}}
														transition={{
															duration: 0.3,
															delay: 0.5,
														}}
													>
														<ProjectResumeView
															key={`resume-view-${resumeRefreshKey}`}
															project={
																activeProject
															}
															onEdit={() =>
																setIsEditing(
																	true
																)
															}
															onVersionChange={
																handleResumeVersionChange
															}
															canEdit={
																canEditProjectResume
															}
														/>
													</motion.div>
												</>
											)}
										</>
									) : null}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* Right Column: Sticky collapsible chat card */}
				<StickyChatCard
					projectId={projectId}
					onMentionClick={handleMentionClick}
					topOffsetClassName="top-4 sm:top-6"
					widthClassName="w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]"
					messages={activeAskAi.messages}
					fieldContext={activeAskAi.fieldContext}
					isLoading={activeAskAi.isLoading}
					isBuildingContext={activeAskAi.isBuildingContext}
					contextError={activeAskAi.contextError}
					hasActiveContext={activeAskAi.hasActiveContext}
					externalActiveTab={chatTab}
					externalShouldExpand={shouldExpandChat}
					onAIReplyClick={(message) => {
						// When user clicks reply on an AI message, send a follow-up question
						const followUpQuestion = `Following up on your previous response: "${message.content?.substring(
							0,
							100
						)}..." - Can you provide more details?`;
						void activeAskAi.sendMessage(
							followUpQuestion,
							undefined,
							undefined,
							message
						);
					}}
				/>
			</AskAIProvider>
			{previewingResourceId && (
				<DocumentPreviewModal
					resourceId={previewingResourceId}
					onClose={() => setPreviewingResourceId(null)}
					onDeleteSuccess={() => {
						// Optionally refresh something, but DocumentManager will refetch
					}}
				/>
			)}
			<Modal
				isOpen={copyModalOpen}
				onClose={() => {
					if (!isCopyingBorrower) {
						setCopyModalOpen(false);
						setCopyError(null);
					}
				}}
				title="Copy Borrower Profile"
			>
				<div className="space-y-4">
					<p className="text-sm text-gray-600">
						Copy borrower resume details and documents from an
						existing project. This will replace the current borrower
						resume and documents.
					</p>
					<Select
						options={templateOptions}
						value={copySourceProjectId}
						onChange={(event) =>
							setCopySourceProjectId(event.target.value)
						}
						placeholder={
							templateOptions.length
								? "Select a project"
								: "No other projects available"
						}
						disabled={
							templateOptions.length === 0 || isCopyingBorrower
						}
					/>
					{copyError && (
						<p className="text-sm text-red-600">{copyError}</p>
					)}
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => {
								if (!isCopyingBorrower) {
									setCopyModalOpen(false);
									setCopyError(null);
								}
							}}
							disabled={isCopyingBorrower}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCopyBorrowerProfile}
							disabled={!copySourceProjectId || isCopyingBorrower}
						>
							{isCopyingBorrower ? "Copying..." : "Copy Profile"}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
