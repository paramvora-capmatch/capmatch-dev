// src/app/project/documents/[id]/page.tsx
"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { Button } from "../../../../components/ui/Button";
import { RoleBasedRoute } from "../../../../components/auth/RoleBasedRoute";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";

import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { ChevronLeft, Loader2 } from "lucide-react";
import { DocumentManager } from "@/components/documents/DocumentManager";

export default function ProjectDocumentsPage() {
	const router = useRouter();
	const params = useParams();
	const { getProject, isLoading } = useProjects();
	const { user } = useAuth(); // The bucket is the borrower's ID

	const projectId = params?.id as string;
	const project = getProject(projectId);

	if (!project) {
		// If loading, show a loader. If done loading and still no project, show error.
		if (isLoading) {
			return (
				<RoleBasedRoute roles={["borrower"]}>
					<DashboardLayout title="Loading Documents...">
						<div className="flex justify-center items-center h-64">
							<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						</div>
					</DashboardLayout>
				</RoleBasedRoute>
			);
		}
		return (
			<RoleBasedRoute roles={["borrower"]}>
				<DashboardLayout title="Project Documents">
					<div className="text-center py-8">
						<h2 className="text-xl font-semibold text-gray-800 mb-2">
							Project not found
						</h2>
						<p className="text-gray-600 mb-6">
							The project you're looking for doesn't exist or has
							been removed.
						</p>
						<Button
							variant="outline"
							leftIcon={<ChevronLeft size={16} />}
							onClick={() => router.push("/dashboard")}
						>
							Back to Dashboard
						</Button>
					</div>
				</DashboardLayout>
			</RoleBasedRoute>
		);
	}

	return (
		<RoleBasedRoute roles={["borrower"]}>
			<DashboardLayout title={`Documents - ${project.projectName}`}>
				<LoadingOverlay isLoading={isLoading} />

				<div className="mb-6">
					<Button
						variant="outline"
						leftIcon={<ChevronLeft size={16} />}
						onClick={() =>
							router.push(`/project/workspace/${project.id}`)
						}
					>
						Back to Workspace
					</Button>
				</div>

				<DocumentManager
					bucketId={user?.id || null} // Borrower's own bucket
					folderPath={project.id} // Project-specific folder
					title="Project Documents"
					canUpload={true}
					canDelete={true}
				/>
			</DashboardLayout>
		</RoleBasedRoute>
	);
}
