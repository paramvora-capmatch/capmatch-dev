"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { OnlyOfficeEditor } from "@/components/documents/OnlyOfficeEditor";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const bucketId = searchParams.get("bucket");
  const filePath = searchParams.get("path");

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
  // This ensures that if you navigate away and come back to the same file,
  // the component is treated as a fresh instance
  const editorKey = `editor-${bucketId}-${filePath}`;

  return (
    <OnlyOfficeEditor
      key={editorKey}
      bucketId={bucketId}
      filePath={decodeURIComponent(filePath)}
    />
  );
}

export default function DocumentEditPage() {
  return <EditorPageContent />;
}
