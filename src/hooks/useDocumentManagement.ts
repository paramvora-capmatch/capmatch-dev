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
  metadata?: any; // To hold version info
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
        if (error) throw error;
        parentId = folderId || root.id;
      } else {
        // Borrower-level documents root
        const { data: root, error } = await supabase
          .from("resources")
          .select("id")
          .eq("org_id", activeOrg.id)
          .eq("resource_type", "BORROWER_DOCS_ROOT")
          .single();
        if (error) throw error;
        parentId = folderId || root.id;
      }

      const { data: resources, error } = await supabase
        .from("resources")
        .select(
          `
          id, name, resource_type, created_at,
          current_version:document_versions!resources_current_version_id_fkey(
            storage_path, 
            created_at, 
            metadata
          )
        `
        )
        .eq("parent_id", parentId)
        .in("resource_type", ["FOLDER", "FILE"])
        .order("name");

      if (error) throw error;

      const filesList: DocumentFile[] = [];
      const foldersList: DocumentFolder[] = [];

      for (const resource of resources || []) {
        if (resource.resource_type === "FILE") {
          // Handle case where current_version might be an array or object
          const currentVersion = Array.isArray(resource.current_version) 
            ? resource.current_version[0] 
            : resource.current_version;
          
          const size = currentVersion?.metadata?.size || 0;
          filesList.push({
            id: resource.id,
            name: resource.name,
            size: size,
            type: "file",
            storage_path: currentVersion?.storage_path || "",
            resource_id: resource.id,
            created_at: resource.created_at,
            updated_at:
              currentVersion?.created_at || resource.created_at,
            metadata: currentVersion?.metadata,
          });
        } else if (resource.resource_type === "FOLDER") {
          foldersList.push({
            id: resource.id,
            name: resource.name,
            resource_id: resource.id,
            parent_id: parentId,
            created_at: resource.created_at,
            updated_at: resource.created_at,
          });
        }
      }

      setFiles(filesList);
      setFolders(foldersList);
    } catch (err) {
      console.error("Error listing documents:", err);
      setError(err instanceof Error ? err.message : "Failed to list documents");
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
        const { data, error } = await supabase
          .from("resources")
          .select(
            `
          name,
          current_version:document_versions!resources_current_version_id_fkey(
            storage_path
          )
        `
          )
          .eq("id", fileId)
          .single();

        if (error) throw error;
        
        // Handle case where current_version might be an array or object
        const currentVersion = Array.isArray(data?.current_version) 
          ? data.current_version[0] 
          : data?.current_version;
          
        if (!currentVersion?.storage_path)
          throw new Error("File has no storage path");

        const storage_path = currentVersion.storage_path;
        const file_name = data.name;

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
