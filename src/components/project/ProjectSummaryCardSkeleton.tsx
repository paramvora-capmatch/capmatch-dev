// src/components/project/ProjectSummaryCardSkeleton.tsx
import React from 'react';

export const ProjectSummaryCardSkeleton: React.FC = () => {
  return (
    <div className="relative">
      <div className="group rounded-2xl p-4 bg-white shadow-sm animate-pulse">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
              <div className="h-5 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded-md"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden">
          <div className="h-full bg-gray-300 rounded-md w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

