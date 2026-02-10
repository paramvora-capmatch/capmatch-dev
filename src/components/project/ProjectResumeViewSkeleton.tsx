// src/components/project/ProjectResumeViewSkeleton.tsx
import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';

export const ProjectResumeViewSkeleton: React.FC = () => {
  return (
    <Card className="bg-white rounded-2xl shadow-xl border-2 border-gray-300 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Skeleton sections */}
          {[1, 2, 3, 4].map((section) => (
            <div key={section} className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="space-y-2 pl-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

