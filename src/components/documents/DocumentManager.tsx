"use client";

import React, { useState } from "react";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/Button";
import {
  Share2,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import { motion } from "framer-motion";
import { useOrgStore } from "@/stores/useOrgStore";
import { ShareModal } from "./ShareModal";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissionStore } from "@/stores/usePermissionStore";

interface DocumentManagerProps {
  projectId: string | null;
  folderId?: string | null;
  title: string;
  canUpload?: boolean;
  canDelete?: boolean;
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
}) => {
  const {
    files,
    folders,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    deleteFolder,
    downloadFile,
  } = useDocumentManagement(projectId, folderId);

  const { user, activeOrg, currentOrgRole } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isOwner } = useOrgStore();
  const [sharingResource, setSharingResource] = useState<
    DocumentFile | DocumentFolder | null
  >(null);
  const { getPermission } = usePermissionStore();
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
      console.log("[DocumentManager] Starting upload", {
        projectId,
        folderId,
        activeOrgId: activeOrg?.id,
        userId: user?.id,
        currentOrgRole,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      });

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

  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm(`Are you sure you want to delete this file?`)) {
      try {
        await deleteFile(fileId);
      } catch (error) {
        console.error("[DocumentManager] Delete file error", error);
      }
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the folder "${folderName}"? This will also delete all files and subfolders inside it.`
      )
    ) {
      try {
        await deleteFolder(folderId);
      } catch (error) {
        console.error("[DocumentManager] Delete folder error", error);
      }
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await downloadFile(fileId, fileName);
    } catch (error) {
      console.error("[DocumentManager] Download error", error);
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
            {folders.map((folder) => {
              const permission = getPermission(folder.id);
              const userCanEditThis = permission === "edit";
              const userCanViewThis = permission === "view" || userCanEditThis;

              return (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
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
                    {userCanEditThis && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSharingResource(folder)}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteFolder(folder.id, folder.name)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Files */}
            {files.map((file) => {
              const isEditable = /\.(docx|xlsx|pptx)$/i.test(file.name);
              const permission = getPermission(file.id);
              const userCanEditThisFile = permission === "edit";
              const userCanViewThisFile =
                permission === "view" || userCanEditThisFile;

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.metadata?.size)} •{" "}
                        {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {userCanViewThisFile && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file.id, file.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {userCanEditThisFile && (
                      <VersionHistoryDropdown
                        resourceId={file.id}
                        onRollbackSuccess={() => window.location.reload()}
                      />
                    )}
                    {isEditable && userCanEditThisFile && (
                      <Link
                        href={`/documents/edit?bucket=${
                          activeOrg?.id
                        }&path=${encodeURIComponent(file.storage_path)}`}
                        passHref
                        legacyBehavior
                      >
                        <Button
                          as="a"
                          size="sm"
                          variant="outline"
                          title="Edit Document"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {userCanEditThisFile && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSharingResource(file)}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
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
                  {canUpload && canUploadOverall
                    ? "Upload files or create folders to get started"
                    : "No documents available"}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {sharingResource && (
        <ShareModal
          resource={sharingResource}
          isOpen={!!sharingResource}
          onClose={() => setSharingResource(null)}
        />
      )}
    </Card>
  );
};
