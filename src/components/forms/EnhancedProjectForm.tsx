// src/components/forms/EnhancedProjectForm.tsx
"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormWizard, Step } from "../ui/FormWizard";
// Removed Card wrappers to match Borrower styling (single container only)
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select"; // Keep Select for States
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect"; // Import ButtonSelect
import { useProjects } from "../../hooks/useProjects";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

import { FormProvider } from "../../contexts/FormContext";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAutofill } from "../../hooks/useAutofill";

import {
	FileText,
	MapPin,
	Building,
	DollarSign,
	CheckCircle,
	FileQuestion,
	BarChart,
	Info,
	Globe,
	Calendar,
	Map,
	Users,
	Calculator,
	TrendingUp,
	Sparkles,
	Loader2,
	Lock,
	Unlock,
	AlertTriangle,
	Image as ImageIcon,
	Upload,
	X,
} from "lucide-react";
import {
	ProjectProfile,
	ProjectPhase,
	InterestRateType,
	RecoursePreference,
	ExitStrategy,
	FieldMetadata,
} from "../../types/enhanced-types";
import { PROJECT_REQUIRED_FIELDS } from "@/utils/resumeCompletion";

interface EnhancedProjectFormProps {
	existingProject: ProjectProfile;
	onComplete?: (project: ProjectProfile) => void;
	compact?: boolean; // Add compact prop
	onAskAI?: (fieldId: string) => void; // Add onAskAI prop
	onFormDataChange?: (formData: ProjectProfile) => void; // Add onFormDataChange prop
	initialFocusFieldId?: string; // NEW: scroll/focus this field on mount/update
	onVersionChange?: () => void;
}

const assetTypeOptions = [
	"Multifamily",
	"Office",
	"Retail",
	"Industrial",
	"Hospitality",
	"Land",
	"Mixed-Use",
	"Self-Storage",
	"Data Center",
	"Medical Office",
	"Senior Housing",
	"Student Housing",
	"Other",
];
const projectPhaseOptions: ProjectPhase[] = [
	"Acquisition",
	"Refinance",
	"Construction",
	"Bridge",
	"Development",
	"Value-Add",
	"Other",
];
const capitalTypeOptions = [
	{ label: "Senior Debt", value: "Senior Debt" },
	{ label: "Mezz", value: "Mezzanine" },
	{ label: "Preferred Equity", value: "Preferred Equity" },
	{ label: "Common Equity", value: "Common Equity" },
	{ label: "JV Equity", value: "JV Equity" },
	{ label: "Other", value: "Other" },
];
const interestRateTypeOptions: InterestRateType[] = [
	"Not Specified",
	"Fixed",
	"Floating",
];
const recourseOptions: RecoursePreference[] = [
	"Flexible",
	"Full Recourse",
	"Partial Recourse",
	"Non-Recourse",
];
const exitStrategyOptions: ExitStrategy[] = [
	"Undecided",
	"Sale",
	"Refinance",
	"Long-Term Hold",
];

const isProjectValueProvided = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
};

// FieldWarning component for displaying warnings next to field labels
interface FieldWarningProps {
	message: string;
	className?: string;
}

