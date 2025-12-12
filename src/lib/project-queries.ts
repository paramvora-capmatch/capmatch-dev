// src/lib/project-queries.ts
import { supabase } from "../../lib/supabaseClient";
import {
	ProjectProfile,
	ProjectMessage,
	Principal,
} from "@/types/enhanced-types";
// Removed imports: ungroupFromSections, isGroupedFormat, groupBySections
// Storage is now always flat format
import {
	computeProjectCompletion,
	computeBorrowerCompletion,
} from "@/utils/resumeCompletion";
import { getAllFieldIds } from "./schema-utils";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";

// =============================================================================
// JSONB Content Type Definitions
// =============================================================================

/**
 * Defines the structure of project_resumes.content JSONB column
 */
export interface ProjectResumeContent {
	// Section 1: Basic Info
	projectName: string;
	assetType: string;
	dealStatus?: string;
	propertyAddressStreet?: string;
	propertyAddressCity?: string;
	propertyAddressState?: string;
	propertyAddressCounty?: string;
	propertyAddressZip?: string;
	parcelNumber?: string;
	zoningDesignation?: string;
	expectedZoningChanges?: string;
	constructionType?: string;
	groundbreakingDate?: string;
	completionDate?: string;
	totalDevelopmentCost?: number;
	loanAmountRequested?: number;
	loanType?: string;
	requestedTerm?: string;
	syndicationStatus?: string;
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
	trackRecord?: TrackRecordItem[];
	references?: ReferenceItem[];

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
 * Track record item for borrower resume
 */
export interface TrackRecordItem {
	project?: string;
	year?: number;
	units?: number;
	irr?: number | string;
	market?: string;
	type?: string;
}

/**
 * Reference item for borrower resume
 */
export interface ReferenceItem {
	firm?: string;
	relationship?: string;
	years?: string;
	contact?: string;
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

/**
 * Helper: Process raw resume content to extract flat content and metadata
 */
function processResumeContent(rawContent: any): {
	flatContent: Partial<ProjectResumeContent>;
	metadata: Record<string, import("@/types/enhanced-types").FieldMetadata>;
} {
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
			// Rich format from backend: { value, source, warnings, other_values }
			const anyItem: any = item;
			(flatContent as any)[key] = anyItem.value;

			// Prefer the single `source` object; fall back to first entry in legacy `sources` array.
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

	return { flatContent, metadata };
}

/**
 * Helper: Fetch and process project resume for a single project
 */
async function fetchProjectResumeData(projectId: string): Promise<{
	resume: { content: ProjectResumeContent } | null;
	completenessPercent: number | undefined;
	lockedFields: Record<string, boolean>;
	fieldStates: any;
	resourceId: string | null;
}> {
	const { data: resource } = await supabase
		.from("resources")
		.select("id, current_version_id")
		.eq("resource_type", "PROJECT_RESUME")
		.eq("project_id", projectId)
		.maybeSingle();

	let resume: { content: ProjectResumeContent } | null = null;
	let projectCompletenessPercent: number | undefined;
	let projectLockedFields: Record<string, boolean> = {};

	if (resource?.current_version_id) {
		const result = await supabase
			.from("project_resumes")
			.select("content, completeness_percent, locked_fields")
			.eq("id", resource.current_version_id)
			.single();
		resume = result.data;
		projectCompletenessPercent = result.data?.completeness_percent;
		projectLockedFields =
			(result.data?.locked_fields as
				| Record<string, boolean>
				| undefined) || {};
	} else {
		const result = await supabase
			.from("project_resumes")
			.select("content, completeness_percent, locked_fields")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		resume = result.data;
		projectCompletenessPercent = result.data?.completeness_percent;
		projectLockedFields =
			(result.data?.locked_fields as
				| Record<string, boolean>
				| undefined) || {};
	}

	let rawContent = (resume?.content || {}) as any;
	// Fall back to content._lockedFields during migration period if column is empty
	if (!projectLockedFields || Object.keys(projectLockedFields).length === 0) {
		projectLockedFields =
			(rawContent._lockedFields as Record<string, boolean> | undefined) ||
			{};
	}
	const fieldStates = (rawContent._fieldStates as any) || {};

	rawContent = { ...rawContent };
	delete rawContent._lockedFields;
	delete rawContent._fieldStates;
	delete rawContent._metadata;

	// Content is always flat now, no conversion needed

	return {
		resume: resume ? { content: rawContent } : null,
		completenessPercent: projectCompletenessPercent,
		lockedFields: projectLockedFields,
		fieldStates,
		resourceId: resource?.id ?? null,
	};
}

/**
 * Helper: Fetch and process borrower resume for a single project
 * Uses the centralized getProjectBorrowerResume function
 */
async function fetchBorrowerResumeData(projectId: string): Promise<{
	content: BorrowerResumeContent;
	completenessPercent: number | undefined;
	lockedFields: Record<string, boolean>;
}> {
	const borrowerResumeContent = await getProjectBorrowerResume(projectId);

	if (!borrowerResumeContent) {
		return {
			content: {},
			completenessPercent: undefined,
			lockedFields: {},
		};
	}

	return {
		content: borrowerResumeContent,
		completenessPercent: borrowerResumeContent.completenessPercent,
		lockedFields: (borrowerResumeContent as any)._lockedFields || {},
	};
}

/**
 * Helper: Build a ProjectProfile from project and resume data
 */
function buildProjectProfile(
	project: any,
	resumeData: {
		flatContent: Partial<ProjectResumeContent>;
		metadata: Record<
			string,
			import("@/types/enhanced-types").FieldMetadata
		>;
		completenessPercent: number | undefined;
		lockedFields: Record<string, boolean>;
		fieldStates: any;
		resourceId: string | null;
	},
	borrowerData: {
		content: BorrowerResumeContent;
		completenessPercent: number | undefined;
		lockedFields: Record<string, boolean>;
	}
): ProjectProfile {
	const {
		flatContent,
		metadata,
		completenessPercent,
		lockedFields,
		fieldStates,
		resourceId,
	} = resumeData;
	const {
		content: borrowerResumeContent,
		completenessPercent: borrowerCompletenessPercent,
		lockedFields: borrowerLockedFields,
	} = borrowerData;

	// Use stored completeness_percent from column instead of calculating
	// Fall back to calculation only if stored value is missing/invalid
	const borrowerProgress =
		borrowerCompletenessPercent !== undefined &&
		borrowerCompletenessPercent !== null &&
		typeof borrowerCompletenessPercent === "number"
			? Math.round(borrowerCompletenessPercent)
			: Math.round(
					computeBorrowerCompletion(
						borrowerResumeContent,
						borrowerLockedFields
					)
			  );

	const combinedProfile: ProjectProfile = {
		id: project.id,
		owner_org_id: project.owner_org_id,
		assignedAdvisorUserId: project.assigned_advisor_id,
		createdAt: project.created_at,
		updatedAt: project.updated_at,
		...flatContent,
		projectName: flatContent.projectName || project.name,
		assetType: flatContent.assetType || "",
		projectStatus: (flatContent.dealStatus as any) || "",
		dealStatus: flatContent.dealStatus || "",
		interestRateType: (flatContent.interestRateType as any) || "",
		recoursePreference: (flatContent.recoursePreference as any) || "",
		exitStrategy: flatContent.exitStrategy as any,
		completenessPercent: completenessPercent ?? 0,
		internalAdvisorNotes: flatContent.internalAdvisorNotes || "",
		borrowerProgress,
		projectSections: flatContent.projectSections || {},
		borrowerSections: borrowerResumeContent || {},
		_metadata: metadata,
		_lockedFields: lockedFields,
		_fieldStates: fieldStates,
		projectResumeResourceId: resourceId,
	} as ProjectProfile;

	const recomputedCompletion = computeProjectCompletion(
		combinedProfile,
		lockedFields
	);
	const storedCompletion = combinedProfile.completenessPercent;
	const finalCompletion =
		typeof storedCompletion === "number" && storedCompletion > 0
			? storedCompletion
			: recomputedCompletion;

	return {
		...combinedProfile,
		completenessPercent: finalCompletion,
	};
}

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

