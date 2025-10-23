"use client";

import React, { useState, Fragment } from "react";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/Button";
import {
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { cn } from "@/utils/cn";

interface DocumentManagerProps {
  projectId: string | null;
  folderId?: string | null;
  title: string;
  canUpload?: boolean;
  canDelete?: boolean;
  highlightedResourceId?: string | null;
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  projectId,
  folderId = null,
  title,
  canUpload = true,
  canDelete = true,
  highlightedResourceId,
}) => {
  const {
    files,
    folders,
    isLoading,
    uploadFile,
    error
  } = useDocumentManagement(projectId, folderId);

  const { currentOrgRole } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewingResourceId, setPreviewingResourceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      await uploadFile(selectedFile, folderId || undefined);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("[DocumentManager] Upload error", error);
    } finally {
      setIsUploading(false);
    }
  };

  const canUploadOverall = currentOrgRole === "owner"; // Only owners can upload at the root level for now

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            {canUpload && canUploadOverall && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {/* Upload Area */}
        {selectedFile && canUpload && canUploadOverall && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Upload"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple={false}
        />

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
          >
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading documents...</span>
          </div>
        )}

        {/* Documents List */}
        {!isLoading && (
          <div className="space-y-2">
            {/* Folders */}
            {folders.map((folder) => (
              <motion.button
                key={folder.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                // onClick={() => handleFolderClick(folder.id)} // TODO: Implement folder navigation
                className="w-full flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <FolderOpen className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {folder.name}
                  </p>
                  <p className="text-xs text-gray-500">Folder</p>
                </div>
              </motion.button>
            ))}

            {/* Files */}
            {files.map((file) => (
              <motion.button
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setPreviewingResourceId(file.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 text-left",
                  file.id === highlightedResourceId && "border-blue-500 ring-2 ring-blue-300 ring-offset-1"
                )}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.metadata?.size)} •{" "}
                      {formatDate(file.updated_at)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Empty State */}
            {files.length === 0 && folders.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No documents yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {canUpload && canUploadOverall
                    ? "Upload files or create folders to get started"
                    : "No documents available"}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {previewingResourceId && (
        <DocumentPreviewModal
          resourceId={previewingResourceId}
          onClose={() => setPreviewingResourceId(null)}
          onDeleteSuccess={() => {
            // Optionally refresh the list after delete
          }}
        />
      )}
    </Card>
  );
};
