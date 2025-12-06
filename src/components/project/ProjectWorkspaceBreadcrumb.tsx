// src/components/project/ProjectWorkspaceBreadcrumb.tsx
import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProjectWorkspaceBreadcrumbProps {
  projectName: string;
  isBorrowerEditing: boolean;
  onBack: () => void;
  onBorrowerEditingChange: (value: boolean) => void;
  dashboardPath: string;
}

export const ProjectWorkspaceBreadcrumb = React.memo<ProjectWorkspaceBreadcrumbProps>(
  ({ projectName, isBorrowerEditing, onBack, onBorrowerEditingChange, dashboardPath }) => {
    const router = useRouter();

    return (
      <nav className="flex items-center space-x-2 text-base mb-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => router.push(dashboardPath)}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Dashboard
        </button>
        <span className="text-gray-400">/</span>
        {isBorrowerEditing ? (
          <>
            <button
              onClick={() => onBorrowerEditingChange(false)}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              {projectName}
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-semibold">Borrower Details</span>
          </>
        ) : (
          <span className="text-gray-800 font-semibold">{projectName}</span>
        )}
      </nav>
    );
  }
);

ProjectWorkspaceBreadcrumb.displayName = "ProjectWorkspaceBreadcrumb";

