import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "@/stores/useAuthStore";

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  version_number: number;
  type: string;
  storage_path: string; // Path of the CURRENT version
  resource_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentFolder {
  id: string;
  name: string;
  resource_id: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  children?: (DocumentFile | DocumentFolder)[];
}

const STORAGE_SUBDIR: Record<'project' | 'borrower', string> = {
  project: 'project-docs',
  borrower: 'borrower-docs',
};

interface UseDocumentManagementOptions {
  projectId: string | null;
  folderId?: string | null;
  orgId?: string | null;
  context?: 'project' | 'borrower';
  skipInitialFetch?: boolean;
}

export const useDocumentManagement = ({
  projectId,
  folderId = null,
  orgId,
  context = 'project',
  skipInitialFetch = false,
}: UseDocumentManagementOptions) => {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, activeOrg } = useAuthStore();
  
  // Use provided orgId if available, otherwise fall back to activeOrg
  const targetOrgId = orgId || activeOrg?.id;

  const listDocuments = useCallback(async () => {
    if (!targetOrgId) return;
    if (!projectId) {
      setFiles([]);
      setFolders([]);
      setIsLoading(false);
      setError("Project context is required for document management operations.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const rootResourceType =
        context === "borrower" ? "BORROWER_DOCS_ROOT" : "PROJECT_DOCS_ROOT";

      const { data: root, error } = await supabase
        .from("resources")
        .select("id")
        .eq("project_id", projectId)
        .eq("resource_type", rootResourceType)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Failed to find ${rootResourceType}: ${
            error.message || JSON.stringify(error)
          }`
        );
      }

      if (!root || !root.id) {
        throw new Error(
          `${rootResourceType} not found for project ${projectId}. ` +
            `This could indicate a provisioning issue or missing permissions.`
        );
      }

      const parentId = folderId || root.id;

      console.log('[DocumentManagement] Using parent ID:', parentId);

      // First, get all resources (files and folders)
      const { data: resources, error: resourcesError } = await supabase
        .from("resources")
        .select("*")
        .eq("parent_id", parentId)
        .in("resource_type", ["FOLDER", "FILE"])
        .order("name");

      if (resourcesError) {
        console.error('[DocumentManagement] Resources query error:', resourcesError);
        throw new Error(`Failed to fetch resources: ${resourcesError.message || JSON.stringify(resourcesError)}`);
      }
      
      console.log('[DocumentManagement] Resources fetched:', resources?.length || 0);

      const filesList: DocumentFile[] = [];
      const foldersList: DocumentFolder[] = [];

      // Second, fetch all document versions for files in one query
      const fileResourceIds = resources
        ?.filter((r) => r.resource_type === "FILE")
        .map((r) => r.id);
      
      console.log('[DocumentManagement] File resource IDs:', fileResourceIds);

      const versionsMap = new Map();
      if (fileResourceIds && fileResourceIds.length > 0) {
        const { data: versions, error: versionsError } = await supabase
          .from("document_versions")
          .select("*")
          .in("resource_id", fileResourceIds)
          .order("version_number", { ascending: false });

        if (versionsError) {
          console.error("Error fetching versions:", versionsError);
          throw new Error(`Failed to fetch document versions: ${versionsError.message || JSON.stringify(versionsError)}`);
        } else {
          console.log('[DocumentManagement] Versions fetched:', versions?.length || 0);
          versions?.forEach((v) => versionsMap.set(v.id, v));
        }
      }

      // Third, process each resource
      resources?.forEach((resource) => {
        if (resource.resource_type === "FOLDER") {
          foldersList.push({
            id: resource.id,
            resource_id: resource.id,
            name: resource.name,
            created_at: resource.created_at,
            updated_at: resource.updated_at,
          });
        } else if (resource.resource_type === "FILE") {
          // Find the current version for this file
          const currentVersion = resource.current_version_id
            ? versionsMap.get(resource.current_version_id)
            : null;

          if (currentVersion) {
            filesList.push({
              id: currentVersion.id,
              resource_id: resource.id,
              name: resource.name,
              size: (currentVersion.metadata?.size as number) || 0,
              storage_path: currentVersion.storage_path,
              type: (currentVersion.metadata?.mimeType as string) || "application/octet-stream",
              version_number: currentVersion.version_number,
              created_at: currentVersion.created_at,
              updated_at: resource.updated_at,
              metadata: currentVersion.metadata || {},
            });
          } else {
            console.warn(
              `[DocumentManagement] File resource ${resource.id} has no current version`
            );
          }
        }
      });

      console.log('[DocumentManagement] Processed:', { files: filesList.length, folders: foldersList.length });
      setFiles(filesList);
      setFolders(foldersList);
    } catch (err) {
      console.error("[DocumentManagement] Error listing documents:", err);
      if (err instanceof Error) {
        console.error("[DocumentManagement] Error message:", err.message);
        console.error("[DocumentManagement] Error stack:", err.stack);
        setError(err.message);
      } else {
        console.error("[DocumentManagement] Unknown error type:", typeof err);
        console.error("[DocumentManagement] Error value:", err);
        setError("An unknown error occurred while listing documents");
      }
      console.error("[DocumentManagement] Target org:", targetOrgId);
      console.error("[DocumentManagement] Active org:", activeOrg?.id);
      console.error("[DocumentManagement] Project ID:", projectId);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, folderId, targetOrgId, activeOrg?.id, context]);

  const uploadFile = useCallback(
    async (file: File, folderId?: string) => {
      if (!targetOrgId || !user) throw new Error("Missing context");
      setIsLoading(true);
      setError(null);
      let resourceId: string | null = null;
      let finalStoragePath: string | null = null;

      try {
        if (!projectId) {
          throw new Error("Project context required for file uploads");
        }

        const rootResourceType =
          context === "borrower" ? "BORROWER_DOCS_ROOT" : "PROJECT_DOCS_ROOT";

        const { data: root, error: rootError } = await supabase
          .from("resources")
          .select("id")
          .eq("project_id", projectId)
          .eq("resource_type", rootResourceType)
          .maybeSingle();

        if (rootError) throw rootError;
        if (!root?.id) {
          throw new Error(`${rootResourceType} not found for project ${projectId}`);
        }

        const parentId = folderId || root.id;

        const { data: resource, error: resourceError } = await supabase
          .from("resources")
          .insert({
            org_id: targetOrgId,
            project_id: projectId,
            parent_id: parentId,
            resource_type: "FILE",
            name: file.name,
          })
          .select()
          .single();
        if (resourceError) {
          console.error("Error creating resource:", resourceError);
          throw resourceError;
        }
        resourceId = resource.id;

        const { data: version, error: versionError } = await supabase
          .from("document_versions")
          .insert({
            resource_id: resourceId,
            created_by: user.id,
            storage_path: "placeholder",
          })
          .select()
          .single();
        if (versionError) {
          console.error("Error creating document version:", versionError);
          throw versionError;
        }

        // Mark the new version as active (it's the current one)
        const { error: statusError } = await supabase
          .from("document_versions")
          .update({ status: "active" })
          .eq("id", version.id);
        if (statusError) {
          console.error("Error updating version status:", statusError);
          throw statusError;
        }

        const fileFolder = `${projectId}/${STORAGE_SUBDIR[context]}/${resourceId}`;
        finalStoragePath = `${fileFolder}/v${version.version_number}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(targetOrgId)
          .upload(finalStoragePath, file, { upsert: false });
        if (uploadError) {
          console.error("Error uploading file to storage:", uploadError);
          throw uploadError;
        }

        const { error: updateVersionError } = await supabase
          .from("document_versions")
          .update({ storage_path: finalStoragePath })
          .eq("id", version.id);
        if (updateVersionError) {
          console.error("Error updating version storage path:", updateVersionError);
          throw updateVersionError;
        }

        const { error: updateResourceError } = await supabase
          .from("resources")
          .update({ current_version_id: version.id })
          .eq("id", resourceId);
        if (updateResourceError) {
          console.error("Error updating resource current version:", updateResourceError);
          throw updateResourceError;
        }

        await listDocuments();
        return resource;
      } catch (err) {
        const message = err instanceof Error 
          ? err.message 
          : (typeof err === 'object' && err !== null && 'message' in err) 
            ? (err as any).message 
            : JSON.stringify(err);
            
        console.error("Error uploading file:", {
          error: err,
          message,
          resourceId,
          finalStoragePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          projectId,
          activeOrgId: activeOrg?.id
        });
        
        setError(message || "Failed to upload file");
        if (finalStoragePath && targetOrgId)
          await supabase.storage.from(targetOrgId).remove([finalStoragePath]);
        if (resourceId)
          await supabase.from("resources").delete().eq("id", resourceId);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, targetOrgId, user, listDocuments, activeOrg?.id, context]
  );

  const createFolder = useCallback(
    async (folderName: string, parentFolderId?: string) => {
      if (!targetOrgId)
        throw new Error("Cannot create folder without an org ID.");
      setIsLoading(true);
      setError(null);
      try {
        if (!projectId) {
          throw new Error("Project context required for folder creation");
        }

        const rootResourceType =
          context === "borrower" ? "BORROWER_DOCS_ROOT" : "PROJECT_DOCS_ROOT";

        const { data: root, error: rootError } = await supabase
          .from("resources")
          .select("id")
          .eq("project_id", projectId)
          .eq("resource_type", rootResourceType)
          .maybeSingle();
        if (rootError) throw rootError;
        if (!root?.id) {
          throw new Error(`${rootResourceType} not found for project ${projectId}`);
        }
        const parentId = parentFolderId || root.id;

        const { data, error } = await supabase
          .from("resources")
          .insert({
            org_id: targetOrgId,
            project_id: projectId,
            parent_id: parentId,
            resource_type: "FOLDER",
            name: folderName,
          })
          .select()
          .single();
        if (error) throw error;

        await listDocuments();
        return data;
      } catch (err) {
        console.error("Error creating folder:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create folder"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, targetOrgId, listDocuments, context]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!targetOrgId) return;
      try {
        const { data: versions, error: versionsError } = await supabase
          .from("document_versions")
          .select("storage_path")
          .eq("resource_id", fileId);
        if (versionsError) throw versionsError;

        const filePaths = (versions || [])
          .map((v) => v.storage_path)
          .filter((path): path is string => Boolean(path));

        if (filePaths.length > 0) {
          const { error: removeError } = await supabase.storage
            .from(targetOrgId)
            .remove(filePaths);
          if (removeError) throw removeError;
        }

        const { error: deleteError } = await supabase
          .from("resources")
          .delete()
          .eq("id", fileId);
        if (deleteError) throw deleteError;

        await listDocuments();
      } catch (err) {
        console.error("Error deleting file:", err);
        setError(err instanceof Error ? err.message : "Failed to delete file");
        throw err;
      }
    },
    [targetOrgId, listDocuments]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { error } = await supabase.rpc("delete_folder_and_children", {
          p_folder_id: folderId,
        });
        if (error) throw error;
        await listDocuments();
      } catch (err) {
        console.error("Error deleting folder:", err);
        setError(
          err instanceof Error ? err.message : "Failed to delete folder"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [listDocuments]
  );

  const downloadFile = useCallback(
    async (fileId: string) => {
      if (!targetOrgId) throw new Error("Missing context");
      try {
        // Get the resource and its current version
        const { data: resource, error: resourceError } = await supabase
          .from("resources")
          .select("name, current_version_id")
          .eq("id", fileId)
          .single();
        if (resourceError) throw resourceError;
        if (!resource.current_version_id) throw new Error("File has no current version.");
        
        const { data: version, error: versionError } = await supabase
          .from("document_versions")
          .select("storage_path")
          .eq("id", resource.current_version_id)
          .single();

        if (versionError) throw versionError;

        if (!version?.storage_path)
          throw new Error("File has no storage path");

        const storage_path = version.storage_path;
        const file_name = resource.name;

        // Download from storage
        const { data: downloadedFile, error: downloadError } =
          await supabase.storage.from(targetOrgId).download(storage_path);

        if (downloadError) {
          throw new Error(`Failed to download file: ${downloadError.message}`);
        }

        // Create download link
        const url = URL.createObjectURL(downloadedFile);
        const link = document.createElement("a");
        link.href = url;
        link.download = file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error downloading file:", err);
        setError(
          err instanceof Error ? err.message : "Failed to download file"
        );
        throw err;
      }
    },
    [targetOrgId]
  );

  useEffect(() => {
    if (!skipInitialFetch) {
      listDocuments();
    }
  }, [listDocuments, skipInitialFetch]);

  return {
    files,
    folders,
    isLoading,
    error,
    uploadFile,
    createFolder,
    deleteFile,
    deleteFolder,
    downloadFile,
    refresh: listDocuments,
  };
};
