// src/components/project/ProjectSummaryCard.tsx
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { ProjectProfile } from '@/types/enhanced-types';

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
  const completeness = project?.completenessPercent || 0;
  const progressColor = completeness === 100 ? 'bg-green-600' : 'bg-blue-600';
  const progressBgColor = completeness === 100 ? 'bg-emerald-50' : 'bg-blue-50';

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
                <div className="w-full">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-medium text-gray-700 flex items-center animate-pulse">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                          Complete your project details to unlock the Offering Memorandum
                        </span>
                        <span className={`font-semibold transition-colors duration-300 ${completeness === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {completeness}%
                        </span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                        {/* Progress bar with solid color and animation */}
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor} shadow-sm relative overflow-hidden`}
                            style={{ width: `${completeness}%` }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                                 style={{
                                   backgroundSize: '200% 100%',
                                   animation: 'shimmer 2s infinite'
                                 }}
                            />
                        </div>
                        {/* Subtle glow effect for incomplete progress */}
                        {completeness < 100 && (
                          <div className={`absolute inset-0 ${progressBgColor} rounded-full animate-pulse opacity-20`} />
                        )}
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
