// src/lib/project-queries.ts
import { supabase } from "../../lib/supabaseClient";
import {
	ProjectProfile,
	ProjectMessage,
	Principal,
} from "@/types/enhanced-types";
import {
	ungroupFromSections,
	isGroupedFormat,
	groupBySections,
} from "./section-grouping";
import { computeProjectCompletion, computeBorrowerCompletion } from "@/utils/resumeCompletion";
import { sectionHasSubsections, getAllFieldIds } from "./schema-utils";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";

// =============================================================================
// JSONB Content Type Definitions
// =============================================================================

/**
 * Defines the structure of project_resumes.content JSONB column
 */
export interface ProjectResumeContent {
	// ... (Project fields remain unchanged, preserving existing definition)
	projectName: string;
	assetType: string;
	projectStatus: string;
	propertyAddressStreet?: string;
	propertyAddressCity?: string;
	propertyAddressState?: string;
	propertyAddressCounty?: string;
	propertyAddressZip?: string;
	parcelNumber?: string;
	zoningDesignation?: string;
	currentZoning?: string;
	expectedZoningChanges?: string;
	primaryAssetClass?: string;
	constructionType?: string;
	groundbreakingDate?: string;
	completionDate?: string;
	totalDevelopmentCost?: number;
	loanAmountRequested?: number;
	loanType?: string;
	requestedLoanTerm?: string;
	masterPlanName?: string;
	phaseNumber?: string;
	syndicationStatus?: string;
	guarantorNames?: string;
	projectDescription?: string;
	projectPhase?: string;

	// Section 2: Property Specifications
	totalResidentialUnits?: number;
	totalResidentialNRSF?: number;
	averageUnitSize?: number;
	totalCommercialGRSF?: number;
	grossBuildingArea?: number;
	numberOfStories?: number;
	buildingType?: string;
	parkingSpaces?: number;
	parkingRatio?: number;
	parkingType?: string;
	amenityList?: string[];
	amenitySF?: number;
	adaCompliantUnitsPercent?: number;
	leedSustainabilityRating?: string;

	residentialUnitMix?: Array<{
		unitType: string;
		unitCount: number;
		avgSF: number;
		monthlyRent?: number;
		totalSF?: number;
		percentOfTotal?: number;
		affordabilityStatus?: string;
		affordableUnitsCount?: number;
		amiTargetPercent?: number;
		rentBumpSchedule?: string;
	}>;

	commercialSpaceMix?: Array<{
		spaceType: string;
		squareFootage: number;
		tenant?: string;
		leaseTerm?: string;
		annualRent?: number;
		tiAllowance?: number;
	}>;

	// Section 3: Financial Details
	landAcquisition?: number;
	baseConstruction?: number;
	contingency?: number;
	ffe?: number;
	constructionFees?: number;
	aeFees?: number;
	thirdPartyReports?: number;
	legalAndOrg?: number;
	titleAndRecording?: number;
	taxesDuringConstruction?: number;
	workingCapital?: number;
	developerFee?: number;
	pfcStructuringFee?: number;
	loanFees?: number;
	interestReserve?: number;
	relocationCosts?: number;
	syndicationCosts?: number;
	enviroRemediation?: number;

	sponsorEquity?: number;
	taxCreditEquity?: number;
	gapFinancing?: number;

	interestRate?: number;
	underwritingRate?: number;
	prepaymentTerms?: string;
	permTakeoutPlanned?: boolean;
	allInRate?: number;

	realEstateTaxes?: number;
	insurance?: number;
	utilitiesCosts?: number;
	repairsAndMaintenance?: number;
	managementFee?: number;
	generalAndAdmin?: number;
	payroll?: number;
	reserves?: number;
	marketingLeasing?: number;
	serviceCoordination?: number;

	noiYear1?: number;
	yieldOnCost?: number;
	capRate?: number;
	stabilizedValue?: number;
	ltv?: number;
	debtYield?: number;
	dscr?: number;
	trendedNOIYear1?: number;
	untrendedNOIYear1?: number;
	trendedYield?: number;
	untrendedYield?: number;
	inflationAssumption?: number;
	dscrStressTest?: number;
	portfolioLTV?: number;

	// Legacy/Financial
	targetLtvPercent?: number;
	targetLtcPercent?: number;
	amortizationYears?: number;
	interestOnlyPeriodMonths?: number;
	interestRateType?: string;
	targetCloseDate?: string;
	useOfProceeds?: string;
	recoursePreference?: string;
	purchasePrice?: number;
	totalProjectCost?: number;
	capexBudget?: number;
	propertyNoiT12?: number;
	stabilizedNoiProjected?: number;
	exitStrategy?: string;
	businessPlanSummary?: string;
	marketOverviewSummary?: string;
	equityCommittedPercent?: number;

	// Section 4: Market Context
	submarketName?: string;
	distanceToCBD?: number;
	distanceToEmployment?: string;
	distanceToTransit?: number;
	walkabilityScore?: number;
	population3Mi?: number;
	popGrowth201020?: number;
	projGrowth202429?: number;
	medianHHIncome?: number;
	renterOccupiedPercent?: number;
	bachelorsDegreePercent?: number;
	absorptionRate?: number;
	penetrationRate?: number;
	northStarComp?: string;
	infrastructureProject?: string;
	projectBudget?: number;
	infraCompletion?: string;

