"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
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
  EllipsisVertical,
  History,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileAudio,
  FileVideo,
  FileCode,
  File,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  // Explicit context: project vs borrower
  context?: "project" | "borrower";
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
  context,
}) => {
  // Convert special string values to null before passing to the hook
  const actualResourceId = React.useMemo(() => {
    if (resourceId === "PROJECT_ROOT" || resourceId === "BORROWER_ROOT") {
      return null;
    }
    return resourceId;
  }, [resourceId]);

  const inferredContext: "project" | "borrower" =
    context || (projectId ? "project" : "borrower");

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
  } = useDocumentManagement({
    projectId,
    folderId: actualResourceId,
    orgId,
    context: inferredContext,
  });

  const { activeOrg, currentOrgRole } = useAuthStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showUploadPerms, setShowUploadPerms] = useState(false);
  const [sharingFile, setSharingFile] = useState<DocumentFile | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openVersionsDefault, setOpenVersionsDefault] = useState(false);
  const [inlineVersionsFor, setInlineVersionsFor] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuButtonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get the PROJECT_DOCS_ROOT or BORROWER_DOCS_ROOT resource ID for permission checking
  const [docsRootId, setDocsRootId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchDocsRoot = async () => {
      if (!projectId) {
        setDocsRootId(null);
        return;
      }

      const rootResourceType =
        inferredContext === "borrower"
          ? "BORROWER_DOCS_ROOT"
          : "PROJECT_DOCS_ROOT";

      try {
        const { data: root, error } = await supabase
          .from("resources")
          .select("id")
          .eq("project_id", projectId)
          .eq("resource_type", rootResourceType)
          .maybeSingle();

        if (error) {
          console.error(
            `[DocumentManager] Error fetching ${rootResourceType}:`,
            error
          );
          setDocsRootId(null);
          return;
        }

        setDocsRootId(root?.id || null);
      } catch (err) {
        console.error("[DocumentManager] Error in fetchDocsRoot:", err);
        setDocsRootId(null);
      }
    };

    fetchDocsRoot();
  }, [projectId, inferredContext]);

  // Use docsRootId for permissions check when viewing project root or borrower root
  const resourceIdForPermissions = actualResourceId || docsRootId;
  const { canEdit: canEditRoot, isLoading: isLoadingPermissionsRoot } =
    usePermissions(resourceIdForPermissions);
  // Subscribe to permissions object so component re-renders when permissions load
  const permissions = usePermissionStore((state) => state.permissions);
  const getPermission = usePermissionStore((state) => state.getPermission);
  const loadPermissionsForProject = usePermissionStore((state) => state.loadPermissionsForProject);

  const getFileVisual = (fileName: string) => {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    // Keep icon per type, but standardize visuals to blue across all types
    if (["pdf"].includes(ext))
      return { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["xls", "xlsx", "csv"].includes(ext))
      return { Icon: FileSpreadsheet, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["doc", "docx", "rtf"].includes(ext))
      return { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["ppt", "pptx", "key"].includes(ext))
      return { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
      return { Icon: FileImage, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
      return { Icon: FileArchive, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext))
      return { Icon: FileVideo, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["mp3", "wav", "aac", "flac"].includes(ext))
      return { Icon: FileAudio, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (["js", "ts", "json", "py", "rb", "go", "java", "c", "cpp"].includes(ext))
      return { Icon: FileCode, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    return { Icon: File, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
  };

  // Calculate menu position based on button position
  const calculateMenuPosition = (buttonElement: HTMLButtonElement | null) => {
    if (!buttonElement) return null;
    const rect = buttonElement.getBoundingClientRect();
    return {
      top: rect.top + rect.height / 2, // Center vertically on button
      left: rect.right + 8, // 8px to the right of button
    };
  };

  // Close kebab dropdown on outside click (native listener, but ignore clicks inside menu/trigger)
  React.useEffect(() => {
    const handleClickAway = (event: MouseEvent | PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const withinMenuOrTrigger = target.closest('[data-dm-menu="true"], [data-dm-trigger="true"]');
      if (withinMenuOrTrigger) return; // let button/menu handlers manage closing
      setOpenMenuId(null);
      setInlineVersionsFor(null);
      setMenuPosition(null);
    };
    document.addEventListener('pointerdown', handleClickAway as EventListener);
    return () => document.removeEventListener('pointerdown', handleClickAway as EventListener);
  }, []);

  // Update menu position on scroll/resize
  React.useEffect(() => {
    if (!openMenuId) return;
    const updatePosition = () => {
      const buttonElement = menuButtonRefs.current.get(openMenuId);
      if (buttonElement) {
        setMenuPosition(calculateMenuPosition(buttonElement));
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [openMenuId]);

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
      // Reload permissions after upload to ensure newly uploaded documents have correct permissions in state
      if (projectId) {
        await loadPermissionsForProject(projectId);
      }
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
      await downloadFile(file.resource_id);
    } catch (error) {
      console.error("[DocumentManager] Download error", error);
    }
  };

  // Gate root-level actions (upload/create folder)
  // Borrower docs (context === 'borrower'): Owners always edit; Members depend on BORROWER_DOCS_ROOT permission
  // Project docs: rely on resource permission as before
  const isBorrowerDocs = inferredContext === 'borrower';
  const isOwner = currentOrgRole === 'owner';
  const canEdit = isBorrowerDocs ? (isOwner || canEditRoot) : canEditRoot;

  return (
    <Card className="group shadow-sm h-full flex flex-col rounded-2xl p-2 relative overflow-visible">
      <CardHeader className="pb-4 px-3">
          <div className="flex items-center justify-start gap-3">
          <div className="flex items-center gap-2 ml-3">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600 animate-pulse" />
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900">{title}</h3>
          </div>
          {canEdit && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                aria-label="Upload"
              >
                <Upload className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                  {isUploading ? "Uploading..." : "Upload"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-visible">
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
          <div className="space-y-4">
            {/* Folders */}
            {folders.map((folder, index) => (
              <motion.button
                key={folder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
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
            <div className="max-h-[300px] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file, index) => {
              const fileCanEdit = getPermission(file.resource_id) === 'edit';
              const isEditable = /\.(docx|xlsx|pptx|pdf)$/i.test(file.name);
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "group/file w-full bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-all duration-300 text-left flex flex-col p-4 relative overflow-visible",
                    file.id === highlightedResourceId &&
                      "border-blue-500 ring-2 ring-blue-300 ring-offset-1"
                  )}
                >
                  {/* Kebab menu trigger */}
                  <button
                    ref={(el) => {
                      if (el) {
                        menuButtonRefs.current.set(file.id, el);
                      } else {
                        menuButtonRefs.current.delete(file.id);
                      }
                    }}
                    type="button"
                    aria-label="More actions"
                    title="More actions"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 opacity-0 pointer-events-none group-hover/file:opacity-100 group-hover/file:pointer-events-auto transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((prev) => {
                        if (prev === file.id) {
                          // Closing menu
                          setMenuPosition(null);
                          return null;
                        } else {
                          // Opening menu - calculate position
                          const buttonElement = e.currentTarget;
                          const position = calculateMenuPosition(buttonElement);
                          setMenuPosition(position);
                          // Close version history dropdown if it's open for this file
                          if (inlineVersionsFor === file.resource_id) {
                            setInlineVersionsFor(null);
                          }
                          return file.id;
                        }
                      });
                    }}
                    data-dm-trigger="true"
                  >
                    <EllipsisVertical className="h-5 w-5 text-gray-600" />
                  </button>

                  {/* Dropdown menu - rendered in portal to escape overflow */}
                  {mounted && createPortal(
                    <AnimatePresence>
                      {openMenuId === file.id && menuPosition && (
                        <motion.div
                          key={`menu-${file.id}`}
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="fixed z-[99999] w-40 bg-white border border-gray-200 rounded-md shadow-xl py-1 text-left"
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                            transform: 'translateY(-50%)', // Center vertically on button
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          data-dm-menu="true"
                        >
                      {/* Versions */}
                      <button
                        className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setMenuPosition(null);
                          // Show inline version history dropdown anchored to this card
                          setInlineVersionsFor(file.resource_id);
                        }}
                        title="Versions"
                      >
                        <History className="h-4 w-4" />
                        <span>Versions</span>
                      </button>
                      {isEditable && fileCanEdit && (
                        <button
                          className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = `/documents/edit?bucket=${activeOrg?.id}&path=${encodeURIComponent(file.storage_path)}`;
                            window.location.assign(url);
                            setOpenMenuId(null);
                            setMenuPosition(null);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setMenuPosition(null);
                          handleDownload(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                      {fileCanEdit && (
                        <button
                          className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setMenuPosition(null);
                            setSharingFile(file);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      )}
                      {fileCanEdit && (
                        <button
                          className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-red-600 text-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setMenuPosition(null);
                            handleDeleteFile(file);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                      </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
                  <button
                    onClick={() => setPreviewingResourceId(file.resource_id)}
                    className="flex items-center space-x-3 overflow-hidden text-left pr-0 group-hover/file:pr-10 transition-[padding] duration-200"
                  >
                    {(() => {
                      const visual = getFileVisual(file.name);
                      const IconComp = visual.Icon;
                      return (
                        <div className={`flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg ${visual.bg} border ${visual.border}`}>
                          <IconComp className={`h-5 w-5 ${visual.color}`} />
                        </div>
                      );
                    })()}
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {file.name}
                      </p>
                      {/* timestamp removed per design */}
                    </div>
                  </button>

                {/* Inline Version History Dropdown (anchored to card) */}
                {inlineVersionsFor === file.resource_id && (
                  <div className="absolute right-10 top-2 z-[10000]">
                    <VersionHistoryDropdown
                      key={`inline-versions-${file.resource_id}`}
                      resourceId={file.resource_id}
                      defaultOpen={true}
                      hideTrigger={true}
                      onRollbackSuccess={() => {
                        // Optional: refresh after rollback if desired
                        refresh();
                      }}
                    />
                  </div>
                )}

                  {/* Bottom quick actions removed; all actions are now in kebab menu */}
                </motion.div>
              );
            })}
              </div>
            </div>

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
          onClose={() => {
            setPreviewingResourceId(null);
            setOpenVersionsDefault(false); // Reset state when modal closes
          }}
          openVersionsDefault={openVersionsDefault}
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
