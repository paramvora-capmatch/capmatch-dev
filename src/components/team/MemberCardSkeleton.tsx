// src/components/team/MemberCardSkeleton.tsx
import React from 'react';

export const MemberCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="h-6 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
          <div className="h-8 w-28 bg-gray-200 rounded"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

