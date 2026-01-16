"use client";

import React, { useState } from "react";
import { ProjectProfile } from "@/types/enhanced-types";
import { UnderwritingVault } from "./UnderwritingVault";
import { ProjectResumeView } from "@/components/project/ProjectResumeView";
import { BorrowerResumeView } from "@/components/forms/BorrowerResumeView";
import { Button } from "@/components/ui/Button";
import { FileText, ShieldCheck, ExternalLink } from "lucide-react";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";
import { AskAIProvider } from "@/components/ui/AskAIProvider";
import { StickyChatCard } from "@/components/chat/StickyChatCard";
import { useAskAI } from "@/hooks/useAskAI";

interface LenderProjectWorkspaceProps {
    project: ProjectProfile;
    borrowerResume: any;
    projectId: string;
}

type WorkspaceMode = "resume" | "underwriting";

export const LenderProjectWorkspace: React.FC<LenderProjectWorkspaceProps> = ({
    project,
    borrowerResume,
    projectId,
}) => {
    const [mode, setMode] = useState<WorkspaceMode>("resume");
    const router = useRouter();

    // Setup AskAI for the "project" context by default for simplicity
    // Ideally, this could switch contexts based on the mode, but 'project' is a safe default for general retrieval
    const activeAskAi = useAskAI({
        formData: (project as unknown as Record<string, unknown>) || {},
        apiPath: "/api/project-qa",
        contextType: "project",
    });

    const handleViewOM = () => {
        // Navigate to OM page
        router.push(`/project/om/${projectId}/dashboard`);
    };

    const handleFieldAskAI = (fieldId: string) => {
        void activeAskAi.activateField(fieldId, { autoSend: true });
    };

    return (
        <AskAIProvider onFieldAskAI={handleFieldAskAI}>
            <div
                className="relative w-full flex flex-row animate-fadeIn bg-gray-200"
                style={{ minHeight: "100vh", height: "auto" }}
            >
                {/* Global page background (grid + blue tint) behind both columns */}
                <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{ minHeight: "100vh" }}
                >
                    <div className="absolute inset-0 opacity-[0.5]">
                        <svg
                            className="absolute inset-0 h-full w-full text-blue-500"
                            aria-hidden="true"
                        >
                            <defs>
                                <pattern
                                    id="lender-grid-pattern"
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
                                fill="url(#lender-grid-pattern)"
                            />
                        </svg>
                    </div>
                </div>

                {/* Left Column: Scrollable content */}
                <div className="flex-1 relative z-[1] min-w-0">
                    <div className="relative p-6 min-w-0 space-y-6">

                        {/* Mode Switcher and Meta Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setMode("resume")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                        mode === "resume"
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                                    )}
                                >
                                    <FileText className="h-4 w-4" />
                                    Resume View
                                </button>
                                <button
                                    onClick={() => setMode("underwriting")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                        mode === "underwriting"
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                                    )}
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Underwriting
                                </button>
                            </div>

                            {mode === "resume" && (
                                <Button
                                    variant="outline"
                                    onClick={handleViewOM}
                                    className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View OM
                                </Button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[600px]">
                            {mode === "resume" ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Project Resume */}
                                    <ProjectResumeView
                                        project={project}
                                        onEdit={() => { }}
                                        canEdit={false}
                                    />

                                    {/* Borrower Resume */}
                                    <BorrowerResumeView
                                        resume={borrowerResume}
                                        projectId={projectId}
                                        onEdit={() => { }}
                                        canEdit={false}
                                    />
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <UnderwritingVault projectId={projectId} orgId={project.owner_org_id} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Sticky Chat Card */}
                <StickyChatCard
                    projectId={projectId}
                    topOffsetClassName="top-4 sm:top-6"
                    widthClassName="w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]"
                    messages={activeAskAi.messages}
                    fieldContext={activeAskAi.fieldContext}
                    isLoading={activeAskAi.isLoading}
                    isBuildingContext={activeAskAi.isBuildingContext}
                    contextError={activeAskAi.contextError}
                    hasActiveContext={activeAskAi.hasActiveContext}
                    onAIReplyClick={(message) => {
                        const followUpQuestion = `Following up: "${message.content?.substring(0, 50)}..." - details?`;
                        void activeAskAi.sendMessage(followUpQuestion, undefined, undefined, message);
                    }}
                />
            </div>
        </AskAIProvider>
    );
};
