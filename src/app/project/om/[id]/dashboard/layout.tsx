"use client";

import React from "react";
import {
	OMDashboardProvider,
	useOMDashboard,
} from "@/contexts/OMDashboardContext";
import { DashboardShell } from "@/components/om/DashboardShell";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";

// Wrapper component to use the context within the layout
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const params = useParams();
	const projectId = params?.id as string;
	const { getProject } = useProjects();
	const project = projectId ? getProject(projectId) : null;

	if (!project) {
		return <div>Project not found</div>;
	}

	// Since this is a client component, we can use the context hook here.
	const { scenario, setScenario } = useOMDashboard();

	return (
		<DashboardShell
			projectId={projectId}
			projectName={project.projectName}
			currentScenario={scenario}
			onScenarioChange={setScenario}
		>
			{children}
		</DashboardShell>
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
