"use client";

import React from "react";
import {
	OMDashboardProvider,
	useOMDashboard,
} from "@/contexts/OMDashboardContext";
import { OMDataProvider } from "@/contexts/OMDataContext";
import { DashboardShell } from "@/components/om/DashboardShell";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useOMData } from "@/hooks/useOMData";

// Wrapper component to use the context within the layout
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const params = useParams();
	const projectId = params?.id as string;
	const { getProject } = useProjects();
	const project = projectId ? getProject(projectId) : null;

	// Fetch OM data ONCE at layout level - shared across all child pages
	const { omData, isLoading, error } = useOMData(projectId || "");

	// All hooks must be called before any conditional logic
	const { scenario, setScenario } = useOMDashboard();

	if (!project) {
		return <div>Project not found</div>;
	}

	return (
		<OMDataProvider omData={omData} isLoading={isLoading} error={error}>
			<DashboardShell
				projectId={projectId}
				projectName={project.projectName}
				currentScenario={scenario}
				onScenarioChange={setScenario}
			>
				{children}
			</DashboardShell>
		</OMDataProvider>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<OMDashboardProvider>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</OMDashboardProvider>
	);
}
