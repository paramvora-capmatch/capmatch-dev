// src/components/documents/DocumentManager.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { FileObject } from '@supabase/storage-js';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { FileText, Upload, Download, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface DocumentManagerProps {
  bucketId: string | null;
  folderPath?: string;
  title: string;
  canUpload?: boolean;
  canDelete?: boolean;
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
}) => {
  const { files, isLoading, error, uploadFile, downloadFile, deleteFile } = useStorage(bucketId, folderPath);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    await uploadFile(selectedFile);
    setSelectedFile(null);
    setIsUploading(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
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
                <p className="text-sm">{error}</p>
            </div>
        )}

        <div className="flex-1 overflow-y-auto">
            {isLoading && files.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            ) : files.length > 0 ? (
                <ul className="space-y-2">
                    {files.map((file) => (
                        <li key={file.id} className="flex items-center justify-between p-2 bg-white border rounded-md hover:bg-gray-50">
                            <div className="flex items-center truncate">
                                <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                                <div className="truncate">
                                    <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(file.metadata.size)} • {formatDate(file.created_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(file.name)} title="Download">
                                    <Download size={16} />
                                </Button>
                                {canDelete && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(file.name)} title="Delete">
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>No documents found.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};