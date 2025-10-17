import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '@/stores/useAuthStore';

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
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
    if (!activeOrg) {
      setFiles([]);
      setFolders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let parentId: string;

      if (projectId) {
        // Get the project docs root resource
        const { data: docsRoot, error: docsRootError } = await supabase
          .from('resources')
          .select('id')
          .eq('org_id', activeOrg.id)
          .eq('project_id', projectId)
          .eq('resource_type', 'PROJECT_DOCS_ROOT')
          .single();

        if (docsRootError) {
          throw new Error(`Failed to find project docs root: ${docsRootError.message}`);
        }

        parentId = folderId || docsRoot.id;
      } else {
        // For borrower documents, get the borrower resume resource
        const { data: borrowerResume, error: borrowerResumeError } = await supabase
          .from('resources')
          .select('id')
          .eq('org_id', activeOrg.id)
          .eq('resource_type', 'BORROWER_RESUME')
          .single();

        if (borrowerResumeError) {
          throw new Error(`Failed to find borrower resume: ${borrowerResumeError.message}`);
        }

        parentId = folderId || borrowerResume.id;
      }
      
      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('parent_id', parentId)
        .in('resource_type', ['FOLDER', 'FILE'])
        .order('name');

      if (resourcesError) {
        throw new Error(`Failed to list documents: ${resourcesError.message}`);
      }

      const filesList: DocumentFile[] = [];
      const foldersList: DocumentFolder[] = [];

      for (const resource of resources || []) {
        if (resource.resource_type === 'FILE') {
          filesList.push({
            id: resource.id,
            name: resource.name,
            size: 0, // Will be updated when we get file info
            type: 'file',
            storage_path: resource.storage_path || '',
            resource_id: resource.id,
            created_at: resource.created_at,
            updated_at: resource.updated_at
          });
        } else if (resource.resource_type === 'FOLDER') {
          foldersList.push({
            id: resource.id,
            name: resource.name,
            resource_id: resource.id,
            parent_id: resource.parent_id,
            created_at: resource.created_at,
            updated_at: resource.updated_at
          });
        }
      }

      setFiles(filesList);
      setFolders(foldersList);
    } catch (err) {
      console.error('Error listing documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to list documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeOrg, folderId]);

  const uploadFile = useCallback(async (file: File, folderId?: string) => {
    if (!activeOrg || !user) {
      throw new Error('Missing required context for file upload');
    }

    setIsLoading(true);
    setError(null);

    try {
      let parentId: string;
      let filePath: string;

      if (projectId) {
        // Get the project docs root resource
        const { data: docsRoot, error: docsRootError } = await supabase
          .from('resources')
          .select('id')
          .eq('org_id', activeOrg.id)
          .eq('project_id', projectId)
          .eq('resource_type', 'PROJECT_DOCS_ROOT')
          .single();

        if (docsRootError) {
          throw new Error(`Failed to find project docs root: ${docsRootError.message}`);
        }

        parentId = folderId || docsRoot.id;
        filePath = `${projectId}/${file.name}`;
      } else {
        // For borrower documents, get the borrower resume resource
        const { data: borrowerResume, error: borrowerResumeError } = await supabase
          .from('resources')
          .select('id')
          .eq('org_id', activeOrg.id)
          .eq('resource_type', 'BORROWER_RESUME')
          .single();

        if (borrowerResumeError) {
          throw new Error(`Failed to find borrower resume: ${borrowerResumeError.message}`);
        }

        parentId = folderId || borrowerResume.id;
        filePath = `borrower_docs/${file.name}`;
      }

      // Create the file resource first
      const { data: fileResource, error: fileResourceError } = await supabase
        .from('resources')
        .insert({
          org_id: activeOrg.id,
          project_id: projectId,
          parent_id: parentId,
          resource_type: 'FILE',
          name: file.name,
          storage_path: filePath
        })
        .select()
        .single();

      if (fileResourceError) {
        throw new Error(`Failed to create file resource: ${fileResourceError.message}`);
      }

      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from(activeOrg.id)
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) {
        // Clean up the resource if upload fails
        await supabase.from('resources').delete().eq('id', fileResource.id);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Refresh the document list
      await listDocuments();
      
      return fileResource;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeOrg, user, listDocuments]);

  const createFolder = useCallback(async (folderName: string, parentFolderId?: string) => {
    if (!projectId) {
      throw new Error('Folder creation requires a project context');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-documents', {
        body: {
          action: 'create_folder',
          projectId,
          folderId: parentFolderId || null,
          folderName
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to create folder');

      // Refresh the document list
      await listDocuments();
      
      return data.data;
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, listDocuments]);

  const deleteFile = useCallback(async (fileId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the file name for the edge function
      const { data: fileResource, error: fileResourceError } = await supabase
        .from('resources')
        .select('name')
        .eq('id', fileId)
        .single();

      if (fileResourceError) {
        throw new Error(`Failed to find file resource: ${fileResourceError.message}`);
      }

      const { data, error } = await supabase.functions.invoke('manage-documents', {
        body: {
          action: 'delete_file',
          fileName: fileResource.name
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to delete file');

      // Refresh the document list
      await listDocuments();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [listDocuments]);

  const deleteFolder = useCallback(async (folderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-documents', {
        body: {
          action: 'delete_folder',
          folderId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to delete folder');

      // Refresh the document list
      await listDocuments();
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [listDocuments]);

  const downloadFile = useCallback(async (fileId: string) => {
    if (!activeOrg) {
      throw new Error('Missing required context for file download');
    }

    try {
      // Get the file resource to get the storage path
      const { data: fileResource, error: fileResourceError } = await supabase
        .from('resources')
        .select('storage_path, name')
        .eq('id', fileId)
        .single();

      if (fileResourceError) {
        throw new Error(`Failed to find file resource: ${fileResourceError.message}`);
      }

      if (!fileResource.storage_path) {
        throw new Error('File has no storage path');
      }

      // Download from storage
      const { data, error: downloadError } = await supabase.storage
        .from(activeOrg.id)
        .download(fileResource.storage_path);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileResource.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
      throw err;
    }
  }, [activeOrg]);

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
    refresh: listDocuments
  };
};
