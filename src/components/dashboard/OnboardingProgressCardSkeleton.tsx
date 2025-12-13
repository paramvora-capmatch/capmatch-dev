// src/components/dashboard/OnboardingProgressCardSkeleton.tsx
import React from 'react';

export const OnboardingProgressCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 bg-gray-200 rounded w-40"></div>
            <div className="h-9 w-24 bg-gray-200 rounded-md"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="h-3 w-full bg-gray-200 rounded-md"></div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
      </div>
    </div>
  );
};

