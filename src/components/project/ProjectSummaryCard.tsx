// src/components/project/ProjectSummaryCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
// Removed Card wrappers to avoid extra white container around progress bars
import { Loader2, Edit } from 'lucide-react';
import { ProjectProfile } from '@/types/enhanced-types';
import { useBorrowerResumeStore } from '@/stores/useBorrowerResumeStore';
import { Button } from '@/components/ui/Button';

interface ProjectSummaryCardProps {
  project: ProjectProfile | null;
  isLoading: boolean;
  onEdit?: () => void;
  onBorrowerClick?: () => void; // Optional override for borrower resume click behavior
}

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
  project,
  isLoading,
  onEdit,
  onBorrowerClick
}) => {
  const router = useRouter();
  const completeness = project?.completenessPercent || 0;
  const isProjectHealthy = completeness >= 90;
  // Use blue for complete/healthy state, red for incomplete
  const progressColor = isProjectHealthy ? 'bg-blue-600' : 'bg-red-600';
  const progressBgColor = isProjectHealthy ? 'bg-blue-50' : 'bg-red-50';

  const { content: borrowerContent } = useBorrowerResumeStore();
  // Source of truth: borrower resume's own completeness; if not available, treat as 0.
  // This avoids falling back to stale per-project snapshots that can diverge.
  const borrowerCompleteness = Math.round((borrowerContent?.completenessPercent as number | undefined) ?? 0);
  const isBorrowerHealthy = borrowerCompleteness >= 90;
  // Progress colors standardized: blue when healthy, red when incomplete
  const borrowerProgressColor = isBorrowerHealthy ? 'bg-blue-600' : 'bg-red-600';
  const borrowerProgressBgColor = isBorrowerHealthy ? 'bg-blue-50' : 'bg-red-50';

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
            className={`rounded-2xl p-3 border-2 ${
              isBorrowerHealthy
                ? 'border-blue-400'
                : 'border-red-400'
            } bg-white cursor-pointer hover:opacity-95 transition p-4`}
            onClick={(e) => {
              e.stopPropagation();
              if (onBorrowerClick) {
                onBorrowerClick();
              } else {
                router.push('/dashboard/borrower-resume');
              }
            }}
            role="button"
            aria-label="Open borrower resume"
          >
            <div className="flex justify-between items-center mb-2 text-base">
              <span className={`font-semibold text-gray-900`}>
                Complete your borrower resume
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-gray-900`}>{borrowerCompleteness}%</span>
                <Button
                  size="sm"
                  variant={borrowerCompleteness < 80 ? 'outline' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onBorrowerClick) {
                      onBorrowerClick();
                    } else {
                      router.push('/dashboard/borrower-resume');
                    }
                  }}
                  className="justify-center text-sm px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {borrowerCompleteness < 80 ? 'Edit' : 'View Profile'}
                </Button>
              </div>
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
