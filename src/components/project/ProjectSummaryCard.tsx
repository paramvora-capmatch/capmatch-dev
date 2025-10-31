// src/components/project/ProjectSummaryCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { ProjectProfile } from '@/types/enhanced-types';
import { useBorrowerResumeStore } from '@/stores/useBorrowerResumeStore';

interface ProjectSummaryCardProps {
  project: ProjectProfile | null;
  isLoading: boolean;
  onEdit?: () => void;
}

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
  project,
  isLoading,
  onEdit
}) => {
  const router = useRouter();
  const completeness = project?.completenessPercent || 0;
  const isProjectHealthy = completeness >= 90;
  const progressColor = isProjectHealthy ? 'bg-green-600' : 'bg-red-600';
  const progressBgColor = isProjectHealthy ? 'bg-emerald-50' : 'bg-red-50';

  const { content: borrowerContent } = useBorrowerResumeStore();
  // Source of truth: borrower resume's own completeness; if not available, treat as 0.
  // This avoids falling back to stale per-project snapshots that can diverge.
  const borrowerCompleteness = Math.round((borrowerContent?.completenessPercent as number | undefined) ?? 0);
  const isBorrowerHealthy = borrowerCompleteness >= 90;
  const borrowerProgressColor = isBorrowerHealthy ? 'bg-green-600' : 'bg-red-600';
  const borrowerProgressBgColor = isBorrowerHealthy ? 'bg-emerald-50' : 'bg-red-50';

  const handleCardClick = () => {
    onEdit?.();
  };

  return (
    <Card
      className="shadow-sm border border-gray-200 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={handleCardClick}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-3 md:p-4 relative">
        {isLoading ? (
          <div className="h-12 flex items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="ml-3">Loading project...</span>
          </div>
        ) : project ? (
            <>
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project resume completion */}
                <div
                  className={`rounded-lg p-3 border ${isProjectHealthy ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'} cursor-pointer hover:opacity-95 transition`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
                  role="button"
                  aria-label="Edit project resume"
                >
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className={`font-medium flex items-center ${isProjectHealthy ? 'text-emerald-800' : 'text-red-800'}`}>
                      <span className={`w-1.5 h-1.5 ${isProjectHealthy ? 'bg-emerald-400' : 'bg-red-400'} rounded-full mr-2 animate-pulse`}></span>
                      Complete your project details to unlock the Offering Memorandum
                    </span>
                    <span className={`font-semibold ${isProjectHealthy ? 'text-emerald-700' : 'text-red-700'}`}>{completeness}%</span>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-md transition-all duration-700 ease-out ${progressColor} shadow-sm relative overflow-hidden`}
                      style={{ width: `${completeness}%` }}
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }}
                      />
                    </div>
                    {completeness < 100 && (
                      <div className={`absolute inset-0 ${progressBgColor} rounded-md animate-pulse opacity-20`} />
                    )}
                  </div>
                </div>

                {/* Borrower resume completion */}
                <div
                  className={`rounded-lg p-3 border ${isBorrowerHealthy ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'} cursor-pointer hover:opacity-95 transition`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/dashboard/borrower-resume');
                  }}
                  role="button"
                  aria-label="Open borrower resume"
                >
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className={`font-medium flex items-center ${isBorrowerHealthy ? 'text-emerald-800' : 'text-red-800'}`}>
                      <span className={`w-1.5 h-1.5 ${isBorrowerHealthy ? 'bg-emerald-400' : 'bg-red-400'} rounded-full mr-2 animate-pulse`}></span>
                      Complete your borrower resume
                    </span>
                    <span className={`font-semibold ${isBorrowerHealthy ? 'text-emerald-700' : 'text-red-700'}`}>{borrowerCompleteness}%</span>
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
              </div>
            </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No project found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
