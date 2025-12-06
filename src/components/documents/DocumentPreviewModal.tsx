// src/components/documents/DocumentPreviewModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { OnlyOfficeEditor } from "./OnlyOfficeEditor";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import { ShareModal } from "./ShareModal";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";
import { extractOriginalFilename } from "@/utils/documentUtils";
import { Loader2, Download, Edit, Share2, Trash2 } from "lucide-react";
import Link from "next/link";

interface DocumentPreviewModalProps {
  resourceId: string;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  openVersionsDefault?: boolean;
}

interface ResourceDetails extends DocumentFile {
  org_id: string;
  project_id: string | null;
  storage_path: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  resourceId,
  onClose,
  onDeleteSuccess,
  openVersionsDefault = false,
}) => {
  const [resource, setResource] = useState<ResourceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { activeOrg } = useAuthStore();
  const docContext = resource?.storage_path?.includes('/borrower-docs/')
    ? 'borrower'
    : 'project';
  const { deleteFile, downloadFile } = useDocumentManagement({
    projectId: resource?.project_id || null,
    context: docContext,
    skipInitialFetch: true,
  });
  const { canEdit } = usePermissions(resourceId);
  
  const isEditableInOffice = resource && /\.(docx|xlsx|pptx|pdf)$/i.test(resource.name);

  const fetchResourceDetails = useCallback(async () => {
    if (!resourceId) return;
    setIsLoading(true);
    setError(null);

    console.log('[DocumentPreviewModal] Fetching resource details for:', resourceId);

    try {
      // First, get the resource
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("id", resourceId)
        .single();
      
      if (error) {
        console.error('[DocumentPreviewModal] Error fetching resource:', error);
        throw new Error(`Failed to fetch resource: ${error.message}`);
      }

      if (!data) {
        throw new Error("Resource not found");
      }

      console.log('[DocumentPreviewModal] Resource data:', data);

      // If there's no current_version_id, this resource has no versions yet
      if (!data.current_version_id) {
        throw new Error("This document has no versions. It may not have been uploaded correctly.");
      }

      // Now fetch the current version separately
      const { data: currentVersion, error: versionError } = await supabase
        .from("document_versions")
        .select("*")
        .eq("id", data.current_version_id)
        .single();

      if (versionError) {
        console.error('[DocumentPreviewModal] Error fetching version:', versionError);
        throw new Error(`Failed to fetch document version: ${versionError.message}`);
      }
      
      if (!currentVersion) {
        throw new Error("Document version not found");
      }

      console.log('[DocumentPreviewModal] Current version:', currentVersion);

      // Extract original filename from storage path if resource.name contains version prefix
      const displayName = data.name.includes('_user') || data.name.match(/^v\d+_/)
        ? extractOriginalFilename(currentVersion.storage_path)
        : data.name;

      const formattedResource: ResourceDetails = {
        id: data.id,
        name: displayName,
        org_id: data.org_id,
        project_id: data.project_id,
        storage_path: currentVersion.storage_path,
        created_at: data.created_at,
        updated_at: currentVersion.created_at,
        resource_id: data.id,
        metadata: currentVersion.metadata,
        size: (currentVersion.metadata?.size as number) || 0,
        version_number: currentVersion.version_number,
        type: (currentVersion.metadata?.mimeType as string) || 'unknown',
      };

      console.log('[DocumentPreviewModal] Formatted resource:', formattedResource);
      setResource(formattedResource);
    } catch (err) {
      console.error('[DocumentPreviewModal] Error in fetchResourceDetails:', err);
      setError(err instanceof Error ? err.message : "Failed to load document details.");
    } finally {
      setIsLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    fetchResourceDetails();
  }, [fetchResourceDetails]);

  const handleRollbackSuccess = useCallback(() => {
    // Refresh the document instead of closing the modal
    fetchResourceDetails();
  }, [fetchResourceDetails]);
  
  const handleDelete = async () => {
    if (!resource) return;
    if (window.confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      try {
        await deleteFile(resource.id);
        onDeleteSuccess?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete file.");
      }
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    try {
      await downloadFile(resource.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file.");
    }
  };

  return (
    <>
      <Modal 
        isOpen={true} 
        onClose={onClose} 
        title={resource?.name || "Loading..."} 
        size="full"
        headerRight={
          <div className="flex items-center space-x-2">
            {canEdit && (
              <VersionHistoryDropdown 
                key={`versions-${resourceId}-${openVersionsDefault}`}
                resourceId={resourceId} 
                onRollbackSuccess={handleRollbackSuccess} 
                defaultOpen={openVersionsDefault} 
              />
            )}
            {canEdit && isEditableInOffice && (
              <Link
                href={`/documents/edit?bucket=${activeOrg?.id}&path=${encodeURIComponent(resource.storage_path)}`}
                className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md text-sm px-4 py-2"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Link>
            )}
            <Button variant="outline" onClick={handleDownload} leftIcon={<Download size={16}/>}>Download</Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setIsSharing(true)} leftIcon={<Share2 size={16}/>}>Share</Button>
                <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 size={16}/>}>Delete</Button>
              </>
            )}
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Preview area - extends to bottom */}
            <div className="flex-1 bg-gray-200 rounded-md overflow-hidden relative min-h-0" style={{ minHeight: '500px' }}>
                {/* Decorative Background Layer for preview */}
                <div className="pointer-events-none absolute inset-0">
                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-[0.5]">
                        <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
                            <defs>
                                <pattern id="preview-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#preview-grid)" />
                        </svg>
                    </div>
                </div>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-700 z-10">
                        <p>{error}</p>
                    </div>
                )}
                {!isLoading && !error && resource && (
                    <OnlyOfficeEditor
                        key={resource.id} // Re-mount when resource changes
                        bucketId={resource.org_id}
                        filePath={resource.storage_path}
                        mode="view"
                        hideHeader={true}
                    />
                )}
                {!resource && !isLoading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <p className="text-gray-500">No document loaded</p>
                    </div>
                )}
            </div>
        </div>
      </Modal>
      {isSharing && resource && (
        <ShareModal
            resource={resource}
            isOpen={isSharing}
            onClose={() => setIsSharing(false)}
        />
      )}
    </>
  );
};