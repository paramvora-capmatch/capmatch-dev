// src/components/documents/DocumentPreviewModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { OnlyOfficeEditor } from "./OnlyOfficeEditor";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import { ShareModal } from "./ShareModal";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Download, Edit, Share2, Trash2 } from "lucide-react";
import Link from "next/link";

interface DocumentPreviewModalProps {
  resourceId: string;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

interface ResourceDetails extends DocumentFile {
  org_id: string;
  project_id: string | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  resourceId,
  onClose,
  onDeleteSuccess,
}) => {
  const [resource, setResource] = useState<ResourceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { activeOrg } = useAuthStore();
  const { deleteFile, downloadFile } = useDocumentManagement(resource?.project_id || null, null);
  const { canEdit } = usePermissions(resourceId);
  
  const isEditableInOffice = resource && /\.(docx|xlsx|pptx)$/i.test(resource.name);

  useEffect(() => {
    const fetchResourceDetails = async () => {
      if (!resourceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("resources")
          .select("*, current_version:document_versions!current_version_id(*)")
          .eq("id", resourceId)
          .single();
        
        if (error) throw error;
        
        const currentVersion = data.current_version;
        if (!currentVersion) throw new Error("Document version not found.");

        const formattedResource: ResourceDetails = {
          id: data.id,
          name: data.name,
          org_id: data.org_id,
          project_id: data.project_id,
          storage_path: currentVersion.storage_path,
          created_at: data.created_at,
          updated_at: currentVersion.created_at,
          size: currentVersion.metadata?.size || 0,
          type: currentVersion.metadata?.mimetype || 'unknown',
          resource_id: data.id,
          metadata: currentVersion.metadata
        };
        setResource(formattedResource);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchResourceDetails();
  }, [resourceId]);
  
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
    <Modal isOpen={true} onClose={onClose} title={resource?.name || "Loading..."} size="full">
        <div className="flex flex-col h-[calc(100vh-10rem)]">
            <div className="flex-1 bg-gray-200 rounded-md overflow-hidden relative">
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
                    />
                )}
            </div>
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center justify-end space-x-2">
                    {canEdit && isEditableInOffice && (
                        <Link
                          href={`/documents/edit?bucket=${activeOrg?.id}&path=${encodeURIComponent(resource.storage_path)}`}
                          passHref
                          legacyBehavior
                        >
                            <Button as="a" variant="primary" leftIcon={<Edit size={16}/>}>Edit</Button>
                        </Link>
                    )}
                    <Button variant="outline" onClick={handleDownload} leftIcon={<Download size={16}/>}>Download</Button>
                    {canEdit && (
                        <>
                            <Button variant="outline" onClick={() => setIsSharing(true)} leftIcon={<Share2 size={16}/>}>Share</Button>
                            <VersionHistoryDropdown resourceId={resourceId} onRollbackSuccess={onClose} />
                            <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 size={16}/>}>Delete</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
        {isSharing && resource && (
            <ShareModal
                resource={resource}
                isOpen={isSharing}
                onClose={() => setIsSharing(false)}
            />
        )}
    </Modal>
  );
};