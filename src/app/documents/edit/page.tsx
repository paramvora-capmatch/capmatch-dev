"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OnlyOfficeEditor } from "@/components/documents/OnlyOfficeEditor";
import { StickyChatCard } from "@/components/chat/StickyChatCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { Brain, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const bucketId = searchParams.get("bucket");
  const filePath = searchParams.get("path");
  const { user } = useAuthStore();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Extract projectId and resourceId from path: {projectId}/underwriting-docs/{resourceId}/{filename}
  const { projectId, resourceId, isUnderwritingDoc } = useMemo(() => {
    if (!filePath) return { projectId: null, resourceId: null, isUnderwritingDoc: false };
    const parts = filePath.split('/');
    const underwritingIndex = parts.indexOf('underwriting-docs');
    if (underwritingIndex !== -1 && parts.length >= underwritingIndex + 2) {
      return {
        projectId: parts[underwritingIndex - 1],
        resourceId: parts[underwritingIndex + 1],
        isUnderwritingDoc: true
      };
    }
    return { projectId: null, resourceId: null, isUnderwritingDoc: false };
  }, [filePath]);

  const isAdvisor = user?.role === 'advisor';
  const showChat = isAdvisor && isUnderwritingDoc && projectId && resourceId;

  if (!bucketId || !filePath) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-red-500">
          Missing required parameters (bucket or path) in URL.
        </div>
      </div>
    );
  }

  // Use a stable key based on the current params
  const editorKey = `editor-${bucketId}-${filePath}`;

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <OnlyOfficeEditor
          key={editorKey}
          bucketId={bucketId}
          filePath={decodeURIComponent(filePath)}
        />

        {/* AI Underwriter Trigger Tab */}
        {showChat && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600 text-white py-4 px-2 rounded-l-xl shadow-xl hover:bg-blue-700 transition-all flex flex-col items-center gap-2 group border border-blue-400 border-r-0"
          >
            <Brain size={20} className="group-hover:scale-110 transition-transform" />
            <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold tracking-widest uppercase">AI Underwriter</span>
          </button>
        )}

        {/* AI Underwriter Drawer */}
        <AnimatePresence>
          {showChat && isChatOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-[450px] bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col"
            >
              <div className="flex-1 overflow-hidden">
                <StickyChatCard
                  projectId={projectId}
                  topOffsetClassName="top-0"
                  widthClassName="w-full"
                  mode="underwriter"
                  hideTeamTab={true}
                  clientContext={{
                    context_type: "live_edit",
                    resource_id: resourceId,
                    resource_name: filePath.split('/').pop() || "Document",
                    doc_type: filePath.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  }}
                />
              </div>
              {/* Close handle */}
              <button
                onClick={() => setIsChatOpen(false)}
                className="absolute left-[-24px] top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-r-0 border-gray-200 rounded-l-md flex items-center justify-center shadow-md hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DocumentEditPage() {
  return <EditorPageContent />;
}