	rentComps?: Array<{
		propertyName: string;
		address?: string;
		distance?: number;
		yearBuilt?: number;
		totalUnits?: number;
		occupancyPercent?: number;
		avgRentMonth?: number;
		rentPSF?: number;
		concessions?: string;
	}>;

	saleComps?: Array<{
		propertyName: string;
		salePricePerUnit?: number;
		capRate?: number;
		saleDate?: string;
	}>;

	// Section 5: Special Considerations
	opportunityZone?: boolean;
	affordableHousing?: boolean;
	affordableUnitsNumber?: number;
	amiTargetPercent?: number;
	taxExemption?: boolean;
	tifDistrict?: boolean;
	taxAbatement?: boolean;
	paceFinancing?: boolean;
	historicTaxCredits?: boolean;
	newMarketsCredits?: boolean;
	exemptionStructure?: string;
	sponsoringEntity?: string;
	structuringFee?: number;
	exemptionTerm?: number;
	incentiveStacking?: string[];
	relocationPlan?: string;
	seismicPMLRisk?: string;

	// Section 6: Timeline
	landAcqClose?: string;
	entitlements?: string;
	finalPlans?: string;
	permitsIssued?: string;
	verticalStart?: string;
	firstOccupancy?: string;
	stabilization?: string;
	preLeasedSF?: number;
	drawSchedule?: Array<{
		drawNumber: number;
		percentComplete?: number;
		amount?: number;
	}>;
	absorptionProjection?: number;
	opDeficitEscrow?: number;
	leaseUpEscrow?: number;

	// Section 7: Site & Context
	totalSiteAcreage?: number;
	currentSiteStatus?: string;
	topography?: string;
	environmental?: string;
	utilities?: string;
	utilityCapacity?: string;
	geotechSoilsRep?: string;
	floodZone?: string;
	siteAccess?: string;
	proximityShopping?: string;
	proximityRestaurants?: string;
	proximityParks?: string;
	proximitySchools?: string;
	proximityHospitals?: string;
	topEmployers?: string;

	// Section 8: Sponsor Info
	sponsorEntityName?: string;
	sponsorStructure?: string;
	equityPartner?: string;
	contactInfo?: string;
	sponsorExpScore?: number;
	priorDevelopments?: number;
	netWorth?: number;
	guarantorLiquidity?: number;
	portfolioDSCR?: number;

	completenessPercent?: number;
	internalAdvisorNotes?: string;

	projectSections?: any;
	borrowerSections?: any;
}

/**
 * Defines the structure of borrower_resumes.content JSONB column
 * Updated to support Enhanced Resume features (Metadata, Locks)
 */
export interface BorrowerResumeContent {
	// Basic borrower info
	fullLegalName?: string;
	primaryEntityName?: string;
	primaryEntityStructure?: string;
	contactEmail?: string;
	contactPhone?: string;
	contactAddress?: string;
	bioNarrative?: string;
	linkedinUrl?: string;
	websiteUrl?: string;

	// Experience fields
	yearsCREExperienceRange?: string;
	assetClassesExperience?: string[];
	geographicMarketsExperience?: string[];
	totalDealValueClosedRange?: string;
	existingLenderRelationships?: string;

	// Financial fields
	creditScoreRange?: string;
	netWorthRange?: string;
	liquidityRange?: string;
	bankruptcyHistory?: boolean;
	foreclosureHistory?: boolean;
	litigationHistory?: boolean;

	// Principals
	principals?: Principal[];

	// Progress tracking
	completenessPercent?: number;

	// Metadata
	createdAt?: string;
	updatedAt?: string;
	masterProfileId?: string;
	lastSyncedAt?: string;
	customFields?: string[];

	// Enhanced Metadata Containers (New)
	_metadata?: Record<string, import("@/types/enhanced-types").FieldMetadata>;
	_lockedFields?: Record<string, boolean>;
	_fieldStates?: Record<string, any>;
}

/**
 * Defines the structure of advisor_resumes.content JSONB column
 */
export interface AdvisorResumeContent {
	name?: string;
	title?: string;
	email?: string;
	phone?: string;
	bio?: string;
	avatar?: string;
	specialties?: string[];
	yearsExperience?: number;
	linkedinUrl?: string;
	websiteUrl?: string;
	company?: string;
	location?: string;
	certifications?: string[];
	education?: string;
	completenessPercent?: number;
	createdAt?: string;
	updatedAt?: string;
}

// =============================================================================
// Database Query Functions
// =============================================================================

// Helper to map borrower resume fields to sections for storage grouping
// Using actual section IDs from borrower-resume-form.schema.json
const BORROWER_FIELD_TO_SECTION: Record<string, string> = {
	// basic-info section
	fullLegalName: "basic-info",
	primaryEntityName: "basic-info",
	primaryEntityStructure: "basic-info",
	contactEmail: "basic-info",
	contactPhone: "basic-info",
	contactAddress: "basic-info",
	// experience section
	yearsCREExperienceRange: "experience",
	assetClassesExperience: "experience",
	geographicMarketsExperience: "experience",
	totalDealValueClosedRange: "experience",
	existingLenderRelationships: "experience",
	bioNarrative: "experience",
	// borrower-financials section
	creditScoreRange: "borrower-financials",
	netWorthRange: "borrower-financials",
	liquidityRange: "borrower-financials",
	bankruptcyHistory: "borrower-financials",
	foreclosureHistory: "borrower-financials",
	litigationHistory: "borrower-financials",
	// online-presence section
	linkedinUrl: "online-presence",
	websiteUrl: "online-presence",
	// principals section
	principals: "principals",
};

