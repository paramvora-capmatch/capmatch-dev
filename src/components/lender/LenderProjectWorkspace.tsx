"use client";

import React from "react";
import { ProjectProfile } from "@/types/enhanced-types";
import { UnderwritingVault } from "./UnderwritingVault";
import { Button } from "@/components/ui/Button";
import { FileSpreadsheet } from "lucide-react";
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

      {/* Left column: View OM (styled like borrower/advisor) + Underwriting Vault (view-only) */}
      <div className="flex-1 relative z-[1] min-w-0">
        <div className="relative p-6 min-w-0 space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-transparent to-green-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-green-200 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse" />
            <div className="relative z-10">
              <h3 className="text-base font-semibold text-emerald-800 flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                Deal Ready!
              </h3>
              <p className="text-sm text-emerald-700">
                View the Offering Memorandum for this deal.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleViewOM}
              className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 hover:border-emerald-400 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10 whitespace-nowrap flex-shrink-0"
            >
              <FileSpreadsheet className="mr-2 h-5 w-5" />
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
