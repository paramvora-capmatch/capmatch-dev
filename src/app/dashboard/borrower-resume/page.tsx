// src/app/dashboard/borrower-resume/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { BorrowerResumeForm } from "../../../components/forms/BorrowerResumeForm";
import { DocumentManager } from "../../../components/documents/DocumentManager";

import { useBorrowerProfile } from "../../../hooks/useBorrowerProfile";

import { BorrowerResumeContent } from "../../../lib/project-queries";
import { Loader2 } from "lucide-react";
import { LoadingOverlay } from "../../../components/ui/LoadingOverlay"; // Import LoadingOverlay
import { ArrowLeft } from "lucide-react";

export default function BorrowerResumePage() {
	const router = useRouter();
	// Use context hook, providing a fallback empty object if context is not ready
	const { isLoading: profileLoading } =
		useBorrowerProfile() || { content: null, isLoading: true };

	// Handle borrower resume completion from the form's onComplete callback
	const handleBorrowerResumeComplete = async (borrowerResume: BorrowerResumeContent | null) => {
		if (!borrowerResume) {
			router.push("/dashboard"); // Go to dashboard on failure/cancellation
			return;
		}

		// Borrower resume completed successfully, redirect to dashboard
		// The first project is already created by the edge function during onboarding
		router.replace("/dashboard");
	};

	// Render the breadcrumb element for DashboardLayout
	const breadcrumb = (
		<nav className="flex items-center space-x-2 text-2xl mb-2">
			<button
				onClick={() => router.push("/dashboard")}
				className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
				aria-label="Go back to Dashboard"
			>
				<ArrowLeft className="h-4 w-4" />
			</button>
			<button
				onClick={() => router.push("/dashboard")}
				className="text-gray-500 hover:text-gray-700 font-medium"
			>
				Dashboard
			</button>
			<span className="text-gray-400">/</span>
			<span className="text-gray-800 font-semibold">
				Borrower Resume
			</span>
		</nav>
	);

	return (
		<RoleBasedRoute roles={["borrower"]}>
            <DashboardLayout breadcrumb={breadcrumb}>
				<LoadingOverlay isLoading={false} />{" "}
				{/* Display loading overlay based on UI context */}
				{profileLoading ? ( // Check borrower resume specific loading state
					<div className="flex justify-center items-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						<span className="ml-3 text-gray-600">
							Loading Borrower Resume...
						</span>
					</div>
				) : (
                    <>
                        <div className="max-w-5xl mx-auto">
                            {/* Borrower Documents moved from /documents */}
                            <div className="mb-6 p-4 bg-white rounded shadow-sm border">
                                <p className="text-gray-600">
                                    Manage documents related to you as a borrower, such as Personal Financial Statements (PFS), Schedule of Real Estate Owned (SREO), and entity documents. These documents can be used across multiple projects.
                                </p>
                            </div>
                            <div className="mb-8">
                                <DocumentManager
                                    projectId={null}
                                    resourceId="BORROWER_ROOT"
                                    title="General Borrower Documents"
                                />
                            </div>
							<div className="mb-6 p-4 bg-white rounded shadow-sm border">
								<p className="text-gray-600">
									Your borrower resume is used across all your
									projects. Complete it thoroughly to help match
									you with appropriate lenders. Changes are
									auto-saved.
								</p>
							</div>
							{/* Pass the completion handler */}
							<BorrowerResumeForm
								onComplete={handleBorrowerResumeComplete}
							/>
						</div>
					</>
				)}
			</DashboardLayout>
		</RoleBasedRoute>
	);
}

