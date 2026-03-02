// src/components/ui/DocumentUpload.tsx
import React, { useState } from 'react';
import { FileUp, Check, X, FileText } from 'lucide-react';
import { Button } from './Button';
import { DocumentCategory } from '../../types/enhanced-types';

interface DocumentUploadProps {
  label: string;
  description?: string;
  documentType: DocumentCategory | string;
  projectId?: string;
  onUpload?: (file: File, documentType: string) => void;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  label,
  description,
  documentType,
  projectId,
  onUpload,
  maxSize = 10, // Default 10MB
  allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setErrorMessage(`File size exceeds the maximum allowed size of ${maxSize}MB`);
      setUploadStatus('error');
      return;
    }
    
    // Check file type
    const fileExtension = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedTypes.includes(fileExtension)) {
      setErrorMessage(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      setUploadStatus('error');
      return;
    }
    
    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage('');
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    try {
      setUploadStatus('uploading');
      
      // Simulate file upload - in a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In mock mode, we'll just simulate a successful upload
      // Store metadata in localStorage to simulate storage
      const fileId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const fileMetadata = {
        id: fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType,
        projectId,
        uploadedAt: new Date().toISOString(),
        uploaderUserId: 'current-user'
      };
      
      // Store in local storage
      const existingDocs = (() => {
        try {
          const raw = localStorage.getItem('capmatch_documents');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      localStorage.setItem('capmatch_documents', JSON.stringify([...existingDocs, fileMetadata]));
      
      setUploadStatus('success');
      
      // Call the onUpload callback if provided
      if (onUpload) {
        onUpload(file, documentType);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('error');
      setErrorMessage('Failed to upload file. Please try again.');
    }
  };
  
  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-800">{label}</h3>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        
        {uploadStatus === 'success' ? (
          <div className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
            <Check size={16} className="mr-1" />
            Uploaded
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Max size: {maxSize}MB
          </div>
        )}
      </div>
      
      {uploadStatus === 'success' ? (
        <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded">
          <div className="flex items-center">
            <FileText size={20} className="text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">{file?.name}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetUpload}
          >
            Replace
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <input
              type="file"
              id={`file-${documentType}`}
              className="hidden"
              onChange={handleFileChange}
              accept={allowedTypes.join(',')}
            />
            <label
              htmlFor={`file-${documentType}`}
              className="block w-full cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg py-8 px-4 text-center hover:bg-gray-100 transition-colors"
            >
              <FileUp size={36} className="mx-auto text-gray-400 mb-2" />
              <span className="block text-sm font-medium text-gray-700">
                {file ? file.name : 'Click to upload or drag and drop'}
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                {allowedTypes.join(', ')} up to {maxSize}MB
              </span>
            </label>
          </div>
          
          {errorMessage && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <X size={16} className="mr-1" />
              {errorMessage}
            </div>
          )}
          
          {file && uploadStatus !== 'error' && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="primary"
                onClick={handleUpload}
                isLoading={uploadStatus === 'uploading'}
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};