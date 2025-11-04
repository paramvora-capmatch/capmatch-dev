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
import { AskAIProvider } from "@/components/ui/AskAIProvider";
import { StickyChatCard } from "@/components/chat/StickyChatCard";
import { useAskAI } from "@/hooks/useAskAI";

export default function BorrowerResumePage() {
	const router = useRouter();
	// Use context hook, providing a fallback empty object if context is not ready
    const { content: borrowerContent, isLoading: profileLoading } =
        useBorrowerProfile() || { content: null, isLoading: true };

	// Treat loading as blocking UI only when there is no content yet (initial load)
	const isInitialLoading = profileLoading && !borrowerContent;

    const [localCompletion, setLocalCompletion] = React.useState<number | null>(
		borrowerContent?.completenessPercent ?? null
	);

    const [activeFieldId, setActiveFieldId] = React.useState<string | null>(null);
    const [currentFormData, setCurrentFormData] = React.useState<Record<string, unknown>>({});
    const [chatTab, setChatTab] = React.useState<"team" | "ai">("team");
    const askAi = useAskAI({ formData: currentFormData, apiPath: '/api/borrower-qa', contextType: 'borrower' });

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
            <DashboardLayout breadcrumb={breadcrumb} scrollableContent={false}>
				<LoadingOverlay isLoading={false} />{" "}
				{/* Display loading overlay based on UI context */}
				{isInitialLoading ? ( // Only block UI on initial load when there's no content
					<div className="flex justify-center items-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						<span className="ml-3 text-gray-600">
							Loading Borrower Resume...
						</span>
					</div>
				) : (
                    <AskAIProvider onFieldAskAI={(fieldId: string) => setActiveFieldId(fieldId)}>
                    <div className="h-full w-full flex flex-row animate-fadeIn">
                        {/* Left Column: Scrollable content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Borrower Resume Completion Summary */}
                                {(() => {
                                    const completionValue = localCompletion ?? (borrowerContent?.completenessPercent ?? 0);
                                    return (
                                        <div className={`rounded-lg p-4 border ${(completionValue >= 90) ? 'border-emerald-200' : 'border-red-200'} bg-white`}>
                                            <div className="flex justify-between items-center mb-2 text-sm">
                                                <span className={`font-medium ${(completionValue >= 90) ? 'text-emerald-800' : 'text-red-800'}`}>Borrower Resume Completion</span>
                                                <span className={`font-semibold ${(completionValue >= 90) ? 'text-emerald-700' : 'text-red-700'}`}>{Math.round(completionValue)}%</span>
                                            </div>
                                            <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full rounded-md transition-all duration-700 ${(completionValue >= 90) ? 'bg-green-600' : 'bg-red-600'}`}
                                                    style={{ width: `${Math.round(completionValue)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                                {/* Borrower Documents moved from /documents */}
                                <div className="p-4 bg-white rounded shadow-sm border">
                                    <p className="text-gray-600">
                                        Manage documents related to you as a borrower, such as Personal Financial Statements (PFS), Schedule of Real Estate Owned (SREO), and entity documents. These documents can be used across multiple projects.
                                    </p>
                                </div>
                                <DocumentManager
                                    projectId={null}
                                    resourceId="BORROWER_ROOT"
                                    title="General Borrower Documents"
                                />
                                <div className="p-4 bg-white rounded shadow-sm border">
                                    <p className="text-gray-600">
                                        Your borrower resume is used across all your
                                        projects. Complete it thoroughly to help match
                                        you with appropriate lenders. Changes are
                                        auto-saved.
                                    </p>
                                </div>
                                {/* Pass the completion handler */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <BorrowerResumeForm
                                        onComplete={handleBorrowerResumeComplete}
                                        onProgressChange={(p) => setLocalCompletion(p)}
                                        onFormDataChange={setCurrentFormData}
                                        onAskAI={(fieldId) => {
                                          setActiveFieldId(fieldId);
                                          // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                          askAi.activateField(fieldId, { autoSend: true });
                                          setChatTab("ai");
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Sticky Ask AI Chat */}
                        <StickyChatCard
                          topOffsetClassName="top-4 sm:top-6"
                          widthClassName="w-[340px] md:w-[360px] xl:w-[420px]"
                          messages={askAi.messages}
                          fieldContext={askAi.fieldContext}
                          isLoading={askAi.isLoading}
                          isBuildingContext={askAi.isBuildingContext}
                          contextError={askAi.contextError}
                          hasActiveContext={askAi.hasActiveContext}
                          externalActiveTab={chatTab}
                        />
                    </div>
                    </AskAIProvider>
				)}
			</DashboardLayout>
		</RoleBasedRoute>
	);
}

