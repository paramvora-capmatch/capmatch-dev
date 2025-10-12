// src/hooks/useStorageWithRBAC.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FileObject } from "@supabase/storage-js";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEntityStore } from "@/stores/useEntityStore";
import { useDocumentPermissionStore } from "@/stores/useDocumentPermissionStore";

export const useStorageWithRBAC = (
  bucketId: string | null,
  folderPath: string = "",
  projectId?: string
) => {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, activeEntity, currentEntityRole } = useAuthStore();
  const { loadEntity } = useEntityStore();
  const { checkDocumentPermission } = useDocumentPermissionStore();

  const listFiles = useCallback(async () => {
    if (!bucketId || !user || !user.id || !activeEntity) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all files from the bucket/folder
      const { data, error } = await supabase.storage
        .from(bucketId)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;
      
      // Filter out the placeholder .keep file
      const allFiles = data.filter((file) => file.name !== ".keep");
      
      // Apply RBAC filtering
      const filteredFiles = await Promise.all(
        allFiles.map(async (file) => {
          const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
          
          // Owners can see all files
          if (currentEntityRole === 'owner') {
            return file;
          }
          
          // For members, check document permissions
          if (currentEntityRole === 'member' && projectId) {
            const hasPermission = await checkDocumentPermission(
              activeEntity.id,
              projectId!,
              filePath,
              user.id!
            );
            return hasPermission ? file : null;
          }
          
          // Default: no access
          return null;
        })
      );
      
      // Remove null entries (files without permission)
      const visibleFiles = filteredFiles.filter(file => file !== null) as FileObject[];
      setFiles(visibleFiles);
      
    } catch (e: any) {
      setError(e.message);
      console.error("Error listing files with RBAC:", e);
    } finally {
      setIsLoading(false);
    }
  }, [bucketId, folderPath, user, activeEntity, currentEntityRole, projectId, checkDocumentPermission]);

  useEffect(() => {
    listFiles();
  }, [listFiles]);

  const uploadFile = async (file: File) => {
    if (!bucketId || !user || !user.id || !activeEntity) {
      console.error('[useStorageWithRBAC] Upload failed - missing required data:', {
        bucketId,
        userId: user?.id,
        activeEntityId: activeEntity?.id
      });
      setError("Bucket ID, user, or active entity is not available.");
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
      
      const { data, error } = await supabase.storage
        .from(bucketId)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Overwrite if exists
        });

      if (error) throw error;
      
      // Note: Permission granting is now handled through the DocumentPermissionModal
      // Entity owners will see the modal to grant access to members
      // Entity members automatically get permission for files they upload
      if (projectId && currentEntityRole === 'member') {
        // Auto-grant permission to the uploader (members can access their own uploads)
        try {
          const { grantPermission } = useDocumentPermissionStore.getState();
          await grantPermission(projectId, user.id!, filePath, 'file');
        } catch (permError) {
          console.error('Error granting permission:', permError);
          // Don't fail the upload if permission granting fails
        }
      }
      
      await listFiles(); // Refresh file list
      return data;
    } catch (e: any) {
      setError(e.message);
      console.error("Error uploading file:", e);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileName: string) => {
    if (!bucketId || !user || !user.id || !activeEntity) {
      setError("Bucket ID, user, or active entity is not available.");
      return;
    }
    
    try {
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      // Check permission before download
      if (currentEntityRole === 'member' && projectId) {
        const hasPermission = await checkDocumentPermission(
          activeEntity.id,
          projectId!,
          filePath,
          user.id!
        );
        
        if (!hasPermission) {
          setError("You don't have permission to download this file.");
          return;
        }
      }
      
      const { data, error } = await supabase.storage
        .from(bucketId)
        .download(filePath);
        
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
      console.error("Error downloading file:", e);
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!bucketId || !user || !user.id || !activeEntity) {
      setError("Bucket ID, user, or active entity is not available.");
      return;
    }
    
    // Only owners can delete files
    if (currentEntityRole !== 'owner') {
      setError("Only owners can delete files.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      const { error } = await supabase.storage
        .from(bucketId)
        .remove([filePath]);
        
      if (error) throw error;
      
      await listFiles(); // Refresh file list
    } catch (e: any) {
      setError(e.message);
      console.error("Error deleting file:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    files,
    isLoading,
    error,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
  };
};
