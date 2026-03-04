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
        "fixed -translate-y-8 z-40 pl-3 sm:pl-4 pr-3 sm:pr-4 lg:pr-6 py-1 transition-[width] duration-300 ease-in-out flex flex-col",
        topOffsetClassName,
        "right-0 bottom-0",
        isCollapsed ? "w-14" : widthClassName
      )}
    >
      <div className="h-[calc(100vh-8.5rem)] w-full flex flex-col min-h-0">
        {isCollapsed ? (
          <button
            aria-label="Open Talk to OM chat"
            onClick={() => setIsCollapsed(false)}
            className="h-full w-14 rounded-2xl shadow-lg border border-gray-200 bg-white/70 hover:bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-2 relative transition-colors"
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
          <div className="h-full flex flex-col">
            <OMChatSidebar onCollapse={() => setIsCollapsed(true)} />
          </div>
        )}
      </div>
    </aside>
  );
};

