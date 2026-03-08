"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Lock, Unlock, Loader2, Upload, X, FileText as FileTextIcon } from "lucide-react";
import { FormGroup } from "@/components/ui/Form";
import { cn } from "@/utils/cn";
import type { ProjectProfile } from "@/types/enhanced-types";
import { supabase } from "@/lib/supabaseClient";
import {
  validateFile,
  sanitizeFilename,
  MAX_IMAGE_OR_PDF_SIZE_BYTES,
  ALLOWED_IMAGE_OR_PDF_TYPES,
} from "@/utils/fileUploadValidation";

export interface ProjectMediaUploadProps {
	projectId: string;
	orgId: string | null;
	disabled?: boolean;
	formData: ProjectProfile;
	setFormData: React.Dispatch<React.SetStateAction<ProjectProfile>>;
	isFieldLocked: (fieldId: string, sectionId?: string) => boolean;
	toggleFieldLock: (fieldId: string) => void;
}

export const ProjectMediaUpload: React.FC<ProjectMediaUploadProps> = ({
	projectId,
	orgId,
	disabled = false,
	formData,
	setFormData,
	isFieldLocked,
	toggleFieldLock,
}) => {
	const [siteImages, setSiteImages] = useState<
		Array<{
			fileName: string;
			source: "main_folder" | "artifacts";
			storagePath: string;
			documentName?: string;
		}>
	>([]);
	const [architecturalDiagrams, setArchitecturalDiagrams] = useState<
		Array<{
			fileName: string;
			source: "main_folder" | "artifacts";
			storagePath: string;
			documentName?: string;
		}>
	>([]);
	const [uploadingSite, setUploadingSite] = useState(false);
	const [uploadingDiagrams, setUploadingDiagrams] = useState(false);
	const [loading, setLoading] = useState(true);
	const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
	const [selectedSiteImages, setSelectedSiteImages] = useState<Set<string>>(
		new Set()
	);
	const [selectedDiagrams, setSelectedDiagrams] = useState<Set<string>>(
		new Set()
	);
	const [deleting, setDeleting] = useState(false);

	const loadImages = useCallback(async () => {
		if (!orgId || !projectId) return;
		setLoading(true);
		try {
			const { loadProjectImages } = await import("@/lib/imageUtils");

			const allImages = await loadProjectImages(projectId, orgId, true);

			const siteImagesList = allImages
				.filter((img: any) => img.category === "site_images")
				.map((img: any) => ({
					fileName: img.name,
					source: img.source,
					storagePath: img.storagePath,
					documentName: img.documentName,
				}));

			const diagramsList = allImages
				.filter((img: any) => img.category === "architectural_diagrams")
				.map((img: any) => ({
					fileName: img.name,
					source: img.source,
					storagePath: img.storagePath,
					documentName: img.documentName,
				}));

			setSiteImages(siteImagesList);
			setArchitecturalDiagrams(diagramsList);

			// Sync image metadata to formData
			const syncImageMetadataToFormData = () => {
				const siteImagesMetadata = siteImagesList.map((img) => ({
					storagePath: img.storagePath,
					filename: img.fileName,
					category: "site_images" as const,
					source: img.source,
					...(img.documentName && { documentName: img.documentName }),
				}));

				const diagramsMetadata = diagramsList.map((img) => ({
					storagePath: img.storagePath,
					filename: img.fileName,
					category: "architectural_diagrams" as const,
					source: img.source,
					...(img.documentName && { documentName: img.documentName }),
				}));

				setFormData((prev) => {
					const updated = { ...prev };

					// Only update if field is not locked and formData doesn't already have the same images
					if (!isFieldLocked("siteImages", "site-context")) {
						const existingSiteImages = (prev as any).siteImages;
						if (
							!existingSiteImages ||
							JSON.stringify(existingSiteImages) !==
							JSON.stringify(siteImagesMetadata)
						) {
							(updated as any).siteImages = siteImagesMetadata;
						}
					}

					if (
						!isFieldLocked("architecturalDiagrams", "site-context")
					) {
						const existingDiagrams = (prev as any)
							.architecturalDiagrams;
						if (
							!existingDiagrams ||
							JSON.stringify(existingDiagrams) !==
							JSON.stringify(diagramsMetadata)
						) {
							(updated as any).architecturalDiagrams =
								diagramsMetadata;
						}
					}

					return updated;
				});
			};

			syncImageMetadataToFormData();

			const urlMap: Record<string, string> = {};
			for (const img of allImages) {
				const { data: urlData } = await supabase.storage
					.from(orgId)
					.createSignedUrl(img.storagePath, 3600);
				if (urlData) {
					urlMap[img.storagePath] = urlData.signedUrl;
				}
			}
			setImageUrls(urlMap);
		} catch (error) {
			console.error("Error loading images:", error);
		} finally {
			setLoading(false);
		}
	}, [orgId, projectId, isFieldLocked, setFormData]);

	useEffect(() => {
		if (!orgId || !projectId) return;
		loadImages();
	}, [orgId, projectId, loadImages]);

	const handleFileUpload = async (
		files: FileList | null,
		folder: "site-images" | "architectural-diagrams"
	) => {
		if (!files || !orgId || !projectId || disabled) return;

		const isSiteImages = folder === "site-images";
		const setUploading = isSiteImages
			? setUploadingSite
			: setUploadingDiagrams;
		const setImages = isSiteImages
			? setSiteImages
			: setArchitecturalDiagrams;

		setUploading(true);
		try {
			for (const file of Array.from(files)) {
				const validation = validateFile(file, {
					allowedMimeTypePredicates: ALLOWED_IMAGE_OR_PDF_TYPES,
					maxSizeBytes: MAX_IMAGE_OR_PDF_SIZE_BYTES,
					requireSanitizedName: false,
				});
				if (!validation.valid) {
					alert(validation.error ?? "Invalid file");
					continue;
				}
				const safeName = sanitizeFilename(file.name);

				const filePath = `${projectId}/${folder}/${safeName}`;
				const { error } = await supabase.storage
					.from(orgId)
					.upload(filePath, file, {
						cacheControl: "3600",
						upsert: true,
					});

				if (error) {
					console.error(`Error uploading ${safeName}:`, error);
					alert(`Failed to upload ${safeName}`);
				} else {
					const uploadedPath = `${projectId}/${folder}/${safeName}`;
					const newImage = {
						fileName: safeName,
						source: "main_folder" as const,
						storagePath: uploadedPath,
					};
					setImages((prev) => [...prev, newImage]);

					// Update formData with new image metadata
					const fieldId = isSiteImages
						? "siteImages"
						: "architecturalDiagrams";
					if (!isFieldLocked(fieldId, "site-context")) {
						setFormData((prev) => {
							const updated = { ...prev };
							const existingImages = (prev as any)[fieldId] || [];
							const imageMetadata = {
								storagePath: uploadedPath,
								filename: safeName,
								category: isSiteImages
									? "site_images"
									: "architectural_diagrams",
								source: "main_folder" as const,
							};
							(updated as any)[fieldId] = [
								...existingImages,
								imageMetadata,
							];
							return updated;
						});
					}

					const { data: urlData } = await supabase.storage
						.from(orgId)
						.createSignedUrl(uploadedPath, 3600);
					if (urlData) {
						setImageUrls((prev) => ({
							...prev,
							[uploadedPath]: urlData.signedUrl,
						}));
					}

					// Invalidate cache after successful upload
					const { invalidateProjectImageCache } = await import(
						"@/lib/imageUtils"
					);
					invalidateProjectImageCache(projectId, orgId);
				}
			}
		} catch (error) {
			console.error("Error uploading files:", error);
			alert("Failed to upload files");
		} finally {
			setUploading(false);
		}
	};

	const handleDeleteMultipleImages = async (
		fileNames: string[],
		folder: "site-images" | "architectural-diagrams"
	) => {
		if (!orgId || !projectId || disabled || fileNames.length === 0) return;

		const isSiteImages = folder === "site-images";
		const images = isSiteImages ? siteImages : architecturalDiagrams;
		const setImages = isSiteImages
			? setSiteImages
			: setArchitecturalDiagrams;
		const setSelected = isSiteImages
			? setSelectedSiteImages
			: setSelectedDiagrams;

		if (
			!confirm(
				`Delete ${fileNames.length} ${fileNames.length === 1 ? "image" : "images"
				}?`
			)
		)
			return;

		setDeleting(true);
		try {
			const filePaths = fileNames
				.map((fileName) => {
					const image = images.find(
						(img) => img.fileName === fileName
					);
					return image
						? image.storagePath
						: `${projectId}/${folder}/${fileName}`;
				})
				.filter(Boolean) as string[];

			const { error } = await supabase.storage
				.from(orgId)
				.remove(filePaths);

			if (error) {
				console.error(
					"[ProjectMediaUpload] Error deleting files:",
					error
				);
				alert(
					`Failed to delete files: ${(error as any).message || JSON.stringify(error)
					}`
				);
				setDeleting(false);
				return;
			}

			setImages((prev) =>
				prev.filter((img) => !fileNames.includes(img.fileName))
			);

			// Update formData to remove deleted images
			const fieldId = isSiteImages
				? "siteImages"
				: "architecturalDiagrams";
			if (!isFieldLocked(fieldId, "site-context")) {
				setFormData((prev) => {
					const updated = { ...prev };
					const existingImages = (prev as any)[fieldId] || [];
					const filePathsToDelete = fileNames.map((fileName) => {
						const image = images.find(
							(img) => img.fileName === fileName
						);
						return image
							? image.storagePath
							: `${projectId}/${folder}/${fileName}`;
					});
					(updated as any)[fieldId] = existingImages.filter(
						(img: any) =>
							!filePathsToDelete.includes(img.storagePath)
					);
					return updated;
				});
			}

			setSelected((prev) => {
				const next = new Set(prev);
				fileNames.forEach((name) => next.delete(name));
				return next;
			});

			setImageUrls((prev) => {
				const next = { ...prev };
				filePaths.forEach((path) => {
					delete next[path];
				});
				return next;
			});

			// Invalidate cache after successful deletion
			const { invalidateProjectImageCache } = await import(
				"@/lib/imageUtils"
			);
			invalidateProjectImageCache(projectId, orgId);

			setTimeout(async () => {
				await loadImages();
			}, 300);
		} catch (error) {
			console.error(
				"[ProjectMediaUpload] Exception during deletion:",
				error
			);
			alert(
				`Failed to delete files: ${error instanceof Error ? error.message : "Unknown error"
				}`
			);
		} finally {
			setDeleting(false);
		}
	};

	const handleDeleteImage = async (
		fileName: string,
		folder: "site-images" | "architectural-diagrams"
	) => {
		await handleDeleteMultipleImages([fileName], folder);
	};

	const handleToggleSelect = (
		fileName: string,
		folder: "site-images" | "architectural-diagrams"
	) => {
		if (disabled) return;

		const isSiteImages = folder === "site-images";
		const setSelected = isSiteImages
			? setSelectedSiteImages
			: setSelectedDiagrams;

		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(fileName)) {
				next.delete(fileName);
			} else {
				next.add(fileName);
			}
			return next;
		});
	};

	const handleSelectAll = (
		folder: "site-images" | "architectural-diagrams"
	) => {
		if (disabled) return;

		const isSiteImages = folder === "site-images";
		const images = isSiteImages ? siteImages : architecturalDiagrams;
		const setSelected = isSiteImages
			? setSelectedSiteImages
			: setSelectedDiagrams;
		const selected = isSiteImages ? selectedSiteImages : selectedDiagrams;

		if (selected.size === images.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(images.map((img) => img.fileName)));
		}
	};

	const getImageUrl = (storagePath: string) => {
		return imageUrls[storagePath] || null;
	};

	if (!orgId || !projectId) {
		return (
			<div className="text-sm text-gray-500">
				Project media is unavailable until an organization and project
				are fully initialized.
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8 text-gray-500 gap-2">
				<Loader2 className="h-5 w-5 animate-spin" />
				<span>Loading images...</span>
			</div>
		);
	}

	return (
		<>
		<div className="space-y-8">
			<FormGroup>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<label className="block text-sm font-medium text-gray-700">
							Site Images
						</label>
						{!disabled && (
							<button
								type="button"
								onClick={() => toggleFieldLock("siteImages")}
								className={cn(
									"flex items-center justify-center p-1 rounded transition-colors",
									"cursor-pointer",
									isFieldLocked("siteImages", "site-context")
										? "text-emerald-600 hover:text-emerald-700"
										: "text-gray-400 hover:text-blue-600"
								)}
								title={
									isFieldLocked("siteImages", "site-context")
										? "Unlock field"
										: "Lock field"
								}
							>
								{isFieldLocked("siteImages", "site-context") ? (
									<Lock className="h-4 w-4" />
								) : (
									<Unlock className="h-4 w-4" />
								)}
							</button>
						)}
					</div>
					{siteImages.length > 0 &&
						!disabled &&
						!isFieldLocked("siteImages", "site-context") && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() =>
										handleSelectAll("site-images")
									}
									className="text-xs text-blue-600 hover:text-blue-700"
								>
									{selectedSiteImages.size ===
										siteImages.length
										? "Deselect All"
										: "Select All"}
								</button>
								{selectedSiteImages.size > 0 && (
									<button
										type="button"
										onClick={() =>
											handleDeleteMultipleImages(
												Array.from(selectedSiteImages),
												"site-images"
											)
										}
										disabled={
											deleting ||
											isFieldLocked(
												"siteImages",
												"site-context"
											)
										}
										className={cn(
											"text-xs text-red-600 hover:text-red-700 font-medium",
											deleting &&
											"opacity-50 cursor-not-allowed"
										)}
									>
										{deleting
											? "Deleting..."
											: `Delete Selected (${selectedSiteImages.size})`}
									</button>
								)}
							</div>
						)}
				</div>
				<div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
					<input
						type="file"
						accept="image/*,application/pdf"
						multiple
						onChange={(e) =>
							handleFileUpload(e.target.files, "site-images")
						}
						disabled={
							disabled ||
							uploadingSite ||
							isFieldLocked("siteImages", "site-context")
						}
						className="hidden"
						id="site-images-upload"
					/>
					<label
						htmlFor="site-images-upload"
						className={cn(
							"flex flex-col items-center justify-center cursor-pointer",
							(disabled ||
								uploadingSite ||
								isFieldLocked("siteImages", "site-context")) &&
							"opacity-50 cursor-not-allowed"
						)}
					>
						<Upload className="h-8 w-8 text-gray-400 mb-2" />
						<span className="text-sm text-gray-600">
							{uploadingSite
								? "Uploading..."
								: "Click to upload site images"}
						</span>
					</label>
				</div>
				{siteImages.length > 0 && (
					<div className="max-h-96 overflow-y-auto mt-4 pr-2">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{siteImages.map((image) => {
								const imageUrl = getImageUrl(image.storagePath);
								const isSelected = selectedSiteImages.has(
									image.fileName
								);
								return (
									<div
										key={image.storagePath}
										className={cn(
											"relative group border-2 rounded-lg transition-all",
											isSelected
												? "border-blue-500 ring-2 ring-blue-200"
												: "border-gray-200"
										)}
										onClick={() =>
											handleToggleSelect(
												image.fileName,
												"site-images"
											)
										}
									>
										{!disabled && (
											<div className="absolute top-2 left-2 z-10">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() =>
														handleToggleSelect(
															image.fileName,
															"site-images"
														)
													}
													onClick={(e) =>
														e.stopPropagation()
													}
													className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
												/>
											</div>
										)}
										{image.source === "artifacts" &&
											image.documentName && (
												<div className="absolute top-2 right-2 z-10 group/tooltip">
													<FileTextIcon className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
													<div className="absolute right-0 top-6 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
														<div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
															From:{" "}
															{image.documentName}
															<div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
														</div>
													</div>
												</div>
											)}
										{imageUrl ? (
											<div className="relative w-full h-32 rounded-lg overflow-hidden">
												<Image
													src={imageUrl}
													alt={image.fileName}
													fill
													sizes="(max-width: 768px) 50vw, 25vw"
													className="object-cover"
												/>
											</div>
										) : (
											<div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
												<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
											</div>
										)}
										{!disabled &&
											!deleting &&
											!isFieldLocked(
												"siteImages",
												"site-context"
											) && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteImage(
															image.fileName,
															"site-images"
														);
													}}
													className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
												>
													<X className="h-4 w-4" />
												</button>
											)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</FormGroup>

			<FormGroup>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<label className="block text-sm font-medium text-gray-700">
							Architectural Diagrams
						</label>
						{!disabled && (
							<button
								type="button"
								onClick={() =>
									toggleFieldLock("architecturalDiagrams")
								}
								className={cn(
									"flex items-center justify-center p-1 rounded transition-colors",
									"cursor-pointer",
									isFieldLocked(
										"architecturalDiagrams",
										"site-context"
									)
										? "text-emerald-600 hover:text-emerald-700"
										: "text-gray-400 hover:text-blue-600"
								)}
								title={
									isFieldLocked(
										"architecturalDiagrams",
										"site-context"
									)
										? "Unlock field"
										: "Lock field"
								}
							>
								{isFieldLocked(
									"architecturalDiagrams",
									"site-context"
								) ? (
									<Lock className="h-4 w-4" />
								) : (
									<Unlock className="h-4 w-4" />
								)}
							</button>
						)}
					</div>
					{architecturalDiagrams.length > 0 &&
						!disabled &&
						!isFieldLocked(
							"architecturalDiagrams",
							"site-context"
						) && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() =>
										handleSelectAll(
											"architectural-diagrams"
										)
									}
									className="text-xs text-blue-600 hover:text-blue-700"
								>
									{selectedDiagrams.size ===
										architecturalDiagrams.length
										? "Deselect All"
										: "Select All"}
								</button>
								{selectedDiagrams.size > 0 && (
									<button
										type="button"
										onClick={() =>
											handleDeleteMultipleImages(
												Array.from(selectedDiagrams),
												"architectural-diagrams"
											)
										}
										disabled={
											deleting ||
											isFieldLocked(
												"architecturalDiagrams",
												"site-context"
											)
										}
										className={cn(
											"text-xs text-red-600 hover:text-red-700 font-medium",
											(deleting ||
												isFieldLocked(
													"architecturalDiagrams",
													"site-context"
												)) &&
											"opacity-50 cursor-not-allowed"
										)}
									>
										{deleting
											? "Deleting..."
											: `Delete Selected (${selectedDiagrams.size})`}
									</button>
								)}
							</div>
						)}
				</div>
				<div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
					<input
						type="file"
						accept="image/*,application/pdf"
						multiple
						onChange={(e) =>
							handleFileUpload(
								e.target.files,
								"architectural-diagrams"
							)
						}
						disabled={
							disabled ||
							uploadingDiagrams ||
							isFieldLocked(
								"architecturalDiagrams",
								"site-context"
							)
						}
						className="hidden"
						id="architectural-diagrams-upload"
					/>
					<label
						htmlFor="architectural-diagrams-upload"
						className={cn(
							"flex flex-col items-center justify-center cursor-pointer",
							(disabled ||
								uploadingDiagrams ||
								isFieldLocked(
									"architecturalDiagrams",
									"site-context"
								)) &&
							"opacity-50 cursor-not-allowed"
						)}
					>
						<Upload className="h-8 w-8 text-gray-400 mb-2" />
						<span className="text-sm text-gray-600">
							{uploadingDiagrams
								? "Uploading..."
								: "Click to upload architectural images or PDFs"}
						</span>
					</label>
				</div>
				{architecturalDiagrams.length > 0 && (
					<div className="max-h-96 overflow-y-auto mt-4 pr-2">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{architecturalDiagrams.map((image) => {
								const imageUrl = getImageUrl(image.storagePath);
								const isSelected = selectedDiagrams.has(
									image.fileName
								);
								return (
									<div
										key={image.storagePath}
										className={cn(
											"relative group border-2 rounded-lg transition-all",
											isSelected
												? "border-blue-500 ring-2 ring-blue-200"
												: "border-gray-200"
										)}
										onClick={() =>
											handleToggleSelect(
												image.fileName,
												"architectural-diagrams"
											)
										}
									>
										{!disabled && (
											<div className="absolute top-2 left-2 z-10">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() =>
														handleToggleSelect(
															image.fileName,
															"architectural-diagrams"
														)
													}
													onClick={(e) =>
														e.stopPropagation()
													}
													className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
												/>
											</div>
										)}
										{image.source === "artifacts" &&
											image.documentName && (
												<div className="absolute top-2 right-2 z-10 group/tooltip">
													<FileTextIcon className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
													<div className="absolute right-0 top-6 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
														<div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
															From:{" "}
															{image.documentName}
															<div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
														</div>
													</div>
												</div>
											)}
										{imageUrl ? (
											<div className="relative w-full h-32 rounded-lg overflow-hidden">
												<Image
													src={imageUrl}
													alt={image.fileName}
													fill
													sizes="(max-width: 768px) 50vw, 25vw"
													className="object-cover"
												/>
											</div>
										) : (
											<div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
												<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
											</div>
										)}
										{!disabled &&
											!deleting &&
											!isFieldLocked(
												"architecturalDiagrams",
												"site-context"
											) && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteImage(
															image.fileName,
															"architectural-diagrams"
														);
													}}
													className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
												>
													<X className="h-4 w-4" />
												</button>
											)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</FormGroup>
		</div>
		</>
	);
