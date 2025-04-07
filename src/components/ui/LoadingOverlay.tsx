// src/components/ui/LoadingOverlay.tsx
'use client';

import React from 'react';
import { useUI } from '../../hooks/useUI';

export const LoadingOverlay: React.FC = () => {
  const { isLoading } = useUI();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700">Loading...</p>
      </div>
    </div>
  );
};