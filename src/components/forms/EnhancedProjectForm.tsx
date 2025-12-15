"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import Image from "next/image";
import { FormWizard, Step } from "../ui/FormWizard";
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";
import { FieldWarningsTooltip } from "../ui/FieldWarningsTooltip";
import { HelpCircle } from "lucide-react";
import { useAutofill } from "@/hooks/useAutofill";
import { cn } from "@/utils/cn";
import {
	FileText,
	DollarSign,
	Building,
	Globe,
	Calendar,
	Map as MapIcon,
	Users,
	Calculator,
	AlertTriangle,
	Info,
	Lock,
	Unlock,
	Sparkles,
	Loader2,
	BarChart,
	ChevronDown,
	ChevronRight,
	Upload,
	X,
	FileText as FileTextIcon,
} from "lucide-react";
import {
	ProjectProfile,
	ProjectPhase,
	InterestRateType,
	RecoursePreference,
	ExitStrategy,
} from "@/types/enhanced-types";
import { useAuthStore } from "@/stores/useAuthStore";
import { PROJECT_REQUIRED_FIELDS } from "@/utils/resumeCompletion";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import {
	projectResumeFieldMetadata,
	FieldMetadata as ProjectFieldMeta,
} from "@/lib/project-resume-field-metadata";
import { saveProjectResume } from "@/lib/project-queries";
import { supabase } from "@/lib/supabaseClient";

interface EnhancedProjectFormProps {
	existingProject: ProjectProfile;
	onComplete?: (project: ProjectProfile) => void;
	compact?: boolean;
	onAskAI?: (fieldId: string) => void;
	onFormDataChange?: (formData: ProjectProfile) => void;
	initialFocusFieldId?: string;
	onVersionChange?: () => void;
	initialStepId?: string | null;
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

const buildWorkspaceStepId = (stepId: string) => `project:${stepId}`;

// State mapping: abbreviation -> full name
const STATE_MAP: Record<string, string> = {
	AL: "Alabama",
	AK: "Alaska",
	AZ: "Arizona",
	AR: "Arkansas",
	CA: "California",
	CO: "Colorado",
	CT: "Connecticut",
	DE: "Delaware",
	FL: "Florida",
	GA: "Georgia",
	HI: "Hawaii",
	ID: "Idaho",
	IL: "Illinois",
	IN: "Indiana",
	IA: "Iowa",
	KS: "Kansas",
	KY: "Kentucky",
	LA: "Louisiana",
	ME: "Maine",
	MD: "Maryland",
	MA: "Massachusetts",
	MI: "Michigan",
	MN: "Minnesota",
	MS: "Mississippi",
	MO: "Missouri",
	MT: "Montana",
	NE: "Nebraska",
	NV: "Nevada",
	NH: "New Hampshire",
	NJ: "New Jersey",
	NM: "New Mexico",
	NY: "New York",
	NC: "North Carolina",
	ND: "North Dakota",
	OH: "Ohio",
	OK: "Oklahoma",
	OR: "Oregon",
	PA: "Pennsylvania",
	RI: "Rhode Island",
	SC: "South Carolina",
	SD: "South Dakota",
	TN: "Tennessee",
	TX: "Texas",
	UT: "Utah",
	VT: "Vermont",
	VA: "Virginia",
	WA: "Washington",
	WV: "West Virginia",
	WI: "Wisconsin",
	WY: "Wyoming",
};

// Reverse mapping: full name -> abbreviation
const STATE_REVERSE_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(STATE_MAP).map(([abbr, full]) => [full, abbr])
);

const stateOptionsFullNames = Object.values(STATE_MAP).sort();

const INCENTIVE_LABELS: { key: keyof ProjectProfile; label: string }[] = [
	{ key: "opportunityZone", label: "Opportunity Zone" },
	{ key: "taxExemption", label: "Tax Exemption" },
	{ key: "tifDistrict", label: "TIF District" },
	{ key: "taxAbatement", label: "Tax Abatement" },
	{ key: "paceFinancing", label: "PACE Financing" },
	{ key: "historicTaxCredits", label: "Historic Tax Credits" },
	{ key: "newMarketsCredits", label: "New Markets Credits" },
];

// Dropdown field options
const dealStatusOptions = [
	"Inquiry",
	"Underwriting",
	"Pre-Submission",
	"Submitted",
	"Closed",
];
const expectedZoningChangesOptions = ["None", "Variance", "PUD", "Re-Zoning"];
const syndicationStatusOptions = ["Committed", "In Process", "TBD"];
const sponsorExperienceOptions = [
	"First-Time",
	"Emerging (1-3)",
	"Seasoned (3+)",
];
const loanTypeOptions = [
	"Construction",
	"Permanent",
	"Bridge",
	"Mezzanine",
	"Preferred Equity",
	"Other",
];
const constructionTypeOptions = ["Ground-Up", "Renovation", "Adaptive Reuse"];
const buildingTypeOptions = ["High-rise", "Mid-rise", "Garden", "Podium"];
const hvacSystemOptions = ["Central", "Split System", "PTAC", "VRF"];
const leedGreenRatingOptions = [
	"Certified",
	"Silver",
	"Gold",
	"Platinum",
	"NGBS",
];
const crimeRiskLevelOptions = ["Low", "Moderate", "High"];
const exemptionStructureOptions = ["PFC", "MMD", "PILOT"];
const relocationPlanOptions = ["Complete", "In Process", "N/A"];
const entitlementsOptions = ["Approved", "Pending"];
const finalPlansOptions = ["Approved", "Pending"];
const permitsIssuedOptions = ["Issued", "Pending"];
const currentSiteStatusOptions = ["Vacant", "Existing"];
const topographyOptions = ["Flat", "Sloped"];
const environmentalOptions = ["Clean", "Remediation"];
const utilitiesOptions = ["Available", "None"];
const seismicRiskOptions = ["Low", "Moderate", "High"];
const phaseIESAFindingOptions = ["Clean", "REC", "HREC"];
const riskLevelOptions = ["Low", "Medium", "High"];
const marketStatusOptions = ["Tight", "Balanced", "Soft"];
const demandTrendOptions = ["↑ Growing", "→ Stable", "↓ Declining"];
const supplyPressureOptions = ["Low", "Moderate", "High"];
const luxuryTierOptions = ["Luxury", "Premium", "Value", "Economy"];
const competitivePositionOptions = ["Top 20%", "Middle 60%", "Bottom 20%"];
const zoningCompliantOptions = ["Compliant", "Non-Compliant"];

const isProjectValueProvided = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
};

// Sanitize incoming ProjectProfile / metadata so obviously wrong legacy values
// (e.g. boolean `true` where dataType is Integer/Percent/Text) are nulled out
// before they ever hit the form state or get written back to the DB again.
const sanitizeProjectProfile = (profile: ProjectProfile): ProjectProfile => {
	const next: any = { ...profile };

	// Fix flat field values
	for (const [fieldId, meta] of Object.entries(projectResumeFieldMetadata)) {
		const dataType = (meta as ProjectFieldMeta).dataType;
		if (!dataType || dataType === "Boolean") continue;

		const current = (next as any)[fieldId];
		if (typeof current === "boolean") {
			(next as any)[fieldId] = null;
		}
	}

	// Normalize and enrich rich metadata container on the profile itself
	const fixedMeta: Record<string, any> =
		next._metadata && typeof next._metadata === "object"
			? { ...next._metadata }
			: {};

	for (const [fieldId, meta] of Object.entries(fixedMeta)) {
		const fieldConfig = projectResumeFieldMetadata[fieldId];
		const dataType = fieldConfig?.dataType;
		if (!dataType || dataType === "Boolean") continue;

		if (meta && typeof meta === "object") {
			if (typeof (meta as any).value === "boolean") {
				(meta as any).value = null;
			}
			// Remove original_value (deprecated)
			if ("original_value" in (meta as any)) {
				delete (meta as any).original_value;
			}
			// Convert sources array to single source (backward compatibility)
			if (
				(meta as any).sources &&
				Array.isArray((meta as any).sources) &&
				(meta as any).sources.length > 0 &&
				!(meta as any).source
			) {
				(meta as any).source = (meta as any).sources[0];
				delete (meta as any).sources;
			}
		}
	}

	// Ensure every configured field has default user_input metadata when backend
	// didn't provide any. This mirrors the old mock API behavior where fields
	// that weren't autofilled were treated as user_input and shown as blue.
	// CRITICAL: Only create metadata for fields that have values OR already have metadata.
	// Empty fields without existing metadata should remain without metadata (white) until user inputs something.
	for (const fieldId of Object.keys(projectResumeFieldMetadata)) {
		const existingMeta = fixedMeta[fieldId];
		const currentValue = (next as any)[fieldId];

		// If field already has metadata from backend, ensure it has a source
		if (existingMeta) {
			if (!existingMeta.source) {
				// If we have metadata but no explicit source, treat it as user_input.
				existingMeta.source = { type: "user_input" };
			}
			continue; // Preserve existing metadata
		}

		// Only create NEW metadata for fields that have actual values
		// Empty fields (null, undefined, empty string) should NOT get metadata created
		// This prevents empty fields from turning blue before user interaction
		const hasValue = isProjectValueProvided(currentValue);
		if (hasValue) {
			fixedMeta[fieldId] = {
				value: currentValue,
				source: { type: "user_input" },
				warnings: [],
				other_values: [],
			};
		}
		// If field is empty and has no existing metadata, don't create metadata - it should remain white
	}

	next._metadata = fixedMeta;

	return next as ProjectProfile;
};

interface ProjectMediaUploadProps {
	projectId: string;
	orgId: string | null;
	disabled?: boolean;
	formData: ProjectProfile;
	setFormData: React.Dispatch<React.SetStateAction<ProjectProfile>>;
	isFieldLocked: (fieldId: string, sectionId?: string) => boolean;
	toggleFieldLock: (fieldId: string) => void;
}