function convertToBorrowerSectionWise(flatContent: any): any {
	const sectionWise: any = {};
	for (const [fieldId, fieldValue] of Object.entries(flatContent)) {
		// Preserve special root-level keys
		if (
			fieldId.startsWith("section_") ||
			fieldId.startsWith("_") ||
			fieldId === "completenessPercent" ||
			fieldId === "projectSections" ||
			fieldId === "borrowerSections"
		) {
			sectionWise[fieldId] = fieldValue;
			continue;
		}
		const sectionId = BORROWER_FIELD_TO_SECTION[fieldId];
		// If we don't have a section mapping for this field, drop it from the
		// grouped structure entirely. These are legacy/unused fields (like
		// the old per-principal fields) that we no longer want to persist.
		if (!sectionId) continue;

		// For borrower resumes, sections typically don't have subsections
		// so we place fields directly in the section
		if (!sectionWise[sectionId]) sectionWise[sectionId] = {};
		sectionWise[sectionId][fieldId] = fieldValue;
	}
	return sectionWise;
}

function mergeIntoBorrowerSectionWise(
	existingSectionWise: any,
	flatUpdates: any
): any {
	const merged = existingSectionWise ? { ...existingSectionWise } : {};
	for (const [fieldId, fieldValue] of Object.entries(flatUpdates)) {
		// Preserve special root-level keys
		if (
			fieldId.startsWith("section_") ||
			fieldId.startsWith("_") ||
			fieldId === "completenessPercent" ||
			fieldId === "projectSections" ||
			fieldId === "borrowerSections"
		) {
			if (
				typeof fieldValue === "object" &&
				fieldValue !== null &&
				!Array.isArray(fieldValue)
			) {
				merged[fieldId] = { ...(merged[fieldId] || {}), ...fieldValue };
			} else {
				merged[fieldId] = fieldValue;
			}
			continue;
		}
		const sectionId = BORROWER_FIELD_TO_SECTION[fieldId];
		// Unknown/legacy fields (no section mapping) are dropped rather than
		// being placed in a catch-all section. This prevents re-creating
		// deprecated principal sub-fields on save.
		if (!sectionId) continue;

		// For borrower resumes, sections typically don't have subsections
		// so we place fields directly in the section
		if (!merged[sectionId]) merged[sectionId] = {};
		merged[sectionId][fieldId] = fieldValue;
	}
	return merged;
}

// Helper to normalize legacy sources
const toSourcesArray = (input: any): any[] => {
	if (!input) return [];
	if (Array.isArray(input)) return input;
	if (typeof input === "string") {
		const normalized = input.toLowerCase().trim();
		if (normalized === "user_input" || normalized === "user input") {
			return [{ type: "user_input" }];
		}
		return [{ type: "document", name: input }];
	}
	if (typeof input === "object" && input !== null && "type" in input) {
		return [input];
	}
	return [];
};

// =============================================================================
// Project Resume Functions
// =============================================================================

export const getProjectWithResume = async (
	projectId: string
): Promise<ProjectProfile> => {
	// Fetch core project
	const { data: project, error: projectError } = await supabase
		.from("projects")
		.select("*")
		.eq("id", projectId)
		.single();

	if (projectError)
		throw new Error(`Failed to fetch project: ${projectError.message}`);

	// Fetch resume content
	const { data: resource } = await supabase
		.from("resources")
		.select("id, current_version_id")
		.eq("resource_type", "PROJECT_RESUME")
		.eq("project_id", projectId)
		.maybeSingle();

	let resume: { content: ProjectResumeContent } | null = null;

	if (resource?.current_version_id) {
		const result = await supabase
			.from("project_resumes")
			.select("content")
			.eq("id", resource.current_version_id)
			.single();
		resume = result.data;
	} else {
		const result = await supabase
			.from("project_resumes")
			.select("content")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		resume = result.data;
	}

	let rawContent = (resume?.content || {}) as any;
	const _lockedFields =
		(rawContent._lockedFields as Record<string, boolean> | undefined) || {};
	const _fieldStates = (rawContent._fieldStates as any) || {};

	rawContent = { ...rawContent };
	delete rawContent._lockedFields;
	delete rawContent._fieldStates;
	delete rawContent._metadata;

	if (isGroupedFormat(rawContent)) {
		rawContent = ungroupFromSections(rawContent);
	}

	// Fetch borrower resume for progress calc
	const { data: borrowerResume } = await supabase
		.from("borrower_resumes")
		.select("content")
		.eq("project_id", projectId)
		.maybeSingle();

	const borrowerResumeContent: BorrowerResumeContent =
		borrowerResume?.content || {};
	// Compute borrower completion instead of reading from stored value
	const borrowerProgress = Math.round(
		computeBorrowerCompletion(borrowerResumeContent)
	);

	const _metadata: Record<
		string,
		import("@/types/enhanced-types").FieldMetadata
	> = {};
	const resumeContent: Partial<ProjectResumeContent> = {};

	for (const key in rawContent) {
		const item = rawContent[key];
		if (
			item &&
			typeof item === "object" &&
			"value" in item &&
			("source" in item || "sources" in item)
		) {
			// Rich format from backend: { value, source, warnings, other_values }
			const anyItem: any = item;
			(resumeContent as any)[key] = anyItem.value;

			// Prefer the single `source` object; fall back to first entry in legacy `sources` array.
			let primarySource = anyItem.source;
			if (
				!primarySource &&
				Array.isArray(anyItem.sources) &&
				anyItem.sources.length > 0
			) {
				primarySource = anyItem.sources[0];
			}

			_metadata[key] = {
				value: anyItem.value,
				source: primarySource ?? null,
				warnings: anyItem.warnings || [],
				other_values: anyItem.other_values || [],
			};
		} else {
			(resumeContent as any)[key] = item;
		}
	}

	const combinedProfile: ProjectProfile = {
		id: project.id,
		owner_org_id: project.owner_org_id,
		assignedAdvisorUserId: project.assigned_advisor_id,
		createdAt: project.created_at,
		updatedAt: project.updated_at,
		...resumeContent,
		projectName: resumeContent.projectName || project.name,
		assetType: resumeContent.assetType || "",
		projectStatus: (resumeContent.projectStatus as any) || "",
		interestRateType: (resumeContent.interestRateType as any) || "",
		recoursePreference: (resumeContent.recoursePreference as any) || "",
		exitStrategy: resumeContent.exitStrategy as any,
		completenessPercent: resumeContent.completenessPercent ?? 0,
		internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
		borrowerProgress,
		projectSections: resumeContent.projectSections || {},
		borrowerSections: borrowerResumeContent || {},
		_metadata,
		_lockedFields,
		_fieldStates,
		projectResumeResourceId: resource?.id ?? null,
	} as ProjectProfile;

	const recomputedCompletion = computeProjectCompletion(combinedProfile);
	const storedCompletion = combinedProfile.completenessPercent;
	const finalCompletion =
		typeof storedCompletion === "number" && storedCompletion > 0
			? storedCompletion
			: recomputedCompletion;

	return {
		...combinedProfile,
		completenessPercent: finalCompletion,
	};
};

