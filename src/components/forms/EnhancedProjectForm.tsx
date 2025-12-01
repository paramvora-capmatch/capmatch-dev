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
import { MultiSelect } from "../ui/MultiSelect"; // Import MultiSelect
import { MultiSelectPills } from "../ui/MultiSelectPills"; // Import MultiSelectPills
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
	Plus,
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
import { normalizeSource } from "@/utils/sourceNormalizer";
import { SourceMetadata } from "@/types/source-metadata";

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
const projectTypeOptions = [
	"Multifamily",
	"Mixed-Use",
	"Office",
	"Retail",
	"Industrial",
	"Hospitality",
	"Self-Storage",
	"Senior Housing",
	"Student Housing",
	"Medical Office",
	"Data Center",
	"Land",
	"Other",
];
const amenityListOptions = [
	"Fitness Center",
	"Swimming Pool",
	"Rooftop Deck",
	"Business Center",
	"Package Lockers",
	"Pet Friendly",
	"EV Charging",
	"Bike Storage",
	"Co-Working Space",
	"Concierge",
	"Controlled Access",
	"Garage Parking",
	"Surface Parking",
	"Outdoor Space",
	"Playground",
	"Dog Park",
	"Clubhouse",
	"Media Room",
	"Game Room",
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
			// Import loadProjectImages function
			const { loadProjectImages } = await import("@/lib/imageUtils");

			// Load all images (from main folders and artifacts, excluding "other" category)
			const allImages = await loadProjectImages(projectId, orgId, true); // true = exclude "other"

			// Separate by category
			const siteImagesList = allImages
				.filter((img) => img.category === "site_images")
				.map((img) => ({
					fileName: img.name,
					source: img.source,
					storagePath: img.storagePath,
					documentName: img.documentName,
				}));

			const diagramsList = allImages
				.filter((img) => img.category === "architectural_diagrams")
				.map((img) => ({
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
					setImages((prev) => [
						...prev,
						{
							fileName: file.name,
							source: "main_folder",
							storagePath: filePath,
						},
					]);
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
			setSelected(new Set(images.map((img) => img.fileName)));
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
													<FileText className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
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
					<div className="max-h-96 overflow-y-auto mt-4 pr-2">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{architecturalDiagrams.map((image) => {
								const imageUrl = getImageUrl(image.storagePath);
								const isSelected = selectedDiagrams.has(
									image.fileName
								);
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
										{image.source === "artifacts" &&
											image.documentName && (
												<div className="absolute top-2 right-2 z-10 group/tooltip">
													<FileText className="h-4 w-4 text-blue-500 bg-white rounded-full p-0.5 shadow-sm" />
													<div className="absolute right-0 top-6 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
														<div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
															From:{" "}
															{image.documentName}
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
	const hasInitializedFormDataRef = useRef(false);

	// Metadata state for tracking sources and warnings
	const [fieldMetadata, setFieldMetadata] = useState<
		Record<string, FieldMetadata>
	>(() => {
		return existingProject._metadata || {};
	});

	// Sync fieldMetadata when existingProject._metadata changes (e.g., after autofill)
	useEffect(() => {
		const newMetadata = existingProject._metadata || {};
		// Only update if different to avoid unnecessary re-renders
		if (JSON.stringify(newMetadata) !== JSON.stringify(fieldMetadata)) {
			// Validate and filter sources to ensure they're valid SourceMetadata objects
			const validatedMetadata: Record<string, FieldMetadata> = {};
			for (const [key, meta] of Object.entries(newMetadata)) {
				if (meta && typeof meta === "object") {
					const validatedMeta: any = { ...meta };

					// Validate and filter sources array
					if (meta.sources && Array.isArray(meta.sources)) {
						validatedMeta.sources = meta.sources.filter(
							(src: any) =>
								src &&
								typeof src === "object" &&
								src !== null &&
								"type" in src
						);
					}

					// Validate single source
					if (meta.source) {
						if (
							typeof meta.source === "object" &&
							meta.source !== null &&
							"type" in meta.source
						) {
							validatedMeta.source = meta.source;
						} else {
							validatedMeta.source = null;
						}
					}

					validatedMetadata[key] = validatedMeta as FieldMetadata;
				}
			}

			setFieldMetadata(validatedMetadata);
			console.log(
				"[EnhancedProjectForm] Field metadata synced from existingProject:",
				validatedMetadata
			);
		}
	}, [existingProject._metadata, fieldMetadata]);

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

	// State for showing autofill completion notification
	const [showAutofillNotification, setShowAutofillNotification] =
		useState(false);

	// State to track if autofill has been triggered (clicked) at least once
	// This controls when color coding (green/blue) should be applied
	const [hasAutofillBeenTriggered, setHasAutofillBeenTriggered] =
		useState(false);

	// Wrap handleAutofill to track when autofill is triggered
	const wrappedHandleAutofill = useCallback(async () => {
		setHasAutofillBeenTriggered(true);
		await handleAutofill();
	}, [handleAutofill]);

	// Listen for autofill completion event
	useEffect(() => {
		const handleAutofillCompleted = (event: CustomEvent) => {
			if (
				event.detail.projectId === formData.id &&
				event.detail.context === "project"
			) {
				// Mark autofill as triggered when it completes (in case it was triggered elsewhere)
				setHasAutofillBeenTriggered(true);
				setShowAutofillNotification(true);
				// Auto-hide after 10 seconds
				setTimeout(() => {
					setShowAutofillNotification(false);
				}, 10000);
				// Trigger a re-evaluation of locked fields by forcing a state update
				// The locking logic in the useEffect below will run when existingProject updates
				// This ensures fields are locked even if the parent hasn't reloaded yet
			}
		};

		window.addEventListener(
			"autofill-completed",
			handleAutofillCompleted as EventListener
		);
		return () => {
			window.removeEventListener(
				"autofill-completed",
				handleAutofillCompleted as EventListener
			);
		};
	}, [formData.id]);

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
		// Don't reset the flag here - let the save effect handle it after successful save
		if (isUserActionRef.current) {
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

	// Calculate if autofill has ever been run (any field has source != "User Input")
	const hasAutofillBeenRun = useMemo(() => {
		// Check fieldMetadata state instead of just existingProject._metadata
		return Object.values(fieldMetadata).some((meta) => {
			if (!meta) return false;
			// Check sources array
			if (
				meta.sources &&
				Array.isArray(meta.sources) &&
				meta.sources.length > 0
			) {
				const hasNonUserInput = meta.sources.some((src: any) => {
					if (
						typeof src === "object" &&
						src !== null &&
						"type" in src
					) {
						return src.type !== "user_input";
					}
					if (typeof src === "string") {
						const norm = normalizeSource(src);
						return norm.toLowerCase() !== "user input";
					}
					return false;
				});
				if (hasNonUserInput) return true;
			}
			// Check legacy source
			if (meta.source) {
				const norm = normalizeSource(meta.source);
				return norm.toLowerCase() !== "user input";
			}
			return false;
		});
	}, [fieldMetadata]);

	// Helper function to check if a field is locked
	const isFieldLocked = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			// Locked if explicitly in lockedFields set
			return lockedFields.has(fieldId);
		},
		[lockedFields]
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

	// Helper function to get field sources
	const getFieldSources = useCallback(
		(fieldId: string): string[] => {
			const meta = fieldMetadata[fieldId];
			if (meta) {
				// Prefer sources array if available, fallback to source string
				if (meta.sources && meta.sources.length > 0) {
					return meta.sources;
				}
				if (meta.source) {
					return [meta.source];
				}
			}
			return [];
		},
		[fieldMetadata]
	);

	// Helper function to check if a field value is valid (not null, empty, or invalid)
	const isValidFieldValue = useCallback((value: any): boolean => {
		if (value === null || value === undefined) return false;
		if (typeof value === "string" && value.trim() === "") return false;
		if (Array.isArray(value) && value.length === 0) return false;
		if (typeof value === "object" && Object.keys(value).length === 0)
			return false;
		return true;
	}, []);

	// Lock autofilled fields after existingProject is updated (which happens after autofill)
	// This runs when autofill completes (notification shows) OR when autofill has been triggered
	// and there are autofilled fields in the metadata
	useEffect(() => {
		// Only lock fields if autofill has been triggered
		if (!hasAutofillBeenTriggered) return;
		if (!existingProject) return;

		// Check if there are any autofilled fields (to avoid unnecessary work)
		const metadata = existingProject._metadata || {};
		const hasAutofilledFields = Object.values(metadata).some((meta) => {
			if (!meta) return false;
			const sources = meta.sources;
			if (sources && Array.isArray(sources) && sources.length > 0) {
				return sources.some((src: any) => {
					if (
						typeof src === "object" &&
						src !== null &&
						"type" in src
					) {
						return src.type !== "user_input";
					} else if (typeof src === "string") {
						const normalizedSource = normalizeSource(src);
						return (
							normalizedSource.toLowerCase() !== "user input" &&
							src.toLowerCase() !== "user_input"
						);
					}
					return false;
				});
			}
			if (meta.source) {
				const normalizedSource = normalizeSource(meta.source);
				return (
					normalizedSource.toLowerCase() !== "user input" &&
					meta.source.toLowerCase() !== "user_input"
				);
			}
			return false;
		});

		// Only proceed if there are autofilled fields or if notification is showing
		if (!hasAutofilledFields && !showAutofillNotification) return;

		// Lock autofilled fields that are filled, unlock fields that are empty
		setLockedFields((prev) => {
			const next = new Set(prev);
			const metadata = existingProject._metadata || {};
			let hasChanges = false;

			// Combine all keys from metadata and fieldMetadata to ensure we cover all fields
			const allFieldIds = new Set([
				...Object.keys(metadata),
				...Object.keys(fieldMetadata),
			]);

			// Check all fields
			allFieldIds.forEach((fieldId) => {
				const meta = fieldMetadata[fieldId] || metadata[fieldId];
				if (!meta) return;

				// Determine if this field is autofilled
				let isAutofilled = false;
				const sources = meta.sources;

				if (sources && Array.isArray(sources) && sources.length > 0) {
					// Check if any source is not user_input
					isAutofilled = sources.some((src: any) => {
						if (
							typeof src === "object" &&
							src !== null &&
							"type" in src
						) {
							return src.type !== "user_input";
						} else if (typeof src === "string") {
							const normalizedSource = normalizeSource(src);
							return (
								normalizedSource.toLowerCase() !==
									"user input" &&
								src.toLowerCase() !== "user_input"
							);
						}
						return false;
					});
				} else if (meta.source) {
					// Legacy source check
					const normalizedSource = normalizeSource(meta.source);
					const isUserInput =
						normalizedSource.toLowerCase() === "user input" ||
						meta.source.toLowerCase() === "user_input";
					isAutofilled = !isUserInput;
				}

				// Check if field has a valid value in formData or existingProject
				const fieldValue =
					formData[fieldId as keyof typeof formData] ??
					existingProject[fieldId as keyof typeof existingProject];
				const hasValidValue = isValidFieldValue(fieldValue);

				if (hasValidValue) {
					// Lock filled fields ONLY if they are autofilled
					// This prevents locking user-typed fields
					if (isAutofilled) {
						if (
							!next.has(fieldId) &&
							!unlockedFields.has(fieldId)
						) {
							next.add(fieldId);
							hasChanges = true;
						}
					}
				} else {
					// Unlock empty fields
					if (next.has(fieldId)) {
						next.delete(fieldId);
						hasChanges = true;
					}
				}
			});

			// Save locked fields to database if there are changes
			if (hasChanges) {
				const lockedFieldsObj: Record<string, boolean> = {};
				next.forEach((fieldId) => {
					lockedFieldsObj[fieldId] = true;
				});

				const lockedSectionsObj: Record<string, boolean> = {};
				lockedSections.forEach((sectionId) => {
					lockedSectionsObj[sectionId] = true;
				});

				// Save locked fields asynchronously
				const dataToSave = {
					...formData,
					_metadata: fieldMetadata,
					_lockedFields: lockedFieldsObj,
					_lockedSections: lockedSectionsObj,
				};
				updateProject(formData.id, dataToSave).catch((err) => {
					console.error("Failed to save locked fields:", err);
				});
			}

			return next;
		});
	}, [
		existingProject,
		formData,
		isValidFieldValue,
		fieldMetadata,
		lockedSections,
		updateProject,
		showAutofillNotification,
		hasAutofillBeenTriggered,
		unlockedFields,
	]);

	// Helper function to check if a field is autofilled (has source that's not User Input AND has valid value)
	const isFieldAutofilled = useCallback(
		(fieldId: string): boolean => {
			const meta = fieldMetadata[fieldId];
			if (!meta) return false;

			// Check sources array first (can contain SourceMetadata objects)
			const sources = meta.sources;
			let isUserInput = false;

			if (sources && Array.isArray(sources) && sources.length > 0) {
				// Check if all sources are user_input
				const allUserInput = sources.every((src: any) => {
					if (
						typeof src === "object" &&
						src !== null &&
						"type" in src
					) {
						return src.type === "user_input";
					} else if (typeof src === "string") {
						const normalizedSource = normalizeSource(src);
						return (
							normalizedSource.toLowerCase() === "user input" ||
							src.toLowerCase() === "user_input"
						);
					}
					return false;
				});
				isUserInput = allUserInput;
			}

			// If no sources array, check legacy source field (string)
			if (!sources || sources.length === 0) {
				if (meta.source) {
					// Legacy string format - normalize and check
					const normalizedSource = normalizeSource(meta.source);
					isUserInput =
						normalizedSource.toLowerCase() === "user input" ||
						meta.source.toLowerCase() === "user_input";
				} else {
					// No source at all, not autofilled
					return false;
				}
			}

			// If source is "User Input", it can't be autofilled by AI
			if (isUserInput) return false;

			// Check if field has a valid value
			const fieldValue = formData[fieldId as keyof typeof formData];
			const hasValidValue = isValidFieldValue(fieldValue);

			// Field is autofilled only if it has both a valid source AND a valid value
			return hasValidValue;
		},
		[fieldMetadata, formData, isValidFieldValue]
	);

	// Helper function to get sectionId from fieldId
	const getSectionIdFromFieldId = useCallback(
		(fieldId: string): string | undefined => {
			const sectionFieldMap: Record<string, string[]> = {
				"basic-info": [
					"projectName",
					"propertyAddressStreet",
					"propertyAddressCity",
					"propertyAddressState",
					"propertyAddressZip",
					"propertyAddressCounty",
					"assetType",
					"projectType",
					"parcelNumber",
					"zoningDesignation",
					"expectedZoningChanges",
					"constructionType",
					"dealStatus",
					"requestedTerm",
					"prepaymentPremium",
					"expectedHoldPeriod",
					"syndicationStatus",
					"sponsorExperience",
					"borrowerNetWorth",
					"ltvStressMax",
					"dscrStressMin",
					"totalDevelopmentCost",
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
					"realEstateTaxes",
					"insurance",
					"utilitiesCosts",
					"repairsAndMaintenance",
					"managementFee",
					"generalAndAdmin",
					"payroll",
					"reserves",
					"marketingLeasing",
					"serviceCoordination",
					"noiYear1",
					"yieldOnCost",
					"capRate",
					"stabilizedValue",
					"ltv",
					"debtYield",
					"dscr",
					"dscrStressTest",
					"inflationAssumption",
					"portfolioLTV",
					"trendedNOIYear1",
					"untrendedNOIYear1",
					"trendedYield",
					"untrendedYield",
					"portfolioDSCR",
				],
				"property-specs": [
					"totalResidentialUnits",
					"totalResidentialNRSF",
					"averageUnitSize",
					"totalCommercialGRSF",
					"grossBuildingArea",
					"numberOfStories",
					"parkingSpaces",
					"parkingRatio",
					"buildingEfficiency",
					"buildingType",
					"studioCount",
					"oneBedCount",
					"twoBedCount",
					"threeBedCount",
					"furnishedUnits",
					"lossToLease",
					"hvacSystem",
					"roofTypeAge",
					"solarCapacity",
					"evChargingStations",
					"leedGreenRating",
					"adaCompliantPercent",
					"amenityList",
					"residentialUnitMix",
					"commercialSpaceMix",
				],
				"dev-budget": [
					"landAcquisition",
					"baseConstruction",
					"contingency",
					"ffe",
					"aeFees",
					"constructionFees",
					"thirdPartyReports",
					"legalAndOrg",
					"titleAndRecording",
					"taxesDuringConstruction",
					"loanFees",
					"developerFee",
					"interestReserve",
					"workingCapital",
					"relocationCosts",
					"syndicationCosts",
					"enviroRemediation",
					"pfcStructuringFee",
					"seniorLoanAmount",
					"sponsorEquity",
					"taxCreditEquity",
					"gapFinancing",
					"interestRate",
					"underwritingRate",
					"amortization",
					"prepaymentTerms",
					"recourse",
					"permTakeoutPlanned",
					"allInRate",
				],
				"market-context": [
					"submarketName",
					"walkabilityScore",
					"population3Mi",
					"medianHHIncome",
					"renterOccupiedPercent",
					"popGrowth201020",
					"msaName",
					"projGrowth202429",
					"unemploymentRate",
					"largestEmployer",
					"employerConcentration",
					"submarketAbsorption",
					"supplyPipeline",
					"monthsOfSupply",
					"captureRate",
					"marketConcessions",
					"infrastructureCatalyst",
					"broadbandSpeed",
					"crimeRiskLevel",
					"northStarComp",
					"rentComps",
					"saleComps",
				],
				"special-considerations": [
					"opportunityZone",
					"affordableHousing",
					"affordableUnitsNumber",
					"amiTargetPercent",
					"taxExemption",
					"taxAbatement",
					"exemptionStructure",
					"sponsoringEntity",
					"exemptionTerm",
					"relocationPlan",
					"seismicPMLRisk",
					"incentiveStacking",
					"tifDistrict",
					"paceFinancing",
					"historicTaxCredits",
					"newMarketsCredits",
				],
				timeline: [
					"groundbreakingDate",
					"completionDate",
					"firstOccupancy",
					"stabilization",
					"entitlements",
					"permitsIssued",
					"landAcqClose",
					"finalPlans",
					"verticalStart",
					"substantialComp",
					"preLeasedSF",
					"absorptionProjection",
					"opDeficitEscrow",
					"leaseUpEscrow",
					"drawSchedule",
				],
				"site-context": [
					"totalSiteAcreage",
					"currentSiteStatus",
					"siteAccess",
					"proximityShopping",
					"buildableAcreage",
					"allowableFAR",
					"farUtilizedPercent",
					"densityBonus",
					"soilConditions",
					"wetlandsPresent",
					"seismicRisk",
					"phaseIESAFinding",
					"utilityAvailability",
					"easements",
					"accessPoints",
					"adjacentLandUse",
					"noiseFactors",
					"viewCorridors",
					"topography",
					"floodZone",
				],
				"sponsor-info": [
					"sponsorEntityName",
					"sponsorStructure",
					"equityPartner",
					"contactInfo",
					"sponsorExpScore",
					"priorDevelopments",
					"netWorth",
					"guarantorLiquidity",
					"portfolioDSCR",
				],
			};

			for (const [sectionId, fieldIds] of Object.entries(
				sectionFieldMap
			)) {
				if (fieldIds.includes(fieldId)) {
					return sectionId;
				}
			}
			return undefined;
		},
		[]
	);

	// Helper function to get field styling classes based on lock status
	const getFieldStylingClasses = useCallback(
		(fieldId: string, baseClasses?: string): string => {
			// Only apply color coding after autofill has been triggered at least once
			if (!hasAutofillBeenTriggered) {
				return cn(baseClasses);
			}

			const sectionId = getSectionIdFromFieldId(fieldId);
			const isLocked = isFieldLocked(fieldId, sectionId);

			if (isLocked) {
				// Green styling for locked fields - matches View OM button (emerald-600/700)
				return cn(
					baseClasses,
					"border-emerald-500 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-600",
					"hover:border-emerald-600 transition-colors"
				);
			} else {
				// Blue styling for unlocked fields - matches send button (blue-600)
				return cn(
					baseClasses,
					"border-blue-600 bg-blue-50 focus:ring-blue-600 focus:border-blue-600",
					"hover:border-blue-700 transition-colors"
				);
			}
		},
		[isFieldLocked, getSectionIdFromFieldId, hasAutofillBeenTriggered]
	);

	// Helper function to check if a table field is autofilled
	const isTableFieldAutofilled = useCallback(
		(tableFieldId: string): boolean => {
			return isFieldAutofilled(tableFieldId);
		},
		[isFieldAutofilled]
	);

	// Helper function to get table row styling classes based on lock status
	const getTableRowStylingClasses = useCallback(
		(tableFieldId: string): string => {
			// Only apply color coding after autofill has been triggered at least once
			if (!hasAutofillBeenTriggered) return "";

			const sectionId = getSectionIdFromFieldId(tableFieldId);
			const isLocked = isFieldLocked(tableFieldId, sectionId);

			if (isLocked) {
				// Green background for locked table rows
				return "bg-emerald-50/30 hover:bg-emerald-50/50";
			} else {
				// Blue background for unlocked table rows
				return "bg-blue-50/30 hover:bg-blue-50/50";
			}
		},
		[isFieldLocked, getSectionIdFromFieldId, hasAutofillBeenTriggered]
	);

	// Toggle lock for a single field
	const toggleFieldLock = useCallback(
		(fieldId: string, sectionId?: string) => {
			// Mark that user is making a change to prevent sync from overwriting
			isUserActionRef.current = true;

			const currentlyLocked = lockedFields.has(fieldId);

			if (currentlyLocked) {
				// Unlocking the field
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
			} else {
				// Locking the field
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
			}
		},
		[lockedFields]
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
				"projectType",
				"parcelNumber",
				"zoningDesignation",
				"expectedZoningChanges",
				"constructionType",
				"dealStatus",
				"requestedTerm",
				"prepaymentPremium",
				"expectedHoldPeriod",
				"syndicationStatus",
				"sponsorExperience",
				"borrowerNetWorth",
				"ltvStressMax",
				"dscrStressMin",
				"totalDevelopmentCost",
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
				"realEstateTaxes",
				"insurance",
				"utilitiesCosts",
				"repairsAndMaintenance",
				"managementFee",
				"generalAndAdmin",
				"payroll",
				"reserves",
				"marketingLeasing",
				"serviceCoordination",
				"noiYear1",
				"yieldOnCost",
				"capRate",
				"stabilizedValue",
				"ltv",
				"debtYield",
				"dscr",
				"dscrStressTest",
				"inflationAssumption",
				"portfolioLTV",
				"trendedNOIYear1",
				"untrendedNOIYear1",
				"trendedYield",
				"untrendedYield",
				"portfolioDSCR",
			],
			"property-specs": [
				"totalResidentialUnits",
				"totalResidentialNRSF",
				"averageUnitSize",
				"totalCommercialGRSF",
				"grossBuildingArea",
				"numberOfStories",
				"parkingSpaces",
				"parkingRatio",
				"buildingEfficiency",
				"buildingType",
				"studioCount",
				"oneBedCount",
				"twoBedCount",
				"threeBedCount",
				"furnishedUnits",
				"lossToLease",
				"hvacSystem",
				"roofTypeAge",
				"solarCapacity",
				"evChargingStations",
				"leedGreenRating",
				"adaCompliantPercent",
				"amenityList",
				"residentialUnitMix",
				"commercialSpaceMix",
			],
			"dev-budget": [
				"landAcquisition",
				"baseConstruction",
				"contingency",
				"ffe",
				"aeFees",
				"constructionFees",
				"thirdPartyReports",
				"legalAndOrg",
				"titleAndRecording",
				"taxesDuringConstruction",
				"loanFees",
				"developerFee",
				"interestReserve",
				"workingCapital",
				"relocationCosts",
				"syndicationCosts",
				"enviroRemediation",
				"pfcStructuringFee",
				"seniorLoanAmount",
				"sponsorEquity",
				"taxCreditEquity",
				"gapFinancing",
				"interestRate",
				"underwritingRate",
				"amortization",
				"prepaymentTerms",
				"recourse",
				"permTakeoutPlanned",
				"allInRate",
			],
			"market-context": [
				"submarketName",
				"walkabilityScore",
				"population3Mi",
				"medianHHIncome",
				"renterOccupiedPercent",
				"popGrowth201020",
				"msaName",
				"projGrowth202429",
				"unemploymentRate",
				"largestEmployer",
				"employerConcentration",
				"submarketAbsorption",
				"supplyPipeline",
				"monthsOfSupply",
				"captureRate",
				"marketConcessions",
				"infrastructureCatalyst",
				"broadbandSpeed",
				"crimeRiskLevel",
				"northStarComp",
				"rentComps",
				"saleComps",
			],
			"special-considerations": [
				"opportunityZone",
				"affordableHousing",
				"affordableUnitsNumber",
				"amiTargetPercent",
				"taxExemption",
				"taxAbatement",
				"exemptionStructure",
				"sponsoringEntity",
				"exemptionTerm",
				"relocationPlan",
				"seismicPMLRisk",
				"incentiveStacking",
				"tifDistrict",
				"paceFinancing",
				"historicTaxCredits",
				"newMarketsCredits",
			],
			timeline: [
				"groundbreakingDate",
				"completionDate",
				"firstOccupancy",
				"stabilization",
				"entitlements",
				"permitsIssued",
				"landAcqClose",
				"finalPlans",
				"verticalStart",
				"substantialComp",
				"preLeasedSF",
				"absorptionProjection",
				"opDeficitEscrow",
				"leaseUpEscrow",
				"drawSchedule",
			],
			"site-context": [
				"totalSiteAcreage",
				"currentSiteStatus",
				"siteAccess",
				"proximityShopping",
				"buildableAcreage",
				"allowableFAR",
				"farUtilizedPercent",
				"densityBonus",
				"soilConditions",
				"wetlandsPresent",
				"seismicRisk",
				"phaseIESAFinding",
				"utilityAvailability",
				"easements",
				"accessPoints",
				"adjacentLandUse",
				"noiseFactors",
				"viewCorridors",
				"topography",
				"floodZone",
			],
			"sponsor-info": [
				"sponsorEntityName",
				"sponsorStructure",
				"equityPartner",
				"contactInfo",
				"sponsorExpScore",
				"priorDevelopments",
				"netWorth",
				"guarantorLiquidity",
				"portfolioDSCR",
			],
		};
		return sectionFieldMap[sectionId] || [];
	}, []);

	// Toggle lock for an entire section
	const toggleSectionLock = useCallback(
		(sectionId: string) => {
			// Mark that user is making a change to prevent sync from overwriting
			isUserActionRef.current = true;

			const sectionFields = getSectionFieldIds(sectionId);
			// Check if all fields in this section are currently locked
			const allLocked = sectionFields.every((fid) =>
				lockedFields.has(fid)
			);

			setLockedSections((prev) => {
				const next = new Set(prev);
				if (allLocked) {
					next.delete(sectionId);
				} else {
					next.add(sectionId);
				}
				return next;
			});

			setLockedFields((prev) => {
				const next = new Set(prev);
				if (allLocked) {
					sectionFields.forEach((fid) => next.delete(fid));
				} else {
					sectionFields.forEach((fid) => next.add(fid));
				}
				return next;
			});
		},
		[getSectionFieldIds, lockedFields]
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
				<div className="mb-1">
					<label className="flex text-sm font-medium text-gray-700 items-center gap-2 relative group/field">
						<span>
							{labelText}
							{required && (
								<span className="text-red-500 ml-1">*</span>
							)}
						</span>
						<FieldHelpTooltip
							fieldId={fieldId}
							fieldMetadata={
								fieldMetadata[fieldId]
									? {
											sources: fieldMetadata[fieldId]
												.sources
												? fieldMetadata[
														fieldId
												  ].sources!.map(
														(
															src
														): SourceMetadata => {
															if (
																typeof src ===
																	"object" &&
																src !== null &&
																"type" in src
															) {
																return src as SourceMetadata;
															} else {
																// Convert string to SourceMetadata
																return {
																	type: "document",
																	name:
																		typeof src ===
																		"string"
																			? src
																			: undefined,
																};
															}
														}
												  )
												: undefined,
											warnings:
												fieldMetadata[fieldId].warnings,
											value: fieldMetadata[fieldId].value,
											original_value:
												fieldMetadata[fieldId]
													.original_value,
									  }
									: undefined
							}
						/>
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
				</div>
			);
		},
		[onAskAI, renderFieldLockButton, getFieldWarning, fieldMetadata]
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
		// Note: Don't call onFormDataChange here - it's only for user-initiated changes
		// Calling it on prop changes would cause a render loop
	}, [existingProject]);

	// Initialize parent form data only once on mount to avoid render loops
	useEffect(() => {
		if (!hasInitializedFormDataRef.current && onFormDataChange) {
			hasInitializedFormDataRef.current = true;
			// Use setTimeout to defer the call and avoid updating during render
			setTimeout(() => {
				onFormDataChange(existingProject);
			}, 0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty deps - intentionally only run once on mount with initial values

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
			value: string | number | boolean | string[] | null
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

					// IMMEDIATELY update source to user_input when user types (regardless of whether it changed)
					// This ensures color changes to blue instantly
					const wasUserInput =
						normalizeSource(
							currentMeta.source || ""
						).toLowerCase() === "user input" ||
						currentMeta.source === "user_input";

					if (!wasUserInput) {
						// Field was autofilled - mark as user input immediately
						updatedMeta.source = "user_input";

						// Preserve original_source if not set
						if (
							!updatedMeta.original_source &&
							currentMeta.source
						) {
							// Normalize source to original_source format
							const sourceLower =
								currentMeta.source.toLowerCase();
							if (
								sourceLower.includes("census") ||
								sourceLower.includes("knowledge")
							) {
								updatedMeta.original_source = "knowledge_base";
							} else if (
								sourceLower.includes("document") ||
								currentMeta.source.endsWith(".pdf") ||
								currentMeta.source.endsWith(".xlsx") ||
								currentMeta.source.endsWith(".docx")
							) {
								updatedMeta.original_source = "document";
							} else {
								updatedMeta.original_source = null;
							}
						}

						// Add divergence warning if value changed from original
						if (isChanged && hasOriginalValue) {
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

							if (
								currentMeta.original_source ===
									"knowledge_base" ||
								(currentMeta.source &&
									currentMeta.source
										.toLowerCase()
										.includes("census"))
							) {
								divergenceWarnings.push(
									`Value differs from market data (original: ${originalValueStr}, current: ${currentValueStr})`
								);
							} else if (
								currentMeta.original_source === "document" ||
								(currentMeta.source &&
									(currentMeta.source
										.toLowerCase()
										.includes("document") ||
										currentMeta.source.endsWith(".pdf") ||
										currentMeta.source.endsWith(".xlsx") ||
										currentMeta.source.endsWith(".docx")))
							) {
								divergenceWarnings.push(
									`Value differs from extracted document data (original: ${originalValueStr}, current: ${currentValueStr})`
								);
							} else if (
								currentMeta.source &&
								currentMeta.source !== "user_input"
							) {
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
						} else {
							// User is typing but hasn't changed from original yet - still mark as user_input
							// Keep existing warnings
							updatedMeta.warnings = currentMeta.warnings || [];
						}
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
						// Already user input or no original value - just update value
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

	// Helper functions for table row operations
	const handleTableRowAdd = useCallback(
		(tableField: keyof ProjectProfile, defaultRow: any) => {
			setFormData((prev) => {
				const currentArray = Array.isArray((prev as any)[tableField])
					? [...((prev as any)[tableField] as any[])]
					: [];
				const nextFormData = {
					...prev,
					[tableField]: [...currentArray, { ...defaultRow }],
				};
				onFormDataChange?.(nextFormData);
				return nextFormData;
			});
		},
		[onFormDataChange]
	);

	const handleTableRowDelete = useCallback(
		(tableField: keyof ProjectProfile, index: number) => {
			setFormData((prev) => {
				const currentArray = Array.isArray((prev as any)[tableField])
					? [...((prev as any)[tableField] as any[])]
					: [];
				currentArray.splice(index, 1);
				const nextFormData = {
					...prev,
					[tableField]: currentArray,
				};
				onFormDataChange?.(nextFormData);
				return nextFormData;
			});
		},
		[onFormDataChange]
	);

	const handleTableRowUpdate = useCallback(
		(
			tableField: keyof ProjectProfile,
			index: number,
			field: string,
			value: any
		) => {
			setFormData((prev) => {
				const currentArray = Array.isArray((prev as any)[tableField])
					? [...((prev as any)[tableField] as any[])]
					: [];
				if (currentArray[index]) {
					currentArray[index] = {
						...currentArray[index],
						[field]: value,
					};
				}
				const nextFormData = {
					...prev,
					[tableField]: currentArray,
				};
				onFormDataChange?.(nextFormData);
				return nextFormData;
			});
		},
		[onFormDataChange]
	);

	// Helper function to compare form content (excluding metadata and lock fields)
	const hasFormContentChanged = useCallback(() => {
		// Create clean copies without metadata and lock fields for comparison
		const cleanCurrent = { ...formData };
		delete (cleanCurrent as any)._metadata;
		delete (cleanCurrent as any)._lockedFields;
		delete (cleanCurrent as any)._lockedSections;

		const cleanOriginal = { ...existingProject };
		delete (cleanOriginal as any)._metadata;
		delete (cleanOriginal as any)._lockedFields;
		delete (cleanOriginal as any)._lockedSections;

		// Compare the clean objects
		return JSON.stringify(cleanCurrent) !== JSON.stringify(cleanOriginal);
	}, [formData, existingProject]);

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

			// Only create a new version if form content actually changed
			const contentChanged = hasFormContentChanged();
			if (contentChanged) {
				console.log(
					"[EnhancedProjectForm] Form content changed, creating new version"
				);
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
			} else {
				console.log(
					"[EnhancedProjectForm] No form content changes detected, skipping version creation"
				);
			}

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
		hasFormContentChanged,
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
												getFieldStylingClasses(
													"projectName"
												),
												isFieldDisabled(
													"projectName",
													"basic-info"
												) &&
													"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"propertyAddressStreet"
													),
													isFieldDisabled(
														"propertyAddressStreet",
														"basic-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
														getFieldStylingClasses(
															"propertyAddressCity"
														),
														isFieldDisabled(
															"propertyAddressCity",
															"basic-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
														getFieldStylingClasses(
															"propertyAddressState"
														),
														isFieldDisabled(
															"propertyAddressState",
															"basic-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
														getFieldStylingClasses(
															"propertyAddressZip"
														),
														isFieldDisabled(
															"propertyAddressZip",
															"basic-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"propertyAddressCounty"
													),
													isFieldDisabled(
														"propertyAddressCounty",
														"basic-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"assetType"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								{/* Project Type uses MultiSelect */}
								<FormGroup className="mt-4">
									<AskAIButton
										id="projectType"
										onAskAI={onAskAI || (() => {})}
									>
										<div
											data-field-id="projectType"
											data-field-type="multi-select"
											data-field-section="basic-info"
											data-field-label="Project Type"
											className="relative group/field"
										>
											{renderFieldLabel(
												"projectType",
												"basic-info",
												"Project Type",
												false
											)}
											<MultiSelectPills
												label=""
												options={projectTypeOptions}
												selectedValues={
													Array.isArray(
														formData.projectType
													)
														? formData.projectType
														: []
												}
												onSelect={(values) =>
													handleInputChange(
														"projectType",
														values
													)
												}
												disabled={isFieldDisabled(
													"projectType",
													"basic-info"
												)}
												isLocked={isFieldLocked(
													"projectType",
													"basic-info"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
												isAutofilled={isFieldAutofilled(
													"projectPhase"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
													getFieldStylingClasses(
														"projectDescription"
													),
													"w-full h-24 px-4 py-2 rounded-md focus:outline-none focus:ring-2",
													isFieldDisabled(
														"projectDescription",
														"basic-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												required
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Project Details Section */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Project Details
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="constructionType"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"constructionType",
													"basic-info",
													"Construction Type",
													false
												)}
												<Select
													id="constructionType"
													value={
														formData.constructionType ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"constructionType",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Ground-Up",
															label: "Ground-Up",
														},
														{
															value: "Renovation",
															label: "Renovation",
														},
														{
															value: "Adaptive Reuse",
															label: "Adaptive Reuse",
														},
													]}
													disabled={isFieldDisabled(
														"constructionType",
														"basic-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"constructionType"
														),
														isFieldDisabled(
															"constructionType",
															"basic-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="constructionType"
													data-field-type="select"
													data-field-section="basic-info"
													data-field-required="false"
													data-field-label="Construction Type"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="dealStatus"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"dealStatus",
													"basic-info",
													"Deal Status",
													false
												)}
												<Select
													id="dealStatus"
													value={
														formData.dealStatus ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"dealStatus",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Inquiry",
															label: "Inquiry",
														},
														{
															value: "Underwriting",
															label: "Underwriting",
														},
														{
															value: "Pre-Submission",
															label: "Pre-Submission",
														},
														{
															value: "Submitted",
															label: "Submitted",
														},
														{
															value: "Closed",
															label: "Closed",
														},
													]}
													disabled={isFieldDisabled(
														"dealStatus",
														"basic-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"dealStatus"
														),
														isFieldDisabled(
															"dealStatus",
															"basic-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="dealStatus"
													data-field-type="select"
													data-field-section="basic-info"
													data-field-required="false"
													data-field-label="Deal Status"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
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
													getFieldStylingClasses(
														"loanAmountRequested"
													),
													isFieldDisabled(
														"loanAmountRequested",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"loanType"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
													getFieldStylingClasses(
														"targetLtvPercent"
													),
													isFieldDisabled(
														"targetLtvPercent",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"targetLtcPercent"
													),
													isFieldDisabled(
														"targetLtcPercent",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"amortizationYears"
													),
													isFieldDisabled(
														"amortizationYears",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"interestOnlyPeriodMonths"
													),
													isFieldDisabled(
														"interestOnlyPeriodMonths",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"interestRateType"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
													getFieldStylingClasses(
														"targetCloseDate"
													),
													isFieldDisabled(
														"targetCloseDate",
														"loan-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
											isAutofilled={isFieldAutofilled(
												"recoursePreference"
											)}
											hasAutofillBeenRun={
												hasAutofillBeenRun
											}
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
												"w-full h-24 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors",
												getFieldStylingClasses(
													"useOfProceeds"
												),
												isFieldDisabled(
													"useOfProceeds",
													"loan-info"
												) &&
													"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"purchasePrice"
													),
													isFieldDisabled(
														"purchasePrice",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"totalProjectCost"
													),
													isFieldDisabled(
														"totalProjectCost",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"capexBudget"
													),
													isFieldDisabled(
														"capexBudget",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
										id="totalDevelopmentCost"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"totalDevelopmentCost",
												"financials",
												"Total Development Cost (TDC) ($)",
												false
											)}
											<Input
												id="totalDevelopmentCost"
												type="number"
												label={null}
												value={
													formData.totalDevelopmentCost?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"totalDevelopmentCost",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 29800000"
												disabled={isFieldDisabled(
													"totalDevelopmentCost",
													"financials"
												)}
												className={cn(
													getFieldStylingClasses(
														"totalDevelopmentCost"
													),
													isFieldDisabled(
														"totalDevelopmentCost",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="totalDevelopmentCost"
												data-field-type="number"
												data-field-section="financials"
												data-field-required="false"
												data-field-label="Total Development Cost (TDC) ($)"
												data-field-placeholder="e.g., 29800000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
													getFieldStylingClasses(
														"equityCommittedPercent"
													),
													isFieldDisabled(
														"equityCommittedPercent",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"propertyNoiT12"
													),
													isFieldDisabled(
														"propertyNoiT12",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"stabilizedNoiProjected"
													),
													isFieldDisabled(
														"stabilizedNoiProjected",
														"financials"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
											isAutofilled={isFieldAutofilled(
												"exitStrategy"
											)}
											hasAutofillBeenRun={
												hasAutofillBeenRun
											}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							{/* Loan Terms */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<FileText className="h-4 w-4 mr-2 text-blue-600" />
									Loan Terms
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="loanAmountRequested"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"loanAmountRequested",
													"financials",
													"Loan Amount Requested ($)",
													false
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
													disabled={isFieldDisabled(
														"loanAmountRequested",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"loanAmountRequested"
														),
														isFieldDisabled(
															"loanAmountRequested",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="loanAmountRequested"
													data-field-type="number"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Loan Amount Requested ($)"
													data-field-placeholder="e.g., 10000000"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="loanType"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"loanType",
													"financials",
													"Loan Type",
													false
												)}
												<Select
													id="loanType"
													value={
														formData.loanType || ""
													}
													onChange={(e) =>
														handleInputChange(
															"loanType",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Construction",
															label: "Construction",
														},
														{
															value: "Bridge",
															label: "Bridge",
														},
														{
															value: "Permanent",
															label: "Permanent",
														},
													]}
													disabled={isFieldDisabled(
														"loanType",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"loanType"
														),
														isFieldDisabled(
															"loanType",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="loanType"
													data-field-type="select"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Loan Type"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="requestedTerm"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"requestedTerm",
													"financials",
													"Requested Term",
													false
												)}
												<Input
													id="requestedTerm"
													label={null}
													value={
														formData.requestedTerm ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"requestedTerm",
															e.target.value
														)
													}
													placeholder="e.g., 3 Years + 1 Year Ext"
													disabled={isFieldDisabled(
														"requestedTerm",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"requestedTerm"
														),
														isFieldDisabled(
															"requestedTerm",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="requestedTerm"
													data-field-type="input"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Requested Term"
													data-field-placeholder="e.g., 3 Years + 1 Year Ext"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="amortizationYears"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"amortizationYears",
													"financials",
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
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"amortizationYears"
														),
														isFieldDisabled(
															"amortizationYears",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="amortizationYears"
													data-field-type="number"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Amortization (Years)"
													data-field-placeholder="e.g., 30"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="prepaymentPremium"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"prepaymentPremium",
													"financials",
													"Prepayment Premium",
													false
												)}
												<Select
													id="prepaymentPremium"
													value={
														formData.prepaymentPremium ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"prepaymentPremium",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Yield Maint",
															label: "Yield Maint",
														},
														{
															value: "Defeasance",
															label: "Defeasance",
														},
														{
															value: "Step-down",
															label: "Step-down",
														},
														{
															value: "Open",
															label: "Open",
														},
													]}
													disabled={isFieldDisabled(
														"prepaymentPremium",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"prepaymentPremium"
														),
														isFieldDisabled(
															"prepaymentPremium",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="prepaymentPremium"
													data-field-type="select"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Prepayment Premium"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
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
												"w-full h-24 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors",
												getFieldStylingClasses(
													"businessPlanSummary"
												),
												isFieldDisabled(
													"businessPlanSummary",
													"financials"
												) &&
													"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												"w-full h-24 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors",
												getFieldStylingClasses(
													"marketOverviewSummary"
												),
												isFieldDisabled(
													"marketOverviewSummary",
													"financials"
												) &&
													"bg-emerald-50 border-emerald-200 cursor-not-allowed"
											)}
										/>
									</div>
								</AskAIButton>
							</FormGroup>
							{/* Operating Expenses */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Calculator className="h-4 w-4 mr-2 text-blue-600" />
									Operating Expenses (Proforma Year 1)
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="realEstateTaxes"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"realEstateTaxes",
													"financials",
													"Real Estate Taxes",
													false
												)}
												<Input
													id="realEstateTaxes"
													type="number"
													label={null}
													value={
														(
															formData as any
														).realEstateTaxes?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"realEstateTaxes",
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
														"realEstateTaxes",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"realEstateTaxes"
														),
														isFieldDisabled(
															"realEstateTaxes",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="realEstateTaxes"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="insurance"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"insurance",
													"financials",
													"Insurance",
													false
												)}
												<Input
													id="insurance"
													type="number"
													label={null}
													value={
														(
															formData as any
														).insurance?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"insurance",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 125000"
													disabled={isFieldDisabled(
														"insurance",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"insurance"
														),
														isFieldDisabled(
															"insurance",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="insurance"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="utilitiesCosts"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"utilitiesCosts",
													"financials",
													"Utilities",
													false
												)}
												<Input
													id="utilitiesCosts"
													type="number"
													label={null}
													value={
														(
															formData as any
														).utilitiesCosts?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"utilitiesCosts",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 180000"
													disabled={isFieldDisabled(
														"utilitiesCosts",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"utilitiesCosts"
														),
														isFieldDisabled(
															"utilitiesCosts",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="utilitiesCosts"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="repairsAndMaintenance"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"repairsAndMaintenance",
													"financials",
													"Repairs & Maintenance",
													false
												)}
												<Input
													id="repairsAndMaintenance"
													type="number"
													label={null}
													value={
														(
															formData as any
														).repairsAndMaintenance?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"repairsAndMaintenance",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 95000"
													disabled={isFieldDisabled(
														"repairsAndMaintenance",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"repairsAndMaintenance"
														),
														isFieldDisabled(
															"repairsAndMaintenance",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="repairsAndMaintenance"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="managementFee"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"managementFee",
													"financials",
													"Management Fee",
													false
												)}
												<Input
													id="managementFee"
													type="number"
													label={null}
													value={
														(
															formData as any
														).managementFee?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"managementFee",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 113400"
													disabled={isFieldDisabled(
														"managementFee",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"managementFee"
														),
														isFieldDisabled(
															"managementFee",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="managementFee"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="generalAndAdmin"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"generalAndAdmin",
													"financials",
													"General & Admin",
													false
												)}
												<Input
													id="generalAndAdmin"
													type="number"
													label={null}
													value={
														(
															formData as any
														).generalAndAdmin?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"generalAndAdmin",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 75000"
													disabled={isFieldDisabled(
														"generalAndAdmin",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"generalAndAdmin"
														),
														isFieldDisabled(
															"generalAndAdmin",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="generalAndAdmin"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="payroll"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"payroll",
													"financials",
													"Payroll",
													false
												)}
												<Input
													id="payroll"
													type="number"
													label={null}
													value={
														(
															formData as any
														).payroll?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"payroll",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 120000"
													disabled={isFieldDisabled(
														"payroll",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"payroll"
														),
														isFieldDisabled(
															"payroll",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="payroll"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="reserves"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"reserves",
													"financials",
													"Reserves",
													false
												)}
												<Input
													id="reserves"
													type="number"
													label={null}
													value={
														(
															formData as any
														).reserves?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"reserves",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 29000"
													disabled={isFieldDisabled(
														"reserves",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"reserves"
														),
														isFieldDisabled(
															"reserves",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="reserves"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="marketingLeasing"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"marketingLeasing",
													"financials",
													"Marketing/Leasing",
													false
												)}
												<Input
													id="marketingLeasing"
													type="number"
													label={null}
													value={
														(
															formData as any
														).marketingLeasing?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"marketingLeasing",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 68040"
													disabled={isFieldDisabled(
														"marketingLeasing",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"marketingLeasing"
														),
														isFieldDisabled(
															"marketingLeasing",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="marketingLeasing"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="serviceCoordination"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"serviceCoordination",
													"financials",
													"Service Coordination",
													false
												)}
												<Input
													id="serviceCoordination"
													type="number"
													label={null}
													value={
														(
															formData as any
														).serviceCoordination?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"serviceCoordination",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"serviceCoordination",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"serviceCoordination"
														),
														isFieldDisabled(
															"serviceCoordination",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="serviceCoordination"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Investment Metrics */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
									Investment Metrics
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="noiYear1"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"noiYear1",
													"financials",
													"NOI (Year 1)",
													false
												)}
												<Input
													id="noiYear1"
													type="number"
													label={null}
													value={
														(
															formData as any
														).noiYear1?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"noiYear1",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2268000"
													disabled={isFieldDisabled(
														"noiYear1",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"noiYear1"
														),
														isFieldDisabled(
															"noiYear1",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="noiYear1"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="yieldOnCost"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"yieldOnCost",
													"financials",
													"Yield on Cost (%)",
													false
												)}
												<Input
													id="yieldOnCost"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).yieldOnCost?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"yieldOnCost",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 7.6"
													disabled={isFieldDisabled(
														"yieldOnCost",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"yieldOnCost"
														),
														isFieldDisabled(
															"yieldOnCost",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="yieldOnCost"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="capRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"capRate",
													"financials",
													"Cap Rate (%)",
													false
												)}
												<Input
													id="capRate"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).capRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"capRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 5.5"
													disabled={isFieldDisabled(
														"capRate",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"capRate"
														),
														isFieldDisabled(
															"capRate",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="capRate"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="stabilizedValue"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"stabilizedValue",
													"financials",
													"Stabilized Value ($)",
													false
												)}
												<Input
													id="stabilizedValue"
													type="number"
													label={null}
													value={
														(
															formData as any
														).stabilizedValue?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"stabilizedValue",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 41200000"
													disabled={isFieldDisabled(
														"stabilizedValue",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"stabilizedValue"
														),
														isFieldDisabled(
															"stabilizedValue",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="stabilizedValue"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="ltv"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"ltv",
													"financials",
													"LTV (%)",
													false
												)}
												<Input
													id="ltv"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).ltv?.toString() || ""
													}
													onChange={(e) =>
														handleInputChange(
															"ltv",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 43.7"
													disabled={isFieldDisabled(
														"ltv",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"ltv"
														),
														isFieldDisabled(
															"ltv",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="ltv"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="debtYield"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"debtYield",
													"financials",
													"Debt Yield (%)",
													false
												)}
												<Input
													id="debtYield"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).debtYield?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"debtYield",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 12.6"
													disabled={isFieldDisabled(
														"debtYield",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"debtYield"
														),
														isFieldDisabled(
															"debtYield",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="debtYield"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="dscr"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"dscr",
													"financials",
													"DSCR",
													false
												)}
												<Input
													id="dscr"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).dscr?.toString() || ""
													}
													onChange={(e) =>
														handleInputChange(
															"dscr",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1.25"
													disabled={isFieldDisabled(
														"dscr",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"dscr"
														),
														isFieldDisabled(
															"dscr",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="dscr"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="dscrStressTest"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"dscrStressTest",
													"financials",
													"DSCR Stress Test",
													false
												)}
												<Input
													id="dscrStressTest"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).dscrStressTest?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"dscrStressTest",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1.08"
													disabled={isFieldDisabled(
														"dscrStressTest",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"dscrStressTest"
														),
														isFieldDisabled(
															"dscrStressTest",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="dscrStressTest"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="inflationAssumption"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"inflationAssumption",
													"financials",
													"Inflation Assumption (%)",
													false
												)}
												<Input
													id="inflationAssumption"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).inflationAssumption?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"inflationAssumption",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2.0"
													disabled={isFieldDisabled(
														"inflationAssumption",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"inflationAssumption"
														),
														isFieldDisabled(
															"inflationAssumption",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="inflationAssumption"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="portfolioLTV"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"portfolioLTV",
													"financials",
													"Portfolio LTV (%)",
													false
												)}
												<Input
													id="portfolioLTV"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).portfolioLTV?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"portfolioLTV",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 65.0"
													disabled={isFieldDisabled(
														"portfolioLTV",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"portfolioLTV"
														),
														isFieldDisabled(
															"portfolioLTV",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="portfolioLTV"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="trendedNOIYear1"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"trendedNOIYear1",
													"financials",
													"Trended NOI (Yr 1)",
													false
												)}
												<Input
													id="trendedNOIYear1"
													type="number"
													label={null}
													value={
														(
															formData as any
														).trendedNOIYear1?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"trendedNOIYear1",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2313360"
													disabled={isFieldDisabled(
														"trendedNOIYear1",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"trendedNOIYear1"
														),
														isFieldDisabled(
															"trendedNOIYear1",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="trendedNOIYear1"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="untrendedNOIYear1"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"untrendedNOIYear1",
													"financials",
													"Untrended NOI (Yr 1)",
													false
												)}
												<Input
													id="untrendedNOIYear1"
													type="number"
													label={null}
													value={
														(
															formData as any
														).untrendedNOIYear1?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"untrendedNOIYear1",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2222640"
													disabled={isFieldDisabled(
														"untrendedNOIYear1",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"untrendedNOIYear1"
														),
														isFieldDisabled(
															"untrendedNOIYear1",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="untrendedNOIYear1"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="trendedYield"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"trendedYield",
													"financials",
													"Trended Yield (%)",
													false
												)}
												<Input
													id="trendedYield"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).trendedYield?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"trendedYield",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 7.76"
													disabled={isFieldDisabled(
														"trendedYield",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"trendedYield"
														),
														isFieldDisabled(
															"trendedYield",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="trendedYield"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="untrendedYield"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"untrendedYield",
													"financials",
													"Untrended Yield (%)",
													false
												)}
												<Input
													id="untrendedYield"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).untrendedYield?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"untrendedYield",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 7.45"
													disabled={isFieldDisabled(
														"untrendedYield",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"untrendedYield"
														),
														isFieldDisabled(
															"untrendedYield",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="untrendedYield"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="portfolioDSCR"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"portfolioDSCR",
													"financials",
													"Portfolio DSCR",
													false
												)}
												<Input
													id="portfolioDSCR"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).portfolioDSCR?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"portfolioDSCR",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1.35"
													disabled={isFieldDisabled(
														"portfolioDSCR",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"portfolioDSCR"
														),
														isFieldDisabled(
															"portfolioDSCR",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="portfolioDSCR"
													data-field-type="number"
													data-field-section="financials"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="expectedHoldPeriod"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"expectedHoldPeriod",
													"financials",
													"Expected Hold Period (Years)",
													false
												)}
												<Input
													id="expectedHoldPeriod"
													type="number"
													label={null}
													value={
														formData.expectedHoldPeriod?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"expectedHoldPeriod",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 5"
													disabled={isFieldDisabled(
														"expectedHoldPeriod",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"expectedHoldPeriod"
														),
														isFieldDisabled(
															"expectedHoldPeriod",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="expectedHoldPeriod"
													data-field-type="number"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="Expected Hold Period (Years)"
													data-field-placeholder="e.g., 5"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="ltvStressMax"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"ltvStressMax",
													"financials",
													"LTV Stress Max (%)",
													false
												)}
												<Input
													id="ltvStressMax"
													type="number"
													label={null}
													value={
														formData.ltvStressMax?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"ltvStressMax",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 50"
													disabled={isFieldDisabled(
														"ltvStressMax",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"ltvStressMax"
														),
														isFieldDisabled(
															"ltvStressMax",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="ltvStressMax"
													data-field-type="number"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="LTV Stress Max (%)"
													data-field-placeholder="e.g., 50"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="dscrStressMin"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"dscrStressMin",
													"financials",
													"DSCR Stress Min",
													false
												)}
												<Input
													id="dscrStressMin"
													type="number"
													step="0.01"
													label={null}
													value={
														formData.dscrStressMin?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"dscrStressMin",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1.10"
													disabled={isFieldDisabled(
														"dscrStressMin",
														"financials"
													)}
													className={cn(
														getFieldStylingClasses(
															"dscrStressMin"
														),
														isFieldDisabled(
															"dscrStressMin",
															"financials"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="dscrStressMin"
													data-field-type="number"
													data-field-section="financials"
													data-field-required="false"
													data-field-label="DSCR Stress Min"
													data-field-placeholder="e.g., 1.10"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
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
													getFieldStylingClasses(
														"totalResidentialUnits"
													),
													isFieldDisabled(
														"totalResidentialUnits",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"totalResidentialNRSF"
													),
													isFieldDisabled(
														"totalResidentialNRSF",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="totalResidentialNRSF"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="averageUnitSize"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"averageUnitSize",
												"property-specs",
												"Avg Unit Size",
												false
											)}
											<Input
												id="averageUnitSize"
												type="number"
												label={null}
												value={
													formData.averageUnitSize?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"averageUnitSize",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 513"
												disabled={isFieldDisabled(
													"averageUnitSize",
													"property-specs"
												)}
												className={cn(
													getFieldStylingClasses(
														"averageUnitSize"
													),
													isFieldDisabled(
														"averageUnitSize",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="averageUnitSize"
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
													getFieldStylingClasses(
														"totalCommercialGRSF"
													),
													isFieldDisabled(
														"totalCommercialGRSF",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"grossBuildingArea"
													),
													isFieldDisabled(
														"grossBuildingArea",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"numberOfStories"
													),
													isFieldDisabled(
														"numberOfStories",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"parkingSpaces"
													),
													isFieldDisabled(
														"parkingSpaces",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="parkingSpaces"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="parkingRatio"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"parkingRatio",
												"property-specs",
												"Parking Ratio",
												false
											)}
											<Input
												id="parkingRatio"
												type="number"
												step="0.01"
												label={null}
												value={
													formData.parkingRatio?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"parkingRatio",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 1.55"
												disabled={isFieldDisabled(
													"parkingRatio",
													"property-specs"
												)}
												className={cn(
													getFieldStylingClasses(
														"parkingRatio"
													),
													isFieldDisabled(
														"parkingRatio",
														"property-specs"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="parkingRatio"
												data-field-type="number"
												data-field-section="property-specs"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Property Details */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Property Details
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="buildingEfficiency"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"buildingEfficiency",
													"property-specs",
													"Building Efficiency (%)",
													false
												)}
												<Input
													id="buildingEfficiency"
													type="number"
													step="0.1"
													label={null}
													value={
														formData.buildingEfficiency?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"buildingEfficiency",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 82.0"
													disabled={isFieldDisabled(
														"buildingEfficiency",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"buildingEfficiency"
														),
														isFieldDisabled(
															"buildingEfficiency",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="buildingEfficiency"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="buildingType"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"buildingType",
													"property-specs",
													"Building Type",
													false
												)}
												<Select
													id="buildingType"
													value={
														formData.buildingType ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"buildingType",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "High-rise",
															label: "High-rise",
														},
														{
															value: "Mid-rise",
															label: "Mid-rise",
														},
														{
															value: "Garden",
															label: "Garden",
														},
														{
															value: "Podium",
															label: "Podium",
														},
													]}
													disabled={isFieldDisabled(
														"buildingType",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"buildingType"
														),
														isFieldDisabled(
															"buildingType",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="buildingType"
													data-field-type="select"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="studioCount"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"studioCount",
													"property-specs",
													"Studio Count",
													false
												)}
												<Input
													id="studioCount"
													type="number"
													label={null}
													value={
														formData.studioCount?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"studioCount",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 12"
													disabled={isFieldDisabled(
														"studioCount",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"studioCount"
														),
														isFieldDisabled(
															"studioCount",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="studioCount"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="oneBedCount"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"oneBedCount",
													"property-specs",
													"1-Bed Count",
													false
												)}
												<Input
													id="oneBedCount"
													type="number"
													label={null}
													value={
														formData.oneBedCount?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"oneBedCount",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 46"
													disabled={isFieldDisabled(
														"oneBedCount",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"oneBedCount"
														),
														isFieldDisabled(
															"oneBedCount",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="oneBedCount"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="twoBedCount"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"twoBedCount",
													"property-specs",
													"2-Bed Count",
													false
												)}
												<Input
													id="twoBedCount"
													type="number"
													label={null}
													value={
														formData.twoBedCount?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"twoBedCount",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 58"
													disabled={isFieldDisabled(
														"twoBedCount",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"twoBedCount"
														),
														isFieldDisabled(
															"twoBedCount",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="twoBedCount"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="threeBedCount"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"threeBedCount",
													"property-specs",
													"3-Bed Count",
													false
												)}
												<Input
													id="threeBedCount"
													type="number"
													label={null}
													value={
														formData.threeBedCount?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"threeBedCount",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"threeBedCount",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"threeBedCount"
														),
														isFieldDisabled(
															"threeBedCount",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="threeBedCount"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="furnishedUnits"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"furnishedUnits",
													"property-specs",
													"Furnished Units?",
													false
												)}
												<Select
													id="furnishedUnits"
													value={
														formData.furnishedUnits
															? "Yes"
															: formData.furnishedUnits ===
															  false
															? "No"
															: ""
													}
													onChange={(e) =>
														handleInputChange(
															"furnishedUnits",
															e.target.value ===
																"Yes"
																? true
																: e.target
																		.value ===
																  "No"
																? false
																: null
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Yes",
															label: "Yes",
														},
														{
															value: "No",
															label: "No",
														},
													]}
													disabled={isFieldDisabled(
														"furnishedUnits",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"furnishedUnits"
														),
														isFieldDisabled(
															"furnishedUnits",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="furnishedUnits"
													data-field-type="select"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="lossToLease"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"lossToLease",
													"property-specs",
													"Loss to Lease (%)",
													false
												)}
												<Input
													id="lossToLease"
													type="number"
													step="0.1"
													label={null}
													value={
														formData.lossToLease?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"lossToLease",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 5.0"
													disabled={isFieldDisabled(
														"lossToLease",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"lossToLease"
														),
														isFieldDisabled(
															"lossToLease",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="lossToLease"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="hvacSystem"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"hvacSystem",
													"property-specs",
													"HVAC System",
													false
												)}
												<Select
													id="hvacSystem"
													value={
														formData.hvacSystem ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"hvacSystem",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Central",
															label: "Central",
														},
														{
															value: "Split System",
															label: "Split System",
														},
														{
															value: "PTAC",
															label: "PTAC",
														},
														{
															value: "VRF",
															label: "VRF",
														},
													]}
													disabled={isFieldDisabled(
														"hvacSystem",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"hvacSystem"
														),
														isFieldDisabled(
															"hvacSystem",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="hvacSystem"
													data-field-type="select"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="roofTypeAge"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"roofTypeAge",
													"property-specs",
													"Roof Type/Age",
													false
												)}
												<Input
													id="roofTypeAge"
													label={null}
													value={
														formData.roofTypeAge ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"roofTypeAge",
															e.target.value
														)
													}
													placeholder="e.g., TPO, 2 years old"
													disabled={isFieldDisabled(
														"roofTypeAge",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"roofTypeAge"
														),
														isFieldDisabled(
															"roofTypeAge",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="roofTypeAge"
													data-field-type="input"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="solarCapacity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"solarCapacity",
													"property-specs",
													"Solar Capacity (kW)",
													false
												)}
												<Input
													id="solarCapacity"
													type="number"
													label={null}
													value={
														formData.solarCapacity?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"solarCapacity",
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
														"solarCapacity",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"solarCapacity"
														),
														isFieldDisabled(
															"solarCapacity",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="solarCapacity"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="evChargingStations"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"evChargingStations",
													"property-specs",
													"EV Charging Stations",
													false
												)}
												<Input
													id="evChargingStations"
													type="number"
													label={null}
													value={
														formData.evChargingStations?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"evChargingStations",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 8"
													disabled={isFieldDisabled(
														"evChargingStations",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"evChargingStations"
														),
														isFieldDisabled(
															"evChargingStations",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="evChargingStations"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="leedGreenRating"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"leedGreenRating",
													"property-specs",
													"LEED/Green Rating",
													false
												)}
												<Select
													id="leedGreenRating"
													value={
														formData.leedGreenRating ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"leedGreenRating",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Certified",
															label: "Certified",
														},
														{
															value: "Silver",
															label: "Silver",
														},
														{
															value: "Gold",
															label: "Gold",
														},
														{
															value: "Platinum",
															label: "Platinum",
														},
														{
															value: "NGBS",
															label: "NGBS",
														},
													]}
													disabled={isFieldDisabled(
														"leedGreenRating",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"leedGreenRating"
														),
														isFieldDisabled(
															"leedGreenRating",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="leedGreenRating"
													data-field-type="select"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="adaCompliantPercent"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"adaCompliantPercent",
													"property-specs",
													"ADA Compliant %",
													false
												)}
												<Input
													id="adaCompliantPercent"
													type="number"
													step="0.1"
													label={null}
													value={
														formData.adaCompliantPercent?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"adaCompliantPercent",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 5.0"
													disabled={isFieldDisabled(
														"adaCompliantPercent",
														"property-specs"
													)}
													className={cn(
														getFieldStylingClasses(
															"adaCompliantPercent"
														),
														isFieldDisabled(
															"adaCompliantPercent",
															"property-specs"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="adaCompliantPercent"
													data-field-type="number"
													data-field-section="property-specs"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Amenity List */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Amenities
								</h3>
								<div className="grid grid-cols-1 gap-6">
									<FormGroup>
										<AskAIButton
											id="amenityList"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"amenityList",
													"property-specs",
													"Amenity List",
													false
												)}
												<MultiSelectPills
													label=""
													options={amenityListOptions}
													selectedValues={
														Array.isArray(
															(formData as any)
																.amenityList
														)
															? (formData as any)
																	.amenityList
															: []
													}
													onSelect={(values) =>
														handleInputChange(
															"amenityList",
															values
														)
													}
													disabled={isFieldDisabled(
														"amenityList",
														"property-specs"
													)}
													isLocked={isFieldLocked(
														"amenityList",
														"property-specs"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Residential Unit Mix Table */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-md font-medium text-gray-800 flex items-center gap-2">
										<Info className="h-4 w-4 text-blue-600" />
										Residential Unit Mix
										{isFieldAutofilled(
											"residentialUnitMix"
										) && (
											<div title="Autofilled field">
												<Lock className="h-4 w-4 text-emerald-600" />
											</div>
										)}
									</h3>
									<div className="flex items-center gap-2">
										{renderFieldLockButton(
											"residentialUnitMix",
											"property-specs"
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												handleTableRowAdd(
													"residentialUnitMix",
													{
														unitType: "",
														unitCount: 0,
														avgSF: 0,
														totalSF: 0,
														monthlyRent: 0,
														percentOfTotal: null,
														affordabilityStatus: "",
														affordableUnitsCount: 0,
														amiTargetPercent: null,
														rentBumpSchedule: "",
													}
												)
											}
											disabled={isFieldDisabled(
												"residentialUnitMix",
												"property-specs"
											)}
											className="flex items-center gap-1"
										>
											<Plus className="h-4 w-4" />
											Add Row
										</Button>
									</div>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full border-collapse border border-gray-300">
										<thead>
											<tr className="bg-gray-50">
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Unit Type
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Count
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Avg SF
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Total SF
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Monthly Rent
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													% of Total Units
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Affordability Status
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Affordable Units Count
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													AMI Target %
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Rent Bump
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(
												(formData as any)
													.residentialUnitMix
											) &&
											(formData as any).residentialUnitMix
												.length > 0 ? (
												(
													formData as any
												).residentialUnitMix.map(
													(
														unit: any,
														index: number
													) => (
														<tr
															key={index}
															className={getTableRowStylingClasses(
																"residentialUnitMix"
															)}
														>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		unit.unitType ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"unitType",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.unitCount?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"unitCount",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.avgSF?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"avgSF",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.totalSF?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"totalSF",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.monthlyRent?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"monthlyRent",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	step="0.01"
																	value={
																		unit.percentOfTotal?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"percentOfTotal",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: null
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		unit.affordabilityStatus ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"affordabilityStatus",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.affordableUnitsCount?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"affordableUnitsCount",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		unit.amiTargetPercent?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"amiTargetPercent",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: null
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		unit.rentBumpSchedule ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"residentialUnitMix",
																			index,
																			"rentBumpSchedule",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"residentialUnitMix"
																		),
																		isFieldDisabled(
																			"residentialUnitMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleTableRowDelete(
																			"residentialUnitMix",
																			index
																		)
																	}
																	disabled={isFieldDisabled(
																		"residentialUnitMix",
																		"property-specs"
																	)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<X className="h-4 w-4" />
																</Button>
															</td>
														</tr>
													)
												)
											) : (
												<tr>
													<td
														colSpan={8}
														className="border border-gray-300 px-3 py-2 text-center text-gray-500"
													>
														No unit mix data
														available. Click
														&quot;Add Row&quot; to
														add a new entry.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
							{/* Commercial Space Mix Table */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-md font-medium text-gray-800 flex items-center gap-2">
										<Info className="h-4 w-4 text-blue-600" />
										Commercial Space Mix
										{isFieldAutofilled(
											"commercialSpaceMix"
										) && (
											<div title="Autofilled field">
												<Lock className="h-4 w-4 text-emerald-600" />
											</div>
										)}
									</h3>
									<div className="flex items-center gap-2">
										{renderFieldLockButton(
											"commercialSpaceMix",
											"property-specs"
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												handleTableRowAdd(
													"commercialSpaceMix",
													{
														spaceType: "",
														squareFootage: 0,
														tenant: "",
														leaseTerm: "",
														annualRent: 0,
														tiAllowance: 0,
													}
												)
											}
											disabled={isFieldDisabled(
												"commercialSpaceMix",
												"property-specs"
											)}
											className="flex items-center gap-1"
										>
											<Plus className="h-4 w-4" />
											Add Row
										</Button>
									</div>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full border-collapse border border-gray-300">
										<thead>
											<tr className="bg-gray-50">
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Space Type
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Square Footage
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Tenant
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Lease Term
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Annual Rent
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													TI Allowance
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(
												(formData as any)
													.commercialSpaceMix
											) &&
											(formData as any).commercialSpaceMix
												.length > 0 ? (
												(
													formData as any
												).commercialSpaceMix.map(
													(
														space: any,
														index: number
													) => (
														<tr
															key={index}
															className={getTableRowStylingClasses(
																"commercialSpaceMix"
															)}
														>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		space.spaceType ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"spaceType",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		space.squareFootage?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"squareFootage",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		space.tenant ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"tenant",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		space.leaseTerm ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"leaseTerm",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		space.annualRent?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"annualRent",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		space.tiAllowance?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"commercialSpaceMix",
																			index,
																			"tiAllowance",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"commercialSpaceMix"
																		),
																		isFieldDisabled(
																			"commercialSpaceMix",
																			"property-specs"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleTableRowDelete(
																			"commercialSpaceMix",
																			index
																		)
																	}
																	disabled={isFieldDisabled(
																		"commercialSpaceMix",
																		"property-specs"
																	)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<X className="h-4 w-4" />
																</Button>
															</td>
														</tr>
													)
												)
											) : (
												<tr>
													<td
														colSpan={7}
														className="border border-gray-300 px-3 py-2 text-center text-gray-500"
													>
														No commercial space data
														available. Click
														&quot;Add Row&quot; to
														add a new entry.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
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
													getFieldStylingClasses(
														"landAcquisition"
													),
													isFieldDisabled(
														"landAcquisition",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"baseConstruction"
													),
													isFieldDisabled(
														"baseConstruction",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"contingency"
													),
													isFieldDisabled(
														"contingency",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"ffe"
													),
													isFieldDisabled(
														"ffe",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"aeFees"
													),
													isFieldDisabled(
														"aeFees",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
										id="constructionFees"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"constructionFees",
												"dev-budget",
												"Construction Fees",
												false
											)}
											<Input
												id="constructionFees"
												type="number"
												label={null}
												value={
													(
														formData as any
													).constructionFees?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"constructionFees",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 174000"
												disabled={isFieldDisabled(
													"constructionFees",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"constructionFees"
													),
													isFieldDisabled(
														"constructionFees",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="constructionFees"
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
										id="thirdPartyReports"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"thirdPartyReports",
												"dev-budget",
												"Third Party Reports",
												false
											)}
											<Input
												id="thirdPartyReports"
												type="number"
												label={null}
												value={
													(
														formData as any
													).thirdPartyReports?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"thirdPartyReports",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 50000"
												disabled={isFieldDisabled(
													"thirdPartyReports",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"thirdPartyReports"
													),
													isFieldDisabled(
														"thirdPartyReports",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="thirdPartyReports"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="legalAndOrg"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"legalAndOrg",
												"dev-budget",
												"Legal & Org",
												false
											)}
											<Input
												id="legalAndOrg"
												type="number"
												label={null}
												value={
													(
														formData as any
													).legalAndOrg?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"legalAndOrg",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 50000"
												disabled={isFieldDisabled(
													"legalAndOrg",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"legalAndOrg"
													),
													isFieldDisabled(
														"legalAndOrg",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="legalAndOrg"
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
										id="titleAndRecording"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"titleAndRecording",
												"dev-budget",
												"Title & Recording",
												false
											)}
											<Input
												id="titleAndRecording"
												type="number"
												label={null}
												value={
													(
														formData as any
													).titleAndRecording?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"titleAndRecording",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 75000"
												disabled={isFieldDisabled(
													"titleAndRecording",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"titleAndRecording"
													),
													isFieldDisabled(
														"titleAndRecording",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="titleAndRecording"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="taxesDuringConstruction"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"taxesDuringConstruction",
												"dev-budget",
												"Taxes During Const.",
												false
											)}
											<Input
												id="taxesDuringConstruction"
												type="number"
												label={null}
												value={
													(
														formData as any
													).taxesDuringConstruction?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"taxesDuringConstruction",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 20000"
												disabled={isFieldDisabled(
													"taxesDuringConstruction",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"taxesDuringConstruction"
													),
													isFieldDisabled(
														"taxesDuringConstruction",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="taxesDuringConstruction"
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
										id="loanFees"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"loanFees",
												"dev-budget",
												"Loan Fees",
												false
											)}
											<Input
												id="loanFees"
												type="number"
												label={null}
												value={
													(
														formData as any
													).loanFees?.toString() || ""
												}
												onChange={(e) =>
													handleInputChange(
														"loanFees",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 360000"
												disabled={isFieldDisabled(
													"loanFees",
													"dev-budget"
												)}
												className={cn(
													getFieldStylingClasses(
														"loanFees"
													),
													isFieldDisabled(
														"loanFees",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="loanFees"
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
													getFieldStylingClasses(
														"developerFee"
													),
													isFieldDisabled(
														"developerFee",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"interestReserve"
													),
													isFieldDisabled(
														"interestReserve",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"workingCapital"
													),
													isFieldDisabled(
														"workingCapital",
														"dev-budget"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="workingCapital"
												data-field-type="number"
												data-field-section="dev-budget"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Budget Items */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Budget Items
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="relocationCosts"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"relocationCosts",
													"dev-budget",
													"Relocation Costs",
													false
												)}
												<Input
													id="relocationCosts"
													type="number"
													label={null}
													value={
														(
															formData as any
														).relocationCosts?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"relocationCosts",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"relocationCosts",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"relocationCosts"
														),
														isFieldDisabled(
															"relocationCosts",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="relocationCosts"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="syndicationCosts"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"syndicationCosts",
													"dev-budget",
													"Syndication Costs",
													false
												)}
												<Input
													id="syndicationCosts"
													type="number"
													label={null}
													value={
														(
															formData as any
														).syndicationCosts?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"syndicationCosts",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 238000"
													disabled={isFieldDisabled(
														"syndicationCosts",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"syndicationCosts"
														),
														isFieldDisabled(
															"syndicationCosts",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="syndicationCosts"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="enviroRemediation"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"enviroRemediation",
													"dev-budget",
													"Environmental Remediation",
													false
												)}
												<Input
													id="enviroRemediation"
													type="number"
													label={null}
													value={
														(
															formData as any
														).enviroRemediation?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"enviroRemediation",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"enviroRemediation",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"enviroRemediation"
														),
														isFieldDisabled(
															"enviroRemediation",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="enviroRemediation"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="pfcStructuringFee"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"pfcStructuringFee",
													"dev-budget",
													"PFC/Structure Fee",
													false
												)}
												<Input
													id="pfcStructuringFee"
													type="number"
													label={null}
													value={
														(
															formData as any
														).pfcStructuringFee?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"pfcStructuringFee",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 116000"
													disabled={isFieldDisabled(
														"pfcStructuringFee",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"pfcStructuringFee"
														),
														isFieldDisabled(
															"pfcStructuringFee",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="pfcStructuringFee"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Sources of Funds */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<DollarSign className="h-4 w-4 mr-2 text-blue-600" />
									Sources of Funds
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="seniorLoanAmount"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"seniorLoanAmount",
													"dev-budget",
													"Senior Loan Amount",
													false
												)}
												<Input
													id="seniorLoanAmount"
													type="number"
													label={null}
													value={
														(
															formData as any
														).seniorLoanAmount?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"seniorLoanAmount",
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
														"seniorLoanAmount",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"seniorLoanAmount"
														),
														isFieldDisabled(
															"seniorLoanAmount",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="seniorLoanAmount"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="sponsorEquity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"sponsorEquity",
													"dev-budget",
													"Sponsor Equity",
													false
												)}
												<Input
													id="sponsorEquity"
													type="number"
													label={null}
													value={
														(
															formData as any
														).sponsorEquity?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"sponsorEquity",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 11807800"
													disabled={isFieldDisabled(
														"sponsorEquity",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"sponsorEquity"
														),
														isFieldDisabled(
															"sponsorEquity",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="sponsorEquity"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="taxCreditEquity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"taxCreditEquity",
													"dev-budget",
													"Tax Credit Equity",
													false
												)}
												<Input
													id="taxCreditEquity"
													type="number"
													label={null}
													value={
														(
															formData as any
														).taxCreditEquity?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"taxCreditEquity",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"taxCreditEquity",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"taxCreditEquity"
														),
														isFieldDisabled(
															"taxCreditEquity",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="taxCreditEquity"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="gapFinancing"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"gapFinancing",
													"dev-budget",
													"Gap Financing",
													false
												)}
												<Input
													id="gapFinancing"
													type="number"
													label={null}
													value={
														(
															formData as any
														).gapFinancing?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"gapFinancing",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 0"
													disabled={isFieldDisabled(
														"gapFinancing",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"gapFinancing"
														),
														isFieldDisabled(
															"gapFinancing",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="gapFinancing"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Loan Terms */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<FileText className="h-4 w-4 mr-2 text-blue-600" />
									Loan Terms
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="interestRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"interestRate",
													"dev-budget",
													"Interest Rate (%)",
													false
												)}
												<Input
													id="interestRate"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).interestRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"interestRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 6.5"
													disabled={isFieldDisabled(
														"interestRate",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"interestRate"
														),
														isFieldDisabled(
															"interestRate",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="interestRate"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="underwritingRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"underwritingRate",
													"dev-budget",
													"Underwriting Rate (%)",
													false
												)}
												<Input
													id="underwritingRate"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).underwritingRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"underwritingRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 8.5"
													disabled={isFieldDisabled(
														"underwritingRate",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"underwritingRate"
														),
														isFieldDisabled(
															"underwritingRate",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="underwritingRate"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="amortization"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"amortization",
													"dev-budget",
													"Amortization",
													false
												)}
												<Select
													id="amortization"
													value={
														(formData as any)
															.amortization || ""
													}
													onChange={(e) =>
														handleInputChange(
															"amortization",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "IO",
															label: "IO",
														},
														{
															value: "30yr",
															label: "30yr",
														},
														{
															value: "25yr",
															label: "25yr",
														},
													]}
													disabled={isFieldDisabled(
														"amortization",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"amortization"
														),
														isFieldDisabled(
															"amortization",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="amortization"
													data-field-type="select"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="prepaymentTerms"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"prepaymentTerms",
													"dev-budget",
													"Prepayment Terms",
													false
												)}
												<Input
													id="prepaymentTerms"
													label={null}
													value={
														(formData as any)
															.prepaymentTerms ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"prepaymentTerms",
															e.target.value
														)
													}
													placeholder="e.g., No prepayment penalty after year 1"
													disabled={isFieldDisabled(
														"prepaymentTerms",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"prepaymentTerms"
														),
														isFieldDisabled(
															"prepaymentTerms",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="prepaymentTerms"
													data-field-type="input"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="recourse"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"recourse",
													"dev-budget",
													"Recourse",
													false
												)}
												<Select
													id="recourse"
													value={
														(formData as any)
															.recourse || ""
													}
													onChange={(e) =>
														handleInputChange(
															"recourse",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Full",
															label: "Full",
														},
														{
															value: "Partial",
															label: "Partial",
														},
														{
															value: "Non",
															label: "Non",
														},
													]}
													disabled={isFieldDisabled(
														"recourse",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"recourse"
														),
														isFieldDisabled(
															"recourse",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="recourse"
													data-field-type="select"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="permTakeoutPlanned"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"permTakeoutPlanned",
													"dev-budget",
													"Perm Takeout Planned?",
													false
												)}
												<Select
													id="permTakeoutPlanned"
													value={
														(formData as any)
															.permTakeoutPlanned ===
														true
															? "Yes"
															: (formData as any)
																	.permTakeoutPlanned ===
															  false
															? "No"
															: ""
													}
													onChange={(e) =>
														handleInputChange(
															"permTakeoutPlanned",
															e.target.value ===
																"Yes"
																? true
																: e.target
																		.value ===
																  "No"
																? false
																: null
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Yes",
															label: "Yes",
														},
														{
															value: "No",
															label: "No",
														},
													]}
													disabled={isFieldDisabled(
														"permTakeoutPlanned",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"permTakeoutPlanned"
														),
														isFieldDisabled(
															"permTakeoutPlanned",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="permTakeoutPlanned"
													data-field-type="select"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="allInRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"allInRate",
													"dev-budget",
													"All-In Rate (%)",
													false
												)}
												<Input
													id="allInRate"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).allInRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"allInRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 7.2"
													disabled={isFieldDisabled(
														"allInRate",
														"dev-budget"
													)}
													className={cn(
														getFieldStylingClasses(
															"allInRate"
														),
														isFieldDisabled(
															"allInRate",
															"dev-budget"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="allInRate"
													data-field-type="number"
													data-field-section="dev-budget"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
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
													getFieldStylingClasses(
														"submarketName"
													),
													isFieldDisabled(
														"submarketName",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"walkabilityScore"
													),
													isFieldDisabled(
														"walkabilityScore",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"population3Mi"
													),
													isFieldDisabled(
														"population3Mi",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"medianHHIncome"
													),
													isFieldDisabled(
														"medianHHIncome",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"renterOccupiedPercent"
													),
													isFieldDisabled(
														"renterOccupiedPercent",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"popGrowth201020"
													),
													isFieldDisabled(
														"popGrowth201020",
														"market-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="popGrowth201020"
												data-field-type="number"
												data-field-section="market-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Market Context Fields */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Market Data
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="msaName"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"msaName",
													"market-context",
													"MSA Name",
													false
												)}
												<Input
													id="msaName"
													label={null}
													value={
														(formData as any)
															.msaName || ""
													}
													onChange={(e) =>
														handleInputChange(
															"msaName",
															e.target.value
														)
													}
													placeholder="e.g., Dallas-Fort Worth-Arlington, TX"
													disabled={isFieldDisabled(
														"msaName",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"msaName"
														),
														isFieldDisabled(
															"msaName",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="msaName"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="projGrowth202429"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"projGrowth202429",
													"market-context",
													"Pop Growth (5-yr Proj) (%)",
													false
												)}
												<Input
													id="projGrowth202429"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).projGrowth202429?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"projGrowth202429",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 6.9"
													disabled={isFieldDisabled(
														"projGrowth202429",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"projGrowth202429"
														),
														isFieldDisabled(
															"projGrowth202429",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="projGrowth202429"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="unemploymentRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"unemploymentRate",
													"market-context",
													"Unemployment Rate (%)",
													false
												)}
												<Input
													id="unemploymentRate"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).unemploymentRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"unemploymentRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 3.5"
													disabled={isFieldDisabled(
														"unemploymentRate",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"unemploymentRate"
														),
														isFieldDisabled(
															"unemploymentRate",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="unemploymentRate"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="largestEmployer"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"largestEmployer",
													"market-context",
													"Largest Employer",
													false
												)}
												<Input
													id="largestEmployer"
													label={null}
													value={
														(formData as any)
															.largestEmployer ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"largestEmployer",
															e.target.value
														)
													}
													placeholder="e.g., Downtown Dallas"
													disabled={isFieldDisabled(
														"largestEmployer",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"largestEmployer"
														),
														isFieldDisabled(
															"largestEmployer",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="largestEmployer"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="employerConcentration"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"employerConcentration",
													"market-context",
													"Employer Concentration (%)",
													false
												)}
												<Input
													id="employerConcentration"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).employerConcentration?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"employerConcentration",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 15.0"
													disabled={isFieldDisabled(
														"employerConcentration",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"employerConcentration"
														),
														isFieldDisabled(
															"employerConcentration",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="employerConcentration"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="submarketAbsorption"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"submarketAbsorption",
													"market-context",
													"Submarket Absorption (Units/Year)",
													false
												)}
												<Input
													id="submarketAbsorption"
													type="number"
													label={null}
													value={
														(
															formData as any
														).submarketAbsorption?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"submarketAbsorption",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 500"
													disabled={isFieldDisabled(
														"submarketAbsorption",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"submarketAbsorption"
														),
														isFieldDisabled(
															"submarketAbsorption",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="submarketAbsorption"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="supplyPipeline"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"supplyPipeline",
													"market-context",
													"Supply Pipeline (Units)",
													false
												)}
												<Input
													id="supplyPipeline"
													type="number"
													label={null}
													value={
														(
															formData as any
														).supplyPipeline?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"supplyPipeline",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1200"
													disabled={isFieldDisabled(
														"supplyPipeline",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"supplyPipeline"
														),
														isFieldDisabled(
															"supplyPipeline",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="supplyPipeline"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="monthsOfSupply"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"monthsOfSupply",
													"market-context",
													"Months of Supply",
													false
												)}
												<Input
													id="monthsOfSupply"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).monthsOfSupply?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"monthsOfSupply",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 8.5"
													disabled={isFieldDisabled(
														"monthsOfSupply",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"monthsOfSupply"
														),
														isFieldDisabled(
															"monthsOfSupply",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="monthsOfSupply"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="captureRate"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"captureRate",
													"market-context",
													"Capture Rate (%)",
													false
												)}
												<Input
													id="captureRate"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).captureRate?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"captureRate",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2.1"
													disabled={isFieldDisabled(
														"captureRate",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"captureRate"
														),
														isFieldDisabled(
															"captureRate",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="captureRate"
													data-field-type="number"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="marketConcessions"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"marketConcessions",
													"market-context",
													"Market Concessions",
													false
												)}
												<Input
													id="marketConcessions"
													label={null}
													value={
														(formData as any)
															.marketConcessions ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"marketConcessions",
															e.target.value
														)
													}
													placeholder="e.g., 1 Month Free"
													disabled={isFieldDisabled(
														"marketConcessions",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"marketConcessions"
														),
														isFieldDisabled(
															"marketConcessions",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="marketConcessions"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="infrastructureCatalyst"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"infrastructureCatalyst",
													"market-context",
													"Infrastructure Catalyst",
													false
												)}
												<Input
													id="infrastructureCatalyst"
													label={null}
													value={
														(formData as any)
															.infrastructureCatalyst ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"infrastructureCatalyst",
															e.target.value
														)
													}
													placeholder="e.g., New Light Rail Station"
													disabled={isFieldDisabled(
														"infrastructureCatalyst",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"infrastructureCatalyst"
														),
														isFieldDisabled(
															"infrastructureCatalyst",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="infrastructureCatalyst"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="broadbandSpeed"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"broadbandSpeed",
													"market-context",
													"Broadband Speed",
													false
												)}
												<Input
													id="broadbandSpeed"
													label={null}
													value={
														(formData as any)
															.broadbandSpeed ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"broadbandSpeed",
															e.target.value
														)
													}
													placeholder="e.g., Fiber 1Gbps Available"
													disabled={isFieldDisabled(
														"broadbandSpeed",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"broadbandSpeed"
														),
														isFieldDisabled(
															"broadbandSpeed",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="broadbandSpeed"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="crimeRiskLevel"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"crimeRiskLevel",
													"market-context",
													"Crime Risk Level",
													false
												)}
												<Select
													id="crimeRiskLevel"
													value={
														(formData as any)
															.crimeRiskLevel ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"crimeRiskLevel",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Low",
															label: "Low",
														},
														{
															value: "Moderate",
															label: "Moderate",
														},
														{
															value: "High",
															label: "High",
														},
													]}
													disabled={isFieldDisabled(
														"crimeRiskLevel",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"crimeRiskLevel"
														),
														isFieldDisabled(
															"crimeRiskLevel",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="crimeRiskLevel"
													data-field-type="select"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="northStarComp"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"northStarComp",
													"market-context",
													"North Star Comp",
													false
												)}
												<Input
													id="northStarComp"
													label={null}
													value={
														(formData as any)
															.northStarComp || ""
													}
													onChange={(e) =>
														handleInputChange(
															"northStarComp",
															e.target.value
														)
													}
													placeholder="e.g., The Alexan Deep Ellum"
													disabled={isFieldDisabled(
														"northStarComp",
														"market-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"northStarComp"
														),
														isFieldDisabled(
															"northStarComp",
															"market-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="northStarComp"
													data-field-type="input"
													data-field-section="market-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Rent Comps Table */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-md font-medium text-gray-800 flex items-center gap-2">
										<Info className="h-4 w-4 text-blue-600" />
										Rent Comps
										{isFieldAutofilled("rentComps") && (
											<div title="Autofilled field">
												<Lock className="h-4 w-4 text-emerald-600" />
											</div>
										)}
									</h3>
									<div className="flex items-center gap-2">
										{renderFieldLockButton(
											"rentComps",
											"market-context"
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												handleTableRowAdd("rentComps", {
													propertyName: "",
													address: "",
													distance: 0,
													yearBuilt: 0,
													totalUnits: 0,
													occupancyPercent: 0,
													avgRentMonth: 0,
													rentPSF: 0,
													concessions: "",
												})
											}
											disabled={isFieldDisabled(
												"rentComps",
												"market-context"
											)}
											className="flex items-center gap-1"
										>
											<Plus className="h-4 w-4" />
											Add Row
										</Button>
									</div>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full border-collapse border border-gray-300">
										<thead>
											<tr className="bg-gray-50">
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Property Name
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Address
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Distance (mi)
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Year Built
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Total Units
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Occupancy (%)
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Avg Rent/Month
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Rent PSF
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Concessions
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(
												(formData as any).rentComps
											) &&
											(formData as any).rentComps.length >
												0 ? (
												(formData as any).rentComps.map(
													(
														comp: any,
														index: number
													) => (
														<tr
															key={index}
															className={getTableRowStylingClasses(
																"rentComps"
															)}
														>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		comp.propertyName ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"propertyName",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		comp.address ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"address",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.distance?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"distance",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.yearBuilt?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"yearBuilt",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.totalUnits?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"totalUnits",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.occupancyPercent?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"occupancyPercent",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.avgRentMonth?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"avgRentMonth",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.rentPSF?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"rentPSF",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		comp.concessions ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"rentComps",
																			index,
																			"concessions",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"rentComps"
																		),
																		isFieldDisabled(
																			"rentComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleTableRowDelete(
																			"rentComps",
																			index
																		)
																	}
																	disabled={isFieldDisabled(
																		"rentComps",
																		"market-context"
																	)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<X className="h-4 w-4" />
																</Button>
															</td>
														</tr>
													)
												)
											) : (
												<tr>
													<td
														colSpan={10}
														className="border border-gray-300 px-3 py-2 text-center text-gray-500"
													>
														No rent comps data
														available. Click
														&quot;Add Row&quot; to
														add a new entry.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
							{/* Sale Comps Table */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-md font-medium text-gray-800 flex items-center gap-2">
										<Info className="h-4 w-4 text-blue-600" />
										Sale Comps
										{isFieldAutofilled("saleComps") && (
											<div title="Autofilled field">
												<Lock className="h-4 w-4 text-emerald-600" />
											</div>
										)}
									</h3>
									<div className="flex items-center gap-2">
										{renderFieldLockButton(
											"saleComps",
											"market-context"
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												handleTableRowAdd("saleComps", {
													propertyName: "",
													salePricePerUnit: 0,
													capRate: 0,
													saleDate: "",
												})
											}
											disabled={isFieldDisabled(
												"saleComps",
												"market-context"
											)}
											className="flex items-center gap-1"
										>
											<Plus className="h-4 w-4" />
											Add Row
										</Button>
									</div>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full border-collapse border border-gray-300">
										<thead>
											<tr className="bg-gray-50">
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Property Name
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Sale Price/Unit
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Cap Rate (%)
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Sale Date
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(
												(formData as any).saleComps
											) &&
											(formData as any).saleComps.length >
												0 ? (
												(formData as any).saleComps.map(
													(
														comp: any,
														index: number
													) => (
														<tr
															key={index}
															className={getTableRowStylingClasses(
																"saleComps"
															)}
														>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		comp.propertyName ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"saleComps",
																			index,
																			"propertyName",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"saleComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"saleComps"
																		),
																		isFieldDisabled(
																			"saleComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.salePricePerUnit?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"saleComps",
																			index,
																			"salePricePerUnit",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"saleComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"saleComps"
																		),
																		isFieldDisabled(
																			"saleComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		comp.capRate?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"saleComps",
																			index,
																			"capRate",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"saleComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"saleComps"
																		),
																		isFieldDisabled(
																			"saleComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="text"
																	value={
																		comp.saleDate ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"saleComps",
																			index,
																			"saleDate",
																			e
																				.target
																				.value
																		)
																	}
																	disabled={isFieldDisabled(
																		"saleComps",
																		"market-context"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"saleComps"
																		),
																		isFieldDisabled(
																			"saleComps",
																			"market-context"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleTableRowDelete(
																			"saleComps",
																			index
																		)
																	}
																	disabled={isFieldDisabled(
																		"saleComps",
																		"market-context"
																	)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<X className="h-4 w-4" />
																</Button>
															</td>
														</tr>
													)
												)
											) : (
												<tr>
													<td
														colSpan={5}
														className="border border-gray-300 px-3 py-2 text-center text-gray-500"
													>
														No sale comps data
														available. Click
														&quot;Add Row&quot; to
														add a new entry.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
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
												isAutofilled={isFieldAutofilled(
													"opportunityZone"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
												isAutofilled={isFieldAutofilled(
													"affordableHousing"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
															getFieldStylingClasses(
																"affordableUnitsNumber"
															),
															isFieldDisabled(
																"affordableUnitsNumber",
																"special-considerations"
															) &&
																"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
															getFieldStylingClasses(
																"amiTargetPercent"
															),
															isFieldDisabled(
																"amiTargetPercent",
																"special-considerations"
															) &&
																"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"taxExemption"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
												isAutofilled={isFieldAutofilled(
													"taxAbatement"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Special Considerations */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Special Considerations
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="exemptionStructure"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"exemptionStructure",
													"special-considerations",
													"Exemption Structure",
													false
												)}
												<Select
													id="exemptionStructure"
													value={
														(formData as any)
															.exemptionStructure ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"exemptionStructure",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "PFC",
															label: "PFC",
														},
														{
															value: "MMD",
															label: "MMD",
														},
														{
															value: "PILOT",
															label: "PILOT",
														},
													]}
													disabled={isFieldDisabled(
														"exemptionStructure",
														"special-considerations"
													)}
													className={cn(
														getFieldStylingClasses(
															"exemptionStructure"
														),
														isFieldDisabled(
															"exemptionStructure",
															"special-considerations"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="exemptionStructure"
													data-field-type="select"
													data-field-section="special-considerations"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="sponsoringEntity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"sponsoringEntity",
													"special-considerations",
													"Sponsoring Entity",
													false
												)}
												<Input
													id="sponsoringEntity"
													label={null}
													value={
														(formData as any)
															.sponsoringEntity ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"sponsoringEntity",
															e.target.value
														)
													}
													placeholder="e.g., SoGood MMD"
													disabled={isFieldDisabled(
														"sponsoringEntity",
														"special-considerations"
													)}
													className={cn(
														getFieldStylingClasses(
															"sponsoringEntity"
														),
														isFieldDisabled(
															"sponsoringEntity",
															"special-considerations"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="sponsoringEntity"
													data-field-type="input"
													data-field-section="special-considerations"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="exemptionTerm"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"exemptionTerm",
													"special-considerations",
													"Exemption Term (Years)",
													false
												)}
												<Input
													id="exemptionTerm"
													type="number"
													label={null}
													value={
														(
															formData as any
														).exemptionTerm?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"exemptionTerm",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 15"
													disabled={isFieldDisabled(
														"exemptionTerm",
														"special-considerations"
													)}
													className={cn(
														getFieldStylingClasses(
															"exemptionTerm"
														),
														isFieldDisabled(
															"exemptionTerm",
															"special-considerations"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="exemptionTerm"
													data-field-type="number"
													data-field-section="special-considerations"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="relocationPlan"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"relocationPlan",
													"special-considerations",
													"Relocation Plan",
													false
												)}
												<Select
													id="relocationPlan"
													value={
														(formData as any)
															.relocationPlan ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"relocationPlan",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Complete",
															label: "Complete",
														},
														{
															value: "In Process",
															label: "In Process",
														},
														{
															value: "N/A",
															label: "N/A",
														},
													]}
													disabled={isFieldDisabled(
														"relocationPlan",
														"special-considerations"
													)}
													className={cn(
														getFieldStylingClasses(
															"relocationPlan"
														),
														isFieldDisabled(
															"relocationPlan",
															"special-considerations"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="relocationPlan"
													data-field-type="select"
													data-field-section="special-considerations"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="seismicPMLRisk"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"seismicPMLRisk",
													"special-considerations",
													"Seismic/PML Risk",
													false
												)}
												<Input
													id="seismicPMLRisk"
													label={null}
													value={
														(formData as any)
															.seismicPMLRisk ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"seismicPMLRisk",
															e.target.value
														)
													}
													placeholder="e.g., 2.5% PML"
													disabled={isFieldDisabled(
														"seismicPMLRisk",
														"special-considerations"
													)}
													className={cn(
														getFieldStylingClasses(
															"seismicPMLRisk"
														),
														isFieldDisabled(
															"seismicPMLRisk",
															"special-considerations"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="seismicPMLRisk"
													data-field-type="input"
													data-field-section="special-considerations"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="incentiveStacking"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"incentiveStacking",
													"special-considerations",
													"Incentive Stacking",
													false
												)}
												<MultiSelectPills
													label=""
													options={[
														"LIHTC",
														"Section 8",
														"Tax Exemption",
														"Tax Abatement",
														"PACE",
														"Historic Tax Credits",
														"New Markets Credits",
														"Opportunity Zone",
														"Other",
													]}
													selectedValues={
														Array.isArray(
															(formData as any)
																.incentiveStacking
														)
															? (formData as any)
																	.incentiveStacking
															: []
													}
													onSelect={(values) =>
														handleInputChange(
															"incentiveStacking",
															values
														)
													}
													disabled={isFieldDisabled(
														"incentiveStacking",
														"special-considerations"
													)}
													isLocked={isFieldLocked(
														"incentiveStacking",
														"special-considerations"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="tifDistrict"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"tifDistrict",
													"special-considerations",
													"TIF District?",
													false
												)}
												<ButtonSelect
													label=""
													options={["Yes", "No"]}
													selectedValue={
														(formData as any)
															.tifDistrict ===
														true
															? "Yes"
															: (formData as any)
																	.tifDistrict ===
															  false
															? "No"
															: ""
													}
													onSelect={(value) =>
														handleInputChange(
															"tifDistrict",
															value === "Yes"
														)
													}
													gridCols="grid-cols-2"
													disabled={isFieldDisabled(
														"tifDistrict",
														"special-considerations"
													)}
													isAutofilled={isFieldAutofilled(
														"tifDistrict"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="paceFinancing"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"paceFinancing",
													"special-considerations",
													"PACE Financing?",
													false
												)}
												<ButtonSelect
													label=""
													options={["Yes", "No"]}
													selectedValue={
														(formData as any)
															.paceFinancing ===
														true
															? "Yes"
															: (formData as any)
																	.paceFinancing ===
															  false
															? "No"
															: ""
													}
													onSelect={(value) =>
														handleInputChange(
															"paceFinancing",
															value === "Yes"
														)
													}
													gridCols="grid-cols-2"
													disabled={isFieldDisabled(
														"paceFinancing",
														"special-considerations"
													)}
													isAutofilled={isFieldAutofilled(
														"paceFinancing"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="historicTaxCredits"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"historicTaxCredits",
													"special-considerations",
													"Historic Tax Credits?",
													false
												)}
												<ButtonSelect
													label=""
													options={["Yes", "No"]}
													selectedValue={
														(formData as any)
															.historicTaxCredits ===
														true
															? "Yes"
															: (formData as any)
																	.historicTaxCredits ===
															  false
															? "No"
															: ""
													}
													onSelect={(value) =>
														handleInputChange(
															"historicTaxCredits",
															value === "Yes"
														)
													}
													gridCols="grid-cols-2"
													disabled={isFieldDisabled(
														"historicTaxCredits",
														"special-considerations"
													)}
													isAutofilled={isFieldAutofilled(
														"historicTaxCredits"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="newMarketsCredits"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"newMarketsCredits",
													"special-considerations",
													"New Markets Credits?",
													false
												)}
												<ButtonSelect
													label=""
													options={["Yes", "No"]}
													selectedValue={
														(formData as any)
															.newMarketsCredits ===
														true
															? "Yes"
															: (formData as any)
																	.newMarketsCredits ===
															  false
															? "No"
															: ""
													}
													onSelect={(value) =>
														handleInputChange(
															"newMarketsCredits",
															value === "Yes"
														)
													}
													gridCols="grid-cols-2"
													disabled={isFieldDisabled(
														"newMarketsCredits",
														"special-considerations"
													)}
													isAutofilled={isFieldAutofilled(
														"newMarketsCredits"
													)}
													hasAutofillBeenRun={
														hasAutofillBeenRun
													}
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
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
													getFieldStylingClasses(
														"groundbreakingDate"
													),
													isFieldDisabled(
														"groundbreakingDate",
														"timeline"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"completionDate"
													),
													isFieldDisabled(
														"completionDate",
														"timeline"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"firstOccupancy"
													),
													isFieldDisabled(
														"firstOccupancy",
														"timeline"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"stabilization"
													),
													isFieldDisabled(
														"stabilization",
														"timeline"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"entitlements"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
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
												isAutofilled={isFieldAutofilled(
													"permitsIssued"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Timeline Fields */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Timeline Milestones
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="landAcqClose"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"landAcqClose",
													"timeline",
													"Land Acquisition Close",
													false
												)}
												<Input
													id="landAcqClose"
													type="date"
													label={null}
													value={
														(formData as any)
															.landAcqClose || ""
													}
													onChange={(e) =>
														handleInputChange(
															"landAcqClose",
															e.target.value
														)
													}
													disabled={isFieldDisabled(
														"landAcqClose",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"landAcqClose"
														),
														isFieldDisabled(
															"landAcqClose",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="landAcqClose"
													data-field-type="date"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="finalPlans"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"finalPlans",
													"timeline",
													"Final Plans Status",
													false
												)}
												<Select
													id="finalPlans"
													value={
														(formData as any)
															.finalPlans || ""
													}
													onChange={(e) =>
														handleInputChange(
															"finalPlans",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Approved",
															label: "Approved",
														},
														{
															value: "Pending",
															label: "Pending",
														},
														{
															value: "In Review",
															label: "In Review",
														},
													]}
													disabled={isFieldDisabled(
														"finalPlans",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"finalPlans"
														),
														isFieldDisabled(
															"finalPlans",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="finalPlans"
													data-field-type="select"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="verticalStart"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"verticalStart",
													"timeline",
													"Vertical Start Date",
													false
												)}
												<Input
													id="verticalStart"
													type="date"
													label={null}
													value={
														(formData as any)
															.verticalStart || ""
													}
													onChange={(e) =>
														handleInputChange(
															"verticalStart",
															e.target.value
														)
													}
													disabled={isFieldDisabled(
														"verticalStart",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"verticalStart"
														),
														isFieldDisabled(
															"verticalStart",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="verticalStart"
													data-field-type="date"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="substantialComp"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"substantialComp",
													"timeline",
													"Substantial Completion Date",
													false
												)}
												<Input
													id="substantialComp"
													type="date"
													label={null}
													value={
														(formData as any)
															.substantialComp ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"substantialComp",
															e.target.value
														)
													}
													disabled={isFieldDisabled(
														"substantialComp",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"substantialComp"
														),
														isFieldDisabled(
															"substantialComp",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="substantialComp"
													data-field-type="date"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="preLeasedSF"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"preLeasedSF",
													"timeline",
													"Pre-Leased SF",
													false
												)}
												<Input
													id="preLeasedSF"
													type="number"
													label={null}
													value={
														(
															formData as any
														).preLeasedSF?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"preLeasedSF",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 19669"
													disabled={isFieldDisabled(
														"preLeasedSF",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"preLeasedSF"
														),
														isFieldDisabled(
															"preLeasedSF",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="preLeasedSF"
													data-field-type="number"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="absorptionProjection"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"absorptionProjection",
													"timeline",
													"Absorption Projection (Months)",
													false
												)}
												<Input
													id="absorptionProjection"
													type="number"
													label={null}
													value={
														(
															formData as any
														).absorptionProjection?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"absorptionProjection",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 12"
													disabled={isFieldDisabled(
														"absorptionProjection",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"absorptionProjection"
														),
														isFieldDisabled(
															"absorptionProjection",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="absorptionProjection"
													data-field-type="number"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="opDeficitEscrow"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"opDeficitEscrow",
													"timeline",
													"Operating Deficit Escrow ($)",
													false
												)}
												<Input
													id="opDeficitEscrow"
													type="number"
													label={null}
													value={
														(
															formData as any
														).opDeficitEscrow?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"opDeficitEscrow",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 650000"
													disabled={isFieldDisabled(
														"opDeficitEscrow",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"opDeficitEscrow"
														),
														isFieldDisabled(
															"opDeficitEscrow",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="opDeficitEscrow"
													data-field-type="number"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="leaseUpEscrow"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"leaseUpEscrow",
													"timeline",
													"Lease-Up Escrow ($)",
													false
												)}
												<Input
													id="leaseUpEscrow"
													type="number"
													label={null}
													value={
														(
															formData as any
														).leaseUpEscrow?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"leaseUpEscrow",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1300000"
													disabled={isFieldDisabled(
														"leaseUpEscrow",
														"timeline"
													)}
													className={cn(
														getFieldStylingClasses(
															"leaseUpEscrow"
														),
														isFieldDisabled(
															"leaseUpEscrow",
															"timeline"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="leaseUpEscrow"
													data-field-type="number"
													data-field-section="timeline"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
							</div>
							{/* Draw Schedule Table */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-md font-medium text-gray-800 flex items-center gap-2">
										<Info className="h-4 w-4 text-blue-600" />
										Draw Schedule
										{isFieldAutofilled("drawSchedule") && (
											<div title="Autofilled field">
												<Lock className="h-4 w-4 text-emerald-600" />
											</div>
										)}
									</h3>
									<div className="flex items-center gap-2">
										{renderFieldLockButton(
											"drawSchedule",
											"timeline"
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												handleTableRowAdd(
													"drawSchedule",
													{
														drawNumber: 0,
														percentComplete: 0,
														amount: 0,
													}
												)
											}
											disabled={isFieldDisabled(
												"drawSchedule",
												"timeline"
											)}
											className="flex items-center gap-1"
										>
											<Plus className="h-4 w-4" />
											Add Row
										</Button>
									</div>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full border-collapse border border-gray-300">
										<thead>
											<tr className="bg-gray-50">
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Draw Number
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													% Complete
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Amount ($)
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(
												(formData as any).drawSchedule
											) &&
											(formData as any).drawSchedule
												.length > 0 ? (
												(
													formData as any
												).drawSchedule.map(
													(
														draw: any,
														index: number
													) => (
														<tr
															key={index}
															className={getTableRowStylingClasses(
																"drawSchedule"
															)}
														>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		draw.drawNumber?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"drawSchedule",
																			index,
																			"drawNumber",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"drawSchedule",
																		"timeline"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"drawSchedule"
																		),
																		isFieldDisabled(
																			"drawSchedule",
																			"timeline"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		draw.percentComplete?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"drawSchedule",
																			index,
																			"percentComplete",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"drawSchedule",
																		"timeline"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"drawSchedule"
																		),
																		isFieldDisabled(
																			"drawSchedule",
																			"timeline"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Input
																	type="number"
																	value={
																		draw.amount?.toString() ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		handleTableRowUpdate(
																			"drawSchedule",
																			index,
																			"amount",
																			e
																				.target
																				.value
																				? Number(
																						e
																							.target
																							.value
																				  )
																				: 0
																		)
																	}
																	disabled={isFieldDisabled(
																		"drawSchedule",
																		"timeline"
																	)}
																	className={cn(
																		"w-full",
																		getFieldStylingClasses(
																			"drawSchedule"
																		),
																		isFieldDisabled(
																			"drawSchedule",
																			"timeline"
																		) &&
																			"bg-emerald-50 border-emerald-200 cursor-not-allowed"
																	)}
																/>
															</td>
															<td className="border border-gray-300 px-3 py-2">
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleTableRowDelete(
																			"drawSchedule",
																			index
																		)
																	}
																	disabled={isFieldDisabled(
																		"drawSchedule",
																		"timeline"
																	)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50"
																>
																	<X className="h-4 w-4" />
																</Button>
															</td>
														</tr>
													)
												)
											) : (
												<tr>
													<td
														colSpan={4}
														className="border border-gray-300 px-3 py-2 text-center text-gray-500"
													>
														No draw schedule data
														available. Click
														&quot;Add Row&quot; to
														add a new entry.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
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
													getFieldStylingClasses(
														"totalSiteAcreage"
													),
													isFieldDisabled(
														"totalSiteAcreage",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
												isAutofilled={isFieldAutofilled(
													"currentSiteStatus"
												)}
												hasAutofillBeenRun={
													hasAutofillBeenRun
												}
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="parcelNumber"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"parcelNumber",
												"site-context",
												"Parcel Number(s)",
												false
											)}
											<Input
												id="parcelNumber"
												label={null}
												value={
													formData.parcelNumber || ""
												}
												onChange={(e) =>
													handleInputChange(
														"parcelNumber",
														e.target.value
													)
												}
												placeholder="e.g., 000472000A01B0100"
												disabled={isFieldDisabled(
													"parcelNumber",
													"site-context"
												)}
												className={cn(
													getFieldStylingClasses(
														"parcelNumber"
													),
													isFieldDisabled(
														"parcelNumber",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="parcelNumber"
												data-field-type="input"
												data-field-section="site-context"
												data-field-required="false"
												data-field-label="Parcel Number(s)"
												data-field-placeholder="e.g., 000472000A01B0100"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="zoningDesignation"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"zoningDesignation",
												"site-context",
												"Zoning Designation",
												false
											)}
											<Input
												id="zoningDesignation"
												label={null}
												value={
													formData.zoningDesignation ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"zoningDesignation",
														e.target.value
													)
												}
												placeholder="e.g., PD-317"
												disabled={isFieldDisabled(
													"zoningDesignation",
													"site-context"
												)}
												className={cn(
													getFieldStylingClasses(
														"zoningDesignation"
													),
													isFieldDisabled(
														"zoningDesignation",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="zoningDesignation"
												data-field-type="input"
												data-field-section="site-context"
												data-field-required="false"
												data-field-label="Zoning Designation"
												data-field-placeholder="e.g., PD-317"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="expectedZoningChanges"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"expectedZoningChanges",
												"site-context",
												"Expected Zoning Changes",
												false
											)}
											<Select
												id="expectedZoningChanges"
												value={
													formData.expectedZoningChanges ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"expectedZoningChanges",
														e.target.value
													)
												}
												options={[
													{
														value: "",
														label: "Select...",
													},
													{
														value: "None",
														label: "None",
													},
													{
														value: "Variance",
														label: "Variance",
													},
													{
														value: "PUD",
														label: "PUD",
													},
													{
														value: "Re-Zoning",
														label: "Re-Zoning",
													},
												]}
												disabled={isFieldDisabled(
													"expectedZoningChanges",
													"site-context"
												)}
												className={cn(
													getFieldStylingClasses(
														"expectedZoningChanges"
													),
													isFieldDisabled(
														"expectedZoningChanges",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="expectedZoningChanges"
												data-field-type="select"
												data-field-section="site-context"
												data-field-required="false"
												data-field-label="Expected Zoning Changes"
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
													getFieldStylingClasses(
														"siteAccess"
													),
													isFieldDisabled(
														"siteAccess",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"proximityShopping"
													),
													isFieldDisabled(
														"proximityShopping",
														"site-context"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="proximityShopping"
												data-field-type="input"
												data-field-section="site-context"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Site & Context Fields */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Site Information
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="buildableAcreage"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"buildableAcreage",
													"site-context",
													"Buildable Acreage",
													false
												)}
												<Input
													id="buildableAcreage"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).buildableAcreage?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"buildableAcreage",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2.3"
													disabled={isFieldDisabled(
														"buildableAcreage",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"buildableAcreage"
														),
														isFieldDisabled(
															"buildableAcreage",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="buildableAcreage"
													data-field-type="number"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="allowableFAR"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"allowableFAR",
													"site-context",
													"Allowable FAR",
													false
												)}
												<Input
													id="allowableFAR"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).allowableFAR?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"allowableFAR",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 3.5"
													disabled={isFieldDisabled(
														"allowableFAR",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"allowableFAR"
														),
														isFieldDisabled(
															"allowableFAR",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="allowableFAR"
													data-field-type="number"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="farUtilizedPercent"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"farUtilizedPercent",
													"site-context",
													"FAR Utilized (%)",
													false
												)}
												<Input
													id="farUtilizedPercent"
													type="number"
													step="0.1"
													label={null}
													value={
														(
															formData as any
														).farUtilizedPercent?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"farUtilizedPercent",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 85.0"
													disabled={isFieldDisabled(
														"farUtilizedPercent",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"farUtilizedPercent"
														),
														isFieldDisabled(
															"farUtilizedPercent",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="farUtilizedPercent"
													data-field-type="number"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="densityBonus"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"densityBonus",
													"site-context",
													"Density Bonus?",
													false
												)}
												<Select
													id="densityBonus"
													value={
														(formData as any)
															.densityBonus ===
														true
															? "Yes"
															: (formData as any)
																	.densityBonus ===
															  false
															? "No"
															: ""
													}
													onChange={(e) =>
														handleInputChange(
															"densityBonus",
															e.target.value ===
																"Yes"
																? true
																: e.target
																		.value ===
																  "No"
																? false
																: null
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Yes",
															label: "Yes",
														},
														{
															value: "No",
															label: "No",
														},
													]}
													disabled={isFieldDisabled(
														"densityBonus",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"densityBonus"
														),
														isFieldDisabled(
															"densityBonus",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="densityBonus"
													data-field-type="select"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="soilConditions"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"soilConditions",
													"site-context",
													"Soil Conditions",
													false
												)}
												<Input
													id="soilConditions"
													label={null}
													value={
														(formData as any)
															.soilConditions ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"soilConditions",
															e.target.value
														)
													}
													placeholder="e.g., Expansive Clay, req Piles"
													disabled={isFieldDisabled(
														"soilConditions",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"soilConditions"
														),
														isFieldDisabled(
															"soilConditions",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="soilConditions"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="wetlandsPresent"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"wetlandsPresent",
													"site-context",
													"Wetlands Present?",
													false
												)}
												<Select
													id="wetlandsPresent"
													value={
														(formData as any)
															.wetlandsPresent ===
														true
															? "Yes"
															: (formData as any)
																	.wetlandsPresent ===
															  false
															? "No"
															: ""
													}
													onChange={(e) =>
														handleInputChange(
															"wetlandsPresent",
															e.target.value ===
																"Yes"
																? true
																: e.target
																		.value ===
																  "No"
																? false
																: null
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Yes",
															label: "Yes",
														},
														{
															value: "No",
															label: "No",
														},
													]}
													disabled={isFieldDisabled(
														"wetlandsPresent",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"wetlandsPresent"
														),
														isFieldDisabled(
															"wetlandsPresent",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="wetlandsPresent"
													data-field-type="select"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="seismicRisk"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"seismicRisk",
													"site-context",
													"Seismic Risk",
													false
												)}
												<Select
													id="seismicRisk"
													value={
														(formData as any)
															.seismicRisk || ""
													}
													onChange={(e) =>
														handleInputChange(
															"seismicRisk",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Low",
															label: "Low",
														},
														{
															value: "Moderate",
															label: "Moderate",
														},
														{
															value: "High",
															label: "High",
														},
													]}
													disabled={isFieldDisabled(
														"seismicRisk",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"seismicRisk"
														),
														isFieldDisabled(
															"seismicRisk",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="seismicRisk"
													data-field-type="select"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="phaseIESAFinding"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"phaseIESAFinding",
													"site-context",
													"Phase I ESA Finding",
													false
												)}
												<Select
													id="phaseIESAFinding"
													value={
														(formData as any)
															.phaseIESAFinding ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"phaseIESAFinding",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Clean",
															label: "Clean",
														},
														{
															value: "Recognized Environmental Condition",
															label: "Recognized Environmental Condition",
														},
														{
															value: "Historical Recognized Environmental Condition",
															label: "Historical Recognized Environmental Condition",
														},
													]}
													disabled={isFieldDisabled(
														"phaseIESAFinding",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"phaseIESAFinding"
														),
														isFieldDisabled(
															"phaseIESAFinding",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="phaseIESAFinding"
													data-field-type="select"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="utilityAvailability"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"utilityAvailability",
													"site-context",
													"Utility Availability",
													false
												)}
												<Input
													id="utilityAvailability"
													label={null}
													value={
														(formData as any)
															.utilityAvailability ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"utilityAvailability",
															e.target.value
														)
													}
													placeholder="e.g., All Available"
													disabled={isFieldDisabled(
														"utilityAvailability",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"utilityAvailability"
														),
														isFieldDisabled(
															"utilityAvailability",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="utilityAvailability"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="easements"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"easements",
													"site-context",
													"Easements",
													false
												)}
												<Input
													id="easements"
													label={null}
													value={
														(formData as any)
															.easements || ""
													}
													onChange={(e) =>
														handleInputChange(
															"easements",
															e.target.value
														)
													}
													placeholder="e.g., Utility easement on north side"
													disabled={isFieldDisabled(
														"easements",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"easements"
														),
														isFieldDisabled(
															"easements",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="easements"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="accessPoints"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"accessPoints",
													"site-context",
													"Access Points",
													false
												)}
												<Input
													id="accessPoints"
													label={null}
													value={
														(formData as any)
															.accessPoints || ""
													}
													onChange={(e) =>
														handleInputChange(
															"accessPoints",
															e.target.value
														)
													}
													placeholder="e.g., 1 Curb Cut on Main St"
													disabled={isFieldDisabled(
														"accessPoints",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"accessPoints"
														),
														isFieldDisabled(
															"accessPoints",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="accessPoints"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="adjacentLandUse"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"adjacentLandUse",
													"site-context",
													"Adjacent Land Use",
													false
												)}
												<Input
													id="adjacentLandUse"
													label={null}
													value={
														(formData as any)
															.adjacentLandUse ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"adjacentLandUse",
															e.target.value
														)
													}
													placeholder="e.g., Mixed-Use"
													disabled={isFieldDisabled(
														"adjacentLandUse",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"adjacentLandUse"
														),
														isFieldDisabled(
															"adjacentLandUse",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="adjacentLandUse"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="noiseFactors"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"noiseFactors",
													"site-context",
													"Noise Factors",
													false
												)}
												<Input
													id="noiseFactors"
													label={null}
													value={
														Array.isArray(
															(formData as any)
																.noiseFactors
														)
															? (
																	formData as any
															  ).noiseFactors.join(
																	", "
															  )
															: (formData as any)
																	.noiseFactors ||
															  ""
													}
													onChange={(e) =>
														handleInputChange(
															"noiseFactors",
															e.target.value
																? e.target.value
																		.split(
																			", "
																		)
																		.filter(
																			Boolean
																		)
																: null
														)
													}
													placeholder="e.g., Highway"
													disabled={isFieldDisabled(
														"noiseFactors",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"noiseFactors"
														),
														isFieldDisabled(
															"noiseFactors",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="noiseFactors"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="viewCorridors"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"viewCorridors",
													"site-context",
													"View Corridors",
													false
												)}
												<Input
													id="viewCorridors"
													label={null}
													value={
														Array.isArray(
															(formData as any)
																.viewCorridors
														)
															? (
																	formData as any
															  ).viewCorridors.join(
																	", "
															  )
															: (formData as any)
																	.viewCorridors ||
															  ""
													}
													onChange={(e) =>
														handleInputChange(
															"viewCorridors",
															e.target.value
																? e.target.value
																		.split(
																			", "
																		)
																		.filter(
																			Boolean
																		)
																: null
														)
													}
													placeholder="e.g., Skyline"
													disabled={isFieldDisabled(
														"viewCorridors",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"viewCorridors"
														),
														isFieldDisabled(
															"viewCorridors",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="viewCorridors"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="topography"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"topography",
													"site-context",
													"Topography",
													false
												)}
												<Select
													id="topography"
													value={
														(formData as any)
															.topography || ""
													}
													onChange={(e) =>
														handleInputChange(
															"topography",
															e.target.value
														)
													}
													options={[
														{
															value: "",
															label: "Select...",
														},
														{
															value: "Flat",
															label: "Flat",
														},
														{
															value: "Rolling",
															label: "Rolling",
														},
														{
															value: "Hilly",
															label: "Hilly",
														},
														{
															value: "Steep",
															label: "Steep",
														},
													]}
													disabled={isFieldDisabled(
														"topography",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"topography"
														),
														isFieldDisabled(
															"topography",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="topography"
													data-field-type="select"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="floodZone"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"floodZone",
													"site-context",
													"Flood Zone",
													false
												)}
												<Input
													id="floodZone"
													label={null}
													value={
														(formData as any)
															.floodZone || ""
													}
													onChange={(e) =>
														handleInputChange(
															"floodZone",
															e.target.value
														)
													}
													placeholder="e.g., Zone X"
													disabled={isFieldDisabled(
														"floodZone",
														"site-context"
													)}
													className={cn(
														getFieldStylingClasses(
															"floodZone"
														),
														isFieldDisabled(
															"floodZone",
															"site-context"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="floodZone"
													data-field-type="input"
													data-field-section="site-context"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
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
													getFieldStylingClasses(
														"sponsorEntityName"
													),
													isFieldDisabled(
														"sponsorEntityName",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"sponsorStructure"
													),
													isFieldDisabled(
														"sponsorStructure",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													getFieldStylingClasses(
														"equityPartner"
													),
													isFieldDisabled(
														"equityPartner",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
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
													"w-full h-20 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors",
													getFieldStylingClasses(
														"contactInfo"
													),
													isFieldDisabled(
														"contactInfo",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="contactInfo"
												data-field-type="textarea"
												data-field-section="sponsor-info"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="syndicationStatus"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"syndicationStatus",
												"sponsor-info",
												"Syndication Status",
												false
											)}
											<Select
												id="syndicationStatus"
												value={
													(formData as any)
														.syndicationStatus || ""
												}
												onChange={(e) =>
													handleInputChange(
														"syndicationStatus",
														e.target.value
													)
												}
												options={[
													{
														value: "",
														label: "Select...",
													},
													{
														value: "Committed",
														label: "Committed",
													},
													{
														value: "In Process",
														label: "In Process",
													},
													{
														value: "TBD",
														label: "TBD",
													},
												]}
												disabled={isFieldDisabled(
													"syndicationStatus",
													"sponsor-info"
												)}
												className={cn(
													getFieldStylingClasses(
														"syndicationStatus"
													),
													isFieldDisabled(
														"syndicationStatus",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="syndicationStatus"
												data-field-type="select"
												data-field-section="sponsor-info"
												data-field-required="false"
												data-field-label="Syndication Status"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
								<FormGroup>
									<AskAIButton
										id="sponsorExperience"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"sponsorExperience",
												"sponsor-info",
												"Sponsor Experience",
												false
											)}
											<Select
												id="sponsorExperience"
												value={
													(formData as any)
														.sponsorExperience || ""
												}
												onChange={(e) =>
													handleInputChange(
														"sponsorExperience",
														e.target.value
													)
												}
												options={[
													{
														value: "",
														label: "Select...",
													},
													{
														value: "First-Time",
														label: "First-Time",
													},
													{
														value: "Emerging (1-3)",
														label: "Emerging (1-3)",
													},
													{
														value: "Seasoned (3+)",
														label: "Seasoned (3+)",
													},
												]}
												disabled={isFieldDisabled(
													"sponsorExperience",
													"sponsor-info"
												)}
												className={cn(
													getFieldStylingClasses(
														"sponsorExperience"
													),
													isFieldDisabled(
														"sponsorExperience",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="sponsorExperience"
												data-field-type="select"
												data-field-section="sponsor-info"
												data-field-required="false"
												data-field-label="Sponsor Experience"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormGroup>
									<AskAIButton
										id="borrowerNetWorth"
										onAskAI={onAskAI || (() => {})}
									>
										<div className="relative group/field">
											{renderFieldLabel(
												"borrowerNetWorth",
												"sponsor-info",
												"Borrower Net Worth ($)",
												false
											)}
											<Input
												id="borrowerNetWorth"
												type="number"
												label={null}
												value={
													(
														formData as any
													).borrowerNetWorth?.toString() ||
													""
												}
												onChange={(e) =>
													handleInputChange(
														"borrowerNetWorth",
														e.target.value
															? Number(
																	e.target
																		.value
															  )
															: null
													)
												}
												placeholder="e.g., 45000000"
												disabled={isFieldDisabled(
													"borrowerNetWorth",
													"sponsor-info"
												)}
												className={cn(
													getFieldStylingClasses(
														"borrowerNetWorth"
													),
													isFieldDisabled(
														"borrowerNetWorth",
														"sponsor-info"
													) &&
														"bg-emerald-50 border-emerald-200 cursor-not-allowed"
												)}
												data-field-id="borrowerNetWorth"
												data-field-type="number"
												data-field-section="sponsor-info"
												data-field-required="false"
												data-field-label="Borrower Net Worth ($)"
												data-field-placeholder="e.g., 45000000"
											/>
										</div>
									</AskAIButton>
								</FormGroup>
							</div>
							{/* Additional Sponsor Information */}
							<div className="pt-4">
								<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
									<Info className="h-4 w-4 mr-2 text-blue-600" />
									Additional Sponsor Information
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormGroup>
										<AskAIButton
											id="sponsorExpScore"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"sponsorExpScore",
													"sponsor-info",
													"Sponsor Experience Score",
													false
												)}
												<Input
													id="sponsorExpScore"
													type="number"
													label={null}
													value={
														(
															formData as any
														).sponsorExpScore?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"sponsorExpScore",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 8"
													min="0"
													max="10"
													disabled={isFieldDisabled(
														"sponsorExpScore",
														"sponsor-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"sponsorExpScore"
														),
														isFieldDisabled(
															"sponsorExpScore",
															"sponsor-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="sponsorExpScore"
													data-field-type="number"
													data-field-section="sponsor-info"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="priorDevelopments"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"priorDevelopments",
													"sponsor-info",
													"Prior Developments (Count)",
													false
												)}
												<Input
													id="priorDevelopments"
													type="number"
													label={null}
													value={
														(
															formData as any
														).priorDevelopments?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"priorDevelopments",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 15"
													disabled={isFieldDisabled(
														"priorDevelopments",
														"sponsor-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"priorDevelopments"
														),
														isFieldDisabled(
															"priorDevelopments",
															"sponsor-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="priorDevelopments"
													data-field-type="number"
													data-field-section="sponsor-info"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="netWorth"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"netWorth",
													"sponsor-info",
													"Sponsor Net Worth ($)",
													false
												)}
												<Input
													id="netWorth"
													type="number"
													label={null}
													value={
														(
															formData as any
														).netWorth?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"netWorth",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 45000000"
													disabled={isFieldDisabled(
														"netWorth",
														"sponsor-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"netWorth"
														),
														isFieldDisabled(
															"netWorth",
															"sponsor-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="netWorth"
													data-field-type="number"
													data-field-section="sponsor-info"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
									<FormGroup>
										<AskAIButton
											id="guarantorLiquidity"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"guarantorLiquidity",
													"sponsor-info",
													"Guarantor Liquidity ($)",
													false
												)}
												<Input
													id="guarantorLiquidity"
													type="number"
													label={null}
													value={
														(
															formData as any
														).guarantorLiquidity?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"guarantorLiquidity",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 2500000"
													disabled={isFieldDisabled(
														"guarantorLiquidity",
														"sponsor-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"guarantorLiquidity"
														),
														isFieldDisabled(
															"guarantorLiquidity",
															"sponsor-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="guarantorLiquidity"
													data-field-type="number"
													data-field-section="sponsor-info"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
									<FormGroup>
										<AskAIButton
											id="portfolioDSCR"
											onAskAI={onAskAI || (() => {})}
										>
											<div className="relative group/field">
												{renderFieldLabel(
													"portfolioDSCR",
													"sponsor-info",
													"Portfolio DSCR",
													false
												)}
												<Input
													id="portfolioDSCR"
													type="number"
													step="0.01"
													label={null}
													value={
														(
															formData as any
														).portfolioDSCR?.toString() ||
														""
													}
													onChange={(e) =>
														handleInputChange(
															"portfolioDSCR",
															e.target.value
																? Number(
																		e.target
																			.value
																  )
																: null
														)
													}
													placeholder="e.g., 1.35"
													disabled={isFieldDisabled(
														"portfolioDSCR",
														"sponsor-info"
													)}
													className={cn(
														getFieldStylingClasses(
															"portfolioDSCR"
														),
														isFieldDisabled(
															"portfolioDSCR",
															"sponsor-info"
														) &&
															"bg-emerald-50 border-emerald-200 cursor-not-allowed"
													)}
													data-field-id="portfolioDSCR"
													data-field-type="number"
													data-field-section="sponsor-info"
												/>
											</div>
										</AskAIButton>
									</FormGroup>
								</div>
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
			getTableRowStylingClasses,
			renderFieldLockButton,
			getFieldStylingClasses,
			isFieldAutofilled,
			handleTableRowAdd,
			handleTableRowDelete,
			handleTableRowUpdate,
			hasAutofillBeenRun,
			isFieldLocked,
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
						onClick={wrappedHandleAutofill}
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
				{/* Autofill Completion Notification */}
				<AnimatePresence>
					{showAutofillNotification && (
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-3 flex-1">
									<Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
									<div className="flex-1">
										<h3 className="text-sm font-semibold text-blue-900 mb-1">
											Autofill Complete! 🔒 Lock Fields to
											Prevent Overwrites
										</h3>
										<p className="text-sm text-blue-700 mb-2">
											Some fields like project names,
											descriptions, and custom values may
											be overwritten by AI in future
											autofills. Lock these fields using
											the lock icon (🔒) next to each
											field to protect your manual edits.
										</p>
										<p className="text-xs text-blue-600">
											💡 Tip: Fields with dropdown options
											are automatically validated, but
											free-text fields should be locked if
											you want to preserve your exact
											wording.
										</p>
									</div>
								</div>
								<button
									onClick={() =>
										setShowAutofillNotification(false)
									}
									className="ml-4 text-blue-600 hover:text-blue-800 flex-shrink-0"
									aria-label="Dismiss notification"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
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
