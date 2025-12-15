/**
 * OM Project Guard Component
 * 
 * Wrapper component that validates project existence and handles
 * common loading/error states for OM pages.
 */

import React from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useOMDataContext, type OMData } from "@/contexts/OMDataContext";
import { OMErrorState } from "./OMErrorState";
import { OMLoadingState } from "./OMLoadingState";
import type { ProjectProfile } from "@/types/enhanced-types";

interface OMProjectGuardProps {
	children: (props: {
		projectId: string;
		project: ProjectProfile;
		omData: NonNullable<OMData>;
	}) => React.ReactNode;
	showLoading?: boolean;
	showError?: boolean;
}

export function OMProjectGuard({
	children,
	showLoading = true,
	showError = true,
}: OMProjectGuardProps) {
	const params = useParams();
	// Extract id immediately to avoid read-only property issues in Next.js 15
	const projectId = typeof params?.id === 'string' ? params.id : '';
	const projectsHook = useProjects();
	const getProject = projectsHook.getProject;
	const project = projectId ? getProject(projectId) : null;
	// Consume OM data from context (fetched once at layout level)
	const { omData, isLoading, error } = useOMDataContext();

	if (!project) {
		return <div>Project not found</div>;
	}

	if (showLoading && isLoading) {
		return <OMLoadingState />;
	}

	if (showError && (error || !omData)) {
		return <OMErrorState error={error} />;
	}

	if (!omData) {
		return <OMErrorState />;
	}

	return <>{children({ projectId, project, omData })}</>;
}