export const getProjectsWithResumes = async (
	projectIds: string[]
): Promise<ProjectProfile[]> => {
	if (projectIds.length === 0) return [];

	const { data: projects, error: projectsError } = await supabase
		.from("projects")
		.select("*")
		.in("id", projectIds);
	if (projectsError)
		throw new Error(`Failed to fetch projects: ${projectsError.message}`);

	const { data: resumes, error: resumesError } = await supabase
		.from("project_resumes")
		.select("project_id, content, created_at")
		.in("project_id", projectIds)
		.order("created_at", { ascending: false });
	if (resumesError)
		throw new Error(
			`Failed to fetch project resumes: ${resumesError.message}`
		);

	const { data: borrowerResumes, error: borrowerResumesError } =
		await supabase
			.from("borrower_resumes")
			.select("project_id, content")
			.in("project_id", projectIds);
	if (borrowerResumesError)
		throw new Error(
			`Failed to fetch borrower resumes: ${borrowerResumesError.message}`
		);

	const resumeMap = new Map<string, any>();
	const metadataMap = new Map<
		string,
		Record<string, import("@/types/enhanced-types").FieldMetadata>
	>();
	const lockedFieldsMap = new Map<string, Record<string, boolean>>();
	const fieldStatesMap = new Map<string, any>();

	resumes?.forEach((resume: any) => {
		if (!resumeMap.has(resume.project_id)) {
			let rawContent = (resume.content || {}) as any;
			const rawLockedFields =
				(rawContent._lockedFields as
					| Record<string, boolean>
					| undefined) || {};
			const rawFieldStates = (rawContent._fieldStates as any) || {};

			lockedFieldsMap.set(resume.project_id, rawLockedFields);
			fieldStatesMap.set(resume.project_id, rawFieldStates);

			rawContent = { ...rawContent };
			delete rawContent._lockedFields;
			delete rawContent._fieldStates;

			if (isGroupedFormat(rawContent)) {
				rawContent = ungroupFromSections(rawContent);
			}

			const flatContent: Partial<ProjectResumeContent> = {};
			const metadata: Record<
				string,
				import("@/types/enhanced-types").FieldMetadata
			> = {};

			for (const key in rawContent) {
				const item = rawContent[key];
				if (
					item &&
					typeof item === "object" &&
					"value" in item &&
					("source" in item || "sources" in item)
				) {
					const anyItem: any = item;
					(flatContent as any)[key] = anyItem.value;

					let primarySource = anyItem.source;
					if (
						!primarySource &&
						Array.isArray(anyItem.sources) &&
						anyItem.sources.length > 0
					) {
						primarySource = anyItem.sources[0];
					}

					metadata[key] = {
						value: anyItem.value,
						source: primarySource ?? null,
						warnings: anyItem.warnings || [],
						other_values: anyItem.other_values || [],
					};
				} else {
					(flatContent as any)[key] = item;
				}
			}
			resumeMap.set(resume.project_id, flatContent);
			metadataMap.set(resume.project_id, metadata);
		}
	});

	const borrowerResumeMap = new Map<string, BorrowerResumeContent>();
	borrowerResumes?.forEach((resume: any) => {
		borrowerResumeMap.set(resume.project_id, resume.content || {});
	});

	return (
		projects?.map((project: any) => {
			const resumeContent =
				resumeMap.get(project.id) || ({} as ProjectResumeContent);
			const metadata = metadataMap.get(project.id) || {};
			const borrowerResumeContent =
				borrowerResumeMap.get(project.id) ||
				({} as BorrowerResumeContent);
			// Compute borrower completion instead of reading from stored value
			const borrowerProgress = Math.round(
				computeBorrowerCompletion(borrowerResumeContent)
			);

			const combinedProfile: ProjectProfile = {
				id: project.id,
				owner_org_id: project.owner_org_id,
				assignedAdvisorUserId: project.assigned_advisor_id,
				createdAt: project.created_at,
				updatedAt: project.updated_at,
				...resumeContent,
				projectName: resumeContent.projectName || project.name,
				assetType: resumeContent.assetType || "",
				projectStatus: (resumeContent.projectStatus as any) || "",
				interestRateType: (resumeContent.interestRateType as any) || "",
				recoursePreference:
					(resumeContent.recoursePreference as any) || "",
				exitStrategy: resumeContent.exitStrategy as any,
				completenessPercent: resumeContent.completenessPercent ?? 0,
				internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
				borrowerProgress,
				projectSections: resumeContent.projectSections || {},
				borrowerSections: borrowerResumeContent || {},
				_metadata: metadata,
				_lockedFields: lockedFieldsMap.get(project.id) || {},
				_fieldStates: fieldStatesMap.get(project.id) || {},
				borrowerProfileId: undefined,
			} as ProjectProfile;

			const recomputedCompletion =
				computeProjectCompletion(combinedProfile);
			const storedCompletion = combinedProfile.completenessPercent;
			const finalCompletion =
				typeof storedCompletion === "number" && storedCompletion > 0
					? storedCompletion
					: recomputedCompletion;

			return {
				...combinedProfile,
				completenessPercent: finalCompletion,
			};
		}) || []
	);
};

