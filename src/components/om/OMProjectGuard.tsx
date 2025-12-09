/**
 * OM Project Guard Component
 * 
 * Wrapper component that validates project existence and handles
 * common loading/error states for OM pages.
 */

import React from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useOMData } from "@/hooks/useOMData";
import { OMErrorState } from "./OMErrorState";
import { OMLoadingState } from "./OMLoadingState";

interface OMProjectGuardProps {
	children: (props: {
		projectId: string;
		project: NonNullable<ReturnType<typeof useProjects>["getProject"]>;
		omData: NonNullable<ReturnType<typeof useOMData>["omData"]>;
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
	const projectId = params?.id as string;
	const { getProject } = useProjects();
	const project = projectId ? getProject(projectId) : null;
	const { omData, isLoading, error } = useOMData(projectId || "");

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

