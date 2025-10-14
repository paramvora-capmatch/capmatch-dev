"use client";

import React, { useState, useRef } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Edit,
  X,
  FileArchive,
} from "lucide-react";

interface SampleDocument {
  name: string;
  fileType: string;
  documentType: "text" | "spreadsheet" | "presentation";
  size: string;
  description: string;
  icon: React.ReactNode;
}

export default function DocumentEditorPOC() {
  const [editingDocument, setEditingDocument] = useState<SampleDocument | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.includes("word") || type.includes("document")) {
      return <FileText className="w-8 h-8 text-blue-600" />;
    } else if (type.includes("sheet") || type.includes("excel")) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    } else if (type.includes("pdf")) {
      return <File className="w-8 h-8 text-red-600" />;
    }
    return <FileText className="w-8 h-8 text-gray-600" />;
  };

  const sampleDocuments: SampleDocument[] = [
    {
      name: "sample.docx",
      fileType: "docx",
      documentType: "text",
      size: "12 KB",
      description: "Sample Word Document",
      icon: <FileText className="w-8 h-8 text-blue-600" />,
    },
    {
      name: "sample.xlsx",
      fileType: "xlsx",
      documentType: "spreadsheet",
      size: "9 KB",
      description: "Sample Excel Spreadsheet",
      icon: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
    },
    {
      name: "sample.pptx",
      fileType: "pptx",
      documentType: "presentation",
      size: "25 KB",
      description: "Sample PowerPoint Presentation",
      icon: <FileArchive className="w-8 h-8 text-orange-600" />,
    },
    {
      name: "sample.pdf",
      fileType: "pdf",
      documentType: "text", // For viewing/annotating
      size: "15 KB",
      description: "Sample PDF Document",
      icon: <File className="w-8 h-8 text-red-600" />,
    },
  ];

  const handleEditDocument = (doc: SampleDocument) => {
    setEditingDocument(doc);
  };

  const handleCloseEditor = () => {
    setEditingDocument(null);
  };

  const getSupportedFormats = () => {
    return ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.csv";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col w-full">
      <div className="max-w-7xl mx-auto flex flex-col flex-grow w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Editor POC
          </h1>
          <p className="text-gray-600">
            Upload documents to test OnlyOffice collaborative editing
          </p>
        </div>
        <Script
          src="http://localhost:8080/web-apps/apps/api/documents/api.js"
          strategy="lazyOnload"
        />

        {!editingDocument ? (
          <>
            {/* Documents List */}
            {sampleDocuments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Sample Documents ({sampleDocuments.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sampleDocuments.map((doc) => (
                    <div
                      key={doc.name}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-3">
                          {doc.icon}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.size} - {doc.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit size={14} />}
                        onClick={() => handleEditDocument(doc)}
                        className="w-full"
                      >
                        Edit Document
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                How this POC works
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>
                  Run OnlyOffice Document Server:
                  <code className="block mt-1 bg-blue-100 p-2 rounded text-xs font-mono">
                    docker run -i -t -d -p 8080:80 --name onlyoffice
                    onlyoffice/documentserver
                  </code>
                </li>
                <li>
                  Place `sample.docx`, `sample.xlsx`, `sample.pptx`, and
                  `sample.pdf` files in your project's `/public/samples`
                  directory.
                </li>
                <li>Click "Edit Document" to open it in OnlyOffice editor</li>
                <li>
                  The editor loads the file from your Next.js app and calls back
                  to a Next.js API route upon saving.
                </li>
              </ol>
            </div>
          </>
        ) : (
          <OnlyOfficeEditor
            document={editingDocument}
            onClose={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
}

// OnlyOffice Editor Component
interface OnlyOfficeEditorProps {
  document: SampleDocument;
  onClose: () => void;
}

function OnlyOfficeEditor({ document, onClose }: OnlyOfficeEditorProps) {
  const [editorReady, setEditorReady] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const initializeEditor = async () => {
      // @ts-ignore
      if (!window.DocsAPI || !document || !editorContainerRef.current) {
        return;
      }

      // Ensure the container has a non-zero height
      const containerHeight =
        editorContainerRef.current.getBoundingClientRect().height;
      if (containerHeight < 100) {
        // Increased threshold to ensure sufficient height
        setTimeout(initializeEditor, 100);
        return;
      }

      setIsLoadingConfig(true);

      // @ts-ignore
      if (window.docEditor) {
        // @ts-ignore
        window.docEditor.destroyEditor();
      }

      const payload = {
        fileName: document.name,
        fileType: document.fileType,
        documentType: document.documentType,
        height: `${containerHeight}px`, // Pass the computed height
      };

      try {
        const response = await fetch("/api/onlyoffice/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to get config: ${response.statusText}`);
        }

        const finalConfig = await response.json();

        // Explicitly set height to match container
        finalConfig.height = `${containerHeight}px`;

        // @ts-ignore
        const editor = new DocsAPI.DocEditor("onlyoffice-editor", finalConfig);
        // @ts-ignore
        window.docEditor = editor;
        setEditorReady(true);

        // Force resize after initialization
        window.dispatchEvent(new Event("resize"));
      } catch (error) {
        console.error("Error initializing OnlyOffice editor:", error);
        alert(
          `Could not initialize editor: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoadingConfig(false);
      }
    };

    const scriptCheckInterval = setInterval(() => {
      // @ts-ignore
      if (typeof window.DocsAPI !== "undefined" && window.DocsAPI.DocEditor) {
        clearInterval(scriptCheckInterval);
        initializeEditor();
      }
    }, 100);

    return () => {
      clearInterval(scriptCheckInterval);
      // @ts-ignore
      if (window.docEditor) {
        // @ts-ignore
        window.docEditor.destroyEditor();
        // @ts-ignore
        window.docEditor = null;
      }
    };
  }, [document]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-grow">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {document.name}
          </h3>
          <p className="text-sm text-gray-600">Editing in OnlyOffice</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close Editor
        </Button>
      </div>
      <div
        ref={editorContainerRef}
        id="onlyoffice-editor"
        className="w-full relative flex-grow"
        style={{ minHeight: "600px" }} // Ensure minimum height
      >
        {isLoadingConfig && (
          <div className="absolute inset-0 flex items-center justify-center bg-white text-gray-600">
            <span>Generating secure editor session...</span>
          </div>
        )}
      </div>
    </div>
  );
}