export const saveProjectResume = async (
	projectId: string,
	content: Partial<ProjectProfile>,
	options?: { createNewVersion?: boolean }
): Promise<void> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: existing } = await supabase
		.from("project_resumes")
		.select("id, content")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	const metadata = (content as any)._metadata || {};
	const finalContent: any = {};
	const lockedFields = (content as any)._lockedFields || {};
	const fieldStates = (content as any)._fieldStates || {};

	// Get valid resume field IDs from schema
	const validFieldIds = new Set(getAllFieldIds());

	// Also include fields from metadata (for backward compatibility)
	Object.keys(projectResumeFieldMetadata).forEach((fieldId) =>
		validFieldIds.add(fieldId)
	);

	// Fields that should never be saved to resume content (project-level metadata)
	const excludedFields = new Set([
		"_metadata",
		"_lockedFields",
		"_fieldStates",
		"id",
		"createdAt",
		"updatedAt",
		"owner_org_id",
		"assignedAdvisorUserId",
		"projectDocsResourceId",
		"projectResumeResourceId",
		"borrowerProfileId",
		"borrowerProgress",
		"totalProgress",
		"projectSections",
		"borrowerSections",
	]);

	// Helper to normalize various legacy source shapes into a single SourceMetadata-like object
	const toSourceObject = (input: any): any => {
		if (!input) return { type: "user_input" };

		// Already a SourceMetadata-like object
		if (typeof input === "object" && input !== null && "type" in input) {
			return input;
		}

		// Legacy array form – take first entry
		if (Array.isArray(input) && input.length > 0) {
			const first = input[0];
			if (
				typeof first === "object" &&
				first !== null &&
				"type" in first
			) {
				return first;
			}
			if (typeof first === "string") {
				const normalized = first.toLowerCase().trim();
				if (
					normalized === "user_input" ||
					normalized === "user input"
				) {
					return { type: "user_input" };
				}
				return { type: "document", name: first };
			}
		}

		// Legacy string source
		if (typeof input === "string") {
			const normalized = input.toLowerCase().trim();
			if (normalized === "user_input" || normalized === "user input") {
				return { type: "user_input" };
			}
			return { type: "document", name: input };
		}

		return { type: "user_input" };
	};

	for (const key in content) {
		// Skip excluded fields (project-level metadata)
		if (excludedFields.has(key)) {
			continue;
		}

		// Only process fields that are valid resume fields
		if (!validFieldIds.has(key)) {
			continue;
		}

		const currentValue = (content as any)[key];
		const meta = metadata[key];

		if (meta) {
			const metaAny: any = metadata[key];

			// Prefer explicit SourceMetadata object; fall back to first entry in legacy `sources` array or string.
			const primarySource =
				metaAny?.source ??
				(Array.isArray(metaAny?.sources) && metaAny.sources.length > 0
					? metaAny.sources[0]
					: undefined);

			finalContent[key] = {
				value: currentValue,
				source: toSourceObject(primarySource),
				warnings: metaAny?.warnings || [],
				other_values: metaAny?.other_values || [],
			};
		} else {
			const existingItem = existing?.content?.[key];
			if (
				existingItem &&
				typeof existingItem === "object" &&
				("value" in existingItem ||
					"source" in existingItem ||
					"sources" in existingItem)
			) {
				const existingObj: any = existingItem;
				const existingPrimarySource =
					"source" in existingObj
						? existingObj.source
						: Array.isArray(existingObj.sources) &&
						  existingObj.sources.length > 0
						? existingObj.sources[0]
						: undefined;

				finalContent[key] = {
					value: currentValue,
					source: toSourceObject(existingPrimarySource),
					warnings: existingObj.warnings || [],
					other_values: existingObj.other_values || [],
				};
			} else {
				finalContent[key] = currentValue;
			}
		}
	}

	const isExistingSectionGrouped = isGroupedFormat(existing?.content || {});

	if (existing && !options?.createNewVersion) {
		let contentToSave: any;
		if (isExistingSectionGrouped) {
			const groupedUpdates = groupBySections(finalContent);
			contentToSave = { ...existing.content };
			for (const [sectionKey, sectionFields] of Object.entries(
				groupedUpdates
			)) {
				if (!contentToSave[sectionKey]) contentToSave[sectionKey] = {};

				// Check if this section has subsections according to the schema
				// If it does, sectionFields will have subsection keys (e.g., "project-identity")
				// If it doesn't, sectionFields will have field keys directly
				if (
					typeof sectionFields === "object" &&
					!Array.isArray(sectionFields) &&
					sectionFields !== null &&
					sectionHasSubsections(sectionKey)
				) {
					// Section has subsections - merge at subsection level
					for (const [
						subsectionKey,
						subsectionFields,
					] of Object.entries(sectionFields)) {
						if (
							typeof subsectionFields === "object" &&
							!Array.isArray(subsectionFields) &&
							subsectionFields !== null
						) {
							if (!contentToSave[sectionKey][subsectionKey]) {
								contentToSave[sectionKey][subsectionKey] = {};
							}
							contentToSave[sectionKey][subsectionKey] = {
								...contentToSave[sectionKey][subsectionKey],
								...subsectionFields,
							};
						}
					}
				} else {
					// Section has no subsections or sectionFields is not an object - merge directly
					contentToSave[sectionKey] = {
						...contentToSave[sectionKey],
						...sectionFields,
					};
				}
			}
			contentToSave._lockedFields = lockedFields;
			contentToSave._fieldStates = fieldStates;
		} else {
			contentToSave = {
				...existing.content,
				...finalContent,
				_lockedFields: lockedFields,
				_fieldStates: fieldStates,
			};
		}

		// Calculate and include completenessPercent for updates
		const completionPercent = computeProjectCompletion({
			...content,
			...finalContent,
		});
		contentToSave.completenessPercent = completionPercent;

		const { error } = await supabase
			.from("project_resumes")
			.update({ content: contentToSave })
			.eq("id", existing.id);
		if (error)
			throw new Error(
				`Failed to update project resume: ${error.message}`
			);
	} else {
		let existingContentFlat: Record<string, any> = {};
		if (existing?.content) {
			existingContentFlat = isGroupedFormat(existing.content)
				? ungroupFromSections(existing.content)
				: existing.content;
			const {
				_lockedFields,
				_fieldStates,
				_metadata,
				completenessPercent,
				...cleanExisting
			} = existingContentFlat;
			existingContentFlat = cleanExisting;
		}
		const mergedContent = { ...existingContentFlat, ...finalContent };
		const groupedContent = groupBySections(mergedContent);
		const mergedLockedFields = {
			...(existing?.content?._lockedFields || {}),
			...lockedFields,
		};
		const mergedFieldStates = {
			...(existing?.content?._fieldStates || {}),
			...fieldStates,
		};
		const completionPercent = computeProjectCompletion({
			...content,
			...mergedContent,
		});

		const contentToInsert = {
			...groupedContent,
			_lockedFields: mergedLockedFields,
			_fieldStates: mergedFieldStates,
			completenessPercent: completionPercent,
		};

		const { data: newResume, error } = await supabase
			.from("project_resumes")
			.insert({
				project_id: projectId,
				content: contentToInsert,
				created_by: user?.id ?? null,
			})
			.select("id")
			.single();
		if (error)
			throw new Error(
				`Failed to create project resume: ${error.message}`
			);

		await supabase
			.from("resources")
			.update({ current_version_id: newResume.id })
			.eq("project_id", projectId)
			.eq("resource_type", "PROJECT_RESUME");
	}
};

