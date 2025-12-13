"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

export interface SettingsTabConfig {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  render: () => ReactNode;
}

interface SettingsModalProps {
  isOpen: boolean;
  tabs: SettingsTabConfig[];
  activeTabId: string;
  onClose: () => void;
  onTabChange: (tabId: string) => void;
}

export function SettingsModal({
  isOpen,
  tabs,
  activeTabId,
  onClose,
  onTabChange,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  if (!isOpen || !activeTab) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[61] w-full max-w-5xl h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex">
        <aside className="w-64 border-r border-gray-100 bg-gray-50 rounded-l-2xl p-4 flex flex-col gap-2">
          <div className="mb-2">
            <p className="text-sm font-semibold text-gray-800">Workspace Settings</p>
            <p className="text-xs text-gray-500">Choose an option to edit its details</p>
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-all border border-transparent",
                activeTab.id === tab.id
                  ? "bg-white text-blue-600 shadow-sm border-blue-100"
                  : "text-gray-600 hover:bg-white hover:text-gray-900"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="mt-0.5">{tab.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{tab.label}</span>
                {tab.description && (
                  <span className="block text-xs text-gray-500">{tab.description}</span>
                )}
              </span>
            </button>
          ))}
        </aside>
        <section className="flex-1 p-6 overflow-y-auto rounded-r-2xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{activeTab.label}</h2>
              {activeTab.description && (
                <p className="text-sm text-gray-500 mt-1">{activeTab.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>{activeTab.render()}</div>
        </section>
      </div>
    </div>,
    document.body
  );
}


