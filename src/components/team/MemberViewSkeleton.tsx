// src/components/team/MemberViewSkeleton.tsx
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const MemberViewSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="h-7 bg-gray-200 rounded w-48 mx-auto mb-4 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* User Profile Section Skeleton */}
            <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Organization Section Skeleton */}
            <div className="p-6 border border-gray-200 rounded-lg space-y-3">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>

            {/* Info Note Skeleton */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

