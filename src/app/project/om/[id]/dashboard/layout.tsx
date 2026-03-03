"use client";

import React, { useEffect, useState } from "react";
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
	// Extract id immediately to avoid read-only property issues in Next.js 15
	const projectId = typeof params?.id === 'string' ? params.id : '';
	const { getProject, refreshProject } = useProjects();
	const project = projectId ? getProject(projectId) : null;

	// When project is not in store (e.g. lender opened OM from /lender/project/[id]), fetch and add it
	const [projectLoadFailed, setProjectLoadFailed] = useState(false);
	useEffect(() => {
		if (!projectId || project) {
			setProjectLoadFailed(false);
			return;
		}
		let cancelled = false;
		refreshProject(projectId).then((ok) => {
			if (!cancelled) setProjectLoadFailed(!ok);
		});
		return () => { cancelled = true; };
	}, [projectId, project, refreshProject]);

	// Fetch OM data ONCE at layout level - shared across all child pages
	const { omData, isLoading, error } = useOMData(projectId || "");

	// All hooks must be called before any conditional logic
	const { scenario, setScenario } = useOMDashboard();

	// Still no project: show loading while we try to fetch, or "Project not found" if fetch failed
	if (!project) {
		if (!projectLoadFailed) {
			return (
				<div className="flex justify-center items-center min-h-[200px]">
					<div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
				</div>
			);
		}
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
