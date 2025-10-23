"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/Button";
import {
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  Download,
  FolderOpen,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { cn } from "@/utils/cn";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import Link from "next/link";

interface DocumentManagerProps {
  projectId: string | null;

  // This should correspond to a resource_id for the folder, or special values like "PROJECT_ROOT" or "BORROWER_ROOT"
  resourceId: string | null;

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
  resourceId,
  title,
  canUpload = true,
  canDelete = true,
  highlightedResourceId,
}) => {
  // Convert special string values to null before passing to the hook
  const actualResourceId = React.useMemo(() => {
    if (resourceId === "PROJECT_ROOT" || resourceId === "BORROWER_ROOT") {
      return null;
    }
    return resourceId;
  }, [resourceId]);

  console.log("[DocumentManager] Props:", {
    projectId,
    resourceId,
    actualResourceId,
    title,
  });

  const {
    files,
    folders,
    isLoading,
    error,
    uploadFile,
    createFolder,
    deleteFile,
    deleteFolder,
    downloadFile,
    refresh,
  } = useDocumentManagement(projectId, actualResourceId);

  const { user, activeOrg, currentOrgRole } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Use actualResourceId for permissions check too
  const { canEdit: canPerformActions, isLoading: isLoadingPermissionsRoot } =
    usePermissions(actualResourceId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      console.log("[DocumentManager] Starting upload", {
        projectId,
        resourceId,
        activeOrgId: activeOrg?.id,
        userId: user?.id,
        currentOrgRole,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      });

      await uploadFile(selectedFile, actualResourceId || undefined);

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      await createFolder(newFolderName.trim(), actualResourceId || undefined);
      setNewFolderName("");
      setShowCreateFolder(false);
    } catch (error) {
      console.error("[DocumentManager] Create folder error", error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        // deleteFile expects the resource ID, not the version ID
        console.log("[DocumentManager] Deleting file:", {
          resourceId: file.resource_id,
          name: file.name,
        });
        await deleteFile(file.resource_id);
        await refresh(); // Refresh the list after deletion
      } catch (error) {
        console.error("[DocumentManager] Delete file error", error);
      }
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    if (
      window.confirm(
        `Are you sure you want to delete the folder "${folder.name}"? This will also delete all files and subfolders inside it.`
      )
    ) {
      try {
        await deleteFolder(folder.id);
      } catch (error) {
        console.error("[DocumentManager] Delete folder error", error);
      }
    }
  };

  const handleDownload = async (file: DocumentFile) => {
    try {
      // downloadFile might expect either version ID or resource ID - check the implementation
      // For now, use the version ID since we're downloading a specific version
      console.log("[DocumentManager] Downloading file:", {
        versionId: file.id,
        resourceId: file.resource_id,
        name: file.name,
      });
      await downloadFile(file.id);
    } catch (error) {
      console.error("[DocumentManager] Download error", error);
    }
  };

  const canEdit =
    currentOrgRole === "owner" || currentOrgRole === "project_manager";

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateFolder(!showCreateFolder)}
                  disabled={isCreatingFolder}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Folder
                </Button>
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
        {selectedFile && canEdit && (
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

        {/* Create Folder Area */}
        {showCreateFolder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center space-x-2"
          >
            <FolderOpen className="h-5 w-5 text-gray-600" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={isCreatingFolder}
            >
              {isCreatingFolder ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
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
                className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center">
                  <FolderOpen className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500">Folder</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(folder.created_at)}
                  </span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteFolder(folder)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.button>
            ))}

            {/* Files */}
            {files.map((file) => {
              const isEditable = /\.(docx|xlsx|pptx)$/i.test(file.name);
              console.log("[DocumentManager] Rendering file:", {
                name: file.name,
                versionId: file.id,
                resourceId: file.resource_id,
              });
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 text-left",
                    file.id === highlightedResourceId &&
                      "border-blue-500 ring-2 ring-blue-300 ring-offset-1"
                  )}
                >
                  <button
                    onClick={() => setPreviewingResourceId(file.resource_id)}
                    className="flex items-center space-x-3 overflow-hidden text-left"
                  >
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
                  </button>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <VersionHistoryDropdown
                        resourceId={file.resource_id}
                        onRollbackSuccess={() => refresh()}
                      />
                    )}
                    {isEditable && canEdit && (
                      <Button
                        as="a"
                        href={`/documents/edit?bucket=${
                          activeOrg?.id
                        }&path=${encodeURIComponent(file.storage_path)}`}
                        size="sm"
                        variant="outline"
                        title="Edit Document"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteFile(file)} // This will now use resource_id internally
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Empty State */}
            {files.length === 0 && folders.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No documents yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {canEdit
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
