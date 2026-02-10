"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/Button";
import {
	FileText,
	Upload,
	Loader2,
	AlertCircle,
	Download,
	FolderOpen,
	Edit,
	Trash2,
	Share2,
	EllipsisVertical,
	History,
	FileSpreadsheet,
	FileImage,
	FileArchive,
	FileAudio,
	FileVideo,
	FileCode,
	File,
	ChevronDown,
	LayoutGrid,
	List,
	Expand,
	Shrink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionStore } from "@/stores/usePermissionStore";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { cn } from "@/utils/cn";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { VersionHistoryDropdown } from "./VersionHistoryDropdown";
import { ShareModal } from "./ShareModal";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import UploadPermissionsModal from "./UploadPermissionsModal";
import { Permission } from "@/types/enhanced-types";

interface DocumentManagerProps {
	projectId: string | null;

	// This should correspond to a resource_id for the folder, or special values like "PROJECT_ROOT" or "BORROWER_ROOT"
	resourceId: string | null;

	title: string;
	canUpload?: boolean;
	canDelete?: boolean;
	highlightedResourceId?: string | null;
	// Optional: allows querying a different org's documents (e.g., for advisors viewing borrower docs)
	orgId?: string | null;
	// Explicit context: project vs borrower
	context?: "project" | "borrower";
	// folderPath and bucketId removed as they are managed internally by the hook
	collapsible?: boolean;
	defaultOpen?: boolean;
	maxRows?: number;
}

