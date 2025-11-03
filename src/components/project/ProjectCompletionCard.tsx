// src/components/project/ProjectCompletionCard.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
// No Card wrapper to avoid extra white container
import { ProjectProfile } from "@/types/enhanced-types";

interface ProjectCompletionCardProps {
  project: ProjectProfile | null;
  isLoading?: boolean;
  onEdit?: () => void;
}

export const ProjectCompletionCard: React.FC<ProjectCompletionCardProps> = ({
  project,
  isLoading,
  onEdit,
}) => {
  const completeness = project?.completenessPercent || 0;
  const isProjectHealthy = completeness >= 90;
  const progressColor = isProjectHealthy ? "bg-green-600" : "bg-red-600";
  const progressBgColor = isProjectHealthy ? "bg-emerald-50" : "bg-red-50";
  const router = useRouter();
  const isOmReady = completeness >= 100;

  return (
    <div className="p-0">
      {/* Project resume completion (full-width; no white card wrapper) */}
      <div
        className={`rounded-2xl p-3 border ${
          isProjectHealthy ? "border-emerald-200" : "border-red-200"
        } bg-white cursor-pointer hover:opacity-95 transition`}
        onClick={() => onEdit?.()}
        role="button"
        aria-label="Edit project resume"
      >
        <div className="flex justify-between items-center mb-2 text-sm">
          <span
            className={`font-medium flex items-center ${
              isProjectHealthy ? "text-emerald-800" : "text-red-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 ${
                isProjectHealthy ? "bg-emerald-400" : "bg-red-400"
              } rounded-full mr-2 animate-pulse`}
            ></span>
            Complete your project details to unlock the Offering Memorandum
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`font-semibold ${
                isProjectHealthy ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {completeness}%
            </span>
            <button
              type="button"
              aria-label="View OM"
              disabled={!isOmReady || !project?.id}
              onClick={(e) => {
                e.stopPropagation();
                if (isOmReady && project?.id) {
                  router.push(`/project/om/${project.id}`);
                }
              }}
              className={[
                "px-3 py-1.5 rounded-md border transition w-28 inline-flex items-center justify-center whitespace-nowrap gap-1.5 text-sm font-medium",
                isOmReady
                  ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white shadow"
                  : "bg-emerald-100 text-emerald-700 border-emerald-200 cursor-not-allowed opacity-70",
              ].join(" ")}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              View OM
            </button>
          </div>
        </div>
        <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-md transition-all duration-700 ease-out ${progressColor} shadow-sm relative overflow-hidden`}
            style={{ width: `${completeness}%` }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ backgroundSize: "200% 100%", animation: "shimmer 2s infinite" }}
            />
          </div>
          {completeness < 100 && (
            <div className={`absolute inset-0 ${progressBgColor} rounded-md animate-pulse opacity-20`} />
          )}
        </div>
      </div>
    </div>
  );
};


