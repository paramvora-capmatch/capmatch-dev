import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "@/stores/useAuthStore";

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
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

export const useDocumentManagement = (
  projectId: string | null,
  folderId?: string | null
) => {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, activeOrg } = useAuthStore();

  const listDocuments = useCallback(async () => {
    if (!activeOrg) return;
    setIsLoading(true);
    setError(null);

    try {
      let parentId;

      if (projectId) {
        // Get the project docs root resource
        const { data: root, error } = await supabase
          .from("resources")
          .select("id")
          .eq("project_id", projectId)
          .eq("resource_type", "PROJECT_DOCS_ROOT")
          .single();
        if (error) throw new Error(`Failed to find PROJECT_DOCS_ROOT: ${error.message || JSON.stringify(error)}`);
        if (!root?.id) {
          throw new Error("Project docs root has no ID");
        }
        parentId = folderId || root.id;
      } else {
        // For org-level documents, use BORROWER_DOCS_ROOT
        console.log('[DocumentManagement] Looking for BORROWER_DOCS_ROOT for org:', activeOrg.id);
        const { data: root, error } = await supabase
          .from("resources")
          .select("id")
          .eq("org_id", activeOrg.id)
          .eq("resource_type", "BORROWER_DOCS_ROOT")
          .maybeSingle();
        
        console.log('[DocumentManagement] BORROWER_DOCS_ROOT query result:', { root, error });
        
        if (error) {
          throw new Error(`Failed to query BORROWER_DOCS_ROOT: ${error.message || JSON.stringify(error)}`);
        }
        if (!root) {
          throw new Error(`BORROWER_DOCS_ROOT not found for org ${activeOrg.id}. This should have been created during onboarding.`);
        }
        if (!root.id) {
          throw new Error(`BORROWER_DOCS_ROOT exists but has no ID for org ${activeOrg.id}`);
        }
        parentId = folderId || root.id;
      }

      console.log('[DocumentManagement] Using parent ID:', parentId);

      // First, get all resources (files and folders)
      const { data: resources, error } = await supabase
        .from("resources")
        .select("*")
        .eq("parent_id", parentId)
        .in("resource_type", ["FOLDER", "FILE"])
        .order("name");

      if (error) {
        console.error('[DocumentManagement] Resources query error:', error);
        throw new Error(`Failed to fetch resources: ${error.message || JSON.stringify(error)}`);
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
            name: resource.name,
            created_at: resource.created_at,
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
              storage_path: currentVersion.storage_path,
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
      console.error("[DocumentManagement] Active org:", activeOrg?.id);
      console.error("[DocumentManagement] Project ID:", projectId);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, folderId, activeOrg]);

  const uploadFile = useCallback(
    async (file: File, folderId?: string) => {
      if (!activeOrg || !user) throw new Error("Missing context");
      setIsLoading(true);
      setError(null);
      let resourceId: string | null = null;
      let finalStoragePath: string | null = null;

      try {
        let parentId;
        if (projectId) {
          const { data: root, error } = await supabase
            .from("resources")
            .select("id")
            .eq("project_id", projectId)
            .eq("resource_type", "PROJECT_DOCS_ROOT")
            .single();
          if (error) throw error;
          parentId = folderId || root.id;
        } else {
          const { data: root, error } = await supabase
            .from("resources")
            .select("id")
            .eq("org_id", activeOrg.id)
            .eq("resource_type", "BORROWER_DOCS_ROOT")
            .single();
          if (error) throw error;
          parentId = folderId || root.id;
        }

        const { data: resource, error: resourceError } = await supabase
          .from("resources")
          .insert({
            org_id: activeOrg.id,
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

        const fileFolder = projectId
          ? `${projectId}/${resourceId}`
          : `borrower_docs/${resourceId}`;
        finalStoragePath = `${fileFolder}/v${version.version_number}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(activeOrg.id)
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
        console.error("Error uploading file:", {
          error: err,
          message: err instanceof Error ? err.message : "Unknown error",
          stack: err instanceof Error ? err.stack : undefined,
          resourceId,
          finalStoragePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          projectId,
          activeOrgId: activeOrg?.id
        });
        setError(err instanceof Error ? err.message : "Failed to upload file");
        if (finalStoragePath)
          await supabase.storage.from(activeOrg!.id).remove([finalStoragePath]);
        if (resourceId)
          await supabase.from("resources").delete().eq("id", resourceId);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, activeOrg, user, listDocuments]
  );

  const createFolder = useCallback(
    async (folderName: string, parentFolderId?: string) => {
      if (!activeOrg)
        throw new Error("Cannot create folder without an active org.");
      setIsLoading(true);
      setError(null);
      try {
        let parentId;
        if (projectId) {
          const { data: root, error } = await supabase
            .from("resources")
            .select("id")
            .eq("project_id", projectId)
            .eq("resource_type", "PROJECT_DOCS_ROOT")
            .single();
          if (error) throw error;
          parentId = parentFolderId || root.id;
        } else {
          const { data: root, error } = await supabase
            .from("resources")
            .select("id")
            .eq("org_id", activeOrg.id)
            .eq("resource_type", "BORROWER_DOCS_ROOT")
            .single();
          if (error) throw error;
          parentId = parentFolderId || root.id;
        }

        const { data, error } = await supabase
          .from("resources")
          .insert({
            org_id: activeOrg.id,
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
    [projectId, activeOrg, listDocuments]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!activeOrg) return;
      try {
        const { data: resource } = await supabase
          .from("resources")
          .select("project_id")
          .eq("id", fileId)
          .single();
        if (!resource) throw new Error("Resource not found");

        const folderToDelete = resource.project_id
          ? `${resource.project_id}/${fileId}`
          : `borrower_docs/${fileId}`;
        const { data: filesInFolder, error: listError } = await supabase.storage
          .from(activeOrg.id)
          .list(folderToDelete);
        if (listError) throw listError;

        const filePaths = filesInFolder.map(
          (f) => `${folderToDelete}/${f.name}`
        );
        if (filePaths.length > 0) {
          const { error: removeError } = await supabase.storage
            .from(activeOrg.id)
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
    [activeOrg, listDocuments]
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
      if (!activeOrg) throw new Error("Missing context");
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
          await supabase.storage.from(activeOrg.id).download(storage_path);

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
    [activeOrg]
  );

  useEffect(() => {
    listDocuments();
  }, [listDocuments]);

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