const formatFileSize = (bytes: number) => {
	if (!bytes || bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const DocumentManager: React.FC<DocumentManagerProps> = ({
	projectId,
	resourceId,
	title,
	canUpload = true,
	canDelete = true,
	highlightedResourceId,
	orgId,
	context,
	collapsible = false,
	defaultOpen = true,
	maxRows = 2,
}) => {
	// Convert special string values to null before passing to the hook
	const actualResourceId = React.useMemo(() => {
		if (resourceId === "PROJECT_ROOT" || resourceId === "BORROWER_ROOT") {
			return null;
		}
		return resourceId;
	}, [resourceId]);

	const inferredContext: "project" | "borrower" =
		context || (projectId ? "project" : "borrower");

	const {
		files,
		folders,
		isLoading,
		error,
		uploadFile,
		deleteFile,
		deleteFolder,
		downloadFile,
		refresh,
	} = useDocumentManagement({
		projectId,
		folderId: actualResourceId,
		orgId,
		context: inferredContext,
	});

	const { activeOrg, currentOrgRole } = useAuthStore();
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [previewingResourceId, setPreviewingResourceId] = useState<
		string | null
	>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [showUploadPerms, setShowUploadPerms] = useState(false);
	const [sharingFile, setSharingFile] = useState<DocumentFile | null>(null);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [openVersionsDefault, setOpenVersionsDefault] = useState(false);
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const [mounted, setMounted] = useState(false);
	const menuButtonRefs = React.useRef<Map<string, HTMLButtonElement>>(
		new Map()
	);

	const [isCollapsed, setIsCollapsed] = useState(!defaultOpen);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isExpandedAll, setIsExpandedAll] = useState(false);

	// Handle mounting for portal
	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	// Get the PROJECT_DOCS_ROOT or BORROWER_DOCS_ROOT resource ID for permission checking
	const [docsRootId, setDocsRootId] = React.useState<string | null>(null);

	React.useEffect(() => {
		const fetchDocsRoot = async () => {
			if (!projectId) {
				setDocsRootId(null);
				return;
			}

			const rootResourceType =
				inferredContext === "borrower"
					? "BORROWER_DOCS_ROOT"
					: "PROJECT_DOCS_ROOT";

			try {
				const { data: root, error } = await supabase
					.from("resources")
					.select("id")
					.eq("project_id", projectId)
					.eq("resource_type", rootResourceType)
					.maybeSingle();

				if (error) {
					console.error(
						`[DocumentManager] Error fetching ${rootResourceType}:`,
						error
					);
					setDocsRootId(null);
					return;
				}

				setDocsRootId(root?.id || null);
			} catch (err) {
				console.error("[DocumentManager] Error in fetchDocsRoot:", err);
				setDocsRootId(null);
			}
		};

		fetchDocsRoot();
	}, [projectId, inferredContext]);

	// Use docsRootId for permissions check when viewing project root or borrower root
	const resourceIdForPermissions = actualResourceId || docsRootId;
	const { canEdit: canEditRoot, isLoading: isLoadingPermissionsRoot } =
		usePermissions(resourceIdForPermissions);
	// Subscribe to permissions object so component re-renders when permissions load
	const permissions = usePermissionStore((state) => state.permissions);
	const getPermission = usePermissionStore((state) => state.getPermission);
	const loadPermissionsForProject = usePermissionStore(
		(state) => state.loadPermissionsForProject
	);

	const getFileVisual = (fileName: string) => {
		const ext = (fileName.split(".").pop() || "").toLowerCase();
		// Keep icon per type, but standardize visuals to blue across all types
		if (["pdf"].includes(ext))
			return {
				Icon: FileText,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["xls", "xlsx", "csv"].includes(ext))
			return {
				Icon: FileSpreadsheet,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["doc", "docx", "rtf"].includes(ext))
			return {
				Icon: FileText,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["ppt", "pptx", "key"].includes(ext))
			return {
				Icon: FileText,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
			return {
				Icon: FileImage,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
			return {
				Icon: FileArchive,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext))
			return {
				Icon: FileVideo,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (["mp3", "wav", "aac", "flac"].includes(ext))
			return {
				Icon: FileAudio,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		if (
			["js", "ts", "json", "py", "rb", "go", "java", "c", "cpp"].includes(
				ext
			)
		)
			return {
				Icon: FileCode,
				color: "text-blue-600",
				bg: "bg-blue-50",
				border: "border-blue-200",
			};
		return {
			Icon: File,
			color: "text-blue-600",
			bg: "bg-blue-50",
			border: "border-blue-200",
		};
	};

	// Calculate menu position based on button position
	const calculateMenuPosition = (buttonElement: HTMLButtonElement | null) => {
		if (!buttonElement) return null;
		const rect = buttonElement.getBoundingClientRect();
		return {
			top: rect.top + rect.height / 2, // Center vertically on button
			left: rect.right + 8, // 8px to the right of button
		};
	};

	// Close kebab dropdown on outside click (native listener, but ignore clicks inside menu/trigger)
	React.useEffect(() => {
		const handleClickAway = (event: MouseEvent | PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			const withinMenuOrTrigger = target.closest(
				'[data-dm-menu="true"], [data-dm-trigger="true"]'
			);
			if (withinMenuOrTrigger) return; // let button/menu handlers manage closing
			setOpenMenuId(null);
			setMenuPosition(null);
		};
		document.addEventListener(
			"pointerdown",
			handleClickAway as EventListener
		);
		return () =>
			document.removeEventListener(
				"pointerdown",
				handleClickAway as EventListener
			);
	}, []);

	// Update menu position on scroll/resize
	React.useEffect(() => {
		if (!openMenuId) return;
		const updatePosition = () => {
			const buttonElement = menuButtonRefs.current.get(openMenuId);
			if (buttonElement) {
				setMenuPosition(calculateMenuPosition(buttonElement));
			}
		};
		updatePosition();
		window.addEventListener("scroll", updatePosition, true);
		window.addEventListener("resize", updatePosition);
		return () => {
			window.removeEventListener("scroll", updatePosition, true);
			window.removeEventListener("resize", updatePosition);
		};
	}, [openMenuId]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const files = Array.from(e.target.files);
			setSelectedFiles(files);
			setShowUploadPerms(true);
		}
	};

	const applyPermissions = async (
		resourceId: string,
		selections: Record<string, Record<string, Permission | "none">>,
		fileKey: string
	) => {
		// Iterate member selections for this fileKey and call RPC
		const entries = Object.entries(selections);
		for (const [userId, perFiles] of entries) {
			const perm = perFiles[fileKey];
			if (!perm) continue;
			// Owners are excluded from modal; only MEMBERS here
			try {
				const { error: rpcError } = await supabase.rpc(
					"set_permission_for_resource",
					{
						p_resource_id: resourceId,
						p_user_id: userId,
						p_permission: perm,
					}
				);
				if (rpcError) {
					console.error(
						"[DocumentManager] set_permission_for_resource error",
						rpcError
					);
				}
			} catch (err) {
				console.error(
					"[DocumentManager] Error applying permission",
					err
				);
			}
		}
	};

	const handleConfirmUpload = async (
		selections: Record<string, Record<string, Permission | "none">>
	) => {
		if (!selectedFiles.length) return;
		setIsUploading(true);
		try {
			for (const f of selectedFiles) {
				const created = await uploadFile(
					f,
					actualResourceId || undefined
				);
				const rId = created?.id as string;
				const key = `${f.name}__${f.size}__${f.type}`;
				if (rId) {
					await applyPermissions(rId, selections, key);
				}
			}
			await refresh();
			// Reload permissions after upload to ensure newly uploaded documents have correct permissions in state
			if (projectId) {
				await loadPermissionsForProject(projectId);
			}
		} catch (error) {
			console.error(
				"[DocumentManager] Upload with permissions error",
				error
			);
		} finally {
			setIsUploading(false);
			setSelectedFiles([]);
			setShowUploadPerms(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleDeleteFile = async (file: DocumentFile) => {
		if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
			try {
				// deleteFile expects the resource ID, not the version ID
				await deleteFile(file.resource_id);
				await refresh(); // Refresh the list after deletion
			} catch (error) {
				console.error("[DocumentManager] Delete file error", error);
			}
		}
	};

	const handleDeleteFolder = async (folder: DocumentFolder) => {
		if (
			window.confirm(
				`Are you sure you want to delete the folder "${folder.name}"? This will also delete all files and subfolders inside it.`
			)
		) {
			try {
				await deleteFolder(folder.id);
			} catch (error) {
				console.error("[DocumentManager] Delete folder error", error);
			}
		}
	};

	const handleDownload = async (file: DocumentFile) => {
		try {
			// downloadFile might expect either version ID or resource ID - check the implementation
			// For now, use the version ID since we're downloading a specific version
			await downloadFile(file.resource_id);
		} catch (error) {
			console.error("[DocumentManager] Download error", error);
		}
	};

	// Gate root-level actions (upload/create folder)
	// Borrower docs (context === 'borrower'): Owners always edit; Members depend on BORROWER_DOCS_ROOT permission
	// Project docs: rely on resource permission as before
	const isBorrowerDocs = inferredContext === "borrower";
	const isOwner = currentOrgRole === "owner";
	const canEdit = isBorrowerDocs ? isOwner || canEditRoot : canEditRoot;

	const displayedFolders = isCollapsed ? [] : (collapsible ? folders : folders);
    // Use all files, let CSS handle the scroll
    const displayedFiles = isCollapsed ? [] : (collapsible ? files : files);
    
	const hasDocuments = folders.length > 0 || files.length > 0;
	const handleHeaderClick = collapsible ? () => setIsCollapsed(!isCollapsed) : undefined;

	return (
		<Card className="group shadow-xl h-full flex flex-col rounded-2xl p-0 relative overflow-visible border-2 border-gray-300 bg-white hover:shadow-2xl transition-shadow duration-300">
			<CardHeader
				className={cn(
					"pb-3 px-4 pt-4 border-b-2 border-gray-300 flex flex-row items-center justify-between space-y-0",
					collapsible && "cursor-pointer"
				)}
				onClick={handleHeaderClick}
			>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-blue-50 rounded-lg">
						<FileText className="h-5 w-5 text-blue-600" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900">
						{title}
					</h3>
                    {canEdit && (
						<Button
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								fileInputRef.current?.click();
							}}
							disabled={isUploading || isCollapsed}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all font-medium text-gray-700 ml-2"
							aria-label="Upload"
						>
							<Upload className="h-4 w-4 text-gray-600" />
                            <span>{isUploading ? "Uploading..." : "Upload"}</span>
						</Button>
					)}
				</div>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
					{/* View Toggle */}
					<div className="flex items-center bg-gray-100 p-0.5 rounded-lg border-2 border-gray-300 mr-2">
						<button
							onClick={() => setViewMode("grid")}
							className={cn(
								"p-1.5 rounded-md transition-all",
								viewMode === "grid"
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-500 hover:text-gray-700"
							)}
							title="Grid View"
						>
							<LayoutGrid className="h-4 w-4" />
						</button>
						<button
							onClick={() => setViewMode("list")}
							className={cn(
								"p-1.5 rounded-md transition-all",
								viewMode === "list"
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-500 hover:text-gray-700"
							)}
							title="List View"
						>
							<List className="h-4 w-4" />
						</button>
					</div>

					{/* Expand / Collapse documents list - same style as list/grid toggle */}
					{!isCollapsed && hasDocuments && (
						<div className="flex items-center bg-gray-100 p-0.5 rounded-lg border-2 border-gray-300 mr-2">
							<button
								onClick={() => setIsExpandedAll(!isExpandedAll)}
								className={cn(
									"p-1.5 rounded-md transition-all",
									isExpandedAll
										? "bg-white text-blue-600 shadow-sm"
										: "text-gray-500 hover:text-gray-700"
								)}
								title={isExpandedAll ? "Collapse documents" : "Expand documents"}
								aria-label={isExpandedAll ? "Collapse documents" : "Expand documents"}
							>
								{isExpandedAll ? (
									<Shrink className="h-4 w-4" />
								) : (
									<Expand className="h-4 w-4" />
								)}
							</button>
						</div>
					)}

                    {collapsible && (
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
							aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                         >
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isCollapsed ? "" : "rotate-180")} />
                         </Button>
                    )}
                </div>
			</CardHeader>

			<AnimatePresence>
				{!isCollapsed && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
                        className="overflow-visible"
					>
			            <CardContent className="flex-1 p-4 overflow-visible">
				{/* Upload permissions handled via modal after file selection */}

				{/* Hidden file input */}
				<input
					ref={fileInputRef}
					type="file"
					onChange={handleFileChange}
					className="hidden"
					multiple={true}
				/>

				{/* Error Display */}
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
					>
						<AlertCircle className="h-5 w-5 text-red-600" />
						<p className="text-sm text-red-800">{error}</p>
					</motion.div>
				)}

				{/* Loading State */}
				{isLoading && (
					<div className="flex items-center justify-center h-32">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						<span className="ml-3 text-gray-600">
							Loading documents...
						</span>
					</div>
				)}


						{/* Documents List */}
						{!isLoading && (
							<div className={cn(
                                "flex flex-col gap-3 overflow-y-auto pr-1 transition-all duration-300",
                                !isExpandedAll && "max-h-[150px]"
                            )}>
								{/* Folders */}
                                <div className={cn(
                                    viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "flex flex-col gap-2"
                                )}>
								    {displayedFolders.map((folder, index) => (
									<motion.button
										key={folder.id}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.2,
											delay: index * 0.03,
										}}
										// onClick={() => handleFolderClick(folder.id)} // TODO: Implement folder navigation
										className={cn(
                                            "w-full flex items-center justify-between p-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-300 transition-all shadow-md hover:shadow-lg",
                                            viewMode === "list" && "flex-row py-2"
                                        )}
									>
										<div className="flex items-center">
											<FolderOpen className="h-5 w-5 text-blue-500 mr-3" />
											<div className="text-left">
												<p className="text-sm font-medium text-gray-900">
													{folder.name}
												</p>
												<p className="text-xs text-gray-500">
													Folder
												</p>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<span className="text-xs text-gray-400">
												{formatDate(folder.created_at)}
											</span>
											{canEdit && (
												<Button
													size="sm"
													variant="ghost"
													onClick={(e) => {
                                                        e.stopPropagation();
												        handleDeleteFolder(folder);
                                                    }}
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									</motion.button>
								    ))}
                                </div>

								{/* Files */}
								<div className={cn(
                                    "overflow-visible",
                                    viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "flex flex-col gap-2"
                                )}>
										{displayedFiles.map((file, index) => {
											const fileCanEdit =
												getPermission(file.resource_id) ===
												"edit";
											const isEditable =
												/\.(docx|xlsx|pptx|pdf)$/i.test(
													file.name
												);
											const filePermission = getPermission(
												file.resource_id
											);
                                            const fileVisual = getFileVisual(file.name);
                                            
											return (
												<motion.div
													key={file.id}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{
														duration: 0.2,
														delay: index * 0.03,
													}}
													className={cn(
														"group/file w-full bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-lg hover:border-blue-300 transition-all duration-200 text-left flex relative overflow-visible",
														file.id === highlightedResourceId && "border-blue-500 ring-2 ring-blue-100",
                                                        viewMode === "grid" ? "flex-col p-3 justify-between" : "flex-row items-center p-3 h-auto"
													)}
												>
											<button
												onClick={() =>
													setPreviewingResourceId(
														file.resource_id
													)
												}
												className="flex-1 flex items-center space-x-3 overflow-hidden text-left"
											>
                                                <div className={cn(
                                                    "flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50",
                                                    viewMode === "grid" ? "h-10 w-10" : "h-8 w-8"
                                                )}>
                                                    <fileVisual.Icon className={cn(
                                                        "text-blue-600",
                                                        viewMode === "grid" ? "h-6 w-6" : "h-4 w-4"
                                                    )} />
                                                </div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-gray-900 truncate transition-colors">
														{file.name}
													</p>
												</div>
											</button>

                                            {/* Action Buttons (List Mode) or Kebab Menu (Grid Mode) */}
                                            {viewMode === "list" ? (
                                                <div className="flex items-center gap-1.5 ml-auto shrink-0 pr-1">
                                                    {isEditable && fileCanEdit && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="flex items-center gap-0 group-hover/file:gap-2 px-2 group-hover/file:px-3 h-8 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 overflow-hidden border border-transparent hover:border-blue-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const url = `/documents/edit?bucket=${activeOrg?.id}&path=${encodeURIComponent(file.storage_path)}`;
                                                                window.location.assign(url);
                                                            }}
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4 flex-shrink-0" />
                                                            <span className="text-xs font-medium whitespace-nowrap max-w-0 group-hover/file:max-w-[60px] opacity-0 group-hover/file:opacity-100 transition-all duration-300 overflow-hidden">
                                                                Edit
                                                            </span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="flex items-center gap-0 group-hover/file:gap-2 px-2 group-hover/file:px-3 h-8 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 overflow-hidden border border-transparent hover:border-blue-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(file);
                                                        }}
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4 flex-shrink-0" />
                                                        <span className="text-xs font-medium whitespace-nowrap max-w-0 group-hover/file:max-w-[70px] opacity-0 group-hover/file:opacity-100 transition-all duration-300 overflow-hidden">
                                                            Download
                                                        </span>
                                                    </Button>
                                                    {fileCanEdit && currentOrgRole === "owner" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="flex items-center gap-0 group-hover/file:gap-2 px-2 group-hover/file:px-3 h-8 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 overflow-hidden border border-transparent hover:border-blue-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSharingFile(file);
                                                            }}
                                                            title="Share"
                                                        >
                                                            <Share2 className="h-4 w-4 flex-shrink-0" />
                                                            <span className="text-xs font-medium whitespace-nowrap max-w-0 group-hover/file:max-w-[60px] opacity-0 group-hover/file:opacity-100 transition-all duration-300 overflow-hidden">
                                                                Share
                                                            </span>
                                                        </Button>
                                                    )}
                                                    {fileCanEdit && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="flex items-center gap-0 group-hover/file:gap-2 px-2 group-hover/file:px-3 h-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300 overflow-hidden border border-transparent hover:border-red-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFile(file);
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4 flex-shrink-0" />
                                                            <span className="text-xs font-medium whitespace-nowrap max-w-0 group-hover/file:max-w-[60px] opacity-0 group-hover/file:opacity-100 transition-all duration-300 overflow-hidden">
                                                                Delete
                                                            </span>
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        ref={(el) => {
                                                            if (el) {
                                                                menuButtonRefs.current.set(
                                                                    file.id,
                                                                    el
                                                                );
                                                            } else {
                                                                menuButtonRefs.current.delete(
                                                                    file.id
                                                                );
                                                            }
                                                        }}
                                                        type="button"
                                                        aria-label="More actions"
                                                        title="More actions"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm opacity-0 pointer-events-none group-hover/file:opacity-100 group-hover/file:pointer-events-auto transition-all duration-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId((prev) => {
                                                                if (prev === file.id) {
                                                                    setMenuPosition(null);
                                                                    return null;
                                                                } else {
                                                                    const buttonElement = e.currentTarget;
                                                                    const position = calculateMenuPosition(buttonElement);
                                                                    setMenuPosition(position);
                                                                    return file.id;
                                                                }
                                                            });
                                                        }}
                                                        data-dm-trigger="true"
                                                    >
                                                        <EllipsisVertical className="h-5 w-5 text-gray-600" />
                                                    </button>
                                                    
                                                    {/* Dropdown menu - rendered in portal to escape overflow */}
                                                    {mounted && createPortal(
                                                        <AnimatePresence>
                                                            {openMenuId === file.id && menuPosition && (
                                                                <motion.div
                                                                    key={`menu-${file.id}`}
                                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                                    className="fixed z-[99999] w-40 bg-white border border-gray-200 rounded-md shadow-xl py-1 text-left"
                                                                    style={{
                                                                        top: `${menuPosition.top}px`,
                                                                        left: `${menuPosition.left}px`,
                                                                        transform: "translateY(-50%)",
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    data-dm-menu="true"
                                                                >
                                                                    {isEditable && fileCanEdit && (
                                                                        <button
                                                                            className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                const url = `/documents/edit?bucket=${activeOrg?.id}&path=${encodeURIComponent(file.storage_path)}`;
                                                                                window.location.assign(url);
                                                                                setOpenMenuId(null);
                                                                                setMenuPosition(null);
                                                                            }}
                                                                            title="Edit"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                            <span>Edit</span>
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setOpenMenuId(null);
                                                                            setMenuPosition(null);
                                                                            handleDownload(file);
                                                                        }}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                        <span>Download</span>
                                                                    </button>
                                                                    {fileCanEdit && currentOrgRole === "owner" && (
                                                                        <button
                                                                            className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 text-left"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setOpenMenuId(null);
                                                                                setMenuPosition(null);
                                                                                setSharingFile(file);
                                                                            }}
                                                                        >
                                                                            <Share2 className="h-4 w-4" />
                                                                            <span>Share</span>
                                                                        </button>
                                                                    )}
                                                                    {fileCanEdit && (
                                                                        <button
                                                                            className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-red-600 text-left"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setOpenMenuId(null);
                                                                                setMenuPosition(null);
                                                                                handleDeleteFile(file);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>,
                                                        document.body
                                                    )}
                                                </>
                                            )}
										</motion.div>
									);
								})}
							</div>
						</div>

				)}


						{/* Empty State */}
						{files.length === 0 &&
							folders.length === 0 &&
							!isLoading && (
								<div className="text-center py-8">
									<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<p className="text-gray-500">
										No documents yet
									</p>
									<p className="text-sm text-gray-400 mt-1">
										{canEdit
											? "Upload files or create folders to get started"
											: "No documents available"}
									</p>
								</div>
							)}

			</CardContent>
                </motion.div>
            )}
            </AnimatePresence>
			{/* Permissions modal for uploads */}
			{showUploadPerms && canEdit && (
				<UploadPermissionsModal
					isOpen={showUploadPerms}
					onClose={() => {
						setShowUploadPerms(false);
						setSelectedFiles([]);
						if (fileInputRef.current)
							fileInputRef.current.value = "";
					}}
					files={selectedFiles}
					onConfirm={handleConfirmUpload}
				/>
			)}
			{previewingResourceId && (
				<DocumentPreviewModal
					resourceId={previewingResourceId}
					onClose={() => {
						setPreviewingResourceId(null);
						setOpenVersionsDefault(false); // Reset state when modal closes
					}}
					openVersionsDefault={openVersionsDefault}
					onDeleteSuccess={() => {
						// Optionally refresh the list after delete
					}}
				/>
			)}
			{sharingFile && (
				<ShareModal
					resource={{ ...sharingFile, id: sharingFile.resource_id }}
					isOpen={!!sharingFile}
					onClose={() => setSharingFile(null)}
				/>
			)}
		</Card>
	);
};
