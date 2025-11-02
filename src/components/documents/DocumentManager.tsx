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
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionStore } from "@/stores/usePermissionStore";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { cn } from "@/utils/cn";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import { ShareModal } from "./ShareModal";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import UploadPermissionsModal from "./UploadPermissionsModal";
import { Permission } from "@/types/enhanced-types";

interface DocumentManagerProps {
  projectId: string | null;

  // This should correspond to a resource_id for the folder, or special values like "PROJECT_ROOT" or "BORROWER_ROOT"
  resourceId: string | null;

  title: string;
  canUpload?: boolean;
  canDelete?: boolean;
  highlightedResourceId?: string | null;
  // Optional: allows querying a different org's documents (e.g., for advisors viewing borrower docs)
  orgId?: string | null;
  // folderPath and bucketId removed as they are managed internally by the hook
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
  orgId,
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
    deleteFile,
    deleteFolder,
    downloadFile,
    refresh,
  } = useDocumentManagement(projectId, actualResourceId, orgId);

  const { user, activeOrg, currentOrgRole } = useAuthStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showUploadPerms, setShowUploadPerms] = useState(false);
  const [sharingFile, setSharingFile] = useState<DocumentFile | null>(null);

  // Get the PROJECT_DOCS_ROOT or BORROWER_DOCS_ROOT resource ID for permission checking
  const [docsRootId, setDocsRootId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchDocsRoot = async () => {
      if (projectId) {
        // For projects, fetch PROJECT_DOCS_ROOT
        try {
          const { data: root, error } = await supabase
            .from("resources")
            .select("id")
            .eq("project_id", projectId)
            .eq("resource_type", "PROJECT_DOCS_ROOT")
            .maybeSingle();
          if (error) {
            console.error("[DocumentManager] Error fetching PROJECT_DOCS_ROOT:", error);
            return;
          }
          setDocsRootId(root?.id || null);
        } catch (err) {
          console.error("[DocumentManager] Error in fetchDocsRoot:", err);
        }
      } else {
        // For borrower docs, fetch BORROWER_DOCS_ROOT
        // Use provided orgId if available, otherwise fall back to activeOrg
        const targetOrgId = orgId || activeOrg?.id;
        if (targetOrgId) {
          try {
            const { data: root, error } = await supabase
              .from("resources")
              .select("id")
              .eq("org_id", targetOrgId)
              .eq("resource_type", "BORROWER_DOCS_ROOT")
              .maybeSingle();
            if (error) {
              console.error("[DocumentManager] Error fetching BORROWER_DOCS_ROOT:", error);
              return;
            }
            setDocsRootId(root?.id || null);
          } catch (err) {
            console.error("[DocumentManager] Error in fetchDocsRoot:", err);
          }
        } else {
          setDocsRootId(null);
        }
      }
    };
    fetchDocsRoot();
  }, [projectId, activeOrg, orgId]);

  // Use docsRootId for permissions check when viewing project root or borrower root
  const resourceIdForPermissions = actualResourceId || docsRootId;
  const { canEdit: canEditRoot, isLoading: isLoadingPermissionsRoot } =
    usePermissions(resourceIdForPermissions);
  const getPermission = usePermissionStore((state) => state.getPermission);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setShowUploadPerms(true);
    }
  };

  const applyPermissions = async (
    resourceId: string,
    selections: Record<string, Record<string, Permission | "none">>,
    fileKey: string
  ) => {
    // Iterate member selections for this fileKey and call RPC
    const entries = Object.entries(selections);
    for (const [userId, perFiles] of entries) {
      const perm = perFiles[fileKey];
      if (!perm) continue;
      // Owners are excluded from modal; only MEMBERS here
      try {
        const { error: rpcError } = await supabase.rpc(
          "set_permission_for_resource",
          {
            p_resource_id: resourceId,
            p_user_id: userId,
            p_permission: perm,
          }
        );
        if (rpcError) {
          console.error("[DocumentManager] set_permission_for_resource error", rpcError);
        }
      } catch (err) {
        console.error("[DocumentManager] Error applying permission", err);
      }
    }
  };

  const handleConfirmUpload = async (
    selections: Record<string, Record<string, Permission | "none">>
  ) => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    try {
      for (const f of selectedFiles) {
        const created = await uploadFile(f, actualResourceId || undefined);
        const rId = created?.id as string;
        const key = `${f.name}__${f.size}__${f.type}`;
        if (rId) {
          await applyPermissions(rId, selections, key);
        }
      }
      await refresh();
    } catch (error) {
      console.error("[DocumentManager] Upload with permissions error", error);
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
      setShowUploadPerms(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const canEdit = canEditRoot; // Gate root-level actions (upload/create folder) by edit on current folder

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {/* Upload permissions handled via modal after file selection */}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple={true}
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
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </motion.button>
            ))}

            {/* Files */}
            {files.map((file) => {
              const fileCanEdit = getPermission(file.resource_id) === 'edit';
              const isEditable = /\.(docx|xlsx|pptx)$/i.test(file.name);
              const filePermission = getPermission(file.resource_id);
              console.log("[DocumentManager] Rendering file:", {
                name: file.name,
                versionId: file.id,
                resourceId: file.resource_id,
                permission: filePermission,
                canEdit: fileCanEdit,
                allPermissions: usePermissionStore.getState().permissions,
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
                        {formatFileSize((file.metadata?.size as number) || 0)} •{" "}
                        {formatDate(file.updated_at)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center space-x-2">
                    {fileCanEdit && (
                      <VersionHistoryDropdown
                        resourceId={file.resource_id}
                        onRollbackSuccess={() => refresh()}
                      />
                    )}
                    {isEditable && fileCanEdit && (
                      <Link
                        href={`/documents/edit?bucket=${
                          activeOrg?.id
                        }&path=${encodeURIComponent(file.storage_path)}`}
                        className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-xs px-2.5 py-1.5"
                        title="Edit Document"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {fileCanEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSharingFile(file)}
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    )}
                    {fileCanEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteFile(file)} // This will now use resource_id internally
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
      {/* Permissions modal for uploads */}
      {showUploadPerms && canEdit && (
        <UploadPermissionsModal
          isOpen={showUploadPerms}
          onClose={() => {
            setShowUploadPerms(false);
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          files={selectedFiles}
          onConfirm={handleConfirmUpload}
        />
      )}
      {previewingResourceId && (
        <DocumentPreviewModal
          resourceId={previewingResourceId}
          onClose={() => setPreviewingResourceId(null)}
          onDeleteSuccess={() => {
            // Optionally refresh the list after delete
          }}
        />
      )}
      {sharingFile && (
        <ShareModal
          resource={{ ...sharingFile, id: sharingFile.resource_id }}
          isOpen={!!sharingFile}
          onClose={() => setSharingFile(null)}
        />
      )}
    </Card>
  );
};