// =============================================================================
// Borrower Resume Functions
// =============================================================================

/**
 * Loads borrower resume content from the JSONB column.
 */
export const getProjectBorrowerResume = async (
	projectId: string
): Promise<BorrowerResumeContent | null> => {
	const { data: resource } = await supabase
		.from("resources")
		.select("current_version_id")
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME")
		.maybeSingle();

	let query = supabase.from("borrower_resumes").select("content");
	if (resource?.current_version_id) {
		query = query.eq("id", resource.current_version_id);
	} else {
		query = query
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1);
	}

	const { data, error } = await query.maybeSingle();
	if (error && error.code !== "PGRST116")
		throw new Error(`Failed to load borrower resume: ${error.message}`);
	if (!data) return null;

	let content = (data.content || {}) as any;

	// Ungroup if needed for UI consumption
	if (isGroupedFormat(content)) {
		// Extract root keys
		const {
			_lockedFields,
			_fieldStates,
			_metadata,
			completenessPercent,
			...sections
		} = content;
		const flat = ungroupFromSections(sections);
		content = {
			...flat,
			_lockedFields,
			_fieldStates,
			_metadata,
			completenessPercent,
		};
	}

	// Unwrap rich values if present (handle cases where DB returns { value, source, ... })
	const unwrappedContent: any = {};

	for (const key in content) {
		const val = (content as any)[key];
		if (
			val &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			"value" in val &&
			key !== "_metadata" &&
			key !== "_lockedFields" &&
			key !== "_fieldStates" &&
			key !== "borrowerSections" &&
			key !== "projectSections"
		) {
			unwrappedContent[key] = (val as any).value;
		} else {
			unwrappedContent[key] = val;
		}
	}

	return unwrappedContent as BorrowerResumeContent;
};