const FieldWarning: React.FC<FieldWarningProps> = ({ message, className }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const triggerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen && triggerRef.current) {
			const updatePosition = () => {
				const rect = triggerRef.current?.getBoundingClientRect();
				if (rect) {
					const scrollY = window.scrollY;
					const scrollX = window.scrollX;

					setPosition({
						top: rect.top + scrollY - 8,
						left: rect.left + scrollX + rect.width / 2,
					});
				}
			};

			updatePosition();
			window.addEventListener("scroll", updatePosition, true);
			window.addEventListener("resize", updatePosition);

			return () => {
				window.removeEventListener("scroll", updatePosition, true);
				window.removeEventListener("resize", updatePosition);
			};
		}
	}, [isOpen]);

	return (
		<>
			<div
				ref={triggerRef}
				className={cn("relative inline-flex items-center", className)}
				onMouseEnter={() => setIsOpen(true)}
				onMouseLeave={() => setIsOpen(false)}
			>
				<AlertTriangle
					size={16}
					className="text-amber-600 hover:text-amber-700 transition-colors cursor-help"
				/>
			</div>
			{typeof window !== "undefined" &&
				createPortal(
					<AnimatePresence>
						{isOpen && (
							<motion.div
								initial={{ opacity: 0, y: 5, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: 5, scale: 0.95 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
								style={{
									position: "fixed",
									top: `${position.top}px`,
									left: `${position.left}px`,
									transform: "translate(-50%, -100%)",
									zIndex: 9999,
									width: "16rem", // w-64
									marginBottom: "0.5rem",
								}}
								className="bg-white rounded-lg shadow-xl border border-amber-200 pointer-events-auto"
								onClick={(e) => e.stopPropagation()}
								onMouseEnter={() => setIsOpen(true)}
								onMouseLeave={() => setIsOpen(false)}
							>
								<div className="p-3">
									<div className="flex items-start gap-2">
										<AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-gray-800 leading-relaxed">
											{message}
										</p>
									</div>
								</div>
								{/* Arrow pointer */}
								<div className="absolute top-full -mt-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-amber-200 transform rotate-45" />
							</motion.div>
						)}
					</AnimatePresence>,
					document.body
				)}
		</>
	);
};

// Project Media Upload Component
interface ProjectMediaUploadProps {
	projectId: string;
	orgId: string | null;
	disabled?: boolean;
}

const ProjectMediaUpload: React.FC<ProjectMediaUploadProps> = ({
	projectId,
	orgId,
	disabled = false,
}) => {
	const [siteImages, setSiteImages] = useState<Array<{fileName: string; source: 'main_folder' | 'artifacts'; storagePath: string; documentName?: string}>>([]);
	const [architecturalDiagrams, setArchitecturalDiagrams] = useState<
		Array<{fileName: string; source: 'main_folder' | 'artifacts'; storagePath: string; documentName?: string}>
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
			// Import loadProjectImages function
			const { loadProjectImages } = await import('@/lib/imageUtils');
			
			// Load all images (from main folders and artifacts, excluding "other" category)
			const allImages = await loadProjectImages(projectId, orgId, true); // true = exclude "other"
			
			// Separate by category
			const siteImagesList = allImages
				.filter(img => img.category === 'site_images')
				.map(img => ({
					fileName: img.name,
					source: img.source,
					storagePath: img.storagePath,
					documentName: img.documentName,
				}));
			
			const diagramsList = allImages
				.filter(img => img.category === 'architectural_diagrams')
				.map(img => ({
					fileName: img.name,
					source: img.source,
					storagePath: img.storagePath,
					documentName: img.documentName,
				}));
			
			setSiteImages(siteImagesList);
			setArchitecturalDiagrams(diagramsList);
			
			// Generate signed URLs for all images
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
	}, [orgId, projectId]);

	// Load existing images
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
				// Validate image file
				if (
					!file.type.startsWith("image/") &&
					!file.name.match(/\.pdf$/i)
				) {
					alert(`${file.name} is not a valid image or PDF file`);
					continue;
				}

				const filePath = `${projectId}/${folder}/${file.name}`;
				const { error } = await supabase.storage
					.from(orgId)
					.upload(filePath, file, {
						cacheControl: "3600",
						upsert: true,
					});

				if (error) {
					console.error(`Error uploading ${file.name}:`, error);
					alert(`Failed to upload ${file.name}`);
				} else {
					const filePath = `${projectId}/${folder}/${file.name}`;
					setImages((prev) => [...prev, {
						fileName: file.name,
						source: 'main_folder',
						storagePath: filePath,
					}]);
					// Generate signed URL for the newly uploaded file
					const { data: urlData } = await supabase.storage
						.from(orgId)
						.createSignedUrl(filePath, 3600);
					if (urlData) {
						setImageUrls((prev) => ({
							...prev,
							[filePath]: urlData.signedUrl,
						}));
					}
				}
			}
		} catch (error) {
			console.error("Error uploading files:", error);
			alert("Failed to upload files");
		} finally {
			setUploading(false);
		}
	};

	const handleDeleteImage = async (
		fileName: string,
		folder: "site-images" | "architectural-diagrams"
	) => {
		await handleDeleteMultipleImages([fileName], folder);
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
				`Delete ${fileNames.length} ${
					fileNames.length === 1 ? "image" : "images"
				}?`
			)
		)
			return;

		setDeleting(true);
		try {
			// Get storage paths for the selected files
			const filePaths = fileNames.map((fileName) => {
				const image = images.find(img => img.fileName === fileName);
				return image ? image.storagePath : `${projectId}/${folder}/${fileName}`;
			}).filter(Boolean) as string[];

			console.log(
				`[ProjectMediaUpload] Attempting to delete files from bucket "${orgId}":`,
				filePaths
			);

			const { data, error } = await supabase.storage
				.from(orgId)
				.remove(filePaths);

			if (error) {
				console.error(
					"[ProjectMediaUpload] Error deleting files:",
					error
				);
				alert(
					`Failed to delete files: ${
						error.message || JSON.stringify(error)
					}`
				);
				setDeleting(false);
				return;
			}

			// Update state after successful deletion
			setImages((prev) =>
				prev.filter((img) => !fileNames.includes(img.fileName))
			);

			// Remove from selected set
			setSelected((prev) => {
				const next = new Set(prev);
				fileNames.forEach((name) => next.delete(name));
				return next;
			});

			// Remove URLs from imageUrls state
			setImageUrls((prev) => {
				const next = { ...prev };
				filePaths.forEach((path) => {
					delete next[path];
				});
				return next;
			});

			// Reload images from storage to refresh the list
			setTimeout(async () => {
				await loadImages();
			}, 300);

			console.log(
				`[ProjectMediaUpload] ✓ Successfully deleted ${fileNames.length} file(s) and updated UI.`
			);
		} catch (error) {
			console.error(
				"[ProjectMediaUpload] Exception during deletion:",
				error
			);
			alert(
				`Failed to delete files: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		} finally {
			setDeleting(false);
		}
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
			// Deselect all
			setSelected(new Set());
		} else {
			// Select all
			setSelected(new Set(images));
		}
	};

	const getImageUrl = (storagePath: string) => {
		return imageUrls[storagePath] || null;
	};

	if (loading) {
		return <div className="text-center py-8">Loading images...</div>;
	}

	return (
		<div className="space-y-8">
			{/* Site Images */}
			<FormGroup>
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-medium text-gray-700">
						Site Images
					</label>
					{siteImages.length > 0 && !disabled && (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleSelectAll("site-images")}
								className="text-xs text-blue-600 hover:text-blue-700"
							>
								{selectedSiteImages.size === siteImages.length
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
									disabled={deleting}
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
						accept="image/*"
						multiple
						onChange={(e) =>
							handleFileUpload(e.target.files, "site-images")
						}
						disabled={disabled || uploadingSite}
						className="hidden"
						id="site-images-upload"
					/>
					<label
						htmlFor="site-images-upload"
						className={cn(
							"flex flex-col items-center justify-center cursor-pointer",
							(disabled || uploadingSite) &&
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
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
						{siteImages.map((image) => {
							const imageUrl = getImageUrl(image.storagePath);
							const isSelected = selectedSiteImages.has(image.fileName);
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
									{image.source === 'artifacts' && image.documentName && (
										<div className="absolute top-2 right-2 z-10 group/tooltip">
											<FileText className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
											<div className="absolute right-0 top-6 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
												<div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
													From: {image.documentName}
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
									{!disabled && !deleting && (
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
				)}
			</FormGroup>

			{/* Architectural Diagrams */}
			<FormGroup>
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-medium text-gray-700">
						Architectural Diagrams
					</label>
					{architecturalDiagrams.length > 0 && !disabled && (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() =>
									handleSelectAll("architectural-diagrams")
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
									disabled={deleting}
									className={cn(
										"text-xs text-red-600 hover:text-red-700 font-medium",
										deleting &&
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
						accept="image/*,.pdf"
						multiple
						onChange={(e) =>
							handleFileUpload(
								e.target.files,
								"architectural-diagrams"
							)
						}
						disabled={disabled || uploadingDiagrams}
						className="hidden"
						id="architectural-diagrams-upload"
					/>
					<label
						htmlFor="architectural-diagrams-upload"
						className={cn(
							"flex flex-col items-center justify-center cursor-pointer",
							(disabled || uploadingDiagrams) &&
								"opacity-50 cursor-not-allowed"
						)}
					>
						<Upload className="h-8 w-8 text-gray-400 mb-2" />
						<span className="text-sm text-gray-600">
							{uploadingDiagrams
								? "Uploading..."
								: "Click to upload architectural diagrams"}
						</span>
					</label>
				</div>
				{architecturalDiagrams.length > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
						{architecturalDiagrams.map((image) => {
							const imageUrl = getImageUrl(image.storagePath);
							const isSelected = selectedDiagrams.has(image.fileName);
							const isPdf = image.fileName.match(/\.pdf$/i);
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
									{image.source === 'artifacts' && image.documentName && (
										<div className="absolute top-2 right-2 z-10 group/tooltip">
											<FileText className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
											<div className="absolute right-0 top-6 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
												<div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
													From: {image.documentName}
													<div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
												</div>
											</div>
										</div>
									)}
									{isPdf ? (
										<div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
											<FileText className="h-8 w-8 text-gray-400" />
										</div>
									) : imageUrl ? (
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
									{!disabled && !deleting && (
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
				)}
			</FormGroup>
		</div>
	);
};

const stateOptions = [
	// Keep states for Select component
	{ value: "", label: "Select a state..." },
	{ value: "AL", label: "Alabama" },
	{ value: "AK", label: "Alaska" },
	{ value: "AZ", label: "Arizona" },
	{ value: "AR", label: "Arkansas" },
	{ value: "CA", label: "California" },
	{ value: "CO", label: "Colorado" },
	{ value: "CT", label: "Connecticut" },
	{ value: "DE", label: "Delaware" },
	{ value: "FL", label: "Florida" },
	{ value: "GA", label: "Georgia" },
	{ value: "HI", label: "Hawaii" },
	{ value: "ID", label: "Idaho" },
	{ value: "IL", label: "Illinois" },
	{ value: "IN", label: "Indiana" },
	{ value: "IA", label: "Iowa" },
	{ value: "KS", label: "Kansas" },
	{ value: "KY", label: "Kentucky" },
	{ value: "LA", label: "Louisiana" },
	{ value: "ME", label: "Maine" },
	{ value: "MD", label: "Maryland" },
	{ value: "MA", label: "Massachusetts" },
	{ value: "MI", label: "Michigan" },
	{ value: "MN", label: "Minnesota" },
	{ value: "MS", label: "Mississippi" },
	{ value: "MO", label: "Missouri" },
	{ value: "MT", label: "Montana" },
	{ value: "NE", label: "Nebraska" },
	{ value: "NV", label: "Nevada" },
	{ value: "NH", label: "New Hampshire" },
	{ value: "NJ", label: "New Jersey" },
	{ value: "NM", label: "New Mexico" },
	{ value: "NY", label: "New York" },
	{ value: "NC", label: "North Carolina" },
	{ value: "ND", label: "North Dakota" },
	{ value: "OH", label: "Ohio" },
	{ value: "OK", label: "Oklahoma" },
	{ value: "OR", label: "Oregon" },
	{ value: "PA", label: "Pennsylvania" },
	{ value: "RI", label: "Rhode Island" },
	{ value: "SC", label: "South Carolina" },
	{ value: "SD", label: "South Dakota" },
	{ value: "TN", label: "Tennessee" },
	{ value: "TX", label: "Texas" },
	{ value: "UT", label: "Utah" },
	{ value: "VT", label: "Vermont" },
	{ value: "VA", label: "Virginia" },
	{ value: "WA", label: "Washington" },
	{ value: "WV", label: "West Virginia" },
	{ value: "WI", label: "Wisconsin" },
	{ value: "WY", label: "Wyoming" },
	{ value: "DC", label: "District of Columbia" },
];

export const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
	existingProject,
	onComplete,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId, // NEW
	onVersionChange,
}) => {
	const router = useRouter();
	const { updateProject } = useProjects();
	const { activeOrg, user } = useAuthStore();

	// Form state initialized from existingProject prop
	const [formData, setFormData] = useState<ProjectProfile>(() => ({
		...existingProject,
	}));
	const [formSaved, setFormSaved] = useState(false); // State for save button feedback
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
	const versionSnapshotSentRef = useRef(false);

	// Metadata state for tracking sources and warnings
	const [fieldMetadata, setFieldMetadata] = useState<
		Record<string, FieldMetadata>
	>(() => {
		return existingProject._metadata || {};
	});

	// Debug: Log metadata when it changes
	useEffect(() => {
		if (Object.keys(fieldMetadata).length > 0) {
			console.log(
				"[EnhancedProjectForm] Field metadata loaded:",
				fieldMetadata
			);
		}
	}, [fieldMetadata]);

	// Use the shared autofill hook
	const projectAddress =
		formData.propertyAddressStreet &&
		formData.propertyAddressCity &&
		formData.propertyAddressState
			? `${formData.propertyAddressStreet} | ${
					formData.propertyAddressCity
			  } ${formData.propertyAddressState}, ${
					formData.propertyAddressZip || ""
			  }`.trim()
			: undefined;
	const { isAutofilling, showSparkles, handleAutofill } = useAutofill(
		formData.id,
		{ projectAddress }
	);

	const snapshotProjectResume = useCallback(
		async ({ keepAlive = false } = {}) => {
			if (!formData.id) {
				return;
			}

			const payload = JSON.stringify({
				projectId: formData.id,
				userId: user?.id ?? null,
			});
			const endpoint = "/api/project-resume/save-version";

			if (
				keepAlive &&
				typeof window !== "undefined" &&
				typeof navigator !== "undefined" &&
				typeof navigator.sendBeacon === "function"
			) {
				const blob = new Blob([payload], {
					type: "application/json",
				});
				navigator.sendBeacon(endpoint, blob);
				return;
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: payload,
			});

			if (!response.ok) {
				throw new Error("Failed to persist resume version");
			}
		},
		[formData.id, user?.id]
	);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleBeforeUnload = () => {
			if (versionSnapshotSentRef.current) {
				return;
			}
			versionSnapshotSentRef.current = true;
			void snapshotProjectResume({ keepAlive: true });
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [snapshotProjectResume]);

	// Lock state management
	// Initialize lockedFields from existingProject._lockedFields
	const [lockedFields, setLockedFields] = useState<Set<string>>(() => {
		const locked = existingProject._lockedFields || {};
		const lockedSet = new Set(
			Object.keys(locked).filter((key) => locked[key] === true)
		);
		console.log(
			"[EnhancedProjectForm] Initialized lockedFields from existingProject:",
			lockedSet,
			"from:",
			locked
		);
		return lockedSet;
	});

	// Sync lockedFields when existingProject changes (e.g., after reload)
	// Use a ref to track if we're in the middle of a user action to prevent overwriting
	const isUserActionRef = useRef(false);

	useEffect(() => {
		// Skip sync if user just made a change (will be saved and then synced on next load)
		if (isUserActionRef.current) {
			isUserActionRef.current = false;
			return;
		}

		const locked = existingProject._lockedFields || {};
		const lockedSet = new Set(
			Object.keys(locked).filter((key) => locked[key] === true)
		);

		// Only update if different to avoid unnecessary re-renders
		const currentLockedArray = Array.from(lockedFields).sort();
		const newLockedArray = Array.from(lockedSet).sort();
		if (
			JSON.stringify(currentLockedArray) !==
			JSON.stringify(newLockedArray)
		) {
			setLockedFields(lockedSet);
			console.log(
				"[EnhancedProjectForm] Synced lockedFields from existingProject:",
				lockedSet
			);
		}
	}, [existingProject._lockedFields, lockedFields]);

	// Initialize lockedSections from existingProject._lockedSections
	const [lockedSections, setLockedSections] = useState<Set<string>>(() => {
		const locked = existingProject._lockedSections || {};
		const lockedSet = new Set(
			Object.keys(locked).filter((key) => locked[key] === true)
		);
		console.log(
			"[EnhancedProjectForm] Initialized lockedSections from existingProject:",
			lockedSet,
			"from:",
			locked
		);
		return lockedSet;
	});
	const [unlockedFields, setUnlockedFields] = useState<Set<string>>(
		new Set()
	); // Fields explicitly unlocked even when section is locked

	// Sync lockedSections when existingProject changes (e.g., after reload)
	useEffect(() => {
		// Skip sync if user just made a change (will be saved and then synced on next load)
		if (isUserActionRef.current) {
			return;
		}

		const locked = existingProject._lockedSections || {};
		const lockedSet = new Set(
			Object.keys(locked).filter((key) => locked[key] === true)
		);

		// Only update if different to avoid unnecessary re-renders
		const currentLockedArray = Array.from(lockedSections).sort();
		const newLockedArray = Array.from(lockedSet).sort();
		if (
			JSON.stringify(currentLockedArray) !==
			JSON.stringify(newLockedArray)
		) {
			setLockedSections(lockedSet);
			console.log(
				"[EnhancedProjectForm] Synced lockedSections from existingProject:",
				lockedSet
			);
		}
	}, [existingProject._lockedSections, lockedSections]);

	// Helper function to check if a field is locked
	const isFieldLocked = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			// If explicitly unlocked (overrides section lock), return false
			if (unlockedFields.has(fieldId)) return false;

			// If explicitly locked, return true
			if (lockedFields.has(fieldId)) return true;

			// If section is locked and field is not explicitly unlocked, return true
			if (sectionId && lockedSections.has(sectionId)) return true;

			return false;
		},
		[lockedFields, lockedSections, unlockedFields]
	);

	// Helper function to check if a field should be disabled (locked OR autofilling)
	const isFieldDisabled = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			return isFieldLocked(fieldId, sectionId) || isAutofilling;
		},
		[isFieldLocked, isAutofilling]
	);

	// Helper function to check if a field has a warning
	const getFieldWarning = useCallback(
		(fieldId: string): string | null => {
			const meta = fieldMetadata[fieldId];
			if (meta && meta.warnings && meta.warnings.length > 0) {
				const warning = meta.warnings[0]; // Return the first warning
				// Debug log for troubleshooting
				if (process.env.NODE_ENV === "development") {
					console.log(
						`[getFieldWarning] Field ${fieldId} has warning:`,
						warning,
						"Full meta:",
						meta
					);
				}
				return warning;
			}
			return null;
		},
		[fieldMetadata]
	);

	// Toggle lock for a single field
	const toggleFieldLock = useCallback(
		(fieldId: string, sectionId?: string) => {
			// Mark that user is making a change to prevent sync from overwriting
			isUserActionRef.current = true;

			// Check current effective lock state
			const currentlyLocked = (() => {
				if (unlockedFields.has(fieldId)) return false;
				if (lockedFields.has(fieldId)) return true;
				if (sectionId && lockedSections.has(sectionId)) return true;
				return false;
			})();

			if (currentlyLocked) {
				// Unlocking the field
				// If section is locked, add to unlockedFields (override section lock)
				if (sectionId && lockedSections.has(sectionId)) {
					setUnlockedFields((prev) => {
						const next = new Set(prev);
						next.add(fieldId);
						return next;
					});
				} else {
					// Field was explicitly locked, remove from lockedFields
					setLockedFields((prev) => {
						const next = new Set(prev);
						next.delete(fieldId);
						return next;
					});
					// Also remove from unlockedFields if it was there
					setUnlockedFields((prev) => {
						const next = new Set(prev);
						next.delete(fieldId);
						return next;
					});
				}
			} else {
				// Locking the field
				// Remove from unlockedFields if it was there
				setUnlockedFields((prev) => {
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
				// Add to lockedFields
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
			}
		},
		[lockedSections, unlockedFields, lockedFields]
	);

	// Get all field IDs in a section (needed for section lock visual feedback)
	const getSectionFieldIds = useCallback((sectionId: string): string[] => {
		// Map of section IDs to their field IDs based on data-field-section attributes
		const sectionFieldMap: Record<string, string[]> = {
			"basic-info": [
				"projectName",
				"propertyAddressStreet",
				"propertyAddressCity",
				"propertyAddressState",
				"propertyAddressZip",
				"propertyAddressCounty",
				"assetType",
				"projectPhase",
				"projectDescription",
			],
			"loan-info": [
				"loanAmountRequested",
				"loanType",
				"targetLtvPercent",
				"targetLtcPercent",
				"amortizationYears",
				"interestOnlyPeriodMonths",
				"interestRateType",
				"targetCloseDate",
				"recoursePreference",
				"useOfProceeds",
			],
			financials: [
				"purchasePrice",
				"totalProjectCost",
				"capexBudget",
				"equityCommittedPercent",
				"propertyNoiT12",
				"stabilizedNoiProjected",
				"exitStrategy",
				"businessPlanSummary",
				"marketOverviewSummary",
			],
			"property-specs": [
				"totalResidentialUnits",
				"totalResidentialNRSF",
				"totalCommercialGRSF",
				"grossBuildingArea",
				"numberOfStories",
				"parkingSpaces",
			],
			"dev-budget": [
				"landAcquisition",
				"baseConstruction",
				"contingency",
				"ffe",
				"aeFees",
				"developerFee",
				"interestReserve",
				"workingCapital",
			],
			"market-context": [
				"submarketName",
				"walkabilityScore",
				"population3Mi",
				"medianHHIncome",
				"renterOccupiedPercent",
				"popGrowth201020",
			],
			"special-considerations": [
				"opportunityZone",
				"affordableHousing",
				"affordableUnitsNumber",
				"amiTargetPercent",
				"taxExemption",
				"taxAbatement",
			],
			timeline: [
				"groundbreakingDate",
				"completionDate",
				"firstOccupancy",
				"stabilization",
				"entitlements",
				"permitsIssued",
			],
			"site-context": [
				"totalSiteAcreage",
				"currentSiteStatus",
				"siteAccess",
				"proximityShopping",
			],
			"sponsor-info": [
				"sponsorEntityName",
				"sponsorStructure",
				"equityPartner",
				"contactInfo",
			],
		};
		return sectionFieldMap[sectionId] || [];
	}, []);

	// Toggle lock for an entire section
	const toggleSectionLock = useCallback(
		(sectionId: string) => {
			// Mark that user is making a change to prevent sync from overwriting
			isUserActionRef.current = true;

			setLockedSections((prev) => {
				const next = new Set(prev);
				const wasLocked = next.has(sectionId);
				if (wasLocked) {
					// Unlocking section - remove it from locked sections
					next.delete(sectionId);
					// Also clear any unlocked fields for this section since they're no longer needed
					setUnlockedFields((prevUnlocked) => {
						const sectionFields = getSectionFieldIds(sectionId);
						const nextUnlocked = new Set(prevUnlocked);
						sectionFields.forEach((fieldId) => {
							nextUnlocked.delete(fieldId);
						});
						return nextUnlocked;
					});
				} else {
					// Locking section - add it to locked sections
					next.add(sectionId);
				}
				return next;
			});
		},
		[getSectionFieldIds]
	);

	// Helper function to render field lock button - always visible, positioned next to Ask AI button
	const renderFieldLockButton = useCallback(
		(fieldId: string, sectionId: string) => {
			const locked = isFieldDisabled(fieldId, sectionId);
			return (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleFieldLock(fieldId, sectionId);
					}}
					onMouseDown={(e) => {
						e.stopPropagation();
					}}
					className={cn(
						"flex items-center justify-center p-1 rounded transition-colors relative z-30 cursor-pointer",
						locked
							? "text-amber-600 hover:text-amber-700"
							: "text-gray-500 hover:text-gray-600"
					)}
					title={locked ? "Unlock field" : "Lock field"}
				>
					{locked ? (
						<Lock className="h-4 w-4" />
					) : (
						<Unlock className="h-4 w-4" />
					)}
				</button>
			);
		},
		[isFieldDisabled, toggleFieldLock]
	);

	// Helper function to render field label with Ask AI and Lock buttons
	const renderFieldLabel = useCallback(
		(
			fieldId: string,
			sectionId: string,
			labelText: string,
			required: boolean = false,
			showWarning: boolean = true // Default to true - always check for warnings
		) => {
			// Always check for warnings (unless explicitly disabled)
			const warning = showWarning ? getFieldWarning(fieldId) : null;
			return (
				<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 relative group/field">
					<span>
						{labelText}
						{required && (
							<span className="text-red-500 ml-1">*</span>
						)}
					</span>
					<FieldHelpTooltip fieldId={fieldId} />
					{warning && <FieldWarning message={warning} />}
					{/* Ask AI and Lock buttons together - Ask AI on left, Lock on right */}
					<div className="ml-auto flex items-center gap-1">
						<button
							type="button"
							onClick={() => (onAskAI || (() => {}))(fieldId)}
							className="px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md text-xs font-medium text-blue-700 opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer relative z-10"
							title="Ask AI for help with this field"
						>
							Ask AI
						</button>
						{renderFieldLockButton(fieldId, sectionId)}
					</div>
				</label>
			);
		},
		[onAskAI, renderFieldLockButton, getFieldWarning]
	);

	// Update local form state if the existingProject prop changes externally
	useEffect(() => {
		setFormData(existingProject);
		// Sync metadata when project changes - always set, even if empty
		const metadata = existingProject._metadata || {};
		setFieldMetadata(metadata);

		// Debug: Log metadata with warnings
		const fieldsWithWarnings = Object.entries(metadata).filter(
			([_, meta]) => meta && meta.warnings && meta.warnings.length > 0
		);
		if (fieldsWithWarnings.length > 0) {
			console.log(
				"[EnhancedProjectForm] Fields with warnings:",
				fieldsWithWarnings.map(([field, meta]) => ({
					field,
					warnings: meta.warnings,
					source: meta.source,
				}))
			);
		} else {
			console.log(
				"[EnhancedProjectForm] No fields with warnings. Metadata keys:",
				Object.keys(metadata)
			);
		}

		// Defer parent notification to avoid updating during render
		setTimeout(() => {
			onFormDataChange?.(existingProject);
		}, 0);
	}, [existingProject, onFormDataChange]);

	// NEW: Focus/scroll to a specific field if requested
	useEffect(() => {
		if (!initialFocusFieldId) return;
		const selector = `[data-field-id="${initialFocusFieldId}"] , #${initialFocusFieldId}`;
		const element = document.querySelector<HTMLElement>(selector);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			const focusable = (
				element.matches("input,select,textarea,button")
					? element
					: element.querySelector("input,select,textarea")
			) as
				| HTMLInputElement
				| HTMLSelectElement
				| HTMLTextAreaElement
				| null;
			requestAnimationFrame(() => {
				(focusable || element).focus?.();
			});
		}
	}, [initialFocusFieldId]);

	// Debounced auto-save effect
	useEffect(() => {
		// This effect handles auto-saving. It runs whenever formData changes.
		// To prevent saving on every keystroke, it uses a debounce mechanism.

		// 1. Clear any existing timer. This is crucial. If the user types again
		//    within the timeout period, the previous save is cancelled.
		if (debounceTimeout.current) {
			clearTimeout(debounceTimeout.current);
		}

		// 2. Set a new timer to trigger the save after a delay (e.g., 2 seconds).
		debounceTimeout.current = setTimeout(async () => {
			// 3. Before saving, check if there are actual changes compared to the initial prop.
			//    This prevents saving if the component re-renders without data changes.

			// Check if formData changed
			const formDataChanged =
				JSON.stringify(formData) !== JSON.stringify(existingProject);

			// Check if lockedFields changed
			const existingLockedFields = existingProject._lockedFields || {};
			const currentLockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((fieldId) => {
				currentLockedFieldsObj[fieldId] = true;
			});
			const lockedFieldsChanged =
				JSON.stringify(existingLockedFields) !==
				JSON.stringify(currentLockedFieldsObj);

			// Check if lockedSections changed
			const existingLockedSections =
				existingProject._lockedSections || {};
			const currentLockedSectionsObj: Record<string, boolean> = {};
			lockedSections.forEach((sectionId) => {
				currentLockedSectionsObj[sectionId] = true;
			});
			const lockedSectionsChanged =
				JSON.stringify(existingLockedSections) !==
				JSON.stringify(currentLockedSectionsObj);

			// Save if formData, lockedFields, or lockedSections changed
			if (
				formDataChanged ||
				lockedFieldsChanged ||
				lockedSectionsChanged
			) {
				try {
					console.log(
						`[ProjectForm] Auto-saving project: ${
							formData.projectName
						}${
							lockedFieldsChanged
								? " (locked fields changed)"
								: ""
						}${
							lockedSectionsChanged
								? " (locked sections changed)"
								: ""
						}`
					);
					// 4. Call the updateProject action from the store with the latest form data and metadata.
					// Convert lockedFields Set to object format for storage
					const lockedFieldsObj: Record<string, boolean> = {};
					lockedFields.forEach((fieldId) => {
						lockedFieldsObj[fieldId] = true;
					});

					// Convert lockedSections Set to object format for storage
					const lockedSectionsObj: Record<string, boolean> = {};
					lockedSections.forEach((sectionId) => {
						lockedSectionsObj[sectionId] = true;
					});

					const dataToSave = {
						...formData,
						_metadata: fieldMetadata,
						_lockedFields: lockedFieldsObj,
						_lockedSections: lockedSectionsObj,
					};
					await updateProject(formData.id, dataToSave);
				} catch (error) {
					console.error("[ProjectForm] Auto-save failed:", error);
				}
			}
		}, 2000); // 2-second debounce delay

		// 5. Cleanup: When the component unmounts or dependencies change,
		//    clear the timeout to prevent memory leaks or unwanted saves.
		return () => {
			if (debounceTimeout.current) {
				clearTimeout(debounceTimeout.current);
			}
		};
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		lockedSections,
		existingProject,
		updateProject,
	]);

	// Immediate save effect for lock changes (not debounced)
	const lockSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		// Clear any pending lock save
		if (lockSaveTimeoutRef.current) {
			clearTimeout(lockSaveTimeoutRef.current);
		}

		// Skip on initial mount or if not a user action
		if (!isUserActionRef.current) {
			return;
		}

		// Save locks immediately (with a small delay to batch rapid changes)
		lockSaveTimeoutRef.current = setTimeout(async () => {
			try {
				const lockedFieldsObj: Record<string, boolean> = {};
				lockedFields.forEach((fieldId) => {
					lockedFieldsObj[fieldId] = true;
				});

				const lockedSectionsObj: Record<string, boolean> = {};
				lockedSections.forEach((sectionId) => {
					lockedSectionsObj[sectionId] = true;
				});

				console.log(
					"[EnhancedProjectForm] Immediately saving lock changes:",
					{ lockedFieldsObj, lockedSectionsObj }
				);

				await updateProject(formData.id, {
					...formData,
					_metadata: fieldMetadata,
					_lockedFields: lockedFieldsObj,
					_lockedSections: lockedSectionsObj,
				});

				// Reset flag after successful save
				isUserActionRef.current = false;
			} catch (error) {
				console.error(
					"[EnhancedProjectForm] Failed to save lock changes:",
					error
				);
			}
		}, 300); // Small delay to batch rapid toggles

		return () => {
			if (lockSaveTimeoutRef.current) {
				clearTimeout(lockSaveTimeoutRef.current);
			}
		};
	}, [
		lockedFields,
		lockedSections,
		formData.id,
		fieldMetadata,
		updateProject,
		formData,
	]);

	// Handle form field changes
	const handleInputChange = useCallback(
		(
			field: keyof ProjectProfile,
			value: string | number | boolean | null
		) => {
			setFormData((prev) => {
				const nextFormData = {
					...prev,
					[field]: value,
				};

				// Update metadata to track source changes
				setFieldMetadata((prevMeta) => {
					const currentMeta = prevMeta[field as string];
					if (!currentMeta) {
						// No metadata tracking for this field - create new entry with original_value
						const newMeta: Record<string, FieldMetadata> = {
							...prevMeta,
							[field as string]: {
								value: value,
								source: "user_input",
								original_value: value, // Set original_value to current value (first time user sets this)
								warnings: [],
							},
						};
						// Update parent with metadata
						setTimeout(() => {
							onFormDataChange?.({
								...nextFormData,
								_metadata: newMeta,
							});
						}, 0);
						return newMeta;
					}

					// Check if value actually changed from the original AI extraction
					const hasOriginalValue =
						currentMeta.original_value !== undefined &&
						currentMeta.original_value !== null;
					const isChanged =
						hasOriginalValue &&
						JSON.stringify(value) !==
							JSON.stringify(currentMeta.original_value);
					const updatedMeta = { ...currentMeta };

					// Always update the value, but preserve original_value
					updatedMeta.value = value;
					// Preserve original_value - don't update it when user edits
					updatedMeta.original_value =
						currentMeta.original_value !== undefined
							? currentMeta.original_value
							: value; // If no original_value exists, set it to current value (first time)

					if (isChanged && hasOriginalValue) {
						// Value changed from original - mark as user input and add divergence warning
						updatedMeta.source = "user_input";

						// Preserve existing warnings (from backend sanity checks) but add divergence warning
						const existingWarnings = currentMeta.warnings || [];
						const divergenceWarnings: string[] = [];

						// Add divergence warning based on original source, include original value
						const originalValueStr =
							typeof currentMeta.original_value === "object"
								? JSON.stringify(currentMeta.original_value)
								: String(currentMeta.original_value);
						const currentValueStr =
							typeof value === "object"
								? JSON.stringify(value)
								: String(value);

						if (currentMeta.original_source === "knowledge_base") {
							divergenceWarnings.push(
								`Value differs from market data (original: ${originalValueStr}, current: ${currentValueStr})`
							);
						} else if (currentMeta.original_source === "document") {
							divergenceWarnings.push(
								`Value differs from extracted document data (original: ${originalValueStr}, current: ${currentValueStr})`
							);
						} else {
							divergenceWarnings.push(
								`Value changed from original (original: ${originalValueStr}, current: ${currentValueStr})`
							);
						}

						// Combine existing warnings with divergence warnings, avoiding duplicates
						updatedMeta.warnings = [...existingWarnings];
						divergenceWarnings.forEach((warning) => {
							if (!updatedMeta.warnings.includes(warning)) {
								updatedMeta.warnings.push(warning);
							}
						});
					} else if (!isChanged && hasOriginalValue) {
						// User typed back the original value - revert to original state
						updatedMeta.source =
							currentMeta.original_source || "user_input";
						// Keep original warnings (from backend) but remove divergence warnings
						const originalWarnings = currentMeta.warnings || [];
						updatedMeta.warnings = originalWarnings.filter(
							(w) =>
								!w.includes("differs from") &&
								!w.includes("Value differs") &&
								!w.includes("Value changed from original")
						);
					} else {
						// No original value to compare against - just update value and source
						updatedMeta.source = "user_input";
						// Keep existing warnings if any
						updatedMeta.warnings = currentMeta.warnings || [];
						// Set original_value to current value if not set
						if (updatedMeta.original_value === undefined) {
							updatedMeta.original_value = value;
						}
					}

					const newMeta = {
						...prevMeta,
						[field as string]: updatedMeta,
					};

					// Update parent form data's metadata so it saves correctly
					setTimeout(() => {
						onFormDataChange?.({
							...nextFormData,
							_metadata: newMeta,
						});
					}, 0);

					return newMeta;
				});

				// Defer parent notification to avoid updating during render
				setTimeout(() => {
					onFormDataChange?.(nextFormData);
				}, 0);
				return nextFormData;
			});
		},
		[onFormDataChange]
	);

	// Handle form submission (manual save via button)
	const handleFormSubmit = useCallback(async () => {
		if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		try {
			setFormSaved(true); // Indicate loading/saving
			// Include metadata, locked_fields, and locked_sections in the save
			// Convert lockedFields Set to object format for storage
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((fieldId) => {
				lockedFieldsObj[fieldId] = true;
			});

			// Convert lockedSections Set to object format for storage
			const lockedSectionsObj: Record<string, boolean> = {};
			lockedSections.forEach((sectionId) => {
				lockedSectionsObj[sectionId] = true;
			});

			const dataToSave = {
				...formData,
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
				_lockedSections: lockedSectionsObj,
			};
			await updateProject(formData.id, dataToSave);
			console.log("Project changes manually saved.");

			try {
				await snapshotProjectResume();
			} catch (snapshotError) {
				console.error(
					"[EnhancedProjectForm] Failed to snapshot resume version:",
					snapshotError
				);
			} finally {
				versionSnapshotSentRef.current = false;
			}

			onVersionChange?.();

			if (onComplete) {
				// Pass the current formData state which reflects the latest changes
				onComplete(dataToSave);
			}
		} catch (error) {
			console.error("Error saving project:", error);
			console.error("Failed to save project.");
		} finally {
			// Reset saved indicator after a short delay
			setTimeout(() => setFormSaved(false), 2000);
		}
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		lockedSections,
		updateProject,
		onComplete,
		snapshotProjectResume,
		onVersionChange,
	]);

	// handleAutofill is now provided by the useAutofill hook

	// --- Define Steps for FormWizard ---
	const steps: Step[] = useMemo(
		() => [
			// --- Step 1: Basic Information ---
			{
				id: "basic-info",
				title: "Basic Info",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<FileText className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Project Information
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("basic-info")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("basic-info")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("basic-info")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("basic-info") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<FormGroup>
								<AskAIButton
									id="projectName"
									onAskAI={onAskAI || (() => {})}
								>
									<div className="relative group/field">
										{renderFieldLabel(
											"projectName",
											"basic-info",
											"Project Name",
											true
										)}
										<Input
											id="projectName"
											label={null}
											value={formData.projectName || ""}
											onChange={(e) =>
												handleInputChange(
													"projectName",
													e.target.value
												)
											}
											placeholder="e.g., Riverfront Acquisition"
											required
											disabled={isFieldDisabled(
												"projectName",
												"basic-info"
											)}
											className={cn(
												isFieldDisabled(
													"projectName",
													"basic-info"
												) &&
													"bg-gray-50 cursor-not-allowed opacity-75"
											)}
											data-field-id="projectName"
											data-field-type="input"
											data-field-section="basic-info"
											data-field-required="true"
											data-field-label="Project Name"
											data-field-placeholder="e.g., Riverfront Acquisition"
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							{/* Property Address Section */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<MapPin className="h-4 w-4 mr-2 text-blue-600" />{" "}
									Property Address
								</h3>
								<FormGroup>
									<AskAIButton
										id="propertyAddressStreet"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"propertyAddressStreet",
												"basic-info",
												"Street Address",
												true
											)}
											<Input
												id="propertyAddressStreet"
												label={null}
												value={
													formData.propertyAddressStreet ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"propertyAddressStreet",
														e.target.value
													)
												}
												placeholder="123 Main Street"
												required
												disabled={isFieldDisabled(
													"propertyAddressStreet",
													"basic-info"
												)}
												className={cn(
													isFieldDisabled(
														"propertyAddressStreet",
														"basic-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="propertyAddressStreet"
												data-field-type="input"
												data-field-section="basic-info"
												data-field-required="true"
												data-field-label="Street Address"
												data-field-placeholder="123 Main Street"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
									<FormGroup>
										<AskAIButton
											id="propertyAddressCity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"propertyAddressCity",
													"basic-info",
													"City",
													true
												)}
												<Input
													id="propertyAddressCity"
													label={null}
													value={
														formData.propertyAddressCity ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"propertyAddressCity",
															e.target.value
														)
													}
													placeholder="Anytown"
													required
													disabled={isFieldDisabled(
														"propertyAddressCity",
														"basic-info"
													)}
													className={cn(
														isFieldDisabled(
															"propertyAddressCity",
															"basic-info"
														) &&
															"bg-gray-50 cursor-not-allowed opacity-75"
													)}
													data-field-id="propertyAddressCity"
													data-field-type="input"
													data-field-section="basic-info"
													data-field-required="true"
													data-field-label="City"
													data-field-placeholder="Anytown"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									{/* State uses Select */}
									<FormGroup>
										<AskAIButton
											id="propertyAddressState"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"propertyAddressState",
													"basic-info",
													"State",
													true
												)}
												<Select
													id="propertyAddressState"
													value={
														formData.propertyAddressState ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"propertyAddressState",
															e.target.value
														)
													}
													options={stateOptions}
													required
													disabled={isFieldDisabled(
														"propertyAddressState",
														"basic-info"
													)}
													className={cn(
														isFieldDisabled(
															"propertyAddressState",
															"basic-info"
														) &&
															"bg-gray-50 cursor-not-allowed opacity-75"
													)}
													data-field-id="propertyAddressState"
													data-field-type="select"
													data-field-section="basic-info"
													data-field-required="true"
													data-field-label="State"
													data-field-options={JSON.stringify(
														stateOptions
													)}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="propertyAddressZip"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"propertyAddressZip",
													"basic-info",
													"ZIP Code",
													true
												)}
												<Input
													id="propertyAddressZip"
													label={null}
													value={
														formData.propertyAddressZip ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"propertyAddressZip",
															e.target.value
														)
													}
													placeholder="12345"
													required
													disabled={isFieldDisabled(
														"propertyAddressZip",
														"basic-info"
													)}
													className={cn(
														isFieldDisabled(
															"propertyAddressZip",
															"basic-info"
														) &&
															"bg-gray-50 cursor-not-allowed opacity-75"
													)}
													data-field-id="propertyAddressZip"
													data-field-type="input"
													data-field-section="basic-info"
													data-field-required="true"
													data-field-label="ZIP Code"
													data-field-placeholder="12345"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<FormGroup className="mt-4">
									<AskAIButton
										id="propertyAddressCounty"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"propertyAddressCounty",
												"basic-info",
												"County",
												false
											)}
											<Input
												id="propertyAddressCounty"
												label={null}
												value={
													formData.propertyAddressCounty ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"propertyAddressCounty",
														e.target.value
													)
												}
												placeholder="e.g., Orange County"
												disabled={isFieldDisabled(
													"propertyAddressCounty",
													"basic-info"
												)}
												className={cn(
													isFieldDisabled(
														"propertyAddressCounty",
														"basic-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="propertyAddressCounty"
												data-field-type="input"
												data-field-section="basic-info"
												data-field-required="false"
												data-field-label="County"
												data-field-placeholder="e.g., Orange County"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Property Info Section */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Building className="h-4 w-4 mr-2 text-blue-600" />{" "}
									Property Information
								</h3>
								{/* Asset Type uses ButtonSelect */}
								<FormGroup>
									<AskAIButton
										id="assetType"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="assetType"
											data-field-type="button-select"
											data-field-section="basic-info"
											data-field-required="true"
											data-field-label="Asset Type"
											data-field-options={JSON.stringify(
												assetTypeOptions
											)}
											className="relative group/field"
										>
											{renderFieldLabel(
												"assetType",
												"basic-info",
												"Asset Type",
												true
											)}
											<ButtonSelect
												label=""
												options={assetTypeOptions}
												selectedValue={
													formData.assetType || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"assetType",
														value
													)
												}
												disabled={isFieldDisabled(
													"assetType",
													"basic-info"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								{/* Project Phase uses ButtonSelect */}
								<FormGroup className="mt-4">
									<AskAIButton
										id="projectPhase"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="projectPhase"
											data-field-type="button-select"
											data-field-section="basic-info"
											data-field-required="true"
											data-field-label="Project Phase / Deal Type"
											data-field-options={JSON.stringify(
												projectPhaseOptions
											)}
											className="relative group/field"
										>
											{renderFieldLabel(
												"projectPhase",
												"basic-info",
												"Project Phase / Deal Type",
												true
											)}
											<ButtonSelect
												label=""
												options={projectPhaseOptions}
												selectedValue={
													formData.projectPhase || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"projectPhase",
														value as ProjectPhase
													)
												}
												disabled={isFieldDisabled(
													"projectPhase",
													"basic-info"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								{/* Project Description uses Textarea */}
								<FormGroup className="mt-4">
									<AskAIButton
										id="projectDescription"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="projectDescription"
											data-field-type="textarea"
											data-field-section="basic-info"
											data-field-required="true"
											data-field-label="Project Description"
											data-field-placeholder="Brief description of the project..."
											className="relative group/field"
										>
											{renderFieldLabel(
												"projectDescription",
												"basic-info",
												"Project Description",
												true
											)}
											<textarea
												id="projectDescription"
												value={
													formData.projectDescription ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"projectDescription",
														e.target.value
													)
												}
												placeholder="Brief description of the project..."
												disabled={isFieldDisabled(
													"projectDescription",
													"basic-info"
												)}
												className={cn(
													"w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
													isFieldDisabled(
														"projectDescription",
														"basic-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												required
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 2: Loan Information ---
			{
				id: "loan-info",
				title: "Loan Info",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<DollarSign className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Loan Request Details
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("loan-info")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("loan-info")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("loan-info")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("loan-info") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="loanAmountRequested"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"loanAmountRequested",
												"loan-info",
												"Requested Loan Amount ($)",
												true
											)}
											<Input
												id="loanAmountRequested"
												type="number"
												label={null}
												value={
													formData.loanAmountRequested?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"loanAmountRequested",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 10000000"
												required
												disabled={isFieldDisabled(
													"loanAmountRequested",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"loanAmountRequested",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="loanAmountRequested"
												data-field-type="number"
												data-field-section="loan-info"
												data-field-required="true"
												data-field-label="Requested Loan Amount ($)"
												data-field-placeholder="e.g., 10000000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								{/* Capital Type uses ButtonSelect */}
								<FormGroup>
									<AskAIButton
										id="loanType"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="loanType"
											data-field-type="button-select"
											data-field-section="loan-info"
											data-field-required="true"
											data-field-label="Capital Type"
											data-field-options={JSON.stringify(
												capitalTypeOptions
											)}
											className="relative group/field"
										>
											{renderFieldLabel(
												"loanType",
												"loan-info",
												"Capital Type",
												true
											)}
											<ButtonSelect
												label=""
												options={capitalTypeOptions}
												selectedValue={
													formData.loanType || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"loanType",
														value
													)
												}
												disabled={isFieldDisabled(
													"loanType",
													"loan-info"
												)}
												gridCols="grid-cols-2 md:grid-cols-3"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="targetLtvPercent"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"targetLtvPercent",
												"loan-info",
												"Target LTV (%)",
												true
											)}
											<Input
												id="targetLtvPercent"
												type="number"
												label={null}
												value={
													formData.targetLtvPercent?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"targetLtvPercent",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 70"
												required
												disabled={isFieldDisabled(
													"targetLtvPercent",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"targetLtvPercent",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="targetLtvPercent"
												data-field-type="number"
												data-field-section="loan-info"
												data-field-required="true"
												data-field-label="Target LTV (%)"
												data-field-placeholder="e.g., 70"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="targetLtcPercent"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"targetLtcPercent",
												"loan-info",
												"Target LTC (%) (Construction/Dev)",
												false
											)}
											<Input
												id="targetLtcPercent"
												type="number"
												label={null}
												value={
													formData.targetLtcPercent?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"targetLtcPercent",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 80"
												disabled={isFieldDisabled(
													"targetLtcPercent",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"targetLtcPercent",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="targetLtcPercent"
												data-field-type="number"
												data-field-section="loan-info"
												data-field-required="false"
												data-field-label="Target LTC (%) (Construction/Dev)"
												data-field-placeholder="e.g., 80"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="amortizationYears"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"amortizationYears",
												"loan-info",
												"Amortization (Years)",
												false
											)}
											<Input
												id="amortizationYears"
												type="number"
												label={null}
												value={
													formData.amortizationYears?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"amortizationYears",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 30"
												disabled={isFieldDisabled(
													"amortizationYears",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"amortizationYears",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="amortizationYears"
												data-field-type="number"
												data-field-section="loan-info"
												data-field-required="false"
												data-field-label="Amortization (Years)"
												data-field-placeholder="e.g., 30"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="interestOnlyPeriodMonths"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"interestOnlyPeriodMonths",
												"loan-info",
												"Interest-Only Period (Months)",
												false
											)}
											<Input
												id="interestOnlyPeriodMonths"
												type="number"
												label={null}
												value={
													formData.interestOnlyPeriodMonths?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"interestOnlyPeriodMonths",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 36"
												disabled={isFieldDisabled(
													"interestOnlyPeriodMonths",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"interestOnlyPeriodMonths",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="interestOnlyPeriodMonths"
												data-field-type="number"
												data-field-section="loan-info"
												data-field-required="false"
												data-field-label="Interest-Only Period (Months)"
												data-field-placeholder="e.g., 36"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Interest Rate Type uses ButtonSelect */}
								<FormGroup>
									<AskAIButton
										id="interestRateType"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="interestRateType"
											data-field-type="button-select"
											data-field-section="loan-info"
											data-field-required="false"
											data-field-label="Interest Rate Type"
											data-field-options={JSON.stringify(
												interestRateTypeOptions
											)}
											className="relative group/field"
										>
											{renderFieldLabel(
												"interestRateType",
												"loan-info",
												"Interest Rate Type",
												false
											)}
											<ButtonSelect
												label=""
												options={
													interestRateTypeOptions
												}
												selectedValue={
													formData.interestRateType ||
													"Not Specified"
												}
												onSelect={(value) =>
													handleInputChange(
														"interestRateType",
														value as InterestRateType
													)
												}
												gridCols="grid-cols-2 md:grid-cols-3"
												disabled={isFieldDisabled(
													"interestRateType",
													"loan-info"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="targetCloseDate"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"targetCloseDate",
												"loan-info",
												"Target Close Date",
												false
											)}
											<Input
												id="targetCloseDate"
												type="date"
												label={null}
												value={
													formData.targetCloseDate ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"targetCloseDate",
														e.target.value
													)
												}
												disabled={isFieldDisabled(
													"targetCloseDate",
													"loan-info"
												)}
												className={cn(
													isFieldDisabled(
														"targetCloseDate",
														"loan-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="targetCloseDate"
												data-field-type="date"
												data-field-section="loan-info"
												data-field-required="false"
												data-field-label="Target Close Date"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Recourse Preference uses ButtonSelect */}
							<FormGroup>
								<AskAIButton
									id="recoursePreference"
									onAskAI={onAskAI || (() => {})}
								>
									<div
										data-field-id="recoursePreference"
										data-field-type="button-select"
										data-field-section="loan-info"
										data-field-required="false"
										data-field-label="Recourse Preference"
										data-field-options={JSON.stringify(
											recourseOptions
										)}
										className="relative group/field"
									>
										{renderFieldLabel(
											"recoursePreference",
											"loan-info",
											"Recourse Preference",
											false
										)}
										<ButtonSelect
											label=""
											options={recourseOptions}
											selectedValue={
												formData.recoursePreference ||
												"Flexible"
											}
											onSelect={(value) =>
												handleInputChange(
													"recoursePreference",
													value as RecoursePreference
												)
											}
											gridCols="grid-cols-2 md:grid-cols-3"
											disabled={isFieldDisabled(
												"recoursePreference",
												"loan-info"
											)}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							{/* Use of Proceeds uses Textarea */}
							<FormGroup>
								<AskAIButton
									id="useOfProceeds"
									onAskAI={onAskAI || (() => {})}
								>
									<div
										data-field-id="useOfProceeds"
										data-field-type="textarea"
										data-field-section="loan-info"
										data-field-required="true"
										data-field-label="Use of Proceeds"
										data-field-placeholder="Describe how the loan proceeds will be used..."
										className="relative group/field"
									>
										{renderFieldLabel(
											"useOfProceeds",
											"loan-info",
											"Use of Proceeds",
											true
										)}
										<textarea
											id="useOfProceeds"
											value={formData.useOfProceeds || ""}
											onChange={(e) =>
												handleInputChange(
													"useOfProceeds",
													e.target.value
												)
											}
											placeholder="Describe how the loan proceeds will be used..."
											disabled={isFieldDisabled(
												"useOfProceeds",
												"loan-info"
											)}
											className={cn(
												"w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
												isFieldDisabled(
													"useOfProceeds",
													"loan-info"
												) &&
													"bg-gray-50 cursor-not-allowed opacity-75"
											)}
											required
										/>
									</div>
								</AskAIButton>
							</FormGroup>
						</div>
					</>
				),
			},
			// --- Step 3: Financial Information ---
			{
				id: "financials",
				title: "Financials",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<BarChart className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Financial Information
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("financials")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("financials")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("financials")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("financials") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="purchasePrice"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"purchasePrice",
												"financials",
												"Purchase Price / Current Basis ($)",
												false
											)}
											<Input
												id="purchasePrice"
												type="number"
												label={null}
												value={
													formData.purchasePrice?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"purchasePrice",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 15000000"
												disabled={isFieldDisabled(
													"purchasePrice",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"purchasePrice",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="purchasePrice"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Purchase Price / Current Basis ($)"
												data-field-placeholder="e.g., 15000000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="totalProjectCost"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalProjectCost",
												"financials",
												"Total Project Cost ($)",
												false
											)}
											<Input
												id="totalProjectCost"
												type="number"
												label={null}
												value={
													formData.totalProjectCost?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalProjectCost",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 18000000"
												disabled={isFieldDisabled(
													"totalProjectCost",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"totalProjectCost",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="totalProjectCost"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Total Project Cost ($)"
												data-field-placeholder="e.g., 18000000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="capexBudget"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"capexBudget",
												"financials",
												"CapEx Budget ($)",
												false
											)}
											<Input
												id="capexBudget"
												type="number"
												label={null}
												value={
													formData.capexBudget?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"capexBudget",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 1500000"
												disabled={isFieldDisabled(
													"capexBudget",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"capexBudget",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="capexBudget"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="CapEx Budget ($)"
												data-field-placeholder="e.g., 1500000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="equityCommittedPercent"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"equityCommittedPercent",
												"financials",
												"Equity Committed (%)",
												false
											)}
											<Input
												id="equityCommittedPercent"
												type="number"
												label={null}
												value={
													formData.equityCommittedPercent?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"equityCommittedPercent",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 100"
												disabled={isFieldDisabled(
													"equityCommittedPercent",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"equityCommittedPercent",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="equityCommittedPercent"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Equity Committed (%)"
												data-field-placeholder="e.g., 100"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="propertyNoiT12"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"propertyNoiT12",
												"financials",
												"Current/T12 NOI ($)",
												false
											)}
											<Input
												id="propertyNoiT12"
												type="number"
												label={null}
												value={
													formData.propertyNoiT12?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"propertyNoiT12",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 450000"
												disabled={isFieldDisabled(
													"propertyNoiT12",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"propertyNoiT12",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="propertyNoiT12"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Current/T12 NOI ($)"
												data-field-placeholder="e.g., 450000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="stabilizedNoiProjected"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"stabilizedNoiProjected",
												"financials",
												"Projected Stabilized NOI ($)",
												false
											)}
											<Input
												id="stabilizedNoiProjected"
												type="number"
												label={null}
												value={
													formData.stabilizedNoiProjected?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"stabilizedNoiProjected",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 750000"
												disabled={isFieldDisabled(
													"stabilizedNoiProjected",
													"financials"
												)}
												className={cn(
													isFieldDisabled(
														"stabilizedNoiProjected",
														"financials"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="stabilizedNoiProjected"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Projected Stabilized NOI ($)"
												data-field-placeholder="e.g., 750000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Exit Strategy uses ButtonSelect */}
							<FormGroup>
								<AskAIButton
									id="exitStrategy"
									onAskAI={onAskAI || (() => {})}
								>
									<div
										data-field-id="exitStrategy"
										data-field-type="button-select"
										data-field-section="financials"
										data-field-required="false"
										data-field-label="Exit Strategy"
										data-field-options={JSON.stringify(
											exitStrategyOptions
										)}
										className="relative group/field"
									>
										{renderFieldLabel(
											"exitStrategy",
											"financials",
											"Exit Strategy",
											false
										)}
										<ButtonSelect
											label=""
											options={exitStrategyOptions}
											selectedValue={
												formData.exitStrategy ||
												"Undecided"
											}
											onSelect={(value) =>
												handleInputChange(
													"exitStrategy",
													value as ExitStrategy
												)
											}
											disabled={isFieldDisabled(
												"exitStrategy",
												"financials"
											)}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							{/* Business Plan & Market Overview use Textarea */}
							<FormGroup>
								<AskAIButton
									id="businessPlanSummary"
									onAskAI={onAskAI || (() => {})}
								>
									<div
										data-field-id="businessPlanSummary"
										data-field-type="textarea"
										data-field-section="financials"
										data-field-required="false"
										data-field-label="Business Plan Summary"
										data-field-placeholder="Summary of your business plan..."
										className="relative group/field"
									>
										{renderFieldLabel(
											"businessPlanSummary",
											"financials",
											"Business Plan Summary",
											false
										)}
										<textarea
											id="businessPlanSummary"
											value={
												formData.businessPlanSummary ||
												""
											}
											onChange={(e) =>
												handleInputChange(
													"businessPlanSummary",
													e.target.value
												)
											}
											placeholder="Summary of your business plan..."
											disabled={isFieldDisabled(
												"businessPlanSummary",
												"financials"
											)}
											className={cn(
												"w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
												isFieldDisabled(
													"businessPlanSummary",
													"financials"
												) &&
													"bg-gray-50 cursor-not-allowed opacity-75"
											)}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							<FormGroup>
								<AskAIButton
									id="marketOverviewSummary"
									onAskAI={onAskAI || (() => {})}
								>
									<div
										data-field-id="marketOverviewSummary"
										data-field-type="textarea"
										data-field-section="financials"
										data-field-required="false"
										data-field-label="Market Overview"
										data-field-placeholder="Brief overview of the market..."
										className="relative group/field"
									>
										{renderFieldLabel(
											"marketOverviewSummary",
											"financials",
											"Market Overview",
											false
										)}
										<textarea
											id="marketOverviewSummary"
											value={
												formData.marketOverviewSummary ||
												""
											}
											onChange={(e) =>
												handleInputChange(
													"marketOverviewSummary",
													e.target.value
												)
											}
											placeholder="Brief overview of the market..."
											disabled={isFieldDisabled(
												"marketOverviewSummary",
												"financials"
											)}
											className={cn(
												"w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
												isFieldDisabled(
													"marketOverviewSummary",
													"financials"
												) &&
													"bg-gray-50 cursor-not-allowed opacity-75"
											)}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
						</div>
					</>
				),
			},
			// --- Step 4: Property Specifications ---
			{
				id: "property-specs",
				title: "Property Specs",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<Building className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Property Specifications
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("property-specs")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("property-specs")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("property-specs")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("property-specs") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="totalResidentialUnits"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalResidentialUnits",
												"property-specs",
												"Total Residential Units",
												false
											)}
											<Input
												id="totalResidentialUnits"
												type="number"
												label={null}
												value={
													formData.totalResidentialUnits?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalResidentialUnits",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 116"
												disabled={isFieldDisabled(
													"totalResidentialUnits",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"totalResidentialUnits",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="totalResidentialUnits"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="totalResidentialNRSF"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalResidentialNRSF",
												"property-specs",
												"Total Residential NRSF",
												false
											)}
											<Input
												id="totalResidentialNRSF"
												type="number"
												label={null}
												value={
													formData.totalResidentialNRSF?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalResidentialNRSF",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 59520"
												disabled={isFieldDisabled(
													"totalResidentialNRSF",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"totalResidentialNRSF",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="totalResidentialNRSF"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="totalCommercialGRSF"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalCommercialGRSF",
												"property-specs",
												"Total Commercial GRSF",
												false
											)}
											<Input
												id="totalCommercialGRSF"
												type="number"
												label={null}
												value={
													formData.totalCommercialGRSF?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalCommercialGRSF",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 49569"
												disabled={isFieldDisabled(
													"totalCommercialGRSF",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"totalCommercialGRSF",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="totalCommercialGRSF"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="grossBuildingArea"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"grossBuildingArea",
												"property-specs",
												"Gross Building Area",
												false
											)}
											<Input
												id="grossBuildingArea"
												type="number"
												label={null}
												value={
													formData.grossBuildingArea?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"grossBuildingArea",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 127406"
												disabled={isFieldDisabled(
													"grossBuildingArea",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"grossBuildingArea",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="grossBuildingArea"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="numberOfStories"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"numberOfStories",
												"property-specs",
												"Number of Stories",
												false
											)}
											<Input
												id="numberOfStories"
												type="number"
												label={null}
												value={
													formData.numberOfStories?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"numberOfStories",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 6"
												disabled={isFieldDisabled(
													"numberOfStories",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"numberOfStories",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="numberOfStories"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="parkingSpaces"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"parkingSpaces",
												"property-specs",
												"Parking Spaces",
												false
											)}
											<Input
												id="parkingSpaces"
												type="number"
												label={null}
												value={
													formData.parkingSpaces?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"parkingSpaces",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 180"
												disabled={isFieldDisabled(
													"parkingSpaces",
													"property-specs"
												)}
												className={cn(
													isFieldDisabled(
														"parkingSpaces",
														"property-specs"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="parkingSpaces"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 5: Development Budget ---
			{
				id: "dev-budget",
				title: "Dev Budget",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<Calculator className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Development Budget
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("dev-budget")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("dev-budget")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("dev-budget")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("dev-budget") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="landAcquisition"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"landAcquisition",
												"dev-budget",
												"Land Acquisition",
												false
											)}
											<Input
												id="landAcquisition"
												type="number"
												label={null}
												value={
													(
														formData as any
													).landAcquisition?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"landAcquisition",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 6000000"
												disabled={isFieldDisabled(
													"landAcquisition",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"landAcquisition",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="landAcquisition"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="baseConstruction"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"baseConstruction",
												"dev-budget",
												"Base Construction (Hard Cost)",
												false
											)}
											<Input
												id="baseConstruction"
												type="number"
												label={null}
												value={
													(
														formData as any
													).baseConstruction?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"baseConstruction",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 16950000"
												disabled={isFieldDisabled(
													"baseConstruction",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"baseConstruction",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="baseConstruction"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="contingency"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"contingency",
												"dev-budget",
												"Contingency",
												false
											)}
											<Input
												id="contingency"
												type="number"
												label={null}
												value={
													(
														formData as any
													).contingency?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"contingency",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 847500"
												disabled={isFieldDisabled(
													"contingency",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"contingency",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="contingency"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="ffe"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"ffe",
												"dev-budget",
												"FF&E (Furniture, Fixtures & Equipment)",
												false
											)}
											<Input
												id="ffe"
												type="number"
												label={null}
												value={
													(
														formData as any
													).ffe?.toString() || ""
												}
												onChange={(e) =>
													handleInputChange(
														"ffe",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 580000"
												disabled={isFieldDisabled(
													"ffe",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"ffe",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="ffe"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="aeFees"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"aeFees",
												"dev-budget",
												"A&E Fees (Architecture & Engineering)",
												false
											)}
											<Input
												id="aeFees"
												type="number"
												label={null}
												value={
													(
														formData as any
													).aeFees?.toString() || ""
												}
												onChange={(e) =>
													handleInputChange(
														"aeFees",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 859800"
												disabled={isFieldDisabled(
													"aeFees",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"aeFees",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="aeFees"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="developerFee"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"developerFee",
												"dev-budget",
												"Developer Fee",
												false
											)}
											<Input
												id="developerFee"
												type="number"
												label={null}
												value={
													(
														formData as any
													).developerFee?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"developerFee",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 678000"
												disabled={isFieldDisabled(
													"developerFee",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"developerFee",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="developerFee"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="interestReserve"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"interestReserve",
												"dev-budget",
												"Interest Reserve",
												false
											)}
											<Input
												id="interestReserve"
												type="number"
												label={null}
												value={
													(
														formData as any
													).interestReserve?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"interestReserve",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 1147500"
												disabled={isFieldDisabled(
													"interestReserve",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"interestReserve",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="interestReserve"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="workingCapital"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"workingCapital",
												"dev-budget",
												"Working Capital",
												false
											)}
											<Input
												id="workingCapital"
												type="number"
												label={null}
												value={
													(
														formData as any
													).workingCapital?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"workingCapital",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 1900000"
												disabled={isFieldDisabled(
													"workingCapital",
													"dev-budget"
												)}
												className={cn(
													isFieldDisabled(
														"workingCapital",
														"dev-budget"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="workingCapital"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 6: Market Context ---
			{
				id: "market-context",
				title: "Market Context",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<TrendingUp className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Market Context
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("market-context")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("market-context")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("market-context")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("market-context") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="submarketName"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"submarketName",
												"market-context",
												"Submarket Name",
												false
											)}
											<Input
												id="submarketName"
												label={null}
												value={
													(formData as any)
														.submarketName || ""
												}
												onChange={(e) =>
													handleInputChange(
														"submarketName",
														e.target.value
													)
												}
												placeholder="e.g., Downtown Dallas"
												disabled={isFieldDisabled(
													"submarketName",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"submarketName",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="submarketName"
												data-field-type="input"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="walkabilityScore"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"walkabilityScore",
												"market-context",
												"Walkability Score",
												false
											)}
											<Input
												id="walkabilityScore"
												type="number"
												label={null}
												value={
													(
														formData as any
													).walkabilityScore?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"walkabilityScore",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 85"
												min="0"
												max="100"
												disabled={isFieldDisabled(
													"walkabilityScore",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"walkabilityScore",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="walkabilityScore"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="population3Mi"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"population3Mi",
												"market-context",
												"Population (3-mile radius)",
												false
											)}
											<Input
												id="population3Mi"
												type="number"
												label={null}
												value={
													(
														formData as any
													).population3Mi?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"population3Mi",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 174270"
												disabled={isFieldDisabled(
													"population3Mi",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"population3Mi",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="population3Mi"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="medianHHIncome"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"medianHHIncome",
												"market-context",
												"Median Household Income (3-mile)",
												false
											)}
											<Input
												id="medianHHIncome"
												type="number"
												label={null}
												value={
													(
														formData as any
													).medianHHIncome?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"medianHHIncome",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 85906"
												disabled={isFieldDisabled(
													"medianHHIncome",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"medianHHIncome",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="medianHHIncome"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="renterOccupiedPercent"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"renterOccupiedPercent",
												"market-context",
												"% Renter Occupied (3-mile)",
												false
											)}
											<Input
												id="renterOccupiedPercent"
												type="number"
												label={null}
												value={
													(
														formData as any
													).renterOccupiedPercent?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"renterOccupiedPercent",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 76.7"
												min="0"
												max="100"
												disabled={isFieldDisabled(
													"renterOccupiedPercent",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"renterOccupiedPercent",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="renterOccupiedPercent"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="popGrowth201020"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"popGrowth201020",
												"market-context",
												"Population Growth (2010-2020)",
												false
											)}
											<Input
												id="popGrowth201020"
												type="number"
												label={null}
												value={
													(
														formData as any
													).popGrowth201020?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"popGrowth201020",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 23.3"
												disabled={isFieldDisabled(
													"popGrowth201020",
													"market-context"
												)}
												className={cn(
													isFieldDisabled(
														"popGrowth201020",
														"market-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="popGrowth201020"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 7: Special Considerations ---
			{
				id: "special-considerations",
				title: "Special Programs",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<CheckCircle className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Special Considerations
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock(
											"special-considerations"
										)
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has(
											"special-considerations"
										)
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has(
											"special-considerations"
										)
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has(
										"special-considerations"
									) ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="opportunityZone"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"opportunityZone",
												"special-considerations",
												"Opportunity Zone?",
												false
											)}
											<ButtonSelect
												label=""
												options={["Yes", "No"]}
												selectedValue={
													(formData as any)
														.opportunityZone
														? "Yes"
														: (formData as any)
																.opportunityZone ===
														  false
														? "No"
														: ""
												}
												onSelect={(value) =>
													handleInputChange(
														"opportunityZone",
														value === "Yes"
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"opportunityZone",
													"special-considerations"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="affordableHousing"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"affordableHousing",
												"special-considerations",
												"Affordable Housing?",
												false
											)}
											<ButtonSelect
												label=""
												options={["Yes", "No"]}
												selectedValue={
													(formData as any)
														.affordableHousing
														? "Yes"
														: (formData as any)
																.affordableHousing ===
														  false
														? "No"
														: ""
												}
												onSelect={(value) =>
													handleInputChange(
														"affordableHousing",
														value === "Yes"
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"affordableHousing",
													"special-considerations"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{(formData as any).affordableHousing && (
								<>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<FormGroup>
											<AskAIButton
												id="affordableUnitsNumber"
												onAskAI={onAskAI || (() => {})}
											>
												<div className="relative group/field">
													{renderFieldLabel(
														"affordableUnitsNumber",
														"special-considerations",
														"Number of Affordable Units",
														false
													)}
													<Input
														id="affordableUnitsNumber"
														type="number"
														label={null}
														value={
															(
																formData as any
															).affordableUnitsNumber?.toString() ||
															""
														}
														onChange={(e) =>
															handleInputChange(
																"affordableUnitsNumber",
																e.target.value
																	? Number(
																			e
																				.target
																				.value
																	  )
																	: null
															)
														}
														placeholder="e.g., 58"
														disabled={isFieldDisabled(
															"affordableUnitsNumber",
															"special-considerations"
														)}
														className={cn(
															isFieldDisabled(
																"affordableUnitsNumber",
																"special-considerations"
															) &&
																"bg-gray-50 cursor-not-allowed opacity-75"
														)}
														data-field-id="affordableUnitsNumber"
														data-field-type="number"
														data-field-section="special-considerations"
													/>
												</div>
											</AskAIButton>
										</FormGroup>
										<FormGroup>
											<AskAIButton
												id="amiTargetPercent"
												onAskAI={onAskAI || (() => {})}
											>
												<div className="relative group/field">
													{renderFieldLabel(
														"amiTargetPercent",
														"special-considerations",
														"AMI Target %",
														false
													)}
													<Input
														id="amiTargetPercent"
														type="number"
														label={null}
														value={
															(
																formData as any
															).amiTargetPercent?.toString() ||
															""
														}
														onChange={(e) =>
															handleInputChange(
																"amiTargetPercent",
																e.target.value
																	? Number(
																			e
																				.target
																				.value
																	  )
																	: null
															)
														}
														placeholder="e.g., 80"
														disabled={isFieldDisabled(
															"amiTargetPercent",
															"special-considerations"
														)}
														className={cn(
															isFieldDisabled(
																"amiTargetPercent",
																"special-considerations"
															) &&
																"bg-gray-50 cursor-not-allowed opacity-75"
														)}
														data-field-id="amiTargetPercent"
														data-field-type="number"
														data-field-section="special-considerations"
													/>
												</div>
											</AskAIButton>
										</FormGroup>
									</div>
								</>
							)}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="taxExemption"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"taxExemption",
												"special-considerations",
												"Tax Exemption?",
												false
											)}
											<ButtonSelect
												label=""
												options={["Yes", "No"]}
												selectedValue={
													(formData as any)
														.taxExemption
														? "Yes"
														: (formData as any)
																.taxExemption ===
														  false
														? "No"
														: ""
												}
												onSelect={(value) =>
													handleInputChange(
														"taxExemption",
														value === "Yes"
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"taxExemption",
													"special-considerations"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="taxAbatement"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"taxAbatement",
												"special-considerations",
												"Tax Abatement?",
												false
											)}
											<ButtonSelect
												label=""
												options={["Yes", "No"]}
												selectedValue={
													(formData as any)
														.taxAbatement
														? "Yes"
														: (formData as any)
																.taxAbatement ===
														  false
														? "No"
														: ""
												}
												onSelect={(value) =>
													handleInputChange(
														"taxAbatement",
														value === "Yes"
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"taxAbatement",
													"special-considerations"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 8: Timeline & Milestones ---
			{
				id: "timeline",
				title: "Timeline",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<Calendar className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Timeline & Milestones
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("timeline")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("timeline")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("timeline")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("timeline") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="groundbreakingDate"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"groundbreakingDate",
												"timeline",
												"Groundbreaking Date",
												false
											)}
											<Input
												id="groundbreakingDate"
												type="date"
												label={null}
												value={
													(formData as any)
														.groundbreakingDate ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"groundbreakingDate",
														e.target.value
													)
												}
												disabled={isFieldDisabled(
													"groundbreakingDate",
													"timeline"
												)}
												className={cn(
													isFieldDisabled(
														"groundbreakingDate",
														"timeline"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="groundbreakingDate"
												data-field-type="date"
												data-field-section="timeline"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="completionDate"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"completionDate",
												"timeline",
												"Completion Date",
												false
											)}
											<Input
												id="completionDate"
												type="date"
												label={null}
												value={
													(formData as any)
														.completionDate || ""
												}
												onChange={(e) =>
													handleInputChange(
														"completionDate",
														e.target.value
													)
												}
												disabled={isFieldDisabled(
													"completionDate",
													"timeline"
												)}
												className={cn(
													isFieldDisabled(
														"completionDate",
														"timeline"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="completionDate"
												data-field-type="date"
												data-field-section="timeline"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="firstOccupancy"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"firstOccupancy",
												"timeline",
												"First Occupancy",
												false
											)}
											<Input
												id="firstOccupancy"
												type="date"
												label={null}
												value={
													(formData as any)
														.firstOccupancy || ""
												}
												onChange={(e) =>
													handleInputChange(
														"firstOccupancy",
														e.target.value
													)
												}
												disabled={isFieldDisabled(
													"firstOccupancy",
													"timeline"
												)}
												className={cn(
													isFieldDisabled(
														"firstOccupancy",
														"timeline"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="firstOccupancy"
												data-field-type="date"
												data-field-section="timeline"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="stabilization"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"stabilization",
												"timeline",
												"Stabilization Date",
												false
											)}
											<Input
												id="stabilization"
												type="date"
												label={null}
												value={
													(formData as any)
														.stabilization || ""
												}
												onChange={(e) =>
													handleInputChange(
														"stabilization",
														e.target.value
													)
												}
												disabled={isFieldDisabled(
													"stabilization",
													"timeline"
												)}
												className={cn(
													isFieldDisabled(
														"stabilization",
														"timeline"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="stabilization"
												data-field-type="date"
												data-field-section="timeline"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="entitlements"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="entitlements"
											data-field-type="button-select"
											data-field-section="timeline"
											data-field-required="false"
											data-field-label="Entitlements Status"
											data-field-options={JSON.stringify([
												"Approved",
												"Pending",
											])}
											className="relative group/field"
										>
											{renderFieldLabel(
												"entitlements",
												"timeline",
												"Entitlements Status",
												false
											)}
											<ButtonSelect
												label=""
												options={[
													"Approved",
													"Pending",
												]}
												selectedValue={
													(formData as any)
														.entitlements || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"entitlements",
														value
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"entitlements",
													"timeline"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="permitsIssued"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="permitsIssued"
											data-field-type="button-select"
											data-field-section="timeline"
											data-field-required="false"
											data-field-label="Permits Status"
											data-field-options={JSON.stringify([
												"Issued",
												"Pending",
											])}
											className="relative group/field"
										>
											{renderFieldLabel(
												"permitsIssued",
												"timeline",
												"Permits Status",
												false
											)}
											<ButtonSelect
												label=""
												options={["Issued", "Pending"]}
												selectedValue={
													(formData as any)
														.permitsIssued || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"permitsIssued",
														value
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"permitsIssued",
													"timeline"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 9: Site & Context ---
			{
				id: "site-context",
				title: "Site & Context",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<Map className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Site & Context
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("site-context")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("site-context")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("site-context")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("site-context") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="totalSiteAcreage"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalSiteAcreage",
												"site-context",
												"Total Site Acreage",
												false
											)}
											<Input
												id="totalSiteAcreage"
												type="number"
												label={null}
												value={
													(
														formData as any
													).totalSiteAcreage?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalSiteAcreage",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 2.5"
												step="0.01"
												disabled={isFieldDisabled(
													"totalSiteAcreage",
													"site-context"
												)}
												className={cn(
													isFieldDisabled(
														"totalSiteAcreage",
														"site-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="totalSiteAcreage"
												data-field-type="number"
												data-field-section="site-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="currentSiteStatus"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="currentSiteStatus"
											data-field-type="button-select"
											data-field-section="site-context"
											data-field-required="false"
											data-field-label="Current Site Status"
											data-field-options={JSON.stringify([
												"Vacant",
												"Existing",
											])}
											className="relative group/field"
										>
											{renderFieldLabel(
												"currentSiteStatus",
												"site-context",
												"Current Site Status",
												false
											)}
											<ButtonSelect
												label=""
												options={["Vacant", "Existing"]}
												selectedValue={
													(formData as any)
														.currentSiteStatus || ""
												}
												onSelect={(value) =>
													handleInputChange(
														"currentSiteStatus",
														value
													)
												}
												gridCols="grid-cols-2"
												disabled={isFieldDisabled(
													"currentSiteStatus",
													"site-context"
												)}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="siteAccess"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"siteAccess",
												"site-context",
												"Site Access",
												false
											)}
											<Input
												id="siteAccess"
												label={null}
												value={
													(formData as any)
														.siteAccess || ""
												}
												onChange={(e) =>
													handleInputChange(
														"siteAccess",
														e.target.value
													)
												}
												placeholder="e.g., Hickory St, Ferris St"
												disabled={isFieldDisabled(
													"siteAccess",
													"site-context"
												)}
												className={cn(
													isFieldDisabled(
														"siteAccess",
														"site-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="siteAccess"
												data-field-type="input"
												data-field-section="site-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="proximityShopping"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"proximityShopping",
												"site-context",
												"Proximity to Shopping",
												false
											)}
											<Input
												id="proximityShopping"
												label={null}
												value={
													(formData as any)
														.proximityShopping || ""
												}
												onChange={(e) =>
													handleInputChange(
														"proximityShopping",
														e.target.value
													)
												}
												placeholder="e.g., Farmers Market, Deep Ellum nearby"
												disabled={isFieldDisabled(
													"proximityShopping",
													"site-context"
												)}
												className={cn(
													isFieldDisabled(
														"proximityShopping",
														"site-context"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="proximityShopping"
												data-field-type="input"
												data-field-section="site-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 10: Sponsor Information ---
			{
				id: "sponsor-info",
				title: "Sponsor Info",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<Users className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Sponsor Information
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("sponsor-info")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("sponsor-info")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("sponsor-info")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("sponsor-info") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="sponsorEntityName"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"sponsorEntityName",
												"sponsor-info",
												"Sponsor Entity Name",
												false
											)}
											<Input
												id="sponsorEntityName"
												label={null}
												value={
													(formData as any)
														.sponsorEntityName || ""
												}
												onChange={(e) =>
													handleInputChange(
														"sponsorEntityName",
														e.target.value
													)
												}
												placeholder="e.g., Hoque Global"
												disabled={isFieldDisabled(
													"sponsorEntityName",
													"sponsor-info"
												)}
												className={cn(
													isFieldDisabled(
														"sponsorEntityName",
														"sponsor-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="sponsorEntityName"
												data-field-type="input"
												data-field-section="sponsor-info"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="sponsorStructure"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"sponsorStructure",
												"sponsor-info",
												"Sponsor Structure",
												false
											)}
											<Input
												id="sponsorStructure"
												label={null}
												value={
													(formData as any)
														.sponsorStructure || ""
												}
												onChange={(e) =>
													handleInputChange(
														"sponsorStructure",
														e.target.value
													)
												}
												placeholder="e.g., General Partner"
												disabled={isFieldDisabled(
													"sponsorStructure",
													"sponsor-info"
												)}
												className={cn(
													isFieldDisabled(
														"sponsorStructure",
														"sponsor-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="sponsorStructure"
												data-field-type="input"
												data-field-section="sponsor-info"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="equityPartner"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"equityPartner",
												"sponsor-info",
												"Equity Partner",
												false
											)}
											<Input
												id="equityPartner"
												label={null}
												value={
													(formData as any)
														.equityPartner || ""
												}
												onChange={(e) =>
													handleInputChange(
														"equityPartner",
														e.target.value
													)
												}
												placeholder="e.g., ACARA"
												disabled={isFieldDisabled(
													"equityPartner",
													"sponsor-info"
												)}
												className={cn(
													isFieldDisabled(
														"equityPartner",
														"sponsor-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="equityPartner"
												data-field-type="input"
												data-field-section="sponsor-info"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="contactInfo"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"contactInfo",
												"sponsor-info",
												"Contact Info",
												false
											)}
											<textarea
												id="contactInfo"
												value={
													(formData as any)
														.contactInfo || ""
												}
												onChange={(e) =>
													handleInputChange(
														"contactInfo",
														e.target.value
													)
												}
												placeholder="e.g., Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)"
												disabled={isFieldDisabled(
													"contactInfo",
													"sponsor-info"
												)}
												className={cn(
													"w-full h-20 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
													isFieldDisabled(
														"contactInfo",
														"sponsor-info"
													) &&
														"bg-gray-50 cursor-not-allowed opacity-75"
												)}
												data-field-id="contactInfo"
												data-field-type="textarea"
												data-field-section="sponsor-info"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
						</div>
					</>
				),
			},
			// --- Step 11: Project Media ---
			{
				id: "project-media",
				title: "Project Media",
				component: (
					<>
						<div className="space-y-6">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="text-xl font-semibold text-gray-800 flex items-center">
									<ImageIcon className="h-5 w-5 mr-2 text-blue-600" />{" "}
									Project Media
								</h2>
								<button
									type="button"
									onClick={() =>
										toggleSectionLock("project-media")
									}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
										lockedSections.has("project-media")
											? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
											: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
									)}
									title={
										lockedSections.has("project-media")
											? "Unlock section"
											: "Lock section"
									}
								>
									{lockedSections.has("project-media") ? (
										<>
											<Lock className="h-4 w-4" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-4 w-4" />
											<span>Lock</span>
										</>
									)}
								</button>
							</div>
							<ProjectMediaUpload
								projectId={formData.id}
								orgId={activeOrg?.id || null}
								disabled={isFieldDisabled(
									"project-media",
									"project-media"
								)}
							/>
						</div>
					</>
				),
			},
			// Documents and Review steps removed (DocumentManager exists above; autosave in place)
		],
		[
			formData,
			handleInputChange,
			onAskAI,
			lockedSections,
			isFieldDisabled,
			renderFieldLabel,
			toggleSectionLock,
			activeOrg?.id,
		]
	);
	return (
		<FormProvider initialFormData={formData as Record<string, any>}>
			{/* Sticky header matching Borrower styling */}
			<div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex items-center justify-between px-3 py-4">
				<div>
					<h2 className="text-2xl font-semibold text-gray-800 flex items-center">
						<span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
						Project Resume
					</h2>
					<p className="text-sm text-gray-500">
						{formData.projectName}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleAutofill}
						disabled={isAutofilling}
						className={cn(
							"group relative flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border transition-all duration-300 overflow-hidden",
							isAutofilling
								? "border-blue-400 bg-blue-50 text-blue-700"
								: "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md"
						)}
					>
						{isAutofilling ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
								<span className="text-sm font-medium whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
									Autofilling...
								</span>
							</>
						) : (
							<>
								<Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
								<span className="text-sm font-medium text-blue-700 whitespace-nowrap max-w-0 group-hover:max-w-[140px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
									Autofill Resume
								</span>
							</>
						)}
						{/* Sparkle animation overlay */}
						{showSparkles && (
							<div className="absolute inset-0 pointer-events-none overflow-hidden">
								{[...Array(20)].map((_, i) => (
									<motion.div
										key={i}
										className="absolute w-1 h-1 bg-yellow-400 rounded-full"
										initial={{
											x: "50%",
											y: "50%",
											opacity: 1,
											scale: 0,
										}}
										animate={{
											x: `${Math.random() * 100}%`,
											y: `${Math.random() * 100}%`,
											opacity: [1, 1, 0],
											scale: [0, 1.5, 0],
										}}
										transition={{
											duration: 0.8,
											delay: Math.random() * 0.3,
											ease: "easeOut",
										}}
										style={{
											left: "50%",
											top: "50%",
										}}
									/>
								))}
							</div>
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleFormSubmit}
						isLoading={formSaved}
						disabled={formSaved}
						className="px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
					>
						{formSaved ? "Saving..." : "Save & Exit"}
					</Button>
				</div>
			</div>
			<div className="p-6">
				<FormWizard
					steps={steps}
					onComplete={handleFormSubmit}
					showProgressBar={false}
					showStepIndicators={false}
					allowSkip={true}
					variant="tabs"
					showBottomNav={true}
				/>
			</div>
		</FormProvider>
	);
};
