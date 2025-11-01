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
      {/* Ask AI Button */}
      <button
        onClick={() => onAskAI(id)}
        className="absolute -top-2 -right-2 px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md text-xs font-medium text-blue-700 opacity-0 group-hover/askai:opacity-100 transition-opacity z-10 cursor-pointer"
        title="Ask AI for help with this field"
      >
        Ask AI
      </button>
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