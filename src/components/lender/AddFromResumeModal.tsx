"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { Loader2, FileText, Check, Search, File } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dateUtils";
import { apiClient } from "@/lib/apiClient";

interface AddFromResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void; // Refresh parent
    renameTo?: string; // Optional: Rename target file to this (e.g. "Tax Returns")
}

export const AddFromResumeModal: React.FC<AddFromResumeModalProps> = ({
    isOpen,
    onClose,
    projectId,
    onSuccess,
    renameTo
}) => {
    const [activeTab, setActiveTab] = useState<'borrower' | 'project'>('borrower');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    // Fetch Borrower Docs
    const { 
        files: borrowerFiles, 
        isLoading: borrowerLoading 
    } = useDocumentManagement({
        projectId,
        context: 'borrower',
        skipInitialFetch: !isOpen
    });

    // Fetch Project Docs
    const { 
        files: projectFiles, 
        isLoading: projectLoading 
    } = useDocumentManagement({
        projectId,
        context: 'project',
        skipInitialFetch: !isOpen
    });

    const activeFiles = activeTab === 'borrower' ? borrowerFiles : projectFiles;
    const isLoading = activeTab === 'borrower' ? borrowerLoading : projectLoading;

    const filteredFiles = activeFiles.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopy = async () => {
        if (!selectedFileId) return;
        
        try {
            setIsCopying(true);
            
            await apiClient.post("/api/v1/documents/copy-from-existing", {
                source_resource_id: selectedFileId,
                target_project_id: projectId,
                rename_to: renameTo
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to copy document:", error);
            // Optionally show toast error
        } finally {
            setIsCopying(false);
        }
    };

    // Reset selection on tab change
    useEffect(() => {
        setSelectedFileId(null);
    }, [activeTab]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={renameTo ? `Attach as "${renameTo}"` : "Add Document from Resume"}
            size="lg"
        >
            <div className="h-[500px] flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'borrower' 
                                ? "border-blue-500 text-blue-600" 
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('borrower')}
                    >
                        Borrower Documents
                    </button>
                    <button
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'project' 
                                ? "border-blue-500 text-blue-600" 
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setActiveTab('project')}
                    >
                        Project Documents
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search specific documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 rounded-md bg-gray-50 mb-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <File className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No documents found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 bg-white">
                            {filteredFiles.map((file) => (
                                <button
                                    key={file.resource_id}
                                    onClick={() => setSelectedFileId(file.resource_id)}
                                    className={cn(
                                        "w-full flex items-center p-3 text-left hover:bg-gray-50 transition-colors",
                                        selectedFileId === file.resource_id && "bg-blue-50 hover:bg-blue-50"
                                    )}
                                >
                                    <div className="flex-shrink-0 mr-3">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center",
                                            selectedFileId === file.resource_id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <FileText className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            selectedFileId === file.resource_id ? "text-blue-900" : "text-gray-900"
                                        )}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {formatDate(file.updated_at || file.created_at)} • {(file.size / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                    {selectedFileId === file.resource_id && (
                                        <div className="flex-shrink-0 text-blue-600 ml-3">
                                            <Check className="h-5 w-5" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        disabled={isCopying}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={!selectedFileId || isCopying}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isCopying && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isCopying ? "Copying..." : "Copy Selected Document"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