	// Fetch resume data using helper
	const resumeData = await fetchProjectResumeData(projectId);
	const { flatContent, metadata } = processResumeContent(
		resumeData.resume?.content || {}
	);

	// Fetch borrower resume data using helper
	const borrowerData = await fetchBorrowerResumeData(projectId);

	// Build and return profile
	return buildProjectProfile(
		project,
		{
			flatContent,
			metadata,
			completenessPercent: resumeData.completenessPercent,
			lockedFields: resumeData.lockedFields,
			fieldStates: resumeData.fieldStates,
			resourceId: resumeData.resourceId,
		},
		borrowerData
	);
};

export const getProjectsWithResumes = async (
	projectIds: string[]
): Promise<ProjectProfile[]> => {
	if (projectIds.length === 0) return [];

	// Fetch core projects
	const { data: projects, error: projectsError } = await supabase
		.from("projects")
		.select("*")
		.in("id", projectIds);
	if (projectsError)
		throw new Error(`Failed to fetch projects: ${projectsError.message}`);

	// Fetch resources for all projects to get current version IDs
	const { data: projectResources, error: resourcesError } = await supabase
		.from("resources")
		.select("id, project_id, current_version_id, resource_type")
		.in("project_id", projectIds)
		.in("resource_type", ["PROJECT_RESUME", "BORROWER_RESUME"]);

	if (resourcesError)
		throw new Error(`Failed to fetch resources: ${resourcesError.message}`);

	// Build maps: project_id -> resource data
	const projectResumeResources = new Map<
		string,
		{ id: string; current_version_id: string | null }
	>();
	const borrowerResumeResources = new Map<
		string,
		{ current_version_id: string | null }
	>();

	projectResources?.forEach((resource: any) => {
		if (resource.resource_type === "PROJECT_RESUME") {
			projectResumeResources.set(resource.project_id, {
				id: resource.id,
				current_version_id: resource.current_version_id,
			});
		} else if (resource.resource_type === "BORROWER_RESUME") {
			borrowerResumeResources.set(resource.project_id, {
				current_version_id: resource.current_version_id,
			});
		}
	});

	// Collect all current version IDs
	const projectResumeVersionIds = Array.from(projectResumeResources.values())
		.map((r) => r.current_version_id)
		.filter((id): id is string => id !== null);
	const borrowerResumeVersionIds = Array.from(
		borrowerResumeResources.values()
	)
		.map((r) => r.current_version_id)
		.filter((id): id is string => id !== null);

	// Fetch project resumes by version ID (current versions)
	const projectResumeQueries: Array<Promise<{ data: any; error: any }>> = [];
	if (projectResumeVersionIds.length > 0) {
		projectResumeQueries.push(
			Promise.resolve(
				supabase
					.from("project_resumes")
					.select("id, content, completeness_percent, locked_fields")
					.in("id", projectResumeVersionIds)
			)
		);
	}

	// Also fetch by project_id for projects without resources (fallback)
	projectResumeQueries.push(
		Promise.resolve(
			supabase
				.from("project_resumes")
				.select(
					"project_id, id, content, completeness_percent, locked_fields, created_at"
				)
				.in("project_id", projectIds)
				.order("created_at", { ascending: false })
		)
	);

	const projectResumeResults = await Promise.all(projectResumeQueries);
	const projectResumesByVersionId = new Map<string, any>();
	const projectResumesByProjectId = new Map<string, any[]>();

	projectResumeResults.forEach((result) => {
		if (result.error) return;
		result.data?.forEach((resume: any) => {
			if (resume.id && !resume.project_id) {
				// This is from the version ID query
				projectResumesByVersionId.set(resume.id, resume);
			} else if (resume.project_id) {
				// This is from the project_id query (fallback)
				if (!projectResumesByProjectId.has(resume.project_id)) {
					projectResumesByProjectId.set(resume.project_id, []);
				}
				projectResumesByProjectId.get(resume.project_id)!.push(resume);
			}
		});
	});

	// Fetch borrower resumes by version ID (current versions)
	const borrowerResumeQueries: Array<Promise<{ data: any; error: any }>> = [];
	if (borrowerResumeVersionIds.length > 0) {
		borrowerResumeQueries.push(
			Promise.resolve(
				supabase
					.from("borrower_resumes")
					.select("id, content, completeness_percent, locked_fields")
					.in("id", borrowerResumeVersionIds)
			)
		);
	}

	// Also fetch by project_id for projects without resources (fallback)
	borrowerResumeQueries.push(
		Promise.resolve(
			supabase
				.from("borrower_resumes")
				.select(
					"project_id, id, content, completeness_percent, locked_fields, created_at"
				)
				.in("project_id", projectIds)
				.order("created_at", { ascending: false })
		)
	);

	const borrowerResumeResults = await Promise.all(borrowerResumeQueries);
	const borrowerResumesByVersionId = new Map<string, any>();
	const borrowerResumesByProjectId = new Map<string, any[]>();

	borrowerResumeResults.forEach((result) => {
		if (result.error) return;
		result.data?.forEach((resume: any) => {
			if (resume.id && !resume.project_id) {
				// This is from the version ID query
				borrowerResumesByVersionId.set(resume.id, resume);
			} else if (resume.project_id) {
				// This is from the project_id query (fallback)
				if (!borrowerResumesByProjectId.has(resume.project_id)) {
					borrowerResumesByProjectId.set(resume.project_id, []);
				}
				borrowerResumesByProjectId.get(resume.project_id)!.push(resume);
			}
		});
	});

	// Process each project
	return (
		projects?.map((project: any) => {
			// Get project resume
			const projectResource = projectResumeResources.get(project.id);
			let projectResume: any = null;
			let projectResumeResourceId: string | null = null;

			if (projectResource?.current_version_id) {
				projectResume = projectResumesByVersionId.get(
					projectResource.current_version_id
				);
				projectResumeResourceId = projectResource.id;
			}

			// Fallback: get latest by project_id
			if (!projectResume) {
				const fallbackResumes = projectResumesByProjectId.get(
					project.id
				);
				if (fallbackResumes && fallbackResumes.length > 0) {
					projectResume = fallbackResumes[0]; // Already sorted by created_at desc
				}
			}

			// Get borrower resume
			const borrowerResource = borrowerResumeResources.get(project.id);
			let borrowerResume: any = null;

			if (borrowerResource?.current_version_id) {
				borrowerResume = borrowerResumesByVersionId.get(
					borrowerResource.current_version_id
				);
			}

			// Fallback: get latest by project_id
			if (!borrowerResume) {
				const fallbackResumes = borrowerResumesByProjectId.get(
					project.id
				);
				if (fallbackResumes && fallbackResumes.length > 0) {
					borrowerResume = fallbackResumes[0]; // Already sorted by created_at desc
				}
			}

			// Process project resume content
			let rawContent = (projectResume?.content || {}) as any;
			let projectLockedFields: Record<string, boolean> =
				(projectResume?.locked_fields as
					| Record<string, boolean>
					| undefined) || {};

			if (
				!projectLockedFields ||
				Object.keys(projectLockedFields).length === 0
			) {
				projectLockedFields =
					(rawContent._lockedFields as
						| Record<string, boolean>
						| undefined) || {};
			}

			const fieldStates = (rawContent._fieldStates as any) || {};
			rawContent = { ...rawContent };
			delete rawContent._lockedFields;
			delete rawContent._fieldStates;
			delete rawContent._metadata;

			// Content is always flat now, no conversion needed

			const { flatContent, metadata } = processResumeContent(rawContent);

			// Process borrower resume content
			const borrowerResumeContent: BorrowerResumeContent =
				borrowerResume?.content || {};
			let borrowerLockedFields: Record<string, boolean> =
				(borrowerResume?.locked_fields as
					| Record<string, boolean>
					| undefined) || {};

			if (
				!borrowerLockedFields ||
				Object.keys(borrowerLockedFields).length === 0
			) {
				borrowerLockedFields =
					(borrowerResumeContent as any)?._lockedFields || {};
			}

			// Content is always flat now, no conversion needed

			// Build profile using helper
			return buildProjectProfile(
				project,
				{
					flatContent,
					metadata,
					completenessPercent: projectResume?.completeness_percent,
					lockedFields: projectLockedFields,
					fieldStates,
					resourceId: projectResumeResourceId,
				},
				{
					content: borrowerResumeContent,
					completenessPercent: borrowerResume?.completeness_percent,
					lockedFields: borrowerLockedFields,
				}
			);
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

		let currentValue = (content as any)[key];

		// CRITICAL FIX: Extract value if currentValue is already a rich format object
		// This prevents double-wrapping and ensures we save the actual scalar value
		// This can happen when formData contains rich format objects from autofill or previous saves
		if (
			currentValue &&
			typeof currentValue === "object" &&
			!Array.isArray(currentValue) &&
			"value" in currentValue
		) {
			// Extract the actual value from rich format object
			currentValue = (currentValue as any).value;
		}

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

	// Content is always flat now, no grouping needed
	if (existing && !options?.createNewVersion) {
		const contentToSave = {
			...existing.content,
			...finalContent,
			_fieldStates: fieldStates,
		};

		// Calculate completeness_percent for updates (stored in column, not content)
		const completionPercent = computeProjectCompletion(
			{
				...content,
				...finalContent,
			},
			lockedFields
		);

		const { error } = await supabase
			.from("project_resumes")
			.update({
				content: contentToSave,
				locked_fields: lockedFields,
				completeness_percent: completionPercent,
			})
			.eq("id", existing.id);
		if (error)
			throw new Error(
				`Failed to update project resume: ${error.message}`
			);
	} else {
		// Create new version - content is always flat now
		let existingContentFlat: Record<string, any> = {};
		if (existing?.content) {
			const { _lockedFields, _fieldStates, _metadata, ...cleanExisting } =
				existing.content;
			existingContentFlat = cleanExisting;
		}
		const mergedContent = { ...existingContentFlat, ...finalContent };
		// Use the provided lock state directly as the authoritative source.
		// Do not merge with existing locks, as that would resurrect locks the user explicitly removed.
		const mergedLockedFields = lockedFields;
		const mergedFieldStates = fieldStates;
		const completionPercent = computeProjectCompletion(
			{
				...content,
				...mergedContent,
			},
			mergedLockedFields
		);

		const contentToInsert = {
			...mergedContent,
			_fieldStates: mergedFieldStates,
		};

		const { data: newResume, error } = await supabase
			.from("project_resumes")
			.insert({
				project_id: projectId,
				content: contentToInsert,
				locked_fields: mergedLockedFields,
				completeness_percent: completionPercent,
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

// Known boolean-only borrower fields
const BOOLEAN_BORROWER_FIELDS: Record<string, true> = {
	bankruptcyHistory: true,
	foreclosureHistory: true,
	litigationHistory: true,
};

// Field ids from the borrower form schema – used to validate content
let BORROWER_FIELD_IDS: string[] = [];
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const borrowerFormSchema = require("@/lib/borrower-resume-form.schema.json");
	BORROWER_FIELD_IDS = Object.keys((borrowerFormSchema as any).fields || {});
} catch {
	BORROWER_FIELD_IDS = [];
}

/**
 * Heuristic to detect a "corrupted" borrower resume row where the core
 * borrower fields have been replaced by bare booleans (e.g. mirrors of
 * _lockedFields), which should not be treated as the active resume.
 */
function isCorruptedBooleanSnapshot(content: any): boolean {
	if (!content || typeof content !== "object") return false;

	// Strip metadata/root keys - content is always flat now
	const raw = { ...content };
	delete raw._lockedFields;
	delete raw._fieldStates;
	delete raw._metadata;
	delete raw.completenessPercent;

	const flat = raw; // Content is always flat now

	// If at least one known borrower field has a non-boolean value (or a rich
	// { value: ... } object with a non-boolean value), we consider the snapshot valid.
	let hasNonBooleanForKnownField = false;

	for (const fieldId of BORROWER_FIELD_IDS) {
		const v = flat[fieldId];
		if (v === undefined) continue;

		// Rich format { value, ... }
		if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) {
			const innerValue = (v as any).value;

			// Treat rich-format booleans for non-boolean fields as suspicious
			if (
				typeof innerValue === "boolean" &&
				!BOOLEAN_BORROWER_FIELDS[fieldId]
			) {
				continue;
			}

			// Otherwise, this looks like a real value
			hasNonBooleanForKnownField = true;
			break;
		}

		// Primitive non-boolean value
		if (typeof v !== "boolean") {
			hasNonBooleanForKnownField = true;
			break;
		}

		// Boolean is fine only for the explicit boolean borrower fields
		if (typeof v === "boolean" && BOOLEAN_BORROWER_FIELDS[fieldId]) {
			hasNonBooleanForKnownField = true;
			break;
		}
	}

	// If *none* of the known fields have a proper value, treat as corrupted.
	return !hasNonBooleanForKnownField;
}

/**
 * Loads borrower resume content from the JSONB column.
 * This is the centralized function for fetching borrower resumes.
 * Includes corruption detection to filter out invalid snapshots.
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

	let query = supabase
		.from("borrower_resumes")
		.select("id, content, completeness_percent, locked_fields, created_at");

	// Use current_version_id if available, otherwise fall back to latest
	if (resource?.current_version_id) {
		query = query.eq("id", resource.current_version_id);
	} else {
		// Fetch the latest few rows and pick the first valid one
		query = query
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(5);
	}

	const { data, error } = await query;

	if (error && error.code !== "PGRST116")
		throw new Error(`Failed to load borrower resume: ${error.message}`);
	if (!data || data.length === 0) return null;

	// If we used current_version_id, we have a single row; otherwise find the first non-corrupted snapshot
	const chosen = resource?.current_version_id
		? data[0]
		: data.find((row) => !isCorruptedBooleanSnapshot(row.content));
	const chosenRow = chosen ?? data[0];

	if (!chosenRow) return null;

	const contentRaw = chosenRow.content as any;
	const completenessPercent = chosenRow.completeness_percent;

	if (!contentRaw) return null;

	// Read from locked_fields column, fall back to content._lockedFields during migration
	let lockedFields: Record<string, boolean> =
		(chosenRow.locked_fields as Record<string, boolean> | undefined) || {};

	const content = { ...contentRaw };

	// Content is always flat now - use column value if available, otherwise fall back to content
	if (!lockedFields || Object.keys(lockedFields).length === 0) {
		lockedFields =
			(content._lockedFields as Record<string, boolean> | undefined) ||
			{};
	}
	content._lockedFields = lockedFields;

	// Add completeness_percent from column to content for UI consumption
	// This ensures the UI always has access to the stored value
	if (completenessPercent !== undefined && completenessPercent !== null) {
		(content as any).completenessPercent = completenessPercent;
	}

	// Extract metadata from rich format fields and create _metadata object
	const metadata: Record<string, any> = {};
	const working = { ...content };
	delete working._lockedFields;
	delete working._fieldStates;
	delete working._metadata;

	// Process all fields to extract metadata
	for (const [key, value] of Object.entries(working)) {
		// Skip if already processed
		if (key.startsWith("_")) {
			continue;
		}

		// Handle principals specially - it can be an array or in rich format
		if (key === "principals") {
			// Check if it's in rich format
			if (
				value &&
				typeof value === "object" &&
				!Array.isArray(value) &&
				"value" in value
			) {
				// Store metadata (new schema: value + source + warnings + other_values)
				const anyVal: any = value;
				let primarySource = anyVal.source;
				if (
					!primarySource &&
					Array.isArray(anyVal.sources) &&
					anyVal.sources.length > 0
				) {
					primarySource = anyVal.sources[0];
				}

				metadata[key] = {
					value: anyVal.value,
					source: primarySource ?? null,
					warnings: anyVal.warnings || [],
					other_values: anyVal.other_values || [],
				};
			}
			continue;
		}

		// Check if value is in rich format { value, source, warnings, other_values }
		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			"value" in value
		) {
			const anyVal: any = value;

			// Determine primary source (new schema prefers `source`, but we keep
			// backward compat for legacy `sources` arrays).
			let primarySource = anyVal.source;
			if (
				!primarySource &&
				Array.isArray(anyVal.sources) &&
				anyVal.sources.length > 0
			) {
				primarySource = anyVal.sources[0];
			}

			// Store metadata aligned with new FieldMetadata type
			metadata[key] = {
				value: anyVal.value,
				source: primarySource ?? null,
				warnings: anyVal.warnings || [],
				other_values: anyVal.other_values || [],
			};
		}
	}

	// Add metadata if we have any
	if (Object.keys(metadata).length > 0) {
		content._metadata = metadata;
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

	// Get resource pointer to find the current version
	const { data: resource } = await supabase
		.from("resources")
		.select("current_version_id")
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME")
		.maybeSingle();

	// Get existing content - fetch via current_version_id if available, otherwise latest
	let existingResume: {
		id: string;
		content: any;
		locked_fields?: Record<string, boolean>;
		completeness_percent?: number;
	} | null = null;

	if (resource?.current_version_id) {
		const result = await supabase
			.from("borrower_resumes")
			.select("id, content, locked_fields, completeness_percent")
			.eq("id", resource.current_version_id)
			.maybeSingle();
		existingResume = result.data;
	} else {
		const result = await supabase
			.from("borrower_resumes")
			.select("id, content, locked_fields, completeness_percent")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		existingResume = result.data;
	}

	const existingContent = existingResume?.content || {};
	const existingLockedFields =
		(existingResume?.locked_fields as
			| Record<string, boolean>
			| undefined) || {};
	const existingCompletenessPercent = existingResume?.completeness_percent;
	// Content is always flat now, no grouping needed

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

		let currentValue = (content as any)[key];

		// CRITICAL FIX: Extract value if currentValue is already a rich format object
		// This prevents double-wrapping and ensures we save the actual scalar value
		// This can happen when formData contains rich format objects from autofill or previous saves
		if (
			currentValue &&
			typeof currentValue === "object" &&
			!Array.isArray(currentValue) &&
			"value" in currentValue
		) {
			// Extract the actual value from rich format object
			currentValue = (currentValue as any).value;
		}

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
			// Look up the existing item - content is always flat now
			const existingItemForBooleanGuard = existingContent[key];

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
			// Check if existing had rich data - content is always flat now
			const existingItem = existingContent[key];

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

	// Always create a new version - never update in place
	// This ensures we maintain a complete history and never overwrite
	// locked_fields or completeness_percent columns
	// Content is always flat now, no grouping needed
	{
		// NEW VERSION - content is always flat now
		const { _lockedFields, _fieldStates, _metadata, ...cleanExisting } =
			existingContent;

		const mergedFlat = { ...cleanExisting, ...finalContentFlat };

		// Use the provided lock state directly as the authoritative source.
		// Do not merge with existing locks, as that would resurrect locks the user explicitly removed.
		const mergedLockedFields = lockedFields;
		const mergedFieldStates = fieldStates;

		// Calculate completeness_percent (stored in column, not content)
		// Use provided value if available, otherwise calculate from the content
		const providedCompleteness = (content as any).completenessPercent;
		let finalCompletenessPercent: number;
		if (
			providedCompleteness !== undefined &&
			typeof providedCompleteness === "number"
		) {
			finalCompletenessPercent = providedCompleteness;
		} else {
			// Calculate from the actual content (excluding metadata fields)
			finalCompletenessPercent = computeBorrowerCompletion(
				mergedFlat,
				mergedLockedFields
			);
		}

		const contentToInsert = {
			...mergedFlat,
			_fieldStates: mergedFieldStates,
		};

		const { data: newResume, error } = await supabase
			.from("borrower_resumes")
			.insert({
				project_id: projectId,
				content: contentToInsert,
				locked_fields: mergedLockedFields,
				completeness_percent: finalCompletenessPercent,
				created_by: user?.id ?? null,
			})
			.select("id")
			.single();

		if (error)
			throw new Error(
				`Failed to create borrower resume: ${error.message}`
			);

		// Preserve previous version's locked_fields and completeness_percent
		// This ensures historical versions retain their metadata
		if (existingResume?.id) {
			// Only update if the previous version doesn't have these values set
			// or if they need to be preserved from what we fetched
			const updatePreviousVersion: {
				locked_fields?: Record<string, boolean>;
				completeness_percent?: number;
			} = {};

			// Preserve locked_fields if they exist
			if (
				existingLockedFields &&
				Object.keys(existingLockedFields).length > 0
			) {
				updatePreviousVersion.locked_fields = existingLockedFields;
			}

			// Preserve completeness_percent if it exists
			if (
				existingCompletenessPercent !== undefined &&
				existingCompletenessPercent !== null
			) {
				updatePreviousVersion.completeness_percent =
					existingCompletenessPercent;
			}

			// Only update if we have values to preserve
			if (Object.keys(updatePreviousVersion).length > 0) {
				await supabase
					.from("borrower_resumes")
					.update(updatePreviousVersion)
					.eq("id", existingResume.id);
			}
		}

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
