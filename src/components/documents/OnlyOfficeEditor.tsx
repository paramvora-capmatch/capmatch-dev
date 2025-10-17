// src/components/documents/OnlyOfficeEditor.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface OnlyOfficeEditorProps {
  bucketId: string;
  filePath: string;
}

export const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({
  bucketId,
  filePath,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const onlyofficeUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
  if (!onlyofficeUrl) {
    return (
      <div className="text-red-500 p-8">
        Error: NEXT_PUBLIC_ONLYOFFICE_URL is not configured in your .env file.
      </div>
    );
  }
  const onlyofficeApiUrl = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;

  useEffect(() => {
    const initializeEditor = async () => {
      setIsLoading(true);
      setError(null);

      // @ts-ignore
      let docEditor: any = window.docEditor;
      if (docEditor) {
        docEditor.destroyEditor();
      }

      try {
        const res = await fetch("/api/onlyoffice/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucketId, filePath }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || "Failed to fetch editor configuration."
          );
        }

        const config = await res.json();

        // @ts-ignore
        docEditor = new DocsAPI.DocEditor(
          "onlyoffice-editor-container",
          config
        );

        // @ts-ignore
        window.docEditor = docEditor;
      } catch (err: any) {
        console.error("Error initializing editor:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isScriptReady) {
      initializeEditor();
    }

    return () => {
      // @ts-ignore
      const editor = window.docEditor;
      if (editor) {
        editor.destroyEditor();
        // @ts-ignore
        window.docEditor = null;
      }
    };
  }, [isScriptReady, bucketId, filePath]);

  return (
    <>
      <Script
        src={onlyofficeApiUrl}
        strategy="lazyOnload"
        onLoad={() => setIsScriptReady(true)}
      />
      <div className="h-screen w-screen flex flex-col bg-gray-100">
        <header className="bg-white shadow-sm p-3 flex justify-between items-center z-10 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back
          </Button>
          <div
            className="text-sm text-gray-600 truncate px-4"
            title={filePath.split("/").pop()}
          >
            {filePath.split("/").pop()}
          </div>
        </header>

        <main className="flex-1 relative">
          {(isLoading || error || !isScriptReady) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
              {error ? (
                <div className="text-red-500 text-center p-4">
                  <p className="font-semibold">Failed to load editor.</p>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              ) : (
                <div className="flex items-center text-gray-600">
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  <span>
                    {isScriptReady
                      ? "Configuring editor..."
                      : "Loading editor scripts..."}
                  </span>
                </div>
              )}
            </div>
          )}
          <div id="onlyoffice-editor-container" className="h-full w-full" />
        </main>
      </div>
    </>
  );
};
