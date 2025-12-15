// src/components/team/PendingInviteCardSkeleton.tsx
import React from 'react';

export const PendingInviteCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-gray-200"></div>
      </div>
      {/* Text skeleton */}
      <div className="mt-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="h-5 bg-gray-200 rounded w-40"></div>
          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
      </div>
      {/* Action button skeleton */}
      <div className="mt-4 flex justify-center">
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

