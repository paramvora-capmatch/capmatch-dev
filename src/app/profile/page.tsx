// src/app/profile/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
// *** CORRECTED IMPORT ***
import MinimalSidebarLayout from "../../components/layout/MinimalSidebarLayout";
import { useAuth } from '@/hooks/useAuth';
import { BorrowerProfileForm } from "../../components/forms/BorrowerProfileForm";

import { useProjects } from "../../hooks/useProjects";
import { useBorrowerProfile } from "../../hooks/useBorrowerProfile";

import { BorrowerProfile } from "../../types/enhanced-types";
import { DocumentManager } from '@/components/documents/DocumentManager';
import { Loader2 } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"; // Import LoadingOverlay

export default function ProfilePage() {
	const router = useRouter();
	const { createProject, projects } = useProjects();
	// Use context hook, providing a fallback empty object if context is not ready
	const { borrowerProfile, isLoading: profileLoading } =
		useBorrowerProfile() || { borrowerProfile: null, isLoading: true };
	const { user } = useAuth();

	// Handle profile completion from the form's onComplete callback
	const handleProfileComplete = async (profile: BorrowerProfile | null) => {
		if (!profile) {
			router.push("/dashboard"); // Go to dashboard on failure/cancellation
			return;
		}

		// If the user has no projects, create their first one after profile completion.
		if (projects.length === 0) {
			try {
				console.log(
					"First time profile completion with 0 projects. Creating default project..."
				);
				const newProject = await createProject({
					projectName: "My First Project",
					projectStatus: "Info Gathering",
				});
				// Redirect to the new project's workspace
				router.replace(`/project/workspace/${newProject.id}`);
			} catch (error) {
				console.error(
					"Failed to create project after profile completion:",
					error
				);
				router.push("/dashboard"); // Fallback to dashboard
			}
		} else {
			// User already has projects, just go back to dashboard
			router.push("/dashboard");
		}
	};

	return (
		<RoleBasedRoute roles={["borrower"]}>
			{/* *** USE CORRECT LAYOUT *** */}
			<MinimalSidebarLayout
				title={
					borrowerProfile
						? "Update Borrower Profile"
						: "Create Borrower Profile"
				}
			>
				<LoadingOverlay isLoading={false} />{" "}
				{/* Display loading overlay based on UI context */}
				{profileLoading ? ( // Check profile specific loading state
					<div className="flex justify-center items-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						<span className="ml-3 text-gray-600">
							Loading Profile...
						</span>
					</div>
				) : (
					<>
						<div className="max-w-5xl mx-auto">
							<div className="mb-6 p-4 bg-white rounded shadow-sm border">
								<p className="text-gray-600">
									Your borrower profile is used across all your
									projects. Complete it thoroughly to help match
									you with appropriate lenders. Changes are
									auto-saved.
								</p>
							</div>
							{/* Pass the completion handler */}
							<BorrowerProfileForm
								onComplete={handleProfileComplete}
							/>
						</div>

						<div className="max-w-5xl mx-auto mt-8">
							<DocumentManager
								bucketId={user?.id || null}
								folderPath="borrower_docs"
								title="My Borrower Documents"
								canUpload={true}
								canDelete={true}
							/>
						</div>
					</>
				)}
			</MinimalSidebarLayout>
		</RoleBasedRoute>
	);
}
