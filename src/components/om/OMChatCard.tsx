"use client";

import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/utils/cn";
import { OMChatSidebar } from "./OMChatSidebar";

interface OMChatCardProps {
  projectId: string;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  topOffsetClassName?: string; // e.g., "top-24"
  widthClassName?: string; // e.g., "w-[420px]"
}

export const OMChatCard: React.FC<OMChatCardProps> = ({
  projectId,
  isCollapsed: externalIsCollapsed,
  onCollapseChange,
  topOffsetClassName = "top-24",
  widthClassName = "w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]",
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  const isCollapsed = externalIsCollapsed ?? internalIsCollapsed;
  const setIsCollapsed = (value: boolean) => {
    if (onCollapseChange) {
      onCollapseChange(value);
    } else {
      setInternalIsCollapsed(value);
    }
  };

  return (
    <aside
      className={cn(
        "pl-3 sm:pl-4 mr-3 sm:mr-4 lg:mr-6 transition-[width] duration-300 ease-in-out pt-4",
        isCollapsed ? "w-14" : widthClassName
      )}
    >
      <div className={cn("sticky", topOffsetClassName)}>
        {isCollapsed ? (
          <button
            aria-label="Open Talk to OM chat"
            onClick={() => setIsCollapsed(false)}
            className="h-[calc(100vh-10rem)] w-14 rounded-2xl shadow-lg border border-gray-200 bg-white/70 hover:bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-2 relative transition-colors"
            title="Open Talk to OM chat"
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <span className="mt-1 text-[10px] text-gray-600 text-center">
              Talk to OM
            </span>
          </button>
        ) : (
          <div className="h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex-1 min-h-0">
              <OMChatSidebar />
            </div>
            <button
              aria-label="Collapse chat"
              onClick={() => setIsCollapsed(true)}
              className="mt-2 w-full p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm text-center"
              title="Collapse chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="rotate-180 inline-block mr-1">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              Collapse
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

