// src/components/ui/DragDropProvider.tsx
'use client';

import React from 'react';

interface AskAIButtonProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onAskAI: (fieldId: string) => void;
}

export const AskAIButton: React.FC<AskAIButtonProps> = ({ id, children, className = '', onAskAI }) => {
  return (
    <div className={`${className} relative group/askai`}>
      {children}
    </div>
  );
};

interface AskAIProviderProps {
  children: React.ReactNode;
  onFieldAskAI: (fieldId: string) => void;
}

export const AskAIProvider: React.FC<AskAIProviderProps> = ({ children }) => {
  return (
    <>{children}</>
  );
}; 