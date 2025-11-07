// src/components/project/ProjectSummaryCard.tsx
import React from 'react';
// Removed Card wrappers to avoid extra white container around progress bars
import { Loader2, Edit } from 'lucide-react';
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '@/components/ui/Button';

interface ProjectSummaryCardProps {
  project: ProjectProfile | null;
  isLoading: boolean;
  onEdit?: () => void;
  onBorrowerClick?: () => void; // Optional override for borrower resume click behavior
  borrowerProgress?: number;
}

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
  project,
  isLoading,
  onEdit,
  onBorrowerClick,
  borrowerProgress = 0,
}) => {
  const completeness = project?.completenessPercent || 0;
  const isProjectComplete = completeness >= 100;
  const isProjectHealthy = completeness >= 90;
  // Green when complete (100%), blue when healthy (>=90% but <100%), red when incomplete
  const progressColor = isProjectComplete ? 'bg-green-600' : (isProjectHealthy ? 'bg-blue-600' : 'bg-red-600');
  const progressBgColor = isProjectComplete ? 'bg-green-50' : (isProjectHealthy ? 'bg-blue-50' : 'bg-red-50');

  const borrowerCompleteness = Math.round(borrowerProgress ?? 0);
  const isBorrowerComplete = borrowerCompleteness >= 100;
  const isBorrowerHealthy = borrowerCompleteness >= 90;
  // Green when complete (100%), blue when healthy (>=90% but <100%), red when incomplete
  const borrowerProgressColor = isBorrowerComplete ? 'bg-green-600' : (isBorrowerHealthy ? 'bg-blue-600' : 'bg-red-600');
  const borrowerProgressBgColor = isBorrowerComplete ? 'bg-green-50' : (isBorrowerHealthy ? 'bg-blue-50' : 'bg-red-50');
  
  // Determine bullet color based on progress
  const getBorrowerBulletColor = () => {
    if (borrowerCompleteness >= 90) return "bg-green-500";
    if (borrowerCompleteness >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleCardClick = () => {
    onEdit?.();
  };

  return (
    <div className="relative">
      {isLoading ? (
        <div className="h-12 flex items-center justify-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-3">Loading project...</span>
        </div>
      ) : project ? (
        <>
          {/* Borrower resume completion (full-width; no white card wrapper) */}
          <div
            className="group rounded-2xl p-3 bg-white cursor-pointer hover:opacity-95 transition p-4 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onBorrowerClick?.();
            }}
            role="button"
            aria-label="Open borrower resume"
          >
            <div className="flex justify-between items-center mb-2 text-base">
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-gray-900 flex items-center animate-pulse`}>
                  <span className={`w-1.5 h-1.5 ${getBorrowerBulletColor()} rounded-full mr-2`}></span>
                  Complete your borrower resume
                </span>
                <Button
                  size="sm"
                  variant={borrowerCompleteness < 80 ? 'outline' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBorrowerClick?.();
                  }}
                  className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                >
                  <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                    {borrowerCompleteness < 80 ? 'Edit' : 'View Profile'}
                  </span>
                </Button>
              </div>
              <span className={`font-semibold text-gray-900`}>{borrowerCompleteness}%</span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-md transition-all duration-700 ease-out ${borrowerProgressColor} shadow-sm relative overflow-hidden`}
                style={{ width: `${borrowerCompleteness}%` }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                  style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }}
                />
              </div>
              {borrowerCompleteness < 100 && (
                <div className={`absolute inset-0 ${borrowerProgressBgColor} rounded-md animate-pulse opacity-20`} />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-gray-500">No project found.</div>
      )}
    </div>
  );
};
