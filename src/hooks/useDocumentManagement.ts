import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { extractOriginalFilename } from "@/utils/documentUtils";

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

const STORAGE_SUBDIR: Record<'project' | 'borrower' | 'underwriting', string> = {
  project: 'project-docs',
  borrower: 'borrower-docs',
  underwriting: 'underwriting-docs',
};

interface UseDocumentManagementOptions {
  projectId: string | null;
  folderId?: string | null;
  orgId?: string | null;
  context?: 'project' | 'borrower' | 'underwriting';
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
        context === "borrower" ? "BORROWER_DOCS_ROOT" : context === "underwriting" ? "UNDERWRITING_DOCS_ROOT" : "PROJECT_DOCS_ROOT";

      const { data: root, error } = await supabase
        .from("resources")
        .select("id")
        .eq("project_id", projectId)
        .eq("resource_type", rootResourceType)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Failed to find ${rootResourceType}: ${error.message || JSON.stringify(error)
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

      // First, get all resources (files and folders)
      const { data: resources, error: resourcesError } = await supabase
        .from("resources")
        .select("id, name, resource_type, parent_id, current_version_id, created_at, updated_at")
        .eq("parent_id", parentId)
        .in("resource_type", ["FOLDER", "FILE"])
        .order("name");

      if (resourcesError) {
        console.error('[DocumentManagement] Resources query error:', resourcesError);
        throw new Error(`Failed to fetch resources: ${resourcesError.message || JSON.stringify(resourcesError)}`);
      }

      const filesList: DocumentFile[] = [];
      const foldersList: DocumentFolder[] = [];

      // Second, fetch all document versions for files in one query
      const fileResourceIds = resources
        ?.filter((r) => r.resource_type === "FILE")
        .map((r) => r.id);

      const versionsMap = new Map();
      if (fileResourceIds && fileResourceIds.length > 0) {
        const { data: versions, error: versionsError } = await supabase
          .from("document_versions")
          .select("id, resource_id, version_number, storage_path, created_at, metadata, status")
          .in("resource_id", fileResourceIds)
          .order("version_number", { ascending: false });

        if (versionsError) {
          console.error("Error fetching versions:", versionsError);
          throw new Error(`Failed to fetch document versions: ${versionsError.message || JSON.stringify(versionsError)}`);
        } else {
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
            // Extract original filename from storage path if resource.name contains version prefix
            // Otherwise use resource.name (which should be the clean filename)
            const displayName = resource.name.includes('_user') || resource.name.match(/^v\d+_/)
              ? extractOriginalFilename(currentVersion.storage_path)
              : resource.name;

            filesList.push({
              id: currentVersion.id,
              resource_id: resource.id,
              name: displayName,
              size: (currentVersion.metadata?.size as number) || 0,
              storage_path: currentVersion.storage_path,
              type: (currentVersion.metadata?.mimeType as string) || "application/octet-stream",
              version_number: currentVersion.version_number,
              created_at: currentVersion.created_at,
              updated_at: resource.updated_at,
              metadata: currentVersion.metadata || {},
            });
          }
        }
      });

      setFiles(filesList);
      setFolders(foldersList);
      
      console.log("[DocumentManagement] Fetch complete:", {
          context,
          rootId: root.id,
          parentId,
          resourcesFound: resources?.length,
          filesList: filesList.map(f => f.name),
          foldersList: foldersList.map(f => f.name)
      });

      return { files: filesList, folders: foldersList };

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
      return { files: [], folders: [] };
    } finally {
      setIsLoading(false);
    }
  }, [projectId, folderId, targetOrgId, activeOrg?.id, context]);

  const uploadFile = useCallback(
    async (file: File, folderId?: string) => {
      if (!targetOrgId || !user) throw new Error("Missing context");
      if (!projectId) throw new Error("Project context required for file uploads");

      setIsLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const base = typeof window !== "undefined" ? window.location.origin : "";
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("context", context);
        if (folderId) formData.set("folderId", folderId);
        formData.set("file", file);

        const res = await fetch(`${base}/api/documents/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body.error as string) || res.statusText);
        }

        const data = await res.json();
        await listDocuments();
        return data;
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err)
            ? (err as any).message
            : JSON.stringify(err);
        setError(message || "Failed to upload file");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, targetOrgId, user, listDocuments, context]
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
          context === "borrower" ? "BORROWER_DOCS_ROOT" : context === "underwriting" ? "UNDERWRITING_DOCS_ROOT" : "PROJECT_DOCS_ROOT";

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
    async (resourceId: string) => {
      if (!targetOrgId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const base = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${base}/api/documents/${resourceId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body.error as string) || res.statusText);
        }

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
