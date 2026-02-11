// src/components/project/ProjectCompletionCardSkeleton.tsx
import React from 'react';

export const ProjectCompletionCardSkeleton: React.FC = () => {
  return (
    <div className="p-0">
      <div className="rounded-2xl p-4 bg-white shadow-lg border-2 border-gray-300 animate-pulse">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <div className="h-5 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-5 bg-gray-200 rounded w-12"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="relative w-full bg-gray-200 rounded-md h-4 overflow-hidden">
          <div className="h-full bg-gray-300 rounded-md w-2/3"></div>
        </div>
      </div>
    </div>
  );
};