/**
 * Saves borrower resume content to the JSONB column.
 * Supports Rich Data, Locking, Metadata, and Section grouping.
 */
export const saveProjectBorrowerResume = async (
	projectId: string,
	content: Partial<BorrowerResumeContent>,
	options?: {
		createNewVersion?: boolean;
		lockedFields?: Record<string, boolean>;
		lockedSections?: Record<string, boolean>;
	}
): Promise<void> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Extract metadata/locks
	const metadata = (content as any)._metadata || {};
	const lockedFields =
		options?.lockedFields || (content as any)._lockedFields || {};
	const fieldStates = (content as any)._fieldStates || {};

	// Get existing content
	const { data: existingResume } = await supabase
		.from("borrower_resumes")
		.select("id, content")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	const existingContent = existingResume?.content || {};
	const isExistingSectionWise = isGroupedFormat(existingContent);

	// Prepare rich content payload
	const finalContentFlat: any = {};

	for (const key in content) {
		if (
			key === "_metadata" ||
			key === "_lockedFields" ||
			key === "_fieldStates" ||
			key === "_lockedSections" ||
			key === "completenessPercent"
		)
			continue;

		const currentValue = (content as any)[key];
		const meta = metadata[key];

		// ---------------------------------------------------------------------
		// Guardrail: never persist bare boolean values for non-boolean fields.
		//
		// In some edge cases (e.g. bugs in callers), a field's value might be
		// passed in as `true`/`false` instead of its actual string/array value.
		// Helper to normalize various legacy source shapes into a single SourceMetadata-like object
		const toSourceObject = (input: any): any => {
			if (!input) return { type: "user_input" };

			// Already a SourceMetadata-like object
			if (
				typeof input === "object" &&
				input !== null &&
				"type" in input
			) {
				return input;
			}

			// Legacy array form – take first entry
			if (Array.isArray(input) && input.length > 0) {
				const first = input[0];
				if (
					typeof first === "object" &&
					first !== null &&
					"type" in first
				) {
					return first;
				}
				if (typeof first === "string") {
					const normalized = first.toLowerCase().trim();
					if (
						normalized === "user_input" ||
						normalized === "user input"
					) {
						return { type: "user_input" };
					}
					return { type: "document", name: first };
				}
			}

			// Legacy string source
			if (typeof input === "string") {
				const normalized = input.toLowerCase().trim();
				if (
					normalized === "user_input" ||
					normalized === "user input"
				) {
					return { type: "user_input" };
				}
				return { type: "document", name: input };
			}

			return { type: "user_input" };
		};

		// The only borrower fields that are legitimately boolean are the
		// credit-history flags below. For all other fields, if we see a bare
		// boolean here, we should *not* overwrite the existing rich/value data
		// in the database with that boolean. Instead, we fall back to whatever
		// is already stored in `existingContent` for that key.
		// ---------------------------------------------------------------------
		const BOOLEAN_BORROWER_FIELDS: Record<string, true> = {
			bankruptcyHistory: true,
			foreclosureHistory: true,
			litigationHistory: true,
		};

		if (
			typeof currentValue === "boolean" &&
			!BOOLEAN_BORROWER_FIELDS[key]
		) {
			// Look up the existing item in either flat or section-wise content
			let existingItemForBooleanGuard: any;
			if (isExistingSectionWise) {
				const flatExisting = ungroupFromSections(existingContent);
				existingItemForBooleanGuard = flatExisting[key];
			} else {
				existingItemForBooleanGuard = existingContent[key];
			}

			// If we have an existing item, keep it as-is and skip this key so we
			// don't replace real data with a bare boolean. If we don't, simply
			// skip writing this key.
			if (existingItemForBooleanGuard !== undefined) {
				finalContentFlat[key] = existingItemForBooleanGuard;
			}
			continue;
		}

		if (meta) {
			// Save rich format if metadata exists
			const metaAny: any = metadata[key];
			const primarySource =
				metaAny?.source ??
				(Array.isArray(metaAny?.sources) && metaAny.sources.length > 0
					? metaAny.sources[0]
					: undefined);

			finalContentFlat[key] = {
				value: currentValue,
				source: toSourceObject(primarySource),
				warnings: metaAny?.warnings || [],
				other_values: metaAny?.other_values || [],
			};
		} else {
			// Check if existing had rich data
			// Need to check in flat or sectioned existing content
			let existingItem: any;
			if (isExistingSectionWise) {
				// Try to find in sections
				const flatExisting = ungroupFromSections(existingContent);
				existingItem = flatExisting[key];
			} else {
				existingItem = existingContent[key];
			}

			if (
				existingItem &&
				typeof existingItem === "object" &&
				("value" in existingItem ||
					"source" in existingItem ||
					"sources" in existingItem)
			) {
				const existingObj: any = existingItem;
				const existingPrimarySource =
					"source" in existingObj
						? existingObj.source
						: Array.isArray(existingObj.sources) &&
						  existingObj.sources.length > 0
						? existingObj.sources[0]
						: undefined;

				finalContentFlat[key] = {
					value: currentValue,
					source: toSourceObject(existingPrimarySource),
					warnings: existingObj.warnings || [],
					other_values: existingObj.other_values || [],
				};
			} else {
				// Flat value
				finalContentFlat[key] = {
					value: currentValue,
					source: toSourceObject(null),
					warnings: [],
					other_values: [],
				};
			}
		}
	}

	// Handle Update (In Place) vs Insert (New Version)
	let contentToSave: any;

	if (existingResume && !options?.createNewVersion) {
		// UPDATE IN PLACE
		if (isExistingSectionWise) {
			// Merge flat updates into section-wise structure
			contentToSave = mergeIntoBorrowerSectionWise(
				existingContent,
				finalContentFlat
			);
		} else {
			// Convert to section-wise
			const mergedFlat = { ...existingContent, ...finalContentFlat };
			contentToSave = convertToBorrowerSectionWise(mergedFlat);
		}

		// Append root keys
		contentToSave._lockedFields = lockedFields;
		contentToSave._fieldStates = fieldStates;
		// Always calculate and save completenessPercent to ensure it's always in sync
		// Use provided value if available, otherwise calculate from the content
		const providedCompleteness = (content as any).completenessPercent;
		if (providedCompleteness !== undefined && typeof providedCompleteness === 'number') {
			contentToSave.completenessPercent = providedCompleteness;
		} else {
			// Calculate from the actual content (excluding metadata fields)
			const contentForCalculation = { ...finalContentFlat };
			contentToSave.completenessPercent = computeBorrowerCompletion(contentForCalculation);
		}

		// Get resource pointer to update correct version
		const { data: resource } = await supabase
			.from("resources")
			.select("current_version_id")
			.eq("project_id", projectId)
			.eq("resource_type", "BORROWER_RESUME")
			.maybeSingle();

		const targetId = resource?.current_version_id || existingResume.id;

		const { error } = await supabase
			.from("borrower_resumes")
			.update({ content: contentToSave })
			.eq("id", targetId);

		if (error)
			throw new Error(
				`Failed to update borrower resume: ${error.message}`
			);
	} else {
		// NEW VERSION
		// Flatten existing to merge cleanly
		const existingFlat = isExistingSectionWise
			? ungroupFromSections(existingContent)
			: existingContent;
		const {
			_lockedFields,
			_fieldStates,
			_metadata,
			completenessPercent,
			...cleanExisting
		} = existingFlat;

		const mergedFlat = { ...cleanExisting, ...finalContentFlat };
		const groupedContent = convertToBorrowerSectionWise(mergedFlat);

		const mergedLockedFields = {
			...(existingContent._lockedFields || {}),
			...lockedFields,
		};
		const mergedFieldStates = {
			...(existingContent._fieldStates || {}),
			...fieldStates,
		};

		// Always calculate and save completenessPercent to ensure it's always in sync
		// Use provided value if available, otherwise calculate from the content
		const providedCompleteness = (content as any).completenessPercent;
		let finalCompletenessPercent: number;
		if (providedCompleteness !== undefined && typeof providedCompleteness === 'number') {
			finalCompletenessPercent = providedCompleteness;
		} else if (completenessPercent !== undefined && typeof completenessPercent === 'number') {
			finalCompletenessPercent = completenessPercent;
		} else {
			// Calculate from the actual content (excluding metadata fields)
			finalCompletenessPercent = computeBorrowerCompletion(mergedFlat);
		}

		const contentToInsert = {
			...groupedContent,
			_lockedFields: mergedLockedFields,
			_fieldStates: mergedFieldStates,
			completenessPercent: finalCompletenessPercent,
		};

		const { data: newResume, error } = await supabase
			.from("borrower_resumes")
			.insert({
				project_id: projectId,
				content: contentToInsert,
				created_by: user?.id ?? null,
			})
			.select("id")
			.single();

		if (error)
			throw new Error(
				`Failed to create borrower resume: ${error.message}`
			);

		// Update resource pointer
		const { error: resourceError } = await supabase
			.from("resources")
			.upsert(
				{
					project_id: projectId,
					resource_type: "BORROWER_RESUME",
					current_version_id: newResume.id,
					org_id: (
						await getProjectWithResume(projectId)
					).owner_org_id, // need org_id for upsert, or use update logic if exists
				},
				{ onConflict: "project_id,resource_type" } as any
			);

		// Since we might not have org_id easily without a fetch, try UPDATE first then INSERT if missing?
		// Or relying on existing project-utils flow: usually resource exists.
		// Let's use the update pattern from saveProjectResume which assumes resource exists or handles it.

		if (resourceError) {
			// Fallback: try plain update if upsert failed (e.g. RLS/constraints)
			await supabase
				.from("resources")
				.update({ current_version_id: newResume.id })
				.eq("project_id", projectId)
				.eq("resource_type", "BORROWER_RESUME");
		}
	}
};

// Advisor Resume functions remain largely unchanged as they don't use the complex sectioning yet
export const getAdvisorResume = async (
	orgId: string
): Promise<AdvisorResumeContent | null> => {
	const { data, error } = await supabase
		.from("advisor_resumes")
		.select("content")
		.eq("org_id", orgId)
		.maybeSingle();
	if (error && error.code !== "PGRST116")
		throw new Error(`Failed to load advisor resume: ${error.message}`);
	return data?.content || null;
};

export const saveAdvisorResume = async (
	orgId: string,
	content: Partial<AdvisorResumeContent>
): Promise<void> => {
	const existing = await getAdvisorResume(orgId);
	const mergedContent = { ...(existing || {}), ...content };
	const { error } = await supabase
		.from("advisor_resumes")
		.upsert(
			{ org_id: orgId, content: mergedContent },
			{ onConflict: "org_id" }
		);
	if (error)
		throw new Error(`Failed to save advisor resume: ${error.message}`);
};
