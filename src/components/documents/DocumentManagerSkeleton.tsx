// src/components/documents/DocumentManagerSkeleton.tsx
import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';

interface DocumentManagerSkeletonProps {
  title?: string;
}

export const DocumentManagerSkeleton: React.FC<DocumentManagerSkeletonProps> = ({
  title = "Documents",
}) => {
  return (
    <Card className="bg-white rounded-2xl shadow-xl border-2 border-gray-300 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Skeleton file items */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg animate-pulse"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