const ProjectMediaUpload: React.FC<ProjectMediaUploadProps> = ({
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
					const uploadedPath = `${projectId}/${folder}/${file.name}`;
					const newImage = {
						fileName: file.name,
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
								filename: file.name,
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
				`Delete ${fileNames.length} ${
					fileNames.length === 1 ? "image" : "images"
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
					`Failed to delete files: ${
						(error as any).message || JSON.stringify(error)
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
				`Failed to delete files: ${
					error instanceof Error ? error.message : "Unknown error"
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
	);
};

const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
	existingProject,
	onComplete,
	compact,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId,
	onVersionChange,
	initialStepId,
}) => {
	const { activeOrg, user } = useAuthStore();
	// 1. Initialize state with sanitized data
	const sanitizedExistingProject = useMemo(
		() => sanitizeProjectProfile(existingProject),
		[existingProject]
	);
	const [formData, setFormData] = useState<ProjectProfile>(
		sanitizedExistingProject
	);
	const [fieldMetadata, setFieldMetadata] = useState<Record<string, any>>(
		sanitizedExistingProject._metadata || {}
	);

	// Initialize locked state from props
	const [lockedFields, setLockedFields] = useState<Set<string>>(() => {
		const saved = existingProject._lockedFields || {};
		return new Set(Object.keys(saved).filter((key) => saved[key] === true));
	});

	const [unlockedFields, setUnlockedFields] = useState<Set<string>>(
		new Set()
	);
	const [showAutofillNotification, setShowAutofillNotification] =
		useState(false);
	const [formSaved, setFormSaved] = useState(false);

	const touchWorkspace = useCallback(
		async (stepId?: string) => {
			if (!user?.id || !existingProject?.id) return;
			const nowIso = new Date().toISOString();
			const payload: Record<string, any> = {
				project_id: existingProject.id,
				user_id: user.id,
				last_visited_at: nowIso,
			};
			if (stepId) payload.last_step_id = buildWorkspaceStepId(stepId);
			await supabase
				.from("project_workspace_activity")
				.upsert(payload, { onConflict: "project_id,user_id" });
		},
		[user?.id, existingProject?.id]
	);
	const [isRestoring, setIsRestoring] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

	// Map to store refs for field wrappers (for tooltip triggers)
	const fieldWrapperRefs = useRef<
		Map<string, React.RefObject<HTMLDivElement>>
	>(new Map());

	// Track the last state that was successfully persisted to the DB
	// so we can detect "unsaved changes" (dirty state) on any kind of exit.
	const initialSnapshotRef = useRef<{
		formData: ProjectProfile;
		fieldMetadata: Record<string, any>;
		lockedFields: Set<string>;
	} | null>(null);
	const lastSavedSnapshotRef = useRef<{
		formData: ProjectProfile;
		fieldMetadata: Record<string, any>;
		lockedFields: Set<string>;
	} | null>(null);

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
	} = useAutofill(existingProject.id, { context: "project" });

	// Effect to handle updates from parent (e.g. after Autofill)
	useEffect(() => {
		// If we are restoring from local storage, don't overwrite with props
		if (isRestoring) return;

		const sanitized = sanitizeProjectProfile(existingProject);
		setFormData(sanitized);
		const metadata = sanitized._metadata || {};
		setFieldMetadata(metadata);

		// Update prevFormDataRef when props change
		prevFormDataRef.current = sanitized;

		// Initialize locks strictly from backend (_lockedFields); do NOT auto-lock
		// AI-sourced fields here. Warning-bearing fields should remain editable/red.
		const newLockedFields = new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		);

		setLockedFields(newLockedFields);

		// Clear unlockedFields when reloading from backend to ensure state consistency
		setUnlockedFields(new Set());

		// Establish / refresh the baseline snapshot from the DB-backed project.
		// We treat this as the "saved" state until an explicit or implicit save succeeds.
		const snapshotLocked = new Set(newLockedFields);
		const snapshot: {
			formData: ProjectProfile;
			fieldMetadata: Record<string, any>;
			lockedFields: Set<string>;
		} = {
			formData: sanitized,
			fieldMetadata: metadata,
			lockedFields: snapshotLocked,
		};
		initialSnapshotRef.current = snapshot;
		lastSavedSnapshotRef.current = snapshot;
	}, [existingProject, isRestoring]);

	// Local Storage Autosave Key
	const storageKey = useMemo(
		() => `capmatch_resume_draft_${existingProject.id}`,
		[existingProject.id]
	);

	// Restore from Local Storage on Mount (in-memory only; no automatic DB flush)
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const draft = JSON.parse(saved);
				// Basic check to ensure draft belongs to this project (though key already ensures it)
				if (draft.projectId === existingProject.id) {
					console.log(
						"[EnhancedProjectForm] Restoring draft from local storage"
					);
					setIsRestoring(true); // Prevent prop updates from overwriting restored state temporarily

					setFormData(draft.formData);
					setFieldMetadata(draft.fieldMetadata || {});
					if (draft.lockedFields) {
						setLockedFields(new Set(draft.lockedFields));
					}
					setLastSavedAt(draft.updatedAt);

					// Clear restoring flag after a tick to allow subsequent prop updates (e.g. real remote changes)
					// Ideally we only restore once on mount.
					setTimeout(() => setIsRestoring(false), 100);
				}
			}
		} catch (err) {
			console.warn("[EnhancedProjectForm] Failed to restore draft:", err);
		}
	}, [existingProject.id, storageKey]);

	// Save to Local Storage on Change (Debounced)
	useEffect(() => {
		// Don't autosave while restoring
		if (isRestoring) return;

		const handler = setTimeout(() => {
			if (typeof window === "undefined") return;
			try {
				const draft = {
					projectId: existingProject.id,
					formData,
					fieldMetadata,
					lockedFields: Array.from(lockedFields),
					updatedAt: Date.now(),
				};
				localStorage.setItem(storageKey, JSON.stringify(draft));
				setLastSavedAt(Date.now());
			} catch (err) {
				console.warn(
					"[EnhancedProjectForm] Failed to save draft:",
					err
				);
			}
		}, 1000); // 1 second debounce

		return () => clearTimeout(handler);
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		existingProject.id,
		storageKey,
		isRestoring,
	]);

	// Autosave notification handler (from autofill)
	useEffect(() => {
		const handler = () => {
			setShowAutofillNotification(true);
			setTimeout(() => setShowAutofillNotification(false), 5000);

			// After autofill, force-open subsections with errors or needs input
			// This ensures users see issues immediately after autofill completes
			setTimeout(() => {
				const schemaSteps: any[] = (formSchema as any).steps || [];
				const subsectionsToOpen = new Set<string>();

				schemaSteps.forEach((step) => {
					const sectionId: string = step.id;
					const subsections: any[] = step.subsections || [];

					subsections.forEach((subsection: any) => {
						const subsectionKey = `${sectionId}::${subsection.id}`;
						const fieldIds: string[] = subsection.fields || [];

						if (fieldIds.length === 0) return;

						// Check if subsection has errors or needs input
						const hasErrors = fieldIds.some((fieldId) => {
							const meta = fieldMetadata[fieldId];
							return meta?.warnings && meta.warnings.length > 0;
						});

						// Inline check for blue fields (needs input) - replicate isFieldBlue logic
						const hasNeedsInput = fieldIds.some((fieldId) => {
							const value = (formData as any)[fieldId];
							const hasValue = isProjectValueProvided(value);
							const meta = fieldMetadata[fieldId];
							const hasSource =
								meta?.source ||
								(meta?.sources &&
									Array.isArray(meta.sources) &&
									meta.sources.length > 0);
							const sourceType =
								meta?.source?.type || meta?.sources?.[0]?.type;
							const hasWarnings =
								meta?.warnings && meta.warnings.length > 0;
							const isLocked =
								lockedFields.has(fieldId) &&
								!unlockedFields.has(fieldId);

							// Don't show as blue if there are warnings (should be red instead)
							if (hasWarnings && !isLocked) {
								return false;
							}

							if (!hasValue) {
								return hasSource && !isLocked && !hasWarnings;
							}
							// Blue: user_input source, no warnings, not locked
							return (
								sourceType === "user_input" &&
								!hasWarnings &&
								!isLocked
							);
						});

						if (hasErrors || hasNeedsInput) {
							subsectionsToOpen.add(subsectionKey);
						}
					});
				});

				// Force-open subsections with errors or needs input
				setExpandedSubsections((prev) => {
					const next = new Set(prev);
					subsectionsToOpen.forEach((key) => next.add(key));
					return next;
				});
			}, 100); // Small delay to ensure formData/fieldMetadata have updated
		};
		if (typeof window !== "undefined") {
			window.addEventListener("autofill-completed", handler as any);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener(
					"autofill-completed",
					handler as any
				);
			}
		};
	}, [formData, fieldMetadata, lockedFields, unlockedFields]);

	// Helper function to update metadata when user inputs data
	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
			setFormData((prev) => {
				const next = { ...prev, [fieldId]: value };
				return next;
			});

			// Get existing field metadata
			const currentMeta = fieldMetadata[fieldId] || {
				value: value,
				source: null,
				warnings: [],
				other_values: [],
			};

			// Preserve original source in other_values if it exists and is not user_input
			const originalSource = currentMeta.source;
			const otherValues = Array.isArray(currentMeta.other_values)
				? [...currentMeta.other_values]
				: [];

			// If there's an original source that's not user_input, add it to other_values
			if (originalSource && originalSource.type !== "user_input") {
				const originalValue = currentMeta.value;
				// Check if this source/value combination already exists in other_values
				const alreadyExists = otherValues.some(
					(ov: any) =>
						ov.value === originalValue &&
						ov.source?.type === originalSource.type
				);
				if (!alreadyExists && originalValue !== value) {
					otherValues.push({
						value: originalValue,
						source: originalSource,
					});
				}
			}

			// Update metadata to mark source as User Input
			const updatedMeta = {
				...currentMeta,
				value: value,
				// Force source to user_input when edited manually
				source: { type: "user_input" } as any,
				other_values: otherValues,
			};

			setFieldMetadata((prev) => ({
				...prev,
				[fieldId]: updatedMeta,
			}));
		},
		[fieldMetadata]
	);

	// Helper function to perform realtime sanity check on blur
	// Create debounced sanity checker instance
	const sanityCheckerRef = useRef<
		import("@/lib/debouncedSanityCheck").DebouncedSanityChecker | null
	>(null);

	useEffect(() => {
		import("@/lib/debouncedSanityCheck").then(
			({ DebouncedSanityChecker }) => {
				sanityCheckerRef.current = new DebouncedSanityChecker({
					resumeType: "project",
					debounceMs: 1500, // 1.5 seconds debounce for individual field checks
					batchDebounceMs: 2500, // 2.5 seconds debounce for batch/dependency validations
				});
			}
		);

		return () => {
			sanityCheckerRef.current?.cancelAll();
		};
	}, []);

	const handleBlur = useCallback(
		(fieldId: string, value?: any) => {
			// Use provided value or read from formData
			const fieldValue =
				value !== undefined ? value : (formData as any)[fieldId];
			if (fieldValue === undefined || fieldValue === null) {
				return;
			}

			// Get existing field metadata for realtime sanity check
			const currentMeta = fieldMetadata[fieldId] || {
				value: fieldValue,
				source: null,
				warnings: [],
				other_values: [],
			};

			// Use current formData and override with the field value
			const context = { ...formData, [fieldId]: fieldValue };

			// Schedule debounced sanity check
			sanityCheckerRef.current?.scheduleCheck(
				fieldId,
				fieldValue,
				context,
				currentMeta,
				(fieldId, warnings) => {
					// Update metadata with warnings from sanity check
					setFieldMetadata((prev) => ({
						...prev,
						[fieldId]: {
							...prev[fieldId],
							warnings: warnings,
						},
					}));
				},
				(fieldId, error) => {
					console.error(
						`Realtime sanity check failed for ${fieldId}:`,
						error
					);
					// Don't fail if sanity check fails
				}
			);
		},
		[formData, fieldMetadata]
	);

	// Map of field dependencies: when field A changes, re-validate fields B, C, D
	// This is built from the sanity check config - fields that reference other fields
	const fieldDependencies = useMemo(() => {
		const deps: Record<string, string[]> = {};

		// Fields that depend on buildingType
		deps["buildingType"] = ["numberOfStories"];

		// Fields that depend on projectPhase
		deps["projectPhase"] = ["constructionType", "purchasePrice"];

		// Fields that depend on constructionType
		deps["constructionType"] = ["projectPhase"];

		// Fields that depend on dealStatus
		deps["dealStatus"] = ["completionDate"];
		deps["completionDate"] = ["dealStatus"];

		// Fields that depend on expectedZoningChanges
		deps["expectedZoningChanges"] = ["entitlements"];
		deps["entitlements"] = ["expectedZoningChanges"];

		// Fields that depend on totalResidentialUnits
		deps["totalResidentialUnits"] = [
			"studioCount",
			"oneBedCount",
			"twoBedCount",
			"threeBedCount",
			"parkingRatio",
			"averageUnitSize",
			"affordableUnitsNumber",
		];
		deps["studioCount"] = ["totalResidentialUnits"];
		deps["oneBedCount"] = ["totalResidentialUnits"];
		deps["twoBedCount"] = ["totalResidentialUnits"];
		deps["threeBedCount"] = ["totalResidentialUnits"];

		// Fields that depend on totalResidentialNRSF
		deps["totalResidentialNRSF"] = ["averageUnitSize", "grossBuildingArea"];

		// Fields that depend on totalCommercialGRSF
		deps["totalCommercialGRSF"] = ["grossBuildingArea", "preLeasedSF"];

		// Fields that depend on grossBuildingArea
		deps["grossBuildingArea"] = [
			"totalResidentialNRSF",
			"totalCommercialGRSF",
		];

		// Fields that depend on parkingSpaces
		deps["parkingSpaces"] = ["parkingRatio"];

		// Fields that depend on loanAmountRequested
		deps["loanAmountRequested"] = [
			"targetLtvPercent",
			"targetLtcPercent",
			"debtYield",
			"ltv",
			"loanFees",
			"netWorth",
			"guarantorLiquidity",
		];

		// Fields that depend on stabilizedValue
		deps["stabilizedValue"] = ["targetLtvPercent", "ltv"];

		// Fields that depend on totalDevelopmentCost
		deps["totalDevelopmentCost"] = [
			"targetLtcPercent",
			"yieldOnCost",
			"loanAmountRequested",
			"sponsorEquity",
		];

		// Fields that depend on noiYear1
		deps["noiYear1"] = ["yieldOnCost", "debtYield", "dscr"];

		// Fields that depend on stabilizedNoiProjected
		deps["stabilizedNoiProjected"] = ["stabilizedValue"];

		// Fields that depend on capRate
		deps["capRate"] = ["stabilizedValue"];

		// Fields that depend on interestRate
		deps["interestRate"] = ["underwritingRate", "allInRate", "dscr"];

		// Fields that depend on amortizationYears
		deps["amortizationYears"] = ["dscr"];

		// Fields that depend on supplyPipeline
		deps["supplyPipeline"] = ["monthsOfSupply"];

		// Fields that depend on submarketAbsorption
		deps["submarketAbsorption"] = ["monthsOfSupply", "supplyPipeline"];

		// Fields that depend on affordableHousing
		deps["affordableHousing"] = ["affordableUnitsNumber"];

		// Fields that depend on affordableUnitsNumber
		deps["affordableUnitsNumber"] = ["totalResidentialUnits"];

		// Fields that depend on taxExemption
		deps["taxExemption"] = ["exemptionStructure", "pfcStructuringFee"];

		// Fields that depend on environmental
		deps["environmental"] = ["enviroRemediation"];

		// Fields that depend on phaseIESAFinding
		deps["phaseIESAFinding"] = ["enviroRemediation"];

		// Fields that depend on enviroRemediation
		deps["enviroRemediation"] = ["environmental", "phaseIESAFinding"];

		// Fields that depend on landAcqClose
		deps["landAcqClose"] = ["groundbreakingDate"];

		// Fields that depend on groundbreakingDate
		deps["groundbreakingDate"] = ["landAcqClose", "completionDate"];

		// Fields that depend on firstOccupancy
		deps["firstOccupancy"] = ["stabilization"];

		// Fields that depend on stabilization
		deps["stabilization"] = ["firstOccupancy"];

		// Fields that depend on totalSiteAcreage
		deps["totalSiteAcreage"] = ["buildableAcreage"];

		// Fields that depend on buildableAcreage
		deps["buildableAcreage"] = ["totalSiteAcreage"];

		// Fields that depend on densityBonus
		deps["densityBonus"] = ["farUtilizedPercent"];

		return deps;
	}, []);

	// Track previous formData values to detect actual changes
	const prevFormDataRef = useRef<ProjectProfile>(formData);
	const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Re-validate dependent fields when relevant fields change (batched)
	useEffect(() => {
		// Clear any existing timeout
		if (validationTimeoutRef.current) {
			clearTimeout(validationTimeoutRef.current);
		}

		// Debounce to avoid excessive API calls
		validationTimeoutRef.current = setTimeout(async () => {
			const currentFormData = formData;
			const prevFormData = prevFormDataRef.current;

			// Find fields that actually changed (only check fields in dependencies map)
			const changedFields = new Set<string>();
			const dependencyFieldIds = new Set(Object.keys(fieldDependencies));

			// Only check fields that are in the dependency map or are dependencies themselves
			const allRelevantFields = new Set([
				...Object.keys(fieldDependencies),
				...Object.values(fieldDependencies).flat(),
			]);

			allRelevantFields.forEach((fieldId) => {
				const currentValue = (currentFormData as any)[fieldId];
				const prevValue = (prevFormData as any)[fieldId];
				// Use JSON.stringify for deep comparison of objects/arrays
				if (
					JSON.stringify(currentValue) !== JSON.stringify(prevValue)
				) {
					changedFields.add(fieldId);
				}
			});

			// Only proceed if there are actual changes to relevant fields
			if (changedFields.size === 0) {
				prevFormDataRef.current = currentFormData;
				return;
			}

			// Check all fields that might have dependencies
			const fieldsToRevalidate = new Set<string>();

			// For each changed field, check if it has dependencies
			changedFields.forEach((fieldId) => {
				const dependentFields = fieldDependencies[fieldId];
				if (dependentFields) {
					dependentFields.forEach((depFieldId) => {
						// Only re-validate if the dependent field has a value
						const depValue = (currentFormData as any)[depFieldId];
						if (
							depValue !== undefined &&
							depValue !== null &&
							depValue !== ""
						) {
							fieldsToRevalidate.add(depFieldId);
						}
					});
				}
			});

			// Batch validate all dependent fields in parallel
			if (fieldsToRevalidate.size > 0 && sanityCheckerRef.current) {
				const fieldsToCheck = Array.from(fieldsToRevalidate)
					.map((fieldId) => {
						const fieldValue = (currentFormData as any)[fieldId];
						const currentMeta = fieldMetadata[fieldId] || {
							value: fieldValue,
							source: null,
							warnings: [],
							other_values: [],
						};
						return {
							fieldId,
							value: fieldValue,
							context: currentFormData,
							existingFieldData: currentMeta,
						};
					})
					.filter(
						(field) =>
							field.value !== undefined &&
							field.value !== null &&
							field.value !== ""
					);

				if (fieldsToCheck.length > 0) {
					// Batch check all fields in parallel
					await sanityCheckerRef.current.batchCheck(
						fieldsToCheck,
						(fieldId, warnings) => {
							// Update metadata with warnings from sanity check
							setFieldMetadata((prev) => ({
								...prev,
								[fieldId]: {
									...prev[fieldId],
									warnings: warnings,
								},
							}));
						},
						(fieldId, error) => {
							console.error(
								`Batch sanity check failed for ${fieldId}:`,
								error
							);
						}
					);
				}
			}

			// Update ref after processing
			prevFormDataRef.current = currentFormData;
		}, 1000); // 1000ms debounce to reduce API calls and re-renders

		return () => {
			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current);
			}
		};
	}, [formData, fieldDependencies, fieldMetadata]);

	// Propagate form data changes to parent
	useEffect(() => {
		onFormDataChange?.(formData);
	}, [formData, onFormDataChange]);

	// Helper to derive subsection lock status from its field locks
	const isSubsectionFullyLocked = useCallback(
		(fieldIds: string[]) => {
			if (fieldIds.length === 0) return false;

			// Check if all fields in subsection are locked (and not explicitly unlocked)
			return fieldIds.every(
				(fieldId) =>
					!unlockedFields.has(fieldId) && lockedFields.has(fieldId)
			);
		},
		[lockedFields, unlockedFields]
	);

	const isFieldLocked = useCallback(
		(fieldId: string, _sectionId?: string) => {
			const meta = fieldMetadata[fieldId];
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;

			// Fields with warnings must remain editable/red, never locked.
			if (hasWarnings) return false;

			if (unlockedFields.has(fieldId)) return false;
			if (lockedFields.has(fieldId)) return true;
			return false;
		},
		[lockedFields, unlockedFields, fieldMetadata]
	);

	const toggleFieldLock = useCallback(
		(fieldId: string) => {
			const currentlyLocked = (() => {
				if (unlockedFields.has(fieldId)) return false;
				if (lockedFields.has(fieldId)) return true;
				return false;
			})();

			if (currentlyLocked) {
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
				setUnlockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
			} else {
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
				setUnlockedFields((prev) => {
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
			}
		},
		[unlockedFields, lockedFields]
	);

	const toggleSubsectionLock = useCallback(
		(fieldIds: string[]) => {
			if (fieldIds.length === 0) return;

			const isCurrentlyFullyLocked = isSubsectionFullyLocked(fieldIds);

			// Lock or unlock fields in the subsection.
			// When locking, only lock fields that currently have values; leave empty
			// fields unlocked so they follow the same rules as individual field locks.
			setLockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((fieldId) => {
					if (isCurrentlyFullyLocked) {
						// Unlock all fields when the subsection is already fully locked.
						next.delete(fieldId);
					} else {
						const value = (formData as any)[fieldId];
						const hasValue = isProjectValueProvided(value);
						if (hasValue) {
							next.add(fieldId);
						} else {
							// Ensure empty fields are not marked as locked.
							next.delete(fieldId);
						}
					}
				});
				return next;
			});

			// Clear unlocked flags for this subsection when toggling
			setUnlockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((fieldId) => next.delete(fieldId));
				return next;
			});
		},
		[formData, isSubsectionFullyLocked]
	);

	// Styling Logic: Red, White, Blue, Green
	const getFieldStylingClasses = useCallback(
		(fieldId: string, sectionId?: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;
			// Check single source (new format) or sources array (backward compatibility)
			const hasSource =
				meta?.source ||
				(meta?.sources &&
					Array.isArray(meta.sources) &&
					meta.sources.length > 0);

			const baseClasses =
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors duration-200";

			// Red: warnings exist and not locked
			if (hasWarnings && !locked) {
				return cn(
					baseClasses,
					"border-red-500 bg-red-50 focus:ring-red-200 hover:border-red-600 text-gray-800"
				);
			}

			// Green: locked (regardless of warnings)
			if (locked) {
				return cn(
					baseClasses,
					"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 hover:border-emerald-600 text-gray-800"
				);
			}

			if (!hasValue) {
				if (hasSource) {
					return cn(
						baseClasses,
						"border-blue-600 bg-blue-50 focus:ring-blue-200 hover:border-blue-700 text-gray-800"
					);
				}
				return cn(
					baseClasses,
					"border-gray-200 bg-white focus:ring-blue-200 hover:border-gray-300"
				);
			}

			// Blue: has value, not locked, no warnings
			return cn(
				baseClasses,
				"border-blue-600 bg-blue-50 focus:ring-blue-200 hover:border-blue-700 text-gray-800"
			);
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldAutofilled = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			if (!meta?.source) return false;
			// Backward compatibility: check sources array if source doesn't exist
			if (
				!meta.source &&
				meta.sources &&
				Array.isArray(meta.sources) &&
				meta.sources.length > 0
			) {
				const isUserInput = meta.sources.some((src: any) => {
					if (typeof src === "string")
						return (
							src.toLowerCase() === "user_input" ||
							src.toLowerCase() === "user input"
						);
					return src.type === "user_input";
				});
				return !isUserInput;
			}
			return meta.source.type !== "user_input";
		},
		[fieldMetadata]
	);

	const getFieldWarning = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			if (!meta?.warnings || meta.warnings.length === 0) return null;
			return meta.warnings.join(" ");
		},
		[fieldMetadata]
	);

	const isFieldRed = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;
			return hasWarnings && !locked;
		},
		[fieldMetadata, isFieldLocked]
	);

	const isFieldBlue = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			// Check single source (new format) or sources array (backward compatibility)
			const hasSource =
				meta?.source ||
				(meta?.sources &&
					Array.isArray(meta.sources) &&
					meta.sources.length > 0);
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;

			// Don't show as blue if locked (should be green)
			if (locked) {
				return false;
			}

			// Don't show as blue if there are warnings (should be red instead)
			if (hasWarnings) {
				return false;
			}

			if (!hasValue) {
				// Blue: has source but no value, not locked, no warnings
				return hasSource;
			}

			// Blue: has value, not locked, no warnings (matches visual styling - regardless of source type)
			return true;
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldWhite = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const meta = fieldMetadata[fieldId];
			// Check single source (new format) or sources array (backward compatibility)
			const hasSource =
				meta?.source ||
				(meta?.sources &&
					Array.isArray(meta.sources) &&
					meta.sources.length > 0);
			return !hasValue && !hasSource;
		},
		[formData, fieldMetadata]
	);

	const isFieldGreen = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const locked = isFieldLocked(fieldId, sectionId);
			// Green: locked (regardless of warnings)
			return locked;
		},
		[isFieldLocked]
	);

	const renderFieldLockButton = useCallback(
		(fieldId: string, sectionId: string) => {
			const locked = isFieldLocked(fieldId, sectionId);
			const value = (formData as any)[fieldId];
			const meta = fieldMetadata[fieldId];
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;
			// Check if value is provided - handle objects with keys
			const hasValue = (() => {
				if (Array.isArray(value)) {
					return isProjectValueProvided(value);
				}
				if (value && typeof value === "object") {
					// For objects, check if they have any keys
					return Object.keys(value).length > 0;
				}
				return isProjectValueProvided(value);
			})();
			// Disable if empty (and not already locked) OR if has warnings
			// Still allow unlocking even if the value is now empty so users are never stuck with a locked empty field.
			const isDisabled = (!hasValue && !locked) || hasWarnings;

			const tooltipTitle = isDisabled
				? hasWarnings
					? "Cannot lock a field with warnings. Please resolve warnings first."
					: "Cannot lock an empty field. Please fill in a value first."
				: locked
				? "Unlock field"
				: "Lock field";

			return (
				<div className="flex items-center" title={tooltipTitle}>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							if (isDisabled) return;
							toggleFieldLock(fieldId);
						}}
						disabled={isDisabled}
						className={cn(
							"flex items-center justify-center p-1 rounded transition-colors z-10",
							isDisabled
								? "cursor-not-allowed text-gray-300"
								: "cursor-pointer",
							locked
								? "text-emerald-600 hover:text-emerald-700"
								: "text-gray-400 hover:text-blue-600"
						)}
					>
						{locked ? (
							<Lock className="h-4 w-4" />
						) : (
							<Unlock className="h-4 w-4" />
						)}
					</button>
				</div>
			);
		},
		[formData, isFieldLocked, toggleFieldLock, fieldMetadata]
	);

	const renderFieldLabel = useCallback(
		(
			fieldId: string,
			sectionId: string,
			labelText: string,
			required: boolean = false,
			fieldWrapperRef?: React.RefObject<HTMLDivElement>
		) => {
			const hasWarnings =
				fieldMetadata[fieldId]?.warnings &&
				fieldMetadata[fieldId].warnings.length > 0;
			return (
				<div className="mb-1">
					<label className="flex text-sm font-medium text-gray-700 items-center gap-2 relative group/field w-full">
						<span>
							{labelText}
							{required && (
								<span className="text-red-500 ml-1">*</span>
							)}
						</span>
						<FieldHelpTooltip
							fieldId={fieldId}
							fieldMetadata={fieldMetadata[fieldId]}
						/>
						{hasWarnings && fieldWrapperRef && (
							<FieldWarningsTooltip
								warnings={fieldMetadata[fieldId]?.warnings}
								triggerRef={fieldWrapperRef}
								showIcon={true}
							/>
						)}
						<div className="ml-auto flex items-center gap-1">
							<button
								type="button"
								onClick={() => (onAskAI || (() => {}))(fieldId)}
								className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium text-blue-600 opacity-0 group-hover/field:opacity-100 transition-opacity"
							>
								Ask AI
							</button>
							{renderFieldLockButton(fieldId, sectionId)}
						</div>
					</label>
				</div>
			);
		},
		[onAskAI, renderFieldLockButton, fieldMetadata]
	);

	useEffect(() => {
		if (!initialFocusFieldId) return;
		const selector = `[data-field-id="${initialFocusFieldId}"], #${initialFocusFieldId}`;
		const el = document.querySelector<HTMLElement>(selector);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			const focusable = el.matches("input,select,textarea")
				? el
				: el.querySelector("input,select,textarea");
			(focusable as HTMLElement | null)?.focus?.();
		}
	}, [initialFocusFieldId]);

	// Save Logic (Explicit or Unmount)
	// Use refs to access the latest state and track in-flight saves when checking for dirtiness.
	const stateRef = useRef({ formData, fieldMetadata, lockedFields });
	const isSavingRef = useRef(false);
	useEffect(() => {
		stateRef.current = { formData, fieldMetadata, lockedFields };
	}, [formData, fieldMetadata, lockedFields]);

	// Helper to determine if there are unsaved changes compared to the last
	// known persisted snapshot (or the initial DB snapshot if none).
	const hasUnsavedChanges = useCallback((): boolean => {
		const baseline =
			lastSavedSnapshotRef.current || initialSnapshotRef.current;
		if (!baseline) return true;

		const current = stateRef.current;

		const lockedToArray = (s: Set<string>) =>
			Array.from(s).sort((a, b) => a.localeCompare(b));

		try {
			const formEqual =
				JSON.stringify(current.formData) ===
				JSON.stringify(baseline.formData);
			const metaEqual =
				JSON.stringify(current.fieldMetadata) ===
				JSON.stringify(baseline.fieldMetadata);
			const locksEqual =
				JSON.stringify(lockedToArray(current.lockedFields)) ===
				JSON.stringify(lockedToArray(baseline.lockedFields));

			return !(formEqual && metaEqual && locksEqual);
		} catch {
			// If comparison fails for any reason, err on the side of treating
			// the form as dirty so changes are not lost.
			return true;
		}
	}, []);

	const saveToDatabase = useCallback(
		async (finalData: ProjectProfile, createNewVersion: boolean) => {
			// If there are no unsaved changes relative to our baseline, skip creating
			// another version row. Still clear any local draft.
			if (!hasUnsavedChanges()) {
				if (typeof window !== "undefined") {
					localStorage.removeItem(storageKey);
					setLastSavedAt(null);
				}
				return;
			}

			setFormSaved(true);
			isSavingRef.current = true;

			// Signal to realtime hooks that this is a local save
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: { projectId: finalData.id, context: "project" },
					})
				);
			}

			try {
				await saveProjectResume(finalData.id, finalData, {
					createNewVersion,
				});

				// After a successful save, update the baseline snapshot so subsequent
				// exits only create new versions when there are further edits.
				const snapshotLocked = new Set(
					Object.keys(finalData._lockedFields || {}).filter(
						(k) => finalData._lockedFields?.[k]
					)
				);
				const snapshot: {
					formData: ProjectProfile;
					fieldMetadata: Record<string, any>;
					lockedFields: Set<string>;
				} = {
					formData: finalData,
					fieldMetadata: (finalData as any)._metadata || {},
					lockedFields: snapshotLocked,
				};
				lastSavedSnapshotRef.current = snapshot;
				// Also sync the "current" in-memory state to this snapshot so that
				// a subsequent unmount doesn't see the old pre-save formData and
				// incorrectly conclude there are unsaved changes, which would
				// create a duplicate version.
				stateRef.current = snapshot;

				// Clear local storage after successful save
				if (typeof window !== "undefined") {
					localStorage.removeItem(storageKey);
					setLastSavedAt(null);
				}
			} catch (err) {
				console.error("[EnhancedProjectForm] Save failed:", err);
			} finally {
				isSavingRef.current = false;
				setTimeout(() => setFormSaved(false), 1500);
			}
		},
		[hasUnsavedChanges, storageKey]
	);

	const handleFormSubmit = useCallback(
		async (finalData?: ProjectProfile) => {
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...(finalData || formData),
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
			};

			// Explicit Save & Exit should create a new version only when there
			// are unsaved changes. The helper will no-op if nothing changed.
			await saveToDatabase(dataToSave, true);
			onComplete?.(dataToSave);
			onVersionChange?.();
		},
		[
			formData,
			fieldMetadata,
			lockedFields,
			saveToDatabase,
			onComplete,
			onVersionChange,
		]
	);

	// Save on Unmount
	useEffect(() => {
		return () => {
			// If an explicit save is currently in-flight, skip the unmount save to
			// avoid creating duplicate versions with identical content (e.g. when
			// navigating away immediately after clicking "Save & Exit").
			if (isSavingRef.current) {
				return;
			}

			// If there are no unsaved changes relative to our last saved snapshot,
			// don't create another version on unmount.
			if (!hasUnsavedChanges()) {
				return;
			}

			const {
				formData: currentFormData,
				fieldMetadata: currentMeta,
				lockedFields: currentLocks,
			} = stateRef.current;

			const lockedFieldsObj: Record<string, boolean> = {};
			currentLocks.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...currentFormData,
				_metadata: currentMeta,
				_lockedFields: lockedFieldsObj,
			};

			// Signal to realtime hooks that this is a local save
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: {
							projectId: dataToSave.id,
							context: "project",
						},
					})
				);
			}

			// Fire and forget save on unmount. We always create a new version
			// here when dirty, since this represents an exit with draft changes.
			void saveProjectResume(dataToSave.id, dataToSave, {
				createNewVersion: true,
			})
				.then(() => {
					// Update baseline snapshot after successful background save
					const snapshotLocked = new Set(
						Object.keys(lockedFieldsObj).filter(
							(k) => lockedFieldsObj[k]
						)
					);
					const snapshot: {
						formData: ProjectProfile;
						fieldMetadata: Record<string, any>;
						lockedFields: Set<string>;
					} = {
						formData: dataToSave,
						fieldMetadata: currentMeta,
						lockedFields: snapshotLocked,
					};
					lastSavedSnapshotRef.current = snapshot;

					// Also clear local storage so the same draft isn't re-applied.
					if (typeof window !== "undefined") {
						localStorage.removeItem(storageKey);
					}
				})
				.catch((err) =>
					console.error(
						"[EnhancedProjectForm] Unmount save failed",
						err
					)
				);
		};
	}, [hasUnsavedChanges, storageKey]);

	// Warn the user when attempting to close/refresh the tab or navigate away
	// from the page entirely while there are unsaved changes. Browsers only
	// allow a generic confirmation dialog here – we can't customize the text
	// or add buttons, but this at least nudges the user to use Save & Exit.
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			// If nothing has changed, allow navigation without warning.
			if (!hasUnsavedChanges()) return;

			event.preventDefault();
			// Some browsers require setting returnValue for the prompt to appear.
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasUnsavedChanges]);

	// Derived / calculated fields
	// - incentiveStacking: concatenated labels of enabled incentives
	// - targetLtvPercent: (loanAmountRequested / stabilizedValue) * 100
	// - targetLtcPercent: (loanAmountRequested / totalDevelopmentCost) * 100
	// - totalCommercialGRSF: sum of commercialSpaceMix.squareFootage
	// - studioCount / oneBedCount / twoBedCount / threeBedCount: derived from residentialUnitMix
	useEffect(() => {
		setFormData((prev) => {
			let changed = false;
			const next: ProjectProfile = { ...prev };

			const normalizeNumber = (v: any): number | null => {
				if (typeof v !== "number" || Number.isNaN(v)) return null;
				return v;
			};

			// 1) incentiveStacking – only update when not locked
			if (!lockedFields.has("incentiveStacking")) {
				const activeLabels = INCENTIVE_LABELS.filter(({ key }) => {
					const flag = (prev as any)[key];
					return flag === true;
				}).map((item) => item.label);
				const derived =
					activeLabels.length > 0 ? activeLabels.join(", ") : null;
				const current =
					(prev as any).incentiveStacking === undefined
						? null
						: (prev as any).incentiveStacking;
				// Allow both string and string[] legacy shapes
				const currentStr =
					Array.isArray(current) && current.length > 0
						? current.join(", ")
						: typeof current === "string"
						? current
						: null;
				if (currentStr !== (derived ?? null)) {
					(next as any).incentiveStacking =
						derived === null ? undefined : derived;
					changed = true;
				}
			}

			// 2) targetLtvPercent
			if (!lockedFields.has("targetLtvPercent")) {
				const loanAmt = normalizeNumber(prev.loanAmountRequested);
				const stabilizedVal = normalizeNumber(prev.stabilizedValue);
				const derived =
					loanAmt && stabilizedVal && stabilizedVal !== 0
						? (loanAmt / stabilizedVal) * 100
						: null;
				const current = normalizeNumber(prev.targetLtvPercent);
				if (
					(current === null && derived !== null) ||
					(current !== null && derived === null) ||
					(current !== null &&
						derived !== null &&
						Math.abs(current - derived) > 0.0001)
				) {
					next.targetLtvPercent =
						derived === null ? undefined : derived;
					changed = true;
				}
			}

			// 3) targetLtcPercent
			if (!lockedFields.has("targetLtcPercent")) {
				const loanAmt = normalizeNumber(prev.loanAmountRequested);
				const tdc = normalizeNumber(prev.totalDevelopmentCost);
				const derived =
					loanAmt && tdc && tdc !== 0 ? (loanAmt / tdc) * 100 : null;
				const current = normalizeNumber(prev.targetLtcPercent);
				if (
					(current === null && derived !== null) ||
					(current !== null && derived === null) ||
					(current !== null &&
						derived !== null &&
						Math.abs(current - derived) > 0.0001)
				) {
					next.targetLtcPercent =
						derived === null ? undefined : derived;
					changed = true;
				}
			}

			// 4) totalCommercialGRSF – sum of commercialSpaceMix.squareFootage
			if (!lockedFields.has("totalCommercialGRSF")) {
				const mix = Array.isArray(prev.commercialSpaceMix)
					? prev.commercialSpaceMix
					: [];
				const sum = mix.reduce((acc, row) => {
					const sf =
						row && typeof row.squareFootage === "number"
							? row.squareFootage
							: 0;
					return acc + (Number.isNaN(sf) ? 0 : sf);
				}, 0);
				const derived = sum > 0 ? sum : null;
				const current = normalizeNumber(prev.totalCommercialGRSF);
				if (
					(current === null && derived !== null) ||
					(current !== null && derived === null) ||
					(current !== null &&
						derived !== null &&
						current !== derived)
				) {
					next.totalCommercialGRSF =
						derived === null ? undefined : derived;
					changed = true;
				}
			}

			// 5) Unit mix counts from residentialUnitMix
			const mix = Array.isArray(prev.residentialUnitMix)
				? prev.residentialUnitMix
				: [];

			const computeUnitsForMatcher = (
				matcher: (unitType: string) => boolean
			): number | null => {
				let total = 0;
				for (const row of mix) {
					if (!row || typeof row.unitType !== "string") continue;
					const name = row.unitType.toLowerCase();
					if (!matcher(name)) continue;
					const count =
						typeof row.unitCount === "number" &&
						!Number.isNaN(row.unitCount)
							? row.unitCount
							: 1;
					total += count;
				}
				return total > 0 ? total : null;
			};

			const isStudio = (name: string) => name.includes("studio");
			const isOneBed = (name: string) =>
				name.includes("1br") ||
				name.includes("1 br") ||
				name.includes("one bed") ||
				name.includes("1-bed") ||
				name.includes("1 bed");
			const isTwoBed = (name: string) =>
				name.includes("2br") ||
				name.includes("2 br") ||
				name.includes("two bed") ||
				name.includes("2-bed") ||
				name.includes("2 bed");
			const isThreeBed = (name: string) =>
				name.includes("3br") ||
				name.includes("3 br") ||
				name.includes("three bed") ||
				name.includes("3-bed") ||
				name.includes("3 bed");

			const derivedStudio = computeUnitsForMatcher(isStudio);
			const derivedOne = computeUnitsForMatcher(isOneBed);
			const derivedTwo = computeUnitsForMatcher(isTwoBed);
			const derivedThree = computeUnitsForMatcher(isThreeBed);

			const maybeSetCount = (
				fieldId:
					| "studioCount"
					| "oneBedCount"
					| "twoBedCount"
					| "threeBedCount",
				derived: number | null
			) => {
				if (lockedFields.has(fieldId)) return;
				const current = normalizeNumber((prev as any)[fieldId]);
				if (
					(current === null && derived !== null) ||
					(current !== null && derived === null) ||
					(current !== null &&
						derived !== null &&
						current !== derived)
				) {
					(next as any)[fieldId] =
						derived === null ? undefined : derived;
					changed = true;
				}
			};

			maybeSetCount("studioCount", derivedStudio);
			maybeSetCount("oneBedCount", derivedOne);
			maybeSetCount("twoBedCount", derivedTwo);
			maybeSetCount("threeBedCount", derivedThree);

			return changed ? next : prev;
		});
	}, [
		lockedFields,
		formData.loanAmountRequested,
		formData.stabilizedValue,
		formData.totalDevelopmentCost,
		formData.commercialSpaceMix,
		formData.residentialUnitMix,
		formData.opportunityZone,
		formData.taxExemption,
		formData.tifDistrict,
		formData.taxAbatement,
		formData.paceFinancing,
		formData.historicTaxCredits,
		formData.newMarketsCredits,
	]);

	type ControlKind =
		| "input"
		| "number"
		| "textarea"
		| "select"
		| "button-select";

	const sectionIconComponents = useMemo<
		Record<string, React.ComponentType<{ className?: string }>>
	>(
		() => ({
			FileText,
			DollarSign,
			Building,
			Globe,
			Calendar,
			Map: MapIcon,
			Users,
			Calculator,
			AlertTriangle,
			Info,
			BarChart,
		}),
		[]
	);

	const fieldControlOverrides = useMemo<Record<string, ControlKind>>(
		() => ({
			assetType: "button-select",
			projectPhase: "button-select",
			loanType: "button-select",
			interestRateType: "button-select",
			recoursePreference: "button-select",
			exitStrategy: "button-select",
			// Convert all dropdown fields to button-select (except state which stays as dropdown)
			dealStatus: "button-select",
			expectedZoningChanges: "button-select",
			syndicationStatus: "button-select",
			sponsorExperience: "button-select",
			buildingType: "button-select",
			hvacSystem: "button-select",
			leedGreenRating: "button-select",
			crimeRiskLevel: "button-select",
			exemptionStructure: "button-select",
			relocationPlan: "button-select",
			entitlements: "button-select",
			finalPlans: "button-select",
			permitsIssued: "button-select",
			currentSiteStatus: "button-select",
			topography: "button-select",
			environmental: "button-select",
			utilities: "button-select",
			seismicRisk: "button-select",
			phaseIESAFinding: "button-select",
			// Derived dropdown fields - use button-select like assetType
			riskLevelBase: "button-select",
			riskLevelUpside: "button-select",
			riskLevelDownside: "button-select",
			marketStatus: "button-select",
			demandTrend: "button-select",
			supplyPressure: "button-select",
			luxuryTier: "button-select",
			competitivePosition: "button-select",
			zoningCompliant: "button-select",
		}),
		[]
	);

	const fieldOptionsRegistry = useMemo<Record<string, any[]>>(
		() => ({
			assetType: assetTypeOptions,
			projectPhase: projectPhaseOptions,
			loanType: capitalTypeOptions,
			interestRateType: interestRateTypeOptions,
			recoursePreference: recourseOptions,
			exitStrategy: exitStrategyOptions,
			// Dropdown field options
			dealStatus: dealStatusOptions,
			expectedZoningChanges: expectedZoningChangesOptions,
			syndicationStatus: syndicationStatusOptions,
			sponsorExperience: sponsorExperienceOptions,
			buildingType: buildingTypeOptions,
			hvacSystem: hvacSystemOptions,
			leedGreenRating: leedGreenRatingOptions,
			crimeRiskLevel: crimeRiskLevelOptions,
			exemptionStructure: exemptionStructureOptions,
			relocationPlan: relocationPlanOptions,
			entitlements: entitlementsOptions,
			finalPlans: finalPlansOptions,
			permitsIssued: permitsIssuedOptions,
			currentSiteStatus: currentSiteStatusOptions,
			topography: topographyOptions,
			environmental: environmentalOptions,
			utilities: utilitiesOptions,
			seismicRisk: seismicRiskOptions,
			phaseIESAFinding: phaseIESAFindingOptions,
			// Derived dropdown fields
			riskLevelBase: riskLevelOptions,
			riskLevelUpside: riskLevelOptions,
			riskLevelDownside: riskLevelOptions,
			marketStatus: marketStatusOptions,
			demandTrend: demandTrendOptions,
			supplyPressure: supplyPressureOptions,
			luxuryTier: luxuryTierOptions,
			competitivePosition: competitivePositionOptions,
			zoningCompliant: zoningCompliantOptions,
		}),
		[]
	);

	const getDefaultControlForDataType = useCallback(
		(dataType?: string): ControlKind => {
			if (!dataType) return "input";
			switch (dataType.toLowerCase()) {
				case "textarea":
					return "textarea";
				case "dropdown":
					return "select";
				case "boolean":
					return "button-select";
				case "currency":
				case "integer":
				case "numeric":
					return "number";
				case "date":
					return "input";
				case "table":
					return "textarea";
				default:
					return "input";
			}
		},
		[]
	);

	const getFieldConfig = useCallback((fieldId: string) => {
		const fieldsConfig = (formSchema as any).fields || {};
		return fieldsConfig[fieldId] || {};
	}, []);

	const isFieldRequiredFromSchema = useCallback(
		(fieldId: string): boolean => {
			const config = getFieldConfig(fieldId);
			if (typeof config.required === "boolean") {
				return config.required;
			}
			// Fallback to PROJECT_REQUIRED_FIELDS for backwards compatibility
			return (PROJECT_REQUIRED_FIELDS as readonly string[]).includes(
				fieldId
			);
		},
		[getFieldConfig]
	);

	const renderDynamicField = useCallback(
		(fieldId: string, sectionId: string) => {
			// Remove duplicate fields from frontend to avoid confusion
			// Also filter out table fields that are rendered separately
			// Also filter out image fields that are rendered by ProjectMediaUpload component
			if (
				fieldId === "totalProjectCost" ||
				fieldId === "requestedTerm" ||
				fieldId === "residentialUnitMix" ||
				fieldId === "commercialSpaceMix" ||
				fieldId === "drawSchedule" ||
				fieldId === "rentComps" ||
				fieldId === "majorEmployers" ||
				fieldId === "deliveryByQuarter" ||
				fieldId === "siteImages" ||
				fieldId === "architecturalDiagrams" ||
				// Financial table fields rendered as special tables below
				fieldId === "fiveYearCashFlow" ||
				fieldId === "returnsBreakdown" ||
				fieldId === "quarterlyDeliverySchedule" ||
				fieldId === "sensitivityAnalysis" ||
				fieldId === "capitalUseTiming" ||
				// Risk fields rendered as editable lists below
				fieldId === "riskHigh" ||
				fieldId === "riskMedium" ||
				fieldId === "riskLow"
			) {
				return null;
			}

			const fieldConfig =
				(formSchema as any).fields?.[fieldId] ?? ({} as any);
			const label: string = fieldConfig.label ?? fieldId;
			const fieldMetaConfig = projectResumeFieldMetadata[fieldId];
			const dataType = fieldMetaConfig?.dataType;
			const required = isFieldRequiredFromSchema(fieldId);
			// Field is disabled only if UI logic requires it, but here we want users to be able to unlock and edit.
			// So we generally don't disable the input unless specific logic applies.
			// However, locked fields (Green) should probably be editable ONLY after unlocking.
			const isLocked = isFieldLocked(fieldId, sectionId);
			// We allow editing if unlocked. If locked, user must click unlock icon first.
			const disabled = isLocked;

			const value = (formData as any)[fieldId] ?? "";

			// Determine if this field has any source metadata (e.g. touched by AI/user)
			const metaFromState = fieldMetadata[fieldId];
			// Check single source (new format) or sources array (backward compatibility)
			const hasSources =
				metaFromState &&
				(metaFromState.source ||
					(Array.isArray(metaFromState.sources) &&
						metaFromState.sources.length > 0));
			const hasValue = isProjectValueProvided(value);

			const controlKind: ControlKind =
				fieldControlOverrides[fieldId] ??
				getDefaultControlForDataType(dataType);

			const commonClassName = getFieldStylingClasses(fieldId, sectionId);

			// Get or create a ref for the field wrapper to trigger tooltip on hover
			let fieldWrapperRef = fieldWrapperRefs.current.get(fieldId);
			if (!fieldWrapperRef) {
				fieldWrapperRef =
					React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>;
				fieldWrapperRefs.current.set(fieldId, fieldWrapperRef);
			}

			const renderControl = () => {
				if (controlKind === "textarea") {
					const displayValue =
						typeof value === "object" && value !== null
							? JSON.stringify(value, null, 2)
							: value;

					const handleTextareaChange = (
						e: React.ChangeEvent<HTMLTextAreaElement>
					) => {
						const val = e.target.value;
						if (dataType === "Table") {
							try {
								const parsed = JSON.parse(val);
								handleInputChange(fieldId, parsed);
							} catch {
								handleInputChange(fieldId, val);
							}
						} else {
							handleInputChange(fieldId, val);
						}
					};

					return (
						<textarea
							id={fieldId}
							value={displayValue ?? ""}
							onChange={handleTextareaChange}
							onBlur={() => handleBlur(fieldId)}
							disabled={disabled}
							className={cn(
								commonClassName,
								"h-24 font-mono text-xs"
							)}
							data-field-id={fieldId}
							data-field-type="textarea"
							data-field-section={sectionId}
							data-field-label={label}
						/>
					);
				}

				if (controlKind === "button-select") {
					let options = fieldOptionsRegistry[fieldId] ?? [];

					// Default options for Boolean fields if not in registry
					if (options.length === 0 && dataType === "Boolean") {
						options = [
							{ label: "Yes", value: true },
							{ label: "No", value: false },
						];
					}

					return (
						<div
							data-field-id={fieldId}
							data-field-type="button-select"
							data-field-section={sectionId}
							data-field-label={label}
							className="relative group/field"
						>
							<ButtonSelect
								label=""
								options={options}
								selectedValue={value} // Pass value directly (supports boolean)
								onSelect={async (selected) => {
									handleInputChange(fieldId, selected);
									// Call sanity check immediately after selection (ButtonSelect doesn't have blur)
									await handleBlur(fieldId, selected);
								}}
								disabled={disabled}
								// Use lock status to color the selection container
								isLocked={isLocked}
								// Mark as "touched" when we have either a value or any sources.
								// This makes fields like assetType turn blue after AI sets sources
								// to user_input even when the user hasn't picked a value yet.
								isTouched={hasValue || hasSources}
							/>
						</div>
					);
				}

				if (controlKind === "select") {
					// Special handling for state field: show full names but store abbreviations
					if (fieldId === "propertyAddressState") {
						const options = stateOptionsFullNames.map(
							(fullName) => ({
								label: fullName,
								value: STATE_REVERSE_MAP[fullName] || fullName, // Store abbreviation
							})
						);
						// Ensure the select's value matches the option values (abbreviations).
						// Handle legacy data that may have stored full state names by mapping
						// them back to abbreviations when possible.
						const effectiveValue =
							value &&
							typeof value === "string" &&
							value.length > 2
								? STATE_REVERSE_MAP[value] || value
								: value || "";
						return (
							<Select
								id={fieldId}
								value={effectiveValue}
								onChange={(e) => {
									// Store the abbreviation (option value) directly
									handleInputChange(fieldId, e.target.value);
								}}
								onBlur={() => handleBlur(fieldId)}
								options={options}
								required={required}
								disabled={disabled}
								className={commonClassName}
								data-field-id={fieldId}
								data-field-type="select"
								data-field-section={sectionId}
								data-field-label={label}
							/>
						);
					}
					// For other select fields
					const options = (fieldOptionsRegistry[fieldId] ?? []).map(
						(s) => ({
							label: s,
							value: s,
						})
					);
					return (
						<Select
							id={fieldId}
							value={value || ""}
							onChange={(e) =>
								handleInputChange(fieldId, e.target.value)
							}
							onBlur={() => handleBlur(fieldId)}
							options={options}
							required={required}
							disabled={disabled}
							className={commonClassName}
							data-field-id={fieldId}
							data-field-type="select"
							data-field-section={sectionId}
							data-field-label={label}
						/>
					);
				}

				const inputType =
					controlKind === "number" ||
					["Currency", "Integer", "Numeric"].includes(dataType ?? "")
						? "number"
						: dataType?.toLowerCase() === "date"
						? "date"
						: "text";

				const handleChange = (
					e: React.ChangeEvent<HTMLInputElement>
				) => {
					if (inputType === "number") {
						const raw = e.target.value;
						handleInputChange(fieldId, raw ? Number(raw) : null);
					} else {
						handleInputChange(fieldId, e.target.value);
					}
				};

				return (
					<Input
						id={fieldId}
						type={inputType}
						label={null}
						value={
							value !== null && value !== undefined
								? value.toString()
								: ""
						}
						onChange={handleChange}
						onBlur={() => handleBlur(fieldId)}
						required={required}
						disabled={disabled}
						className={commonClassName}
						data-field-id={fieldId}
						data-field-type={inputType}
						data-field-section={sectionId}
						data-field-label={label}
					/>
				);
			};

			const hasWarnings =
				fieldMetadata[fieldId]?.warnings &&
				fieldMetadata[fieldId].warnings.length > 0;

			return (
				<FormGroup key={fieldId}>
					<AskAIButton id={fieldId} onAskAI={onAskAI || (() => {})}>
						<div className="relative group/field">
							{renderFieldLabel(
								fieldId,
								sectionId,
								label,
								required,
								fieldWrapperRef
							)}
							<div ref={fieldWrapperRef} className="relative">
								{renderControl()}
							</div>
						</div>
					</AskAIButton>
				</FormGroup>
			);
		},
		[
			formData,
			getFieldStylingClasses,
			handleInputChange,
			handleBlur,
			onAskAI,
			renderFieldLabel,
			isFieldLocked,
			isFieldRequiredFromSchema,
			fieldControlOverrides,
			fieldOptionsRegistry,
			getDefaultControlForDataType,
			fieldMetadata,
		]
	);

	// Track which subsections are open (collapsed/expanded)
	const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
		new Set()
	);

	const [manuallyToggledSubsections, setManuallyToggledSubsections] =
		useState<Set<string>>(new Set());

	const toggleSubsection = useCallback((subsectionKey: string) => {
		setManuallyToggledSubsections((prev) => {
			const next = new Set(prev);
			next.add(subsectionKey);
			return next;
		});
		setExpandedSubsections((prev) => {
			const next = new Set(prev);
			if (next.has(subsectionKey)) {
				next.delete(subsectionKey);
			} else {
				next.add(subsectionKey);
			}
			return next;
		});
	}, []);

	// Auto-update subsection state when fields change
	// Rules:
	// - Open if any field is blue (filled/unlocked or touched)
	// - Close if all fields are green and locked
	// - Close if all fields are white (empty/untouched)
	useEffect(() => {
		const schemaSteps: any[] = (formSchema as any).steps || [];
		const autoOpenSubsections = new Set<string>();
		const autoCloseSubsections = new Set<string>();

		schemaSteps.forEach((step) => {
			const sectionId: string = step.id;
			const subsections: any[] = step.subsections || [];

			subsections.forEach((subsection: any) => {
				const subsectionKey = `${sectionId}::${subsection.id}`;
				const fieldIds: string[] = subsection.fields || [];

				if (fieldIds.length === 0) return;

				// Check field states
				const fieldStates = fieldIds.map((fieldId) => {
					const meta = fieldMetadata[fieldId];
					const hasWarnings =
						meta?.warnings && meta.warnings.length > 0;
					return {
						isBlue: isFieldBlue(fieldId, sectionId),
						isGreen: isFieldGreen(fieldId, sectionId),
						isWhite: isFieldWhite(fieldId, sectionId),
						hasValue: isProjectValueProvided(
							(formData as any)[fieldId]
						),
						isLocked: isFieldLocked(fieldId, sectionId),
						hasWarnings: hasWarnings,
					};
				});

				// All green: all fields have values AND are locked
				const allGreen =
					fieldIds.length > 0 &&
					fieldStates.every(
						(s) =>
							s.isGreen && !s.isBlue && !s.isWhite && s.isLocked
					);
				const allWhite =
					fieldIds.length > 0 &&
					fieldStates.every(
						(s) => s.isWhite && !s.isBlue && !s.isGreen
					);
				const hasBlue = fieldStates.some((s) => s.isBlue);
				const hasWarnings = fieldStates.some((s) => s.hasWarnings);

				// Determine auto-state
				// Auto-open if: has blue fields OR has warnings (errors)
				// Auto-close if: all green (complete) OR all white (empty)
				if (hasBlue || hasWarnings) {
					autoOpenSubsections.add(subsectionKey);
				} else if (allGreen || allWhite) {
					autoCloseSubsections.add(subsectionKey);
				}
			});
		});

		setExpandedSubsections((prev) => {
			const next = new Set(prev);
			// Auto-open subsections with blue fields
			autoOpenSubsections.forEach((key) => {
				if (!manuallyToggledSubsections.has(key)) next.add(key);
			});
			// Auto-close subsections that are all green or all white
			autoCloseSubsections.forEach((key) => {
				if (!manuallyToggledSubsections.has(key)) next.delete(key);
			});
			return next;
		});
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		unlockedFields,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
		isFieldLocked,
		manuallyToggledSubsections,
	]);

	// Helper to get blue/green/white styling for complex table wrappers (arrays like unit mix, rent comps, etc.)
	const getTableWrapperClasses = useCallback(
		(fieldId: string, sectionId: string) => {
			const value = (formData as any)[fieldId];
			// Check if value is provided - handle objects with keys
			const hasValue = (() => {
				if (Array.isArray(value)) {
					return isProjectValueProvided(value);
				}
				if (value && typeof value === "object") {
					// For objects, check if they have any keys
					return Object.keys(value).length > 0;
				}
				return isProjectValueProvided(value ?? null);
			})();
			const locked = isFieldLocked(fieldId, sectionId);

			const base =
				"w-full border rounded-md text-sm transition-colors duration-200";

			if (!hasValue) {
				return cn(
					base,
					"border-gray-200 bg-white hover:border-gray-300"
				);
			}

			if (locked) {
				return cn(
					base,
					"border-emerald-500 bg-emerald-50 hover:border-emerald-600"
				);
			}

			return cn(base, "border-blue-600 bg-blue-50 hover:border-blue-700");
		},
		[formData, isFieldLocked]
	);

	const steps: Step[] = useMemo(() => {
		const schemaSteps: any[] = (formSchema as any).steps || [];

		return schemaSteps.map((step) => {
			const sectionId: string = step.id;
			const IconComponent =
				(step.icon && sectionIconComponents[step.icon as string]) ||
				FileText;
			const subsections: any[] = step.subsections || [];

			const renderSubsection = (subsection: any) => {
				const subsectionId: string = subsection.id;
				const subsectionKey = `${sectionId}::${subsectionId}`;
				const isExpanded = expandedSubsections.has(subsectionKey);

				const allFieldIds: string[] = subsection.fields || [];

				// Determine subsection state for visual indication
				const subsectionLocked = isSubsectionFullyLocked(allFieldIds);
				const fieldStates =
					allFieldIds.length > 0
						? allFieldIds.map((fieldId) => {
								const meta = fieldMetadata[fieldId];
								const hasWarnings =
									meta?.warnings && meta.warnings.length > 0;
								return {
									isBlue: isFieldBlue(fieldId, sectionId),
									isGreen: isFieldGreen(fieldId, sectionId),
									isWhite: isFieldWhite(fieldId, sectionId),
									hasValue: isProjectValueProvided(
										(formData as any)[fieldId]
									),
									isLocked: isFieldLocked(fieldId, sectionId),
									hasWarnings: hasWarnings,
								};
						  })
						: [];

				const allGreen =
					fieldStates.length > 0 &&
					fieldStates.every(
						(state) =>
							state.isGreen &&
							!state.isBlue &&
							!state.isWhite &&
							state.isLocked
					);
				const allWhite =
					fieldStates.length > 0 &&
					fieldStates.every(
						(state) =>
							state.isWhite && !state.isBlue && !state.isGreen
					);
				const hasBlue = fieldStates.some((state) => state.isBlue);
				const hasWarnings = fieldStates.some(
					(state) => state.hasWarnings
				);

				// Determine badge state
				// Multiple badges can show simultaneously:
				// - Error badge: shows if any field has warnings (can coexist with Needs Input)
				// - Needs Input badge: shows if any field is blue (can coexist with Error)
				// - Complete badge: exclusive, only shows when all green AND no errors AND no needs input
				const showError = hasWarnings;
				const showNeedsInput = hasBlue;
				const showComplete =
					allFieldIds.length > 0 &&
					allGreen &&
					!hasBlue &&
					!hasWarnings;

				// A subsection can only be locked when all fields that should be part of it
				// are non-empty. If any field is empty, we prevent locking the subsection
				// and instead show a tooltip explaining why.
				const hasEmptyField = fieldStates.some(
					(state) => !state.hasValue
				);
				const subsectionLockDisabled =
					!subsectionLocked && hasEmptyField;

				const subsectionLockTitle = subsectionLockDisabled
					? "Cannot lock subsection because one or more fields are empty. Please fill in all fields first."
					: subsectionLocked
					? "Unlock subsection"
					: "Lock subsection";

				// Remove leading numbers (e.g., "1.1 ", "2.3 ") from subsection titles
				const cleanTitle = subsection.title.replace(/^\d+\.\d+\s*/, "");

				return (
					<div
						key={subsectionId}
						className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden shadow-md"
					>
						<button
							type="button"
							onClick={() => toggleSubsection(subsectionKey)}
							className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
						>
							<div className="flex items-center gap-2">
								{isExpanded ? (
									<ChevronDown className="h-4 w-4 text-gray-500" />
								) : (
									<ChevronRight className="h-4 w-4 text-gray-500" />
								)}
								<h3 className="text-sm font-semibold text-gray-800">
									{cleanTitle}
								</h3>
							</div>
							<div className="flex items-center gap-2">
								<div
									onClick={(e) => {
										e.stopPropagation();
										if (subsectionLockDisabled) return;
										toggleSubsectionLock(allFieldIds);
									}}
									className={cn(
										"flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all border",
										subsectionLockDisabled
											? "cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200"
											: "cursor-pointer",
										!subsectionLockDisabled &&
											(subsectionLocked
												? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
												: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")
									)}
									title={subsectionLockTitle}
								>
									{subsectionLocked ? (
										<>
											<Lock className="h-3 w-3" />
											<span>Unlock</span>
										</>
									) : (
										<>
											<Unlock className="h-3 w-3" />
											<span>Lock</span>
										</>
									)}
								</div>
								{showError && (
									<span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
										Error
									</span>
								)}
								{showNeedsInput && (
									<span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
										Needs Input
									</span>
								)}
								{showComplete && (
									<span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
										Complete
									</span>
								)}
							</div>
						</button>
						{isExpanded && (
							<div className="p-3 pt-0 space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{allFieldIds
										// drawSchedule is rendered as a structured table below
										.filter(
											(fieldId) =>
												!(
													sectionId === "timeline" &&
													fieldId === "drawSchedule"
												) &&
												// Filter out financial table fields that are rendered as special tables
												!(
													sectionId ===
														"financial-details" &&
													(fieldId ===
														"fiveYearCashFlow" ||
														fieldId ===
															"returnsBreakdown" ||
														fieldId ===
															"quarterlyDeliverySchedule" ||
														fieldId ===
															"sensitivityAnalysis" ||
														fieldId ===
															"capitalUseTiming")
												) &&
												// Filter out risk fields that are rendered as editable lists
												!(
													sectionId ===
														"financial-details" &&
													subsectionId ===
														"risk-analysis" &&
													(fieldId === "riskHigh" ||
														fieldId ===
															"riskMedium" ||
														fieldId === "riskLow")
												) &&
												// Filter out market context table fields that are rendered as special tables
												!(
													sectionId ===
														"market-context" &&
													(fieldId ===
														"majorEmployers" ||
														fieldId ===
															"deliveryByQuarter" ||
														fieldId === "rentComps")
												)
										)
										.map((fieldId, idx) => {
											const fieldElement =
												renderDynamicField(
													fieldId,
													sectionId
												);
											// Wrap in Fragment with unique key to handle fields that appear in multiple subsections
											return (
												<React.Fragment
													key={`${subsectionId}-${fieldId}-${idx}`}
												>
													{fieldElement}
												</React.Fragment>
											);
										})}
								</div>

								{/* Section-specific tables in edit mode */}
								{sectionId === "property-specs" &&
									subsectionId === "physical-structure" && (
										<>
											{/* Residential Unit Mix */}
											<div
												className={cn(
													getTableWrapperClasses(
														"residentialUnitMix",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Residential Unit Mix
														</h4>
														{isFieldRequiredFromSchema(
															"residentialUnitMix"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="residentialUnitMix"
															fieldMetadata={
																fieldMetadata[
																	"residentialUnitMix"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"residentialUnitMix",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Unit Type
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Count
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Avg SF
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Monthly Rent
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Total SF
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value = (
																	formData as any
																)
																	.residentialUnitMix;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"residentialUnitMix",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		key:
																			| "unitType"
																			| "unitCount"
																			| "avgSF"
																			| "monthlyRent"
																			| "totalSF",
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const current =
																			next[
																				index
																			] ||
																			{};
																		let v: any =
																			raw;
																		if (
																			[
																				"unitCount",
																				"avgSF",
																				"monthlyRent",
																				"totalSF",
																			].includes(
																				key
																			)
																		) {
																			v =
																				raw.trim() ===
																				""
																					? undefined
																					: Number(
																							raw
																					  );
																			if (
																				Number.isNaN(
																					v
																				)
																			) {
																				v =
																					undefined;
																			}
																		}
																		next[
																			index
																		] = {
																			...current,
																			[key]: v,
																		};
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			{
																				unitType:
																					"",
																				unitCount:
																					undefined,
																				avgSF: undefined,
																				monthlyRent:
																					undefined,
																				totalSF:
																					undefined,
																			}
																		);
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [{}];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr
																					key={
																						idx
																					}
																				>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.unitType ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"unitType",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.unitCount ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"unitCount",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.avgSF ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"avgSF",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.monthlyRent ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"monthlyRent",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.totalSF ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"totalSF",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="sm"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td
																				colSpan={
																					6
																				}
																				className="px-3 pt-3"
																			>
																				<Button
																					type="button"
																					variant="outline"
																					size="sm"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add
																					Row
																				</Button>
																			</td>
																		</tr>
																	</>
																);
															})()}
														</tbody>
													</table>
												</div>
											</div>

											{/* Commercial Space Mix */}
											<div
												className={cn(
													getTableWrapperClasses(
														"commercialSpaceMix",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Commercial Space Mix
														</h4>
														{isFieldRequiredFromSchema(
															"commercialSpaceMix"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="commercialSpaceMix"
															fieldMetadata={
																fieldMetadata[
																	"commercialSpaceMix"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"commercialSpaceMix",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Space Type
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Square
																	Footage
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Tenant
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Lease Term
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Annual Rent
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value = (
																	formData as any
																)
																	.commercialSpaceMix;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"commercialSpaceMix",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		key:
																			| "spaceType"
																			| "squareFootage"
																			| "tenant"
																			| "leaseTerm"
																			| "annualRent",
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const current =
																			next[
																				index
																			] ||
																			{};
																		let v: any =
																			raw;
																		if (
																			[
																				"squareFootage",
																				"annualRent",
																			].includes(
																				key
																			)
																		) {
																			v =
																				raw.trim() ===
																				""
																					? undefined
																					: Number(
																							raw
																					  );
																			if (
																				Number.isNaN(
																					v
																				)
																			) {
																				v =
																					undefined;
																			}
																		}
																		next[
																			index
																		] = {
																			...current,
																			[key]: v,
																		};
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			{
																				spaceType:
																					"",
																				squareFootage:
																					undefined,
																				tenant: "",
																				leaseTerm:
																					"",
																				annualRent:
																					undefined,
																			}
																		);
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [{}];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr
																					key={
																						idx
																					}
																				>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.spaceType ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"spaceType",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.squareFootage ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"squareFootage",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-36 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.tenant ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"tenant",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.leaseTerm ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"leaseTerm",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.annualRent ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"annualRent",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="sm"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td
																				colSpan={
																					6
																				}
																				className="px-3 pt-3"
																			>
																				<Button
																					type="button"
																					variant="outline"
																					size="sm"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add
																					Row
																				</Button>
																			</td>
																		</tr>
																	</>
																);
															})()}
														</tbody>
													</table>
												</div>
											</div>
										</>
									)}

								{sectionId === "timeline" &&
									subsectionId ===
										"construction-lease-up-status" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"drawSchedule",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Draw Schedule
													</h4>
													{isFieldRequiredFromSchema(
														"drawSchedule"
													) && (
														<span className="text-red-500 ml-1">
															*
														</span>
													)}
													<FieldHelpTooltip
														fieldId="drawSchedule"
														fieldMetadata={
															fieldMetadata[
																"drawSchedule"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"drawSchedule",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Draw #
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																% Complete
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Amount
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value = (
																formData as any
															).drawSchedule;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"drawSchedule",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "drawNumber"
																		| "percentComplete"
																		| "amount",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw.trim() ===
																		""
																			? undefined
																			: Number(
																					raw
																			  );
																	if (
																		Number.isNaN(
																			v
																		)
																	) {
																		v =
																			undefined;
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		drawNumber:
																			(next.length ||
																				0) +
																			1,
																		percentComplete:
																			undefined,
																		amount: undefined,
																	});
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [{}];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr
																				key={
																					idx
																				}
																			>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							1
																						}
																						className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.drawNumber ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"drawNumber",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<div className="flex items-center gap-1">
																						<input
																							type="number"
																							min={
																								0
																							}
																							max={
																								100
																							}
																							className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.percentComplete ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"percentComplete",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																						<span className="text-gray-500">
																							%
																						</span>
																					</div>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<div className="flex items-center gap-1">
																						<span className="text-gray-500">
																							$
																						</span>
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.amount ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"amount",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</div>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="sm"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td
																			colSpan={
																				4
																			}
																			className="px-3 pt-3"
																		>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add
																				Row
																			</Button>
																		</td>
																	</tr>
																</>
															);
														})()}
													</tbody>
												</table>
											</div>
										</div>
									)}

								{sectionId === "market-context" &&
									subsectionId === "supply-demand" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"rentComps",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Rent Comparables
													</h4>
													{isFieldRequiredFromSchema(
														"rentComps"
													) && (
														<span className="text-red-500 ml-1">
															*
														</span>
													)}
													<FieldHelpTooltip
														fieldId="rentComps"
														fieldMetadata={
															fieldMetadata[
																"rentComps"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"rentComps",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Property Name
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Address
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Distance (mi)
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Year Built
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Units
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Occupancy %
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Avg Rent/Month
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Rent/PSF
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value = (
																formData as any
															).rentComps;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"rentComps",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "propertyName"
																		| "address"
																		| "distance"
																		| "yearBuilt"
																		| "totalUnits"
																		| "occupancyPercent"
																		| "avgRentMonth"
																		| "rentPSF",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw;
																	if (
																		[
																			"distance",
																			"yearBuilt",
																			"totalUnits",
																			"occupancyPercent",
																			"avgRentMonth",
																			"rentPSF",
																		].includes(
																			key
																		)
																	) {
																		v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		if (
																			Number.isNaN(
																				v
																			)
																		) {
																			v =
																				undefined;
																		}
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		propertyName:
																			"",
																		address:
																			"",
																		distance:
																			undefined,
																		yearBuilt:
																			undefined,
																		totalUnits:
																			undefined,
																		occupancyPercent:
																			undefined,
																		avgRentMonth:
																			undefined,
																		rentPSF:
																			undefined,
																	});
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [{}];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr
																				key={
																					idx
																				}
																			>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.propertyName ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"propertyName",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-56 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.address ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"address",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						step="0.01"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.distance ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"distance",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.yearBuilt ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"yearBuilt",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.totalUnits ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"totalUnits",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.occupancyPercent ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"occupancyPercent",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.avgRentMonth ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"avgRentMonth",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						step="0.01"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.rentPSF ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"rentPSF",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="sm"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td
																			colSpan={
																				9
																			}
																			className="px-3 pt-3"
																		>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add
																				Row
																			</Button>
																		</td>
																	</tr>
																</>
															);
														})()}
													</tbody>
												</table>
											</div>
										</div>
									)}

								{/* Major Employers Table */}
								{sectionId === "market-context" &&
									subsectionId === "demographics-economy" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"majorEmployers",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Major Employers
													</h4>
													{isFieldRequiredFromSchema(
														"majorEmployers"
													) && (
														<span className="text-red-500 ml-1">
															*
														</span>
													)}
													<FieldHelpTooltip
														fieldId="majorEmployers"
														fieldMetadata={
															fieldMetadata[
																"majorEmployers"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"majorEmployers",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Name
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Employees
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Growth
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Distance
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value = (
																formData as any
															).majorEmployers;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"majorEmployers",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "name"
																		| "employees"
																		| "growth"
																		| "distance",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw;
																	if (
																		key ===
																		"employees"
																	) {
																		v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		if (
																			Number.isNaN(
																				v
																			)
																		) {
																			v =
																				undefined;
																		}
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"majorEmployers",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		name: "",
																		employees:
																			undefined,
																		growth: "",
																		distance:
																			"",
																	});
																	handleInputChange(
																		"majorEmployers",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"majorEmployers",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [
																			{
																				name: "",
																				employees:
																					undefined,
																				growth: "",
																				distance:
																					"",
																			},
																	  ];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr
																				key={
																					idx
																				}
																			>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.name ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"name",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="Company Name"
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.employees ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"employees",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="0"
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.growth ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"growth",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="+6%"
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.distance ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"distance",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="0.6 miles"
																					/>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="sm"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td
																			colSpan={
																				5
																			}
																			className="px-3 pt-3"
																		>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add
																				Row
																			</Button>
																		</td>
																	</tr>
																</>
															);
														})()}
													</tbody>
												</table>
											</div>
										</div>
									)}

								{/* Delivery by Quarter Table */}
								{sectionId === "market-context" &&
									subsectionId === "supply-demand" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"deliveryByQuarter",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Delivery by Quarter
													</h4>
													{isFieldRequiredFromSchema(
														"deliveryByQuarter"
													) && (
														<span className="text-red-500 ml-1">
															*
														</span>
													)}
													<FieldHelpTooltip
														fieldId="deliveryByQuarter"
														fieldMetadata={
															fieldMetadata[
																"deliveryByQuarter"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"deliveryByQuarter",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Quarter
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Units
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value = (
																formData as any
															).deliveryByQuarter;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"deliveryByQuarter",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "quarter"
																		| "units",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw;
																	if (
																		key ===
																		"units"
																	) {
																		v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		if (
																			Number.isNaN(
																				v
																			)
																		) {
																			v =
																				undefined;
																		}
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"deliveryByQuarter",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		quarter:
																			"",
																		units: undefined,
																	});
																	handleInputChange(
																		"deliveryByQuarter",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"deliveryByQuarter",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [
																			{
																				quarter:
																					"",
																				units: undefined,
																			},
																	  ];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr
																				key={
																					idx
																				}
																			>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.quarter ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"quarter",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="Q4 2024"
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={
																							0
																						}
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.units ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"units",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																						placeholder="0"
																					/>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="sm"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td
																			colSpan={
																				3
																			}
																			className="px-3 pt-3"
																		>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add
																				Row
																			</Button>
																		</td>
																	</tr>
																</>
															);
														})()}
													</tbody>
												</table>
											</div>
										</div>
									)}

								{/* Financial Table Fields - Investment Metrics & Exit */}
								{sectionId === "financial-details" &&
									subsectionId ===
										"investment-metrics-exit" && (
										<>
											{/* Five Year Cash Flow */}
											<div
												className={cn(
													getTableWrapperClasses(
														"fiveYearCashFlow",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Five Year Cash Flow
														</h4>
														{isFieldRequiredFromSchema(
															"fiveYearCashFlow"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="fiveYearCashFlow"
															fieldMetadata={
																fieldMetadata[
																	"fiveYearCashFlow"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"fiveYearCashFlow",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Year
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Cash Flow
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value = (
																	formData as any
																)
																	.fiveYearCashFlow;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"fiveYearCashFlow",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		if (
																			index >=
																			next.length
																		) {
																			next.push(
																				Number.isNaN(
																					v
																				)
																					? undefined
																					: v
																			);
																		} else {
																			next[
																				index
																			] =
																				Number.isNaN(
																					v
																				)
																					? undefined
																					: v;
																		}
																		handleInputChange(
																			"fiveYearCashFlow",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			undefined
																		);
																		handleInputChange(
																			"fiveYearCashFlow",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"fiveYearCashFlow",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [
																				undefined,
																		  ];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr
																					key={
																						idx
																					}
																				>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						Year{" "}
																						{idx +
																							1}
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<div className="flex items-center gap-1">
																							<span className="text-gray-500">
																								$
																							</span>
																							<input
																								type="number"
																								min={
																									0
																								}
																								className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																								value={
																									row ??
																									""
																								}
																								onChange={(
																									e
																								) =>
																									handleRowChange(
																										idx,
																										e
																											.target
																											.value
																									)
																								}
																								disabled={
																									isLocked
																								}
																							/>
																						</div>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="sm"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td
																				colSpan={
																					3
																				}
																				className="px-3 pt-3"
																			>
																				<Button
																					type="button"
																					variant="outline"
																					size="sm"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add
																					Year
																				</Button>
																			</td>
																		</tr>
																	</>
																);
															})()}
														</tbody>
													</table>
												</div>
											</div>

											{/* Returns Breakdown */}
											<div
												className={cn(
													getTableWrapperClasses(
														"returnsBreakdown",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Returns Breakdown
														</h4>
														{isFieldRequiredFromSchema(
															"returnsBreakdown"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="returnsBreakdown"
															fieldMetadata={
																fieldMetadata[
																	"returnsBreakdown"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"returnsBreakdown",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Component
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Percentage
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value = (
																	formData as any
																)
																	.returnsBreakdown;
																const data =
																	value &&
																	typeof value ===
																		"object" &&
																	!Array.isArray(
																		value
																	)
																		? value
																		: {};
																const isLocked =
																	isFieldLocked(
																		"returnsBreakdown",
																		sectionId
																	);

																const handleChange =
																	(
																		key: string,
																		raw: string
																	) => {
																		const v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		const updated =
																			{
																				...data,
																				[key]: Number.isNaN(
																					v
																				)
																					? undefined
																					: v,
																			};
																		handleInputChange(
																			"returnsBreakdown",
																			updated
																		);
																	};

																return (
																	<>
																		<tr>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				Cash
																				Flow
																			</td>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				<div className="flex items-center gap-1">
																					<input
																						type="number"
																						min={
																							0
																						}
																						max={
																							100
																						}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							data.cashFlow ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleChange(
																								"cashFlow",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																					<span className="text-gray-500">
																						%
																					</span>
																				</div>
																			</td>
																		</tr>
																		<tr>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				Asset
																				Appreciation
																			</td>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				<div className="flex items-center gap-1">
																					<input
																						type="number"
																						min={
																							0
																						}
																						max={
																							100
																						}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							data.assetAppreciation ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleChange(
																								"assetAppreciation",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																					<span className="text-gray-500">
																						%
																					</span>
																				</div>
																			</td>
																		</tr>
																		<tr>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				Tax
																				Benefits
																			</td>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				<div className="flex items-center gap-1">
																					<input
																						type="number"
																						min={
																							0
																						}
																						max={
																							100
																						}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							data.taxBenefits ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleChange(
																								"taxBenefits",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																					<span className="text-gray-500">
																						%
																					</span>
																				</div>
																			</td>
																		</tr>
																		<tr>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				Leverage
																			</td>
																			<td className="px-3 py-2 whitespace-nowrap align-middle">
																				<div className="flex items-center gap-1">
																					<input
																						type="number"
																						min={
																							0
																						}
																						max={
																							100
																						}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							data.leverage ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleChange(
																								"leverage",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																					<span className="text-gray-500">
																						%
																					</span>
																				</div>
																			</td>
																		</tr>
																	</>
																);
															})()}
														</tbody>
													</table>
												</div>
											</div>

											{/* Quarterly Delivery Schedule */}
											<div
												className={cn(
													getTableWrapperClasses(
														"quarterlyDeliverySchedule",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Quarterly Delivery
															Schedule
														</h4>
														{isFieldRequiredFromSchema(
															"quarterlyDeliverySchedule"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="quarterlyDeliverySchedule"
															fieldMetadata={
																fieldMetadata[
																	"quarterlyDeliverySchedule"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"quarterlyDeliverySchedule",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Quarter
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Units
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value = (
																	formData as any
																)
																	.quarterlyDeliverySchedule;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"quarterlyDeliverySchedule",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		key:
																			| "quarter"
																			| "units",
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const current =
																			next[
																				index
																			] ||
																			{};
																		let v: any =
																			raw;
																		if (
																			key ===
																			"units"
																		) {
																			v =
																				raw.trim() ===
																				""
																					? undefined
																					: Number(
																							raw
																					  );
																			if (
																				Number.isNaN(
																					v
																				)
																			) {
																				v =
																					undefined;
																			}
																		}
																		next[
																			index
																		] = {
																			...current,
																			[key]: v,
																		};
																		handleInputChange(
																			"quarterlyDeliverySchedule",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			{
																				quarter:
																					"",
																				units: undefined,
																			}
																		);
																		handleInputChange(
																			"quarterlyDeliverySchedule",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"quarterlyDeliverySchedule",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [
																				{
																					quarter:
																						"",
																					units: undefined,
																				},
																		  ];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr
																					key={
																						idx
																					}
																				>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.quarter ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"quarter",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																							placeholder="Q1 2025"
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={
																								0
																							}
																							className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.units ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"units",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="sm"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td
																				colSpan={
																					3
																				}
																				className="px-3 pt-3"
																			>
																				<Button
																					type="button"
																					variant="outline"
																					size="sm"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add
																					Row
																				</Button>
																			</td>
																		</tr>
																	</>
																);
															})()}
														</tbody>
													</table>
												</div>
											</div>

											{/* Sensitivity Analysis */}
											<div
												className={cn(
													getTableWrapperClasses(
														"sensitivityAnalysis",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Sensitivity Analysis
														</h4>
														{isFieldRequiredFromSchema(
															"sensitivityAnalysis"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="sensitivityAnalysis"
															fieldMetadata={
																fieldMetadata[
																	"sensitivityAnalysis"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"sensitivityAnalysis",
															sectionId
														)}
													</div>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{/* Rent Growth Impact */}
													<div>
														<h5 className="text-xs font-medium text-gray-700 mb-2">
															Rent Growth Impact
														</h5>
														<div className="overflow-x-auto">
															<table className="min-w-full divide-y divide-gray-200 text-sm">
																<thead className="bg-gray-50">
																	<tr>
																		<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																			Growth
																		</th>
																		<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																			IRR
																		</th>
																	</tr>
																</thead>
																<tbody className="bg-white divide-y divide-gray-100">
																	{(() => {
																		const value =
																			(
																				formData as any
																			)
																				.sensitivityAnalysis;
																		const data =
																			value &&
																			typeof value ===
																				"object" &&
																			!Array.isArray(
																				value
																			)
																				? value
																				: {};
																		const rows: any[] =
																			Array.isArray(
																				data.rentGrowthImpact
																			)
																				? data.rentGrowthImpact
																				: [];
																		const isLocked =
																			isFieldLocked(
																				"sensitivityAnalysis",
																				sectionId
																			);

																		const handleRowChange =
																			(
																				index: number,
																				key:
																					| "growth"
																					| "irr",
																				raw: string
																			) => {
																				const next =
																					[
																						...rows,
																					];
																				const current =
																					next[
																						index
																					] ||
																					{};
																				let v: any =
																					raw;
																				if (
																					key ===
																					"irr"
																				) {
																					v =
																						raw.trim() ===
																						""
																							? undefined
																							: Number(
																									raw
																							  );
																					if (
																						Number.isNaN(
																							v
																						)
																					) {
																						v =
																							undefined;
																					}
																				}
																				next[
																					index
																				] =
																					{
																						...current,
																						[key]: v,
																					};
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						rentGrowthImpact:
																							next,
																					}
																				);
																			};

																		const handleAddRow =
																			() => {
																				const next =
																					[
																						...rows,
																					];
																				next.push(
																					{
																						growth: "",
																						irr: undefined,
																					}
																				);
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						rentGrowthImpact:
																							next,
																					}
																				);
																			};

																		const handleRemoveRow =
																			(
																				index: number
																			) => {
																				const next =
																					[
																						...rows,
																					];
																				next.splice(
																					index,
																					1
																				);
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						rentGrowthImpact:
																							next,
																					}
																				);
																			};

																		const displayRows =
																			rows.length >
																			0
																				? rows
																				: [
																						{
																							growth: "",
																							irr: undefined,
																						},
																				  ];

																		return (
																			<>
																				{displayRows.map(
																					(
																						row,
																						idx
																					) => (
																						<tr
																							key={
																								idx
																							}
																						>
																							<td className="px-3 py-2 whitespace-nowrap align-middle">
																								<input
																									type="text"
																									className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																									value={
																										row.growth ??
																										""
																									}
																									onChange={(
																										e
																									) =>
																										handleRowChange(
																											idx,
																											"growth",
																											e
																												.target
																												.value
																										)
																									}
																									disabled={
																										isLocked
																									}
																									placeholder="0%"
																								/>
																							</td>
																							<td className="px-3 py-2 whitespace-nowrap align-middle">
																								<div className="flex items-center gap-1">
																									<input
																										type="number"
																										step="0.1"
																										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																										value={
																											row.irr ??
																											""
																										}
																										onChange={(
																											e
																										) =>
																											handleRowChange(
																												idx,
																												"irr",
																												e
																													.target
																													.value
																											)
																										}
																										disabled={
																											isLocked
																										}
																									/>
																									<span className="text-gray-500">
																										%
																									</span>
																								</div>
																							</td>
																							<td className="px-3 py-2 text-right align-middle">
																								<Button
																									type="button"
																									variant="ghost"
																									size="sm"
																									onClick={() =>
																										handleRemoveRow(
																											idx
																										)
																									}
																									disabled={
																										isLocked ||
																										rows.length <=
																											1
																									}
																									className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																								>
																									Remove
																								</Button>
																							</td>
																						</tr>
																					)
																				)}
																				<tr>
																					<td
																						colSpan={
																							3
																						}
																						className="px-3 pt-3"
																					>
																						<Button
																							type="button"
																							variant="outline"
																							size="sm"
																							onClick={
																								handleAddRow
																							}
																							disabled={
																								isLocked
																							}
																							className="text-xs px-3 py-1"
																						>
																							Add
																							Row
																						</Button>
																					</td>
																				</tr>
																			</>
																		);
																	})()}
																</tbody>
															</table>
														</div>
													</div>

													{/* Construction Cost Impact */}
													<div>
														<h5 className="text-xs font-medium text-gray-700 mb-2">
															Construction Cost
															Impact
														</h5>
														<div className="overflow-x-auto">
															<table className="min-w-full divide-y divide-gray-200 text-sm">
																<thead className="bg-gray-50">
																	<tr>
																		<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																			Cost
																			Change
																		</th>
																		<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																			IRR
																		</th>
																	</tr>
																</thead>
																<tbody className="bg-white divide-y divide-gray-100">
																	{(() => {
																		const value =
																			(
																				formData as any
																			)
																				.sensitivityAnalysis;
																		const data =
																			value &&
																			typeof value ===
																				"object" &&
																			!Array.isArray(
																				value
																			)
																				? value
																				: {};
																		const rows: any[] =
																			Array.isArray(
																				data.constructionCostImpact
																			)
																				? data.constructionCostImpact
																				: [];
																		const isLocked =
																			isFieldLocked(
																				"sensitivityAnalysis",
																				sectionId
																			);

																		const handleRowChange =
																			(
																				index: number,
																				key:
																					| "cost"
																					| "irr",
																				raw: string
																			) => {
																				const next =
																					[
																						...rows,
																					];
																				const current =
																					next[
																						index
																					] ||
																					{};
																				let v: any =
																					raw;
																				if (
																					key ===
																					"irr"
																				) {
																					v =
																						raw.trim() ===
																						""
																							? undefined
																							: Number(
																									raw
																							  );
																					if (
																						Number.isNaN(
																							v
																						)
																					) {
																						v =
																							undefined;
																					}
																				}
																				next[
																					index
																				] =
																					{
																						...current,
																						[key]: v,
																					};
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						constructionCostImpact:
																							next,
																					}
																				);
																			};

																		const handleAddRow =
																			() => {
																				const next =
																					[
																						...rows,
																					];
																				next.push(
																					{
																						cost: "",
																						irr: undefined,
																					}
																				);
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						constructionCostImpact:
																							next,
																					}
																				);
																			};

																		const handleRemoveRow =
																			(
																				index: number
																			) => {
																				const next =
																					[
																						...rows,
																					];
																				next.splice(
																					index,
																					1
																				);
																				handleInputChange(
																					"sensitivityAnalysis",
																					{
																						...data,
																						constructionCostImpact:
																							next,
																					}
																				);
																			};

																		const displayRows =
																			rows.length >
																			0
																				? rows
																				: [
																						{
																							cost: "",
																							irr: undefined,
																						},
																				  ];

																		return (
																			<>
																				{displayRows.map(
																					(
																						row,
																						idx
																					) => (
																						<tr
																							key={
																								idx
																							}
																						>
																							<td className="px-3 py-2 whitespace-nowrap align-middle">
																								<input
																									type="text"
																									className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																									value={
																										row.cost ??
																										""
																									}
																									onChange={(
																										e
																									) =>
																										handleRowChange(
																											idx,
																											"cost",
																											e
																												.target
																												.value
																										)
																									}
																									disabled={
																										isLocked
																									}
																									placeholder="Base"
																								/>
																							</td>
																							<td className="px-3 py-2 whitespace-nowrap align-middle">
																								<div className="flex items-center gap-1">
																									<input
																										type="number"
																										step="0.1"
																										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																										value={
																											row.irr ??
																											""
																										}
																										onChange={(
																											e
																										) =>
																											handleRowChange(
																												idx,
																												"irr",
																												e
																													.target
																													.value
																											)
																										}
																										disabled={
																											isLocked
																										}
																									/>
																									<span className="text-gray-500">
																										%
																									</span>
																								</div>
																							</td>
																							<td className="px-3 py-2 text-right align-middle">
																								<Button
																									type="button"
																									variant="ghost"
																									size="sm"
																									onClick={() =>
																										handleRemoveRow(
																											idx
																										)
																									}
																									disabled={
																										isLocked ||
																										rows.length <=
																											1
																									}
																									className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																								>
																									Remove
																								</Button>
																							</td>
																						</tr>
																					)
																				)}
																				<tr>
																					<td
																						colSpan={
																							3
																						}
																						className="px-3 pt-3"
																					>
																						<Button
																							type="button"
																							variant="outline"
																							size="sm"
																							onClick={
																								handleAddRow
																							}
																							disabled={
																								isLocked
																							}
																							className="text-xs px-3 py-1"
																						>
																							Add
																							Row
																						</Button>
																					</td>
																				</tr>
																			</>
																		);
																	})()}
																</tbody>
															</table>
														</div>
													</div>
												</div>
											</div>
										</>
									)}

								{/* Capital Use Timing - Uses of Funds */}
								{sectionId === "financial-details" &&
									subsectionId === "uses-of-funds" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"capitalUseTiming",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Capital Use Timing
													</h4>
													{isFieldRequiredFromSchema(
														"capitalUseTiming"
													) && (
														<span className="text-red-500 ml-1">
															*
														</span>
													)}
													<FieldHelpTooltip
														fieldId="capitalUseTiming"
														fieldMetadata={
															fieldMetadata[
																"capitalUseTiming"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"capitalUseTiming",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Use Type
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Timing
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value = (
																formData as any
															).capitalUseTiming;
															const data =
																value &&
																typeof value ===
																	"object" &&
																!Array.isArray(
																	value
																)
																	? value
																	: {};
															const isLocked =
																isFieldLocked(
																	"capitalUseTiming",
																	sectionId
																);

															const useTypes =
																Object.keys(
																	data
																);
															const allUseTypes =
																[
																	"landAcquisition",
																	"baseConstruction",
																	"contingency",
																	"constructionFees",
																	"aeFees",
																	"developerFee",
																	"interestReserve",
																	"workingCapital",
																	"opDeficitEscrow",
																	"leaseUpEscrow",
																	"ffe",
																	"thirdPartyReports",
																	"legalAndOrg",
																	"titleAndRecording",
																	"taxesDuringConstruction",
																	"loanFees",
																	"relocationCosts",
																	"syndicationCosts",
																	"enviroRemediation",
																	"pfcStructuringFee",
																];

															const handleChange =
																(
																	useType: string,
																	raw: string
																) => {
																	const updated =
																		{
																			...data,
																			[useType]:
																				raw.trim() ||
																				undefined,
																		};
																	handleInputChange(
																		"capitalUseTiming",
																		updated
																	);
																};

															const handleAddRow =
																() => {
																	// Find first unused use type
																	const unusedType =
																		allUseTypes.find(
																			(
																				type
																			) =>
																				!(
																					type in
																					data
																				)
																		);
																	if (
																		unusedType
																	) {
																		handleInputChange(
																			"capitalUseTiming",
																			{
																				...data,
																				[unusedType]:
																					"",
																			}
																		);
																	}
																};

															const handleRemoveRow =
																(
																	useType: string
																) => {
																	const updated =
																		{
																			...data,
																		};
																	delete updated[
																		useType
																	];
																	handleInputChange(
																		"capitalUseTiming",
																		updated
																	);
																};

															const displayRows =
																useTypes.length >
																0
																	? useTypes.map(
																			(
																				type
																			) => ({
																				useType:
																					type,
																				timing: data[
																					type
																				],
																			})
																	  )
																	: [
																			{
																				useType:
																					"",
																				timing: "",
																			},
																	  ];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => {
																			const formattedUseType =
																				row.useType
																					.replace(
																						/([A-Z])/g,
																						" $1"
																					)
																					.replace(
																						/^./,
																						(
																							str
																						) =>
																							str.toUpperCase()
																					)
																					.trim();
																			return (
																				<tr
																					key={
																						idx
																					}
																				>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						{row.useType ? (
																							<span>
																								{
																									formattedUseType
																								}
																							</span>
																						) : (
																							<select
																								className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																								value={
																									row.useType
																								}
																								onChange={(
																									e
																								) => {
																									const newType =
																										e
																											.target
																											.value;
																									if (
																										newType
																									) {
																										const updated =
																											{
																												...data,
																											};
																										if (
																											row.useType
																										) {
																											delete updated[
																												row
																													.useType
																											];
																										}
																										updated[
																											newType
																										] =
																											row.timing ||
																											"";
																										handleInputChange(
																											"capitalUseTiming",
																											updated
																										);
																									}
																								}}
																								disabled={
																									isLocked
																								}
																							>
																								<option value="">
																									Select
																									Use
																									Type
																								</option>
																								{allUseTypes
																									.filter(
																										(
																											type
																										) =>
																											!(
																												type in
																												data
																											) ||
																											type ===
																												row.useType
																									)
																									.map(
																										(
																											type
																										) => {
																											const label =
																												type
																													.replace(
																														/([A-Z])/g,
																														" $1"
																													)
																													.replace(
																														/^./,
																														(
																															str
																														) =>
																															str.toUpperCase()
																													)
																													.trim();
																											return (
																												<option
																													key={
																														type
																													}
																													value={
																														type
																													}
																												>
																													{
																														label
																													}
																												</option>
																											);
																										}
																									)}
																							</select>
																						)}
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.timing ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleChange(
																									row.useType,
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked ||
																								!row.useType
																							}
																							placeholder="Months 1-24"
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="sm"
																							onClick={() =>
																								handleRemoveRow(
																									row.useType
																								)
																							}
																							disabled={
																								isLocked ||
																								!row.useType ||
																								useTypes.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			);
																		}
																	)}
																	<tr>
																		<td
																			colSpan={
																				3
																			}
																			className="px-3 pt-3"
																		>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked ||
																					useTypes.length >=
																						allUseTypes.length
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add
																				Use
																				Type
																			</Button>
																		</td>
																	</tr>
																</>
															);
														})()}
													</tbody>
												</table>
											</div>
										</div>
									)}

								{/* Risk Analysis Fields */}
								{sectionId === "financial-details" &&
									subsectionId === "risk-analysis" && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* High Risk Items */}
											<div
												className={cn(
													getTableWrapperClasses(
														"riskHigh",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															High Risk Items
														</h4>
														{isFieldRequiredFromSchema(
															"riskHigh"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="riskHigh"
															fieldMetadata={
																fieldMetadata[
																	"riskHigh"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"riskHigh",
															sectionId
														)}
													</div>
												</div>
												{(() => {
													const value = (
														formData as any
													).riskHigh;
													const items: string[] =
														Array.isArray(value)
															? value.map(
																	(item) => {
																		// If item is an object, extract the 'risk' property
																		if (
																			item &&
																			typeof item ===
																				"object" &&
																			!Array.isArray(
																				item
																			)
																		) {
																			return (
																				item.risk ||
																				item.text ||
																				item.value ||
																				JSON.stringify(
																					item
																				)
																			);
																		}
																		return String(
																			item
																		);
																	}
															  )
															: value &&
															  typeof value ===
																	"string"
															? value
																	.split(
																		/[,\n]/
																	)
																	.map(
																		(
																			item
																		) =>
																			item.trim()
																	)
																	.filter(
																		Boolean
																	)
															: [];
													const isLocked =
														isFieldLocked(
															"riskHigh",
															sectionId
														);

													const handleItemChange = (
														index: number,
														newValue: string
													) => {
														const next = [...items];
														next[index] = newValue;
														handleInputChange(
															"riskHigh",
															next
														);
													};

													const handleAddItem =
														() => {
															const next = [
																...items,
																"",
															];
															handleInputChange(
																"riskHigh",
																next
															);
														};

													const handleRemoveItem = (
														index: number
													) => {
														const next = [...items];
														next.splice(index, 1);
														handleInputChange(
															"riskHigh",
															next
														);
													};

													const displayItems =
														items.length > 0
															? items
															: [""];

													return (
														<div className="space-y-2">
															{displayItems.map(
																(item, idx) => (
																	<div
																		key={
																			idx
																		}
																		className="flex items-center gap-2"
																	>
																		<input
																			type="text"
																			className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																			value={
																				item
																			}
																			onChange={(
																				e
																			) =>
																				handleItemChange(
																					idx,
																					e
																						.target
																						.value
																				)
																			}
																			disabled={
																				isLocked
																			}
																			placeholder="Enter risk item"
																		/>
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() =>
																				handleRemoveItem(
																					idx
																				)
																			}
																			disabled={
																				isLocked ||
																				items.length <=
																					1
																			}
																			className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																		>
																			Remove
																		</Button>
																	</div>
																)
															)}
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={
																	handleAddItem
																}
																disabled={
																	isLocked
																}
																className="text-xs px-3 py-1"
															>
																Add Item
															</Button>
														</div>
													);
												})()}
											</div>

											{/* Medium Risk Items */}
											<div
												className={cn(
													getTableWrapperClasses(
														"riskMedium",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Medium Risk Items
														</h4>
														{isFieldRequiredFromSchema(
															"riskMedium"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="riskMedium"
															fieldMetadata={
																fieldMetadata[
																	"riskMedium"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"riskMedium",
															sectionId
														)}
													</div>
												</div>
												{(() => {
													const value = (
														formData as any
													).riskMedium;
													const items: string[] =
														Array.isArray(value)
															? value.map(
																	(item) => {
																		// If item is an object, extract the 'risk' property
																		if (
																			item &&
																			typeof item ===
																				"object" &&
																			!Array.isArray(
																				item
																			)
																		) {
																			return (
																				item.risk ||
																				item.text ||
																				item.value ||
																				JSON.stringify(
																					item
																				)
																			);
																		}
																		return String(
																			item
																		);
																	}
															  )
															: value &&
															  typeof value ===
																	"string"
															? value
																	.split(
																		/[,\n]/
																	)
																	.map(
																		(
																			item
																		) =>
																			item.trim()
																	)
																	.filter(
																		Boolean
																	)
															: [];
													const isLocked =
														isFieldLocked(
															"riskMedium",
															sectionId
														);

													const handleItemChange = (
														index: number,
														newValue: string
													) => {
														const next = [...items];
														next[index] = newValue;
														handleInputChange(
															"riskMedium",
															next
														);
													};

													const handleAddItem =
														() => {
															const next = [
																...items,
																"",
															];
															handleInputChange(
																"riskMedium",
																next
															);
														};

													const handleRemoveItem = (
														index: number
													) => {
														const next = [...items];
														next.splice(index, 1);
														handleInputChange(
															"riskMedium",
															next
														);
													};

													const displayItems =
														items.length > 0
															? items
															: [""];

													return (
														<div className="space-y-2">
															{displayItems.map(
																(item, idx) => (
																	<div
																		key={
																			idx
																		}
																		className="flex items-center gap-2"
																	>
																		<input
																			type="text"
																			className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																			value={
																				item
																			}
																			onChange={(
																				e
																			) =>
																				handleItemChange(
																					idx,
																					e
																						.target
																						.value
																				)
																			}
																			disabled={
																				isLocked
																			}
																			placeholder="Enter risk item"
																		/>
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() =>
																				handleRemoveItem(
																					idx
																				)
																			}
																			disabled={
																				isLocked ||
																				items.length <=
																					1
																			}
																			className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																		>
																			Remove
																		</Button>
																	</div>
																)
															)}
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={
																	handleAddItem
																}
																disabled={
																	isLocked
																}
																className="text-xs px-3 py-1"
															>
																Add Item
															</Button>
														</div>
													);
												})()}
											</div>

											{/* Low Risk Items */}
											<div
												className={cn(
													getTableWrapperClasses(
														"riskLow",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Low Risk Items
														</h4>
														{isFieldRequiredFromSchema(
															"riskLow"
														) && (
															<span className="text-red-500 ml-1">
																*
															</span>
														)}
														<FieldHelpTooltip
															fieldId="riskLow"
															fieldMetadata={
																fieldMetadata[
																	"riskLow"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"riskLow",
															sectionId
														)}
													</div>
												</div>
												{(() => {
													const value = (
														formData as any
													).riskLow;
													const items: string[] =
														Array.isArray(value)
															? value.map(
																	(item) => {
																		// If item is an object, extract the 'risk' property
																		if (
																			item &&
																			typeof item ===
																				"object" &&
																			!Array.isArray(
																				item
																			)
																		) {
																			return (
																				item.risk ||
																				item.text ||
																				item.value ||
																				JSON.stringify(
																					item
																				)
																			);
																		}
																		return String(
																			item
																		);
																	}
															  )
															: value &&
															  typeof value ===
																	"string"
															? value
																	.split(
																		/[,\n]/
																	)
																	.map(
																		(
																			item
																		) =>
																			item.trim()
																	)
																	.filter(
																		Boolean
																	)
															: [];
													const isLocked =
														isFieldLocked(
															"riskLow",
															sectionId
														);

													const handleItemChange = (
														index: number,
														newValue: string
													) => {
														const next = [...items];
														next[index] = newValue;
														handleInputChange(
															"riskLow",
															next
														);
													};

													const handleAddItem =
														() => {
															const next = [
																...items,
																"",
															];
															handleInputChange(
																"riskLow",
																next
															);
														};

													const handleRemoveItem = (
														index: number
													) => {
														const next = [...items];
														next.splice(index, 1);
														handleInputChange(
															"riskLow",
															next
														);
													};

													const displayItems =
														items.length > 0
															? items
															: [""];

													return (
														<div className="space-y-2">
															{displayItems.map(
																(item, idx) => (
																	<div
																		key={
																			idx
																		}
																		className="flex items-center gap-2"
																	>
																		<input
																			type="text"
																			className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																			value={
																				item
																			}
																			onChange={(
																				e
																			) =>
																				handleItemChange(
																					idx,
																					e
																						.target
																						.value
																				)
																			}
																			disabled={
																				isLocked
																			}
																			placeholder="Enter risk item"
																		/>
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() =>
																				handleRemoveItem(
																					idx
																				)
																			}
																			disabled={
																				isLocked ||
																				items.length <=
																					1
																			}
																			className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																		>
																			Remove
																		</Button>
																	</div>
																)
															)}
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={
																	handleAddItem
																}
																disabled={
																	isLocked
																}
																className="text-xs px-3 py-1"
															>
																Add Item
															</Button>
														</div>
													);
												})()}
											</div>
										</div>
									)}

								{sectionId === "site-context" &&
									subsectionId === "project-media" && (
										<div className="mt-2">
											<h4 className="text-sm font-semibold text-gray-800 mb-3">
												Project Media
											</h4>
											<ProjectMediaUpload
												projectId={formData.id}
												orgId={activeOrg?.id || null}
												disabled={false}
												formData={formData}
												setFormData={setFormData}
												isFieldLocked={isFieldLocked}
												toggleFieldLock={
													toggleFieldLock
												}
											/>
										</div>
									)}
							</div>
						)}
					</div>
				);
			};

			return {
				id: sectionId,
				title: step.title,
				component: (
					<div className="space-y-6">
						<div className="mb-2 flex items-center justify-between">
							<h2 className="text-xl font-semibold text-gray-800 flex items-center">
								<IconComponent className="h-5 w-5 mr-2 text-blue-600" />{" "}
								{step.title}
							</h2>
						</div>
						{Array.isArray(subsections) &&
						subsections.length > 0 ? (
							<div className="space-y-4">
								{subsections.map((subsection: any) =>
									renderSubsection(subsection)
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{(step.fields || []).map((fieldId: string) =>
									renderDynamicField(fieldId, sectionId)
								)}
							</div>
						)}
					</div>
				),
			};
		});
	}, [
		expandedSubsections,
		renderDynamicField,
		sectionIconComponents,
		getTableWrapperClasses,
		isFieldLocked,
		handleInputChange,
		renderFieldLockButton,
		toggleSubsection,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
		isSubsectionFullyLocked,
		toggleSubsectionLock,
		formData,
		activeOrg?.id,
		isFieldRequiredFromSchema,
		fieldMetadata,
		toggleFieldLock,
	]);

	const initialStepIndex = useMemo(() => {
		if (!initialStepId) return 0;
		const idx = steps.findIndex((s) => s.id === initialStepId);
		return idx >= 0 ? idx : 0;
	}, [initialStepId, steps]);

	// Helper function to check if all fields are locked
	const areAllFieldsLocked = useCallback((): boolean => {
		// Get all field IDs from schema (both required and optional)
		const allFieldIds = new Set<string>();

		// Get fields from steps/subsections
		if (formSchema && (formSchema as any).steps) {
			(formSchema as any).steps.forEach((step: any) => {
				if (step.fields) {
					step.fields.forEach((fieldId: string) =>
						allFieldIds.add(fieldId)
					);
				}
				if (step.subsections) {
					step.subsections.forEach((subsection: any) => {
						if (subsection.fields) {
							subsection.fields.forEach((fieldId: string) =>
								allFieldIds.add(fieldId)
							);
						}
					});
				}
			});
		}

		// Also get fields from root-level fields object if it exists
		if (formSchema && (formSchema as any).fields) {
			Object.keys((formSchema as any).fields).forEach((fieldId) =>
				allFieldIds.add(fieldId)
			);
		}

		// If no fields found in schema, return false (can't determine, so allow autofill)
		if (allFieldIds.size === 0) {
			return false;
		}

		// Check if all fields are locked
		return Array.from(allFieldIds).every((fieldId) =>
			lockedFields.has(fieldId)
		);
	}, [lockedFields]);

	const wrappedHandleAutofill = useCallback(async () => {
		try {
			// Before triggering autofill, persist the latest lock state (and any
			// current form values) so the backend can respect locked fields.
			// We update the existing resume in place (no new version); the
			// autofill pipeline will create a new version only if it detects
			// actual changes.
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...formData,
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
			};

			// Signal to realtime hooks that this is a local save (before autofill)
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: {
							projectId: dataToSave.id,
							context: "project",
						},
					})
				);
			}

			try {
				await saveProjectResume(dataToSave.id, dataToSave, {
					createNewVersion: false,
				});
			} catch (saveErr) {
				// Log but don't block autofill – better to proceed than silently fail.
				console.error(
					"[EnhancedProjectForm] Failed to persist locks before autofill:",
					saveErr
				);
			}

			await startAutofill();
		} catch (err) {
			console.error("Autofill failed:", err);
		}
	}, [startAutofill, formData, fieldMetadata, lockedFields]);

	return (
		<div
			className={cn(
				"h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden",
				compact && "p-4"
			)}
		>
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<FileText className="h-5 w-5 text-blue-600" />
					<div className="flex items-center gap-2">
						<h3 className="text-xl md:text-2xl font-semibold text-gray-900">
							Project Resume
						</h3>
						<div className="relative group">
							<HelpCircle className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-help" />
							<div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 transform opacity-0 transition-opacity duration-150 group-hover:opacity-100">
								<div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg">
									Fill out the key details for your project.
									Fields can be autofilled from documents and
									locked to prevent overwrites.
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{lastSavedAt && (
						<span className="text-xs text-gray-500 mr-2 hidden sm:inline-block">
							Draft saved{" "}
							{new Date(lastSavedAt).toLocaleTimeString()}
						</span>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={wrappedHandleAutofill}
						disabled={isAutofilling || areAllFieldsLocked()}
						className={cn(
							"group relative flex items-center gap-1 px-2 py-1.5 rounded-md border transition-all",
							isAutofilling
								? "border-blue-400 bg-blue-50 text-blue-700"
								: "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700"
						)}
					>
						{isAutofilling ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4 text-blue-600" />
						)}
						<span className="text-xs font-medium">
							{isAutofilling ? "Autofilling..." : "Autofill"}
						</span>
						{showSparkles && (
							<span className="absolute -inset-1 pointer-events-none rounded-md border border-blue-200" />
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleFormSubmit()}
						isLoading={formSaved}
						disabled={formSaved || isAutofilling}
					>
						{formSaved ? "Saving..." : "Save & Exit"}
					</Button>
				</div>
			</div>
			<div className="p-4">
				{showAutofillNotification && (
					<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex gap-2">
						<Info className="h-4 w-4 mt-0.5" />
						<span>
							Autofill complete. Data from documents has been
							applied.
						</span>
					</div>
				)}
				<FormWizard
					steps={steps}
					onComplete={handleFormSubmit}
					showProgressBar={false}
					showStepIndicators={false}
					allowSkip
					variant="tabs"
					showBottomNav
					initialStep={initialStepIndex}
					onStepChange={(stepId) => {
						void touchWorkspace(stepId);
					}}
				/>
			</div>
		</div>
	);
};

export default EnhancedProjectForm;
