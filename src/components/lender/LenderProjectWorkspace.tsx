"use client";

import React from "react";
import { ProjectProfile } from "@/types/enhanced-types";
import { UnderwritingVault } from "./UnderwritingVault";
import { Button } from "@/components/ui/Button";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { StickyChatCard } from "@/components/chat/StickyChatCard";

interface LenderProjectWorkspaceProps {
  project: ProjectProfile;
  borrowerResume: unknown;
  projectId: string;
}

/**
 * Lender deal workspace: View OM link, underwriting vault (view-only), and right panel
 * with Team chat, Meet, and AI Underwriter. No project/borrower resumes.
 */
export const LenderProjectWorkspace: React.FC<LenderProjectWorkspaceProps> = ({
  project,
  projectId,
}) => {
  const router = useRouter();

  const handleViewOM = () => {
    router.push(`/project/om/${projectId}/dashboard`);
  };

  return (
    <div
      className="relative w-full flex flex-row animate-fadeIn bg-gray-200"
      style={{ minHeight: "100vh", height: "auto" }}
    >
      {/* Background grid */}
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

      {/* Left column: View OM + Underwriting Vault (view-only) */}
      <div className="flex-1 relative z-[1] min-w-0">
        <div className="relative p-6 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Deal workspace</h2>
            <Button
              variant="outline"
              onClick={handleViewOM}
              className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
            >
              <ExternalLink className="h-4 w-4" />
              View OM
            </Button>
          </div>

          <div className="min-h-[600px]">
            <UnderwritingVault
              projectId={projectId}
              orgId={project.owner_org_id}
              viewerOnly={true}
            />
          </div>
        </div>
      </div>

      {/* Right column: Team chat, Meet, AI Underwriter */}
      <StickyChatCard
        projectId={projectId}
        topOffsetClassName="top-4 sm:top-6"
        widthClassName="w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]"
        mode="underwriter"
        defaultTopic="AI Underwriter"
      />
    </div>
  );
};
