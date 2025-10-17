// src/components/ui/LoadingSpinner.tsx
'use client';

import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-2">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  );
};


