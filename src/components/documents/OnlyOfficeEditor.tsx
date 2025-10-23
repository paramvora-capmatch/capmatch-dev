"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface OnlyOfficeEditorProps {
  bucketId: string;
  filePath: string;
  mode?: "edit" | "view";
}

export const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({
  bucketId,
  filePath,
  mode = "edit",
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const docEditorRef = useRef<any>(null); // Use 'any' for simplicity with external library
  const initializationRef = useRef<boolean>(false);

  // Callback for when the script loads
  const handleScriptLoad = useCallback(() => {
    console.log("[OnlyOfficeEditor] OnlyOffice script loaded successfully");
    // @ts-expect-error - OnlyOffice DocsAPI is loaded dynamically
    if (window.DocsAPI) {
      console.log("[OnlyOfficeEditor] DocsAPI is available on window");
      setIsScriptReady(true);
    } else {
      console.error(
        "[OnlyOfficeEditor] DocsAPI not found on window after script load"
      );
      setError("OnlyOffice API failed to initialize. Please refresh the page.");
    }
  }, []);

  const handleScriptError = useCallback(() => {
    console.error("[OnlyOfficeEditor] Failed to load OnlyOffice script");
    setError("Failed to load OnlyOffice editor. Please refresh the page.");
  }, []);

  // Effect to check if script is already loaded (for subsequent component mounts or hot reloads)
  useEffect(() => {
    // @ts-expect-error - OnlyOffice DocsAPI is loaded dynamically
    if (window.DocsAPI) {
      console.log(
        "[OnlyOfficeEditor] DocsAPI already available on window (on mount)"
      );
      setIsScriptReady(true);
    }
  }, []); // Empty dependency array to run once on mount

  const initializeEditor = useCallback(async () => {
    if (!isScriptReady) {
      console.log(
        "[OnlyOfficeEditor] Script not ready, skipping initialization."
      );
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (initializationRef.current) {
      console.log(
        "[OnlyOfficeEditor] Initialization already in progress, skipping"
      );
      return;
    }
    initializationRef.current = true;

    setIsLoading(true);
    setError(null);

    // Give the DOM time to fully render the container
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify container exists in DOM
    const container = document.getElementById("onlyoffice-editor-container");
    if (!container) {
      console.error(
        "[OnlyOfficeEditor] Container #onlyoffice-editor-container not found in DOM"
      );
      setError("Editor container not found. Please refresh the page.");
      setIsLoading(false);
      initializationRef.current = false;
      return;
    }

    // Destroy any existing editor instance
    if (docEditorRef.current) {
      console.log("[OnlyOfficeEditor] Destroying existing editor instance");
      try {
        docEditorRef.current.destroyEditor();
      } catch (e) {
        console.warn("[OnlyOfficeEditor] Error destroying existing editor:", e);
      }
      docEditorRef.current = null;
    }

    if ((window as any).docEditor && (window as any).docEditor !== docEditorRef.current) {
      try {
        (window as any).docEditor.destroyEditor();
      } catch (e) {
        console.warn(
          "[OnlyOfficeEditor] Error destroying global window.docEditor:",
          e
        );
      }
      (window as any).docEditor = null;
    }

    try {
      const res = await fetch("/api/onlyoffice/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucketId, filePath, mode }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Failed to fetch editor configuration."
        );
      }

      const config = await res.json();
      console.log(
        "[OnlyOfficeEditor] Config received, initializing editor with key:",
        config.document.key
      );

      // Check container still exists before creating editor
      const containerStillExists = document.getElementById(
        "onlyoffice-editor-container"
      );
      if (!containerStillExists) {
        throw new Error("Editor container was removed from DOM");
      }

      // Verify DocsAPI is available
      // @ts-expect-error DocsAPI is loaded dynamically and not in TypeScript definitions
      if (!window.DocsAPI) {
        throw new Error(
          "DocsAPI is not available. OnlyOffice script may not have loaded properly."
        );
      }

      // @ts-expect-error DocsAPI is loaded dynamically and not in TypeScript definitions
      const newDocEditor = new DocsAPI.DocEditor(
        "onlyoffice-editor-container",
        config
      );

      docEditorRef.current = newDocEditor;
      (window as any).docEditor = newDocEditor;
      console.log("[OnlyOfficeEditor] Editor initialized successfully");
    } catch (err: unknown) {
      console.error("Error initializing editor:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
      initializationRef.current = false;
    }
  }, [isScriptReady, bucketId, filePath, mode]);

  // Initialize editor when script is ready or dependencies change
  useEffect(() => {
    initializeEditor();

    return () => {
      // Cleanup on unmount or when dependencies change
      console.log("[OnlyOfficeEditor] Cleanup: destroying editor");
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
        } catch (e) {
          console.warn("[OnlyOfficeEditor] Error destroying editor:", e);
        }
        docEditorRef.current = null;
      }
      initializationRef.current = false; // Reset initialization flag
    };
  }, [initializeEditor]);

  // Handle page navigation/back button
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("[OnlyOfficeEditor] Page unloading, cleaning up editor");
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
        } catch (e) {
          console.warn(
            "[OnlyOfficeEditor] Error destroying editor on unload:",
            e
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Conditional logic after all hooks have been called
  const onlyofficeUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
  if (!onlyofficeUrl) {
    return (
      <div className="text-red-500 p-8">
        Error: NEXT_PUBLIC_ONLYOFFICE_URL is not configured in your .env file.
      </div>
    );
  }
  const onlyofficeApiUrl = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;

  return (
    <>
      <Script
        src={onlyofficeApiUrl}
        strategy="lazyOnload"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
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
          <div
            ref={editorContainerRef}
            id="onlyoffice-editor-container"
            className="h-full w-full"
            key={`editor-${bucketId}-${filePath}`}
          />
        </main>
      </div>
    </>
  );
};
