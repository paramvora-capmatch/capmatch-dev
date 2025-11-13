// src/components/dashboard/ProjectCardSkeleton.tsx
import React from "react";
import { Card, CardContent } from "../ui/card";

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <Card className="h-full flex flex-col rounded-xl overflow-hidden bg-white border border-gray-200 min-h-[210px] md:min-h-[250px] lg:min-h-[280px]">
      {/* Progress bar skeleton */}
      <div className="h-2 bg-gray-100">
        <div className="h-full bg-gray-200 w-3/4 animate-pulse" />
      </div>

      <CardContent className="p-6 flex flex-col flex-grow">
        {/* Title skeleton */}
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="h-7 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        </div>

        {/* Content skeletons */}
        <div className="space-y-3 mb-5">
          {/* Asset type skeleton */}
          <div className="flex items-center">
            <div className="h-6 w-6 bg-gray-200 rounded-full mr-2 animate-pulse flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>

          {/* Date skeleton */}
          <div className="flex items-center">
            <div className="h-6 w-6 bg-gray-200 rounded-full mr-2 animate-pulse flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
          </div>

          {/* Progress skeleton */}
          <div className="flex items-center">
            <div className="h-6 w-6 bg-gray-200 rounded-full mr-2 animate-pulse flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

