// src/components/documents/DocumentManager.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useStorageWithRBAC } from '@/hooks/useStorageWithRBAC';
import { FileObject } from '@supabase/storage-js';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { FileText, Upload, Download, Trash2, Loader2, AlertCircle, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { DocumentPermissionModal } from '../modals/DocumentPermissionModal';
import { useAuthStore } from '@/stores/useAuthStore';

interface DocumentManagerProps {
  bucketId: string | null;
  folderPath?: string;
  title: string;
  canUpload?: boolean;
  canDelete?: boolean;
  projectId?: string; // Add projectId for RBAC
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  bucketId,
  folderPath = '',
  title,
  canUpload = true,
  canDelete = true,
  projectId,
}) => {
  const { files, isLoading, error, uploadFile, downloadFile, deleteFile } = useStorageWithRBAC(bucketId, folderPath, projectId);
  const { user, activeEntity, currentEntityRole } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionModal, setPermissionModal] = useState<{
    isOpen: boolean;
    fileName: string;
    filePath: string;
  }>({
    isOpen: false,
    fileName: '',
    filePath: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    try {
      console.log('[DocumentManager] Starting upload', {
        bucketId,
        folderPath,
        projectId,
        activeEntityId: activeEntity?.id,
        userId: user?.id,
        currentEntityRole,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });
      const result = await uploadFile(selectedFile);
      
      if (result && projectId && activeEntity) {
        // Show permission modal for both owners and members to select who gets access
        const filePath = folderPath ? `${folderPath}/${selectedFile.name}` : selectedFile.name;
        console.log('[DocumentManager] Upload succeeded, opening permissions modal', { filePath });
        setPermissionModal({
          isOpen: true,
          fileName: selectedFile.name,
          filePath: filePath
        });
      }
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error('[DocumentManager] Upload error', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      await deleteFile(fileName);
    }
  };

  const handleClosePermissionModal = () => {
    setPermissionModal({
      isOpen: false,
      fileName: '',
      filePath: ''
    });
  };

  const handleChangePermissions = (fileName: string) => {
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    setPermissionModal({
      isOpen: true,
      fileName: fileName,
      filePath: filePath
    });
  };

  const handleDeleteFromDropdown = async (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      await deleteFile(fileName);
    }
  };

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          {title}
        </h2>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col">
        {canUpload && (
          <div className="mb-4 p-3 border border-dashed rounded-md bg-gray-50/50">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                isLoading={isUploading}
                leftIcon={<Upload size={16} />}
              >
                Upload
              </Button>
            </div>
          </div>
        )}

        {error && (
            <div className="my-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <div className="text-sm">
                  <p className="font-medium">{error}</p>
                  {error.includes('Bucket ID, user, or active entity is not available') && (
                    <div className="mt-2 text-xs">
                      <p>Debug info:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>Bucket ID: {bucketId || 'null'}</li>
                        <li>User: {user ? `${user.email} (${user.id})` : 'null'}</li>
                        <li>Active Entity: {activeEntity ? `${activeEntity.name} (${activeEntity.id})` : 'null'}</li>
                        <li>Project ID: {projectId || 'null'}</li>
                      </ul>
                    </div>
                  )}
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            ) : files.length > 0 ? (
                <div className="space-y-2">
                    {files.map((file, index) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="relative"
                        >
                            <div className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="p-2 bg-blue-50 rounded-lg mr-3 flex-shrink-0">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => downloadFile(file.name)}
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                        onClick={() => handleChangePermissions(file.name)}
                                        title="Change permissions"
                                    >
                                        <Settings size={16} />
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteFromDropdown(file.name)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>No documents found.</p>
                </div>
            )}
        </div>
      </CardContent>

      {/* Permission Modal */}
      {permissionModal.isOpen && projectId && activeEntity && user && (
        <DocumentPermissionModal
          isOpen={permissionModal.isOpen}
          onClose={handleClosePermissionModal}
          fileName={permissionModal.fileName}
          filePath={permissionModal.filePath}
          projectId={projectId}
          entityId={activeEntity.id}
          uploaderId={user.id!}
        />
      )}
    </Card>
  );
};