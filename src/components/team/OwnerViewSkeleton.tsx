// src/components/team/OwnerViewSkeleton.tsx
import React from 'react';
import { MemberCardSkeleton } from './MemberCardSkeleton';
import { PendingInviteCardSkeleton } from './PendingInviteCardSkeleton';

export const OwnerViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Pending Invites Section Skeleton */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2].map((i) => (
            <PendingInviteCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Active Members Section Skeleton */}
      <div>
        <div className="mb-4">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Owners Column Skeleton */}
          <div>
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Members Column Skeleton */}
          <div>
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

