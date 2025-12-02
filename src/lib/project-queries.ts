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

// =============================================================================
// JSONB Content Type Definitions
// =============================================================================

/**
 * Defines the structure of project_resumes.content JSONB column
 * This preserves all the fields from the original DTO mapper and includes all fields from Hoque_Data.md
 */
export interface ProjectResumeContent {
	// Section 1: Project Identification & Basic Info
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
	expectedZoningChanges?: string; // None, Variance, PUD
	primaryAssetClass?: string;
	constructionType?: string; // Ground-Up, Renovation, Adaptive Reuse
	groundbreakingDate?: string;
	completionDate?: string;
	totalDevelopmentCost?: number; // TDC - derived from budget sum
	loanAmountRequested?: number;
	loanType?: string;
	requestedLoanTerm?: string; // e.g., "2 years"
	masterPlanName?: string;
	phaseNumber?: string;
	syndicationStatus?: string; // Committed, In Process, TBD
	guarantorNames?: string; // Multiple comma-separated
	projectDescription?: string;
	projectPhase?: string;

	// Section 2: Property Specifications
	totalResidentialUnits?: number; // Derived from unit mix
	totalResidentialNRSF?: number; // Derived from unit SF
	averageUnitSize?: number; // Derived: NRSF / Units
	totalCommercialGRSF?: number;
	grossBuildingArea?: number;
	numberOfStories?: number;
	buildingType?: string; // High-rise, Mid-rise, Garden, Podium
	parkingSpaces?: number;
	parkingRatio?: number; // Derived: Spaces / Units
	parkingType?: string; // Surface, Structured, Underground
	amenityList?: string[]; // Array of amenities
	amenitySF?: number;
	adaCompliantUnitsPercent?: number; // Percentage
	leedSustainabilityRating?: string; // Certified, Pending, None

	// Section 2.1: Residential Unit Mix (stored as array)
	residentialUnitMix?: Array<{
		unitType: string; // e.g., "S1", "Studio", "1BR"
		unitCount: number;
		avgSF: number;
		monthlyRent?: number;
		totalSF?: number; // Derived: Count * SF
		percentOfTotal?: number; // Derived: Count / Total Units
		affordabilityStatus?: string; // Market Rate, Affordable @ 60% AMI, etc.
		affordableUnitsCount?: number; // Per row
		amiTargetPercent?: number; // Per row, e.g., 60% AMI
		rentBumpSchedule?: string; // e.g., "$2.13 to $2.46"
	}>;

	// Section 2.2: Commercial Space Mix (stored as array)
	commercialSpaceMix?: Array<{
		spaceType: string; // e.g., "Retail", "Office"
		squareFootage: number;
		tenant?: string;
		leaseTerm?: string;
		annualRent?: number;
		tiAllowance?: number; // TI Allowance per tenant
	}>;

	// Section 3: Financial Details - Development Budget
	landAcquisition?: number;
	baseConstruction?: number;
	contingency?: number;
	ffe?: number; // FF&E
	constructionFees?: number;
	aeFees?: number; // A&E Fees
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
	enviroRemediation?: number; // Environmental remediation

	// Section 3.2: Sources of Funds
	sponsorEquity?: number;
	taxCreditEquity?: number;
	gapFinancing?: number; // e.g., TIF grants

	// Section 3.3: Loan Terms
	interestRate?: number; // Percentage
	underwritingRate?: number; // Percentage
	prepaymentTerms?: string;
	permTakeoutPlanned?: boolean;
	allInRate?: number; // Percentage - includes origination/MIP

	// Section 3.5: Operating Expenses (Proforma Year 1)
	realEstateTaxes?: number;
	insurance?: number;
	utilitiesCosts?: number;
	repairsAndMaintenance?: number;
	managementFee?: number;
	generalAndAdmin?: number;
	payroll?: number;
	reserves?: number;
	marketingLeasing?: number; // For lease-up
	serviceCoordination?: number; // Specific to supportive housing

	// Section 3.6: Investment Metrics
	noiYear1?: number; // Derived: EGI - Total Exp
	yieldOnCost?: number; // Derived: NOI / TDC
	capRate?: number; // Percentage
	stabilizedValue?: number; // Derived: NOI / Cap Rate
	ltv?: number; // Derived: Loan / Value
	debtYield?: number; // Derived: NOI / Loan
	dscr?: number; // Derived: NOI / Debt Svc
	trendedNOIYear1?: number; // With inflation
	untrendedNOIYear1?: number; // Base case
	trendedYield?: number; // Derived: Trended NOI / TDC
	untrendedYield?: number; // Derived: Untrended NOI / TDC
	inflationAssumption?: number; // Percentage
	dscrStressTest?: number; // Calculated at Rate + 2%
	portfolioLTV?: number; // For sponsor, max 75%

	// Financial fields (existing/legacy)
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
	distanceToCBD?: number; // Decimal (miles)
	distanceToEmployment?: string;
	distanceToTransit?: number; // Decimal (miles)
	walkabilityScore?: number; // Integer 0-100
	population3Mi?: number; // Integer
	popGrowth201020?: number; // Percentage
	projGrowth202429?: number; // Percentage
	medianHHIncome?: number; // Currency
	renterOccupiedPercent?: number; // Percentage
	bachelorsDegreePercent?: number; // Percentage
	absorptionRate?: number; // Units/month
	penetrationRate?: number; // Percentage - Eligible HH / Units
	northStarComp?: string; // Borrower-selected top comp
	infrastructureProject?: string; // e.g., "New Rail Line"
	projectBudget?: number; // Currency
	infraCompletion?: string; // Date (Year)

	// Section 4.3: Rent Comps (stored as array)
	rentComps?: Array<{
		propertyName: string;
		address?: string;
		distance?: number; // Derived: Geo-calc
		yearBuilt?: number;
		totalUnits?: number;
		occupancyPercent?: number;
		avgRentMonth?: number;
		rentPSF?: number; // Derived: Rent / Size
		concessions?: string; // e.g., "1 month free"
	}>;

	// Section 4.4: Sale Comps (stored as array)
	saleComps?: Array<{
		propertyName: string;
		salePricePerUnit?: number;
		capRate?: number; // Percentage
		saleDate?: string; // Date
	}>;

	// Section 5: Special Considerations
	opportunityZone?: boolean;
	affordableHousing?: boolean;
	affordableUnitsNumber?: number;
	amiTargetPercent?: number; // Percentage (e.g., 80% AMI)
	taxExemption?: boolean;
	tifDistrict?: boolean;
	taxAbatement?: boolean;
	paceFinancing?: boolean;
	historicTaxCredits?: boolean;
	newMarketsCredits?: boolean;
	exemptionStructure?: string; // PFC, MMD, PILOT
	sponsoringEntity?: string; // e.g., "SoGood MMD"
	structuringFee?: number; // Currency
	exemptionTerm?: number; // Years
	incentiveStacking?: string[]; // LIHTC, Section 8, HOME
	relocationPlan?: string; // Complete, In Process, N/A
	seismicPMLRisk?: string; // % PML; required in seismic zones

	// Section 6: Timeline & Milestones
	landAcqClose?: string; // Date
	entitlements?: string; // Approved/Pending
	finalPlans?: string; // Approved/Pending
	permitsIssued?: string; // Issued/Pending
	verticalStart?: string; // Date
	firstOccupancy?: string; // Date
	stabilization?: string; // Date
	preLeasedSF?: number;
	drawSchedule?: Array<{
		drawNumber: number;
		percentComplete?: number;
		amount?: number;
	}>;
	absorptionProjection?: number; // Units/Month forecast
	opDeficitEscrow?: number; // 6 Mos OpEx for lease-up shortfalls
	leaseUpEscrow?: number; // 6-12 Mos calculated coverage

	// Section 7: Site & Context
	totalSiteAcreage?: number; // Decimal
	currentSiteStatus?: string; // Vacant/Existing
	topography?: string; // Flat/Sloped
	environmental?: string; // Clean/Remediation
	utilities?: string; // Available/None (dropdown)
	utilityCapacity?: string; // e.g., "Water: 500 GPM available"
	geotechSoilsRep?: string; // Findings summary; bearing capacity
	floodZone?: string; // e.g., "Zone AE"
	siteAccess?: string; // Text
	proximityShopping?: string; // Text
	proximityRestaurants?: string; // Text
	proximityParks?: string; // Text
	proximitySchools?: string; // Text
	proximityHospitals?: string; // Text
	topEmployers?: string; // Distance to key jobs

	// Section 8: Sponsor Information
	sponsorEntityName?: string;
	sponsorStructure?: string; // GP/LP
	equityPartner?: string;
	contactInfo?: string;
	sponsorExpScore?: number; // 0-10 scale based on track record
	priorDevelopments?: number; // # of multifamily units completed
	netWorth?: number; // Currency - Audited
	guarantorLiquidity?: number; // Currency - ≥10% of loan
	portfolioDSCR?: number; // Min 1.20x; overall sponsor health

	// Progress tracking (stored in JSONB, similar to borrower resume)
	completenessPercent?: number;

	internalAdvisorNotes?: string;

	// Legacy fields for compatibility
	projectSections?: any;
	borrowerSections?: any;
}

/**
 * Defines the structure of borrower_resumes.content JSONB column
 * This preserves all the fields from the original BorrowerProfile
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

	// Field states container (fieldId -> { state: "WHITE" | "BLUE" | "GREEN", locked: boolean, source: "ai" | "user_input" | null })
	_fieldStates?: Record<
		string,
		{
			state: "WHITE" | "BLUE" | "GREEN";
			locked: boolean;
			source: "ai" | "user_input" | null;
		}
	>;
	_lockedFields?: Record<string, boolean>;
	// _lockedSections removed - section locks are derived from field locks
}

/**
 * Defines the structure of advisor_resumes.content JSONB column
 * This stores advisor profile information
 */
export interface AdvisorResumeContent {
	// Basic advisor info
	name?: string;
	title?: string;
	email?: string;
	phone?: string;
	bio?: string;
	avatar?: string;

	// Experience fields
	specialties?: string[];
	yearsExperience?: number;

	// Additional fields
	linkedinUrl?: string;
	websiteUrl?: string;
	company?: string;
	location?: string;
	certifications?: string[];
	education?: string;

	// Progress tracking
	completenessPercent?: number;

	// Metadata
	createdAt?: string;
	updatedAt?: string;
}

// =============================================================================
// Database Query Functions
// =============================================================================

/**
 * Fetches a project with its resume content, combining core project fields
 * with detailed fields from the JSONB resume content.
 *
 * This replaces dbProjectToProjectProfile and properly handles the new schema
 * where detailed project data is stored in project_resumes.content JSONB.
 */
export const getProjectWithResume = async (
	projectId: string
): Promise<ProjectProfile> => {
	// Fetch core project data
	const { data: project, error: projectError } = await supabase
		.from("projects")
		.select("*")
		.eq("id", projectId)
		.single();

	if (projectError) {
		throw new Error(`Failed to fetch project: ${projectError.message}`);
	}

	// Fetch detailed project data from resume using Pointer Logic
	// 1. Check for a pointer in the 'resources' table
	const { data: resource } = await supabase
		.from("resources")
		.select("id, current_version_id")
		.eq("resource_type", "PROJECT_RESUME")
		.eq("project_id", projectId)
		.maybeSingle();

	let resume: { content: ProjectResumeContent } | null = null;
	let resumeError = null;

	if (resource?.current_version_id) {
		// 2a. Pointer exists: Fetch that specific version
		const result = await supabase
			.from("project_resumes")
			.select("content")
			.eq("id", resource.current_version_id)
			.single();

		resume = result.data;
		resumeError = result.error;
	} else {
		// 2b. No pointer: Fallback to fetching the latest by date
		const result = await supabase
			.from("project_resumes")
			.select("content")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();

		resume = result.data;
		resumeError = result.error;
	}

	// Resume not found is OK (project might not have detailed data yet)
	if (resumeError && resumeError.code !== "PGRST116") {
		throw new Error(
			`Failed to fetch project resume: ${resumeError.message}`
		);
	}

	let rawContent = (resume?.content || {}) as any;

	// Extract reserved keys that should be preserved at root level but not flattened
	const _lockedFields =
		(rawContent._lockedFields as Record<string, boolean> | undefined) || {};
	const _fieldStates = (rawContent._fieldStates as any) || {};

	// Create a copy for manipulation
	rawContent = { ...rawContent };

	// Remove reserved keys to prevent them from being treated as sections/fields during ungrouping
	delete rawContent._lockedFields;
	delete rawContent._fieldStates;
	delete rawContent._metadata; // Should be handled if it exists, but typically built during processing

	// Check if content is in section-grouped format and ungroup if needed
	if (isGroupedFormat(rawContent)) {
		rawContent = ungroupFromSections(rawContent);
	}

	const { data: borrowerResume, error: borrowerResumeError } = await supabase
		.from("borrower_resumes")
		.select("content")
		.eq("project_id", projectId)
		.maybeSingle();

	if (borrowerResumeError && borrowerResumeError.code !== "PGRST116") {
		throw new Error(
			`Failed to fetch borrower resume: ${borrowerResumeError.message}`
		);
	}

	const borrowerResumeContent: BorrowerResumeContent =
		borrowerResume?.content || {};
	const borrowerProgress = Math.round(
		(borrowerResumeContent.completenessPercent as number | undefined) ?? 0
	);

	// Prepare metadata map and extract flat values
	const _metadata: Record<
		string,
		import("@/types/enhanced-types").FieldMetadata
	> = {};
	const resumeContent: Partial<ProjectResumeContent> = {};

	for (const key in rawContent) {
		const item = rawContent[key];

		// If item is in { value, source/sources, warnings } format (rich data)
		if (
			item &&
			typeof item === "object" &&
			("source" in item || "sources" in item) &&
			"value" in item
		) {
			// Extract value for the flat form
			(resumeContent as any)[key] = item.value;

			// Determine source for metadata (prefer singular source, fallback to first of sources)
			let sourceValue = item.source;
			if (!sourceValue && item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
				const first = item.sources[0];
				// If first source is an object (SourceMetadata), extract name or type
				if (typeof first === 'object' && first !== null) {
					sourceValue = first.name || first.type;
				} else {
					sourceValue = first;
				}
			}

			// Store rich metadata
			_metadata[key] = {
				value: item.value,
				source: sourceValue || null,
				sources: item.sources || (item.source ? [item.source] : []),
				original_source: item.source || null, // Snapshot the original source
				original_value: item.value, // Snapshot the original value
				warnings: item.warnings || [],
			};
		} else {
			// Handle legacy flat data
			(resumeContent as any)[key] = item;
		}
	}

	// Combine core project fields with resume content
	return {
		// Core project fields (from projects table)
		id: project.id,
		owner_org_id: project.owner_org_id,
		assignedAdvisorUserId: project.assigned_advisor_id,
		createdAt: project.created_at,
		updatedAt: project.updated_at,

		// New fields from expanded ProjectResumeContent (spread first)
		...resumeContent,

		// Override with fallbacks for key fields
		projectName: resumeContent.projectName || project.name, // Fallback to core name
		assetType: resumeContent.assetType || "",
		projectStatus: (resumeContent.projectStatus as any) || "",

		// Type-safe overrides for enum fields (no UX defaults – start empty)
		interestRateType: (resumeContent.interestRateType as any) || "",
		recoursePreference: (resumeContent.recoursePreference as any) || "",
		exitStrategy: resumeContent.exitStrategy as any,

		// Load completenessPercent from DB, fallback to 0 if not stored
		completenessPercent: resumeContent.completenessPercent ?? 0,
		internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
		borrowerProgress,
		projectSections: resumeContent.projectSections || {},
		borrowerSections: borrowerResumeContent || {},

		// Add metadata container
		_metadata,

		// Restore locked fields and field states
		_lockedFields,
		_fieldStates,

		// Resource pointer helpers
		projectResumeResourceId: resource?.id ?? null,
	} as ProjectProfile;
};

/**
 * Fetches multiple projects with their resume content.
 * This replaces the array mapping pattern used in the stores.
 */
export const getProjectsWithResumes = async (
	projectIds: string[]
): Promise<ProjectProfile[]> => {
	if (projectIds.length === 0) return [];

	// Fetch core project data
	const { data: projects, error: projectsError } = await supabase
		.from("projects")
		.select("*")
		.in("id", projectIds);

	if (projectsError) {
		throw new Error(`Failed to fetch projects: ${projectsError.message}`);
	}

	// Fetch all resume data, sorted by newest first
	const { data: resumes, error: resumesError } = await supabase
		.from("project_resumes")
		.select("project_id, content, created_at")
		.in("project_id", projectIds)
		.order("created_at", { ascending: false });

	if (resumesError) {
		throw new Error(
			`Failed to fetch project resumes: ${resumesError.message}`
		);
	}

	const { data: borrowerResumes, error: borrowerResumesError } =
		await supabase
			.from("borrower_resumes")
			.select("project_id, content")
			.in("project_id", projectIds);

	if (borrowerResumesError) {
		throw new Error(
			`Failed to fetch borrower resumes: ${borrowerResumesError.message}`
		);
	}

	// Create a map of resume content by project ID
	// Since we sorted by created_at DESC, the first entry we encounter for each project_id is the latest
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

			// Extract lock state from JSONB root
			const rawLockedFields =
				(rawContent._lockedFields as
					| Record<string, boolean>
					| undefined) || {};

			const rawFieldStates = (rawContent._fieldStates as any) || {};

			// Store locks and states in separate map for the returned ProjectProfile
			lockedFieldsMap.set(resume.project_id, rawLockedFields);
			fieldStatesMap.set(resume.project_id, rawFieldStates);

			// Remove reserved keys so they are not treated as regular fields below
			// Create copy to avoid mutation issues if object reused
			rawContent = { ...rawContent };
			delete rawContent._lockedFields;
			delete rawContent._fieldStates;

			// Check if content is in section-grouped format and ungroup if needed
			if (isGroupedFormat(rawContent)) {
				rawContent = ungroupFromSections(rawContent);
			}

			const flatContent: Partial<ProjectResumeContent> = {};
			const metadata: Record<
				string,
				import("@/types/enhanced-types").FieldMetadata
			> = {};

			// Process rich data format
			for (const key in rawContent) {
				const item = rawContent[key];
				if (item && typeof item === "object" && "value" in item) {
					// Handle both 'source' (legacy) and 'sources' (new format)
					const hasSource = "source" in item;
					const hasSources = "sources" in item;

					if (hasSource || hasSources) {
						(flatContent as any)[key] = item.value;

						// Convert sources array to source string for metadata (for backward compatibility)
						let sourceValue: string | null = null;
						let originalSource:
							| "document"
							| "knowledge_base"
							| null = null;
						if (
							hasSources &&
							Array.isArray(item.sources) &&
							item.sources.length > 0
						) {
							// Use first source's name if available
							const firstSource = item.sources[0];
							if (
								typeof firstSource === "object" &&
								firstSource !== null &&
								"type" in firstSource
							) {
								// SourceMetadata object format
								if (firstSource.name) {
									sourceValue = firstSource.name;
								}
								// Determine original_source from type
								if (firstSource.type === "document") {
									originalSource = "document";
								} else if (firstSource.type === "external") {
									originalSource = "knowledge_base";
								}
							} else if (
								typeof firstSource === "object" &&
								firstSource !== null &&
								firstSource.name
							) {
								sourceValue = firstSource.name;
							} else if (typeof firstSource === "string") {
								sourceValue = firstSource;
							}
						} else if (hasSource) {
							if (
								typeof item.source === "object" &&
								item.source !== null &&
								"type" in item.source
							) {
								// SourceMetadata object format
								if (item.source.name) {
									sourceValue = item.source.name;
								}
								// Determine original_source from type
								if (item.source.type === "document") {
									originalSource = "document";
								} else if (item.source.type === "external") {
									originalSource = "knowledge_base";
								}
							} else {
								sourceValue =
									typeof item.source === "string"
										? item.source
										: null;
							}
						}

						metadata[key] = {
							value: item.value,
							source: sourceValue,
							sources:
								hasSources && Array.isArray(item.sources)
									? item.sources
									: hasSource
									? [item.source]
									: [],
							original_source: originalSource,
							original_value:
								item.original_value !== undefined
									? item.original_value
									: item.value, // Use original_value if available, fallback to value
							warnings: item.warnings || [],
						};
					} else {
						(flatContent as any)[key] = item;
					}
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

	// Combine projects with their resume content
	return (
		projects?.map((project: any) => {
			const resumeContent =
				resumeMap.get(project.id) || ({} as ProjectResumeContent);
			const metadata = metadataMap.get(project.id) || {};
			const borrowerResumeContent =
				borrowerResumeMap.get(project.id) ||
				({} as BorrowerResumeContent);
			const borrowerProgress = Math.round(
				(borrowerResumeContent.completenessPercent as
					| number
					| undefined) ?? 0
			);

			return {
				// Core project fields
				id: project.id,
				owner_org_id: project.owner_org_id,
				assignedAdvisorUserId: project.assigned_advisor_id,
				createdAt: project.created_at,
				updatedAt: project.updated_at,

				// New fields from expanded ProjectResumeContent (spread first)
				...resumeContent,

				// Override with fallbacks for key fields
				projectName: resumeContent.projectName || project.name,
				assetType: resumeContent.assetType || "",
				projectStatus: (resumeContent.projectStatus as any) || "",

				// Type-safe overrides for enum fields (no UX defaults – start empty)
				interestRateType: (resumeContent.interestRateType as any) || "",
				recoursePreference:
					(resumeContent.recoursePreference as any) || "",
				exitStrategy: resumeContent.exitStrategy as any,

				// Load completenessPercent from DB, fallback to 0 if not stored
				completenessPercent: resumeContent.completenessPercent ?? 0,
				internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
				borrowerProgress,
				projectSections: resumeContent.projectSections || {},
				borrowerSections: borrowerResumeContent || {},

				// Add metadata container
				_metadata: metadata,

				// Add locked_fields (no _lockedSections - derive from field locks)
				_lockedFields: lockedFieldsMap.get(project.id) || {},
				_fieldStates: fieldStatesMap.get(project.id) || {},

				// Legacy field
				borrowerProfileId: undefined,
			} as ProjectProfile;
		}) || []
	);
};

/**
 * Fetches project messages with sender information.
 * This replaces dbMessageToProjectMessage and handles the join properly.
 */
export const getProjectMessages = async (
	threadId: string
): Promise<ProjectMessage[]> => {
	const { data: messages, error } = await supabase
		.from("project_messages")
		.select(
			`
      id,
      thread_id,
      user_id,
      content,
      created_at,
      sender:profiles(id, full_name, email)
    `
		)
		.eq("thread_id", threadId)
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch messages: ${error.message}`);
	}

	return (
		messages?.map((msg: any) => ({
			id: msg.id,
			thread_id: msg.thread_id,
			user_id: msg.user_id,
			content: msg.content,
			created_at: msg.created_at,
		})) || []
	);
};

/**
 * Saves project resume content to the JSONB column.
 * This provides a type-safe way to update project details.
 * Now supports rich data format with metadata (value + source + warnings).
 */
export const saveProjectResume = async (
	projectId: string,
	content: Partial<ProjectProfile>, // Changed to ProjectProfile to access _metadata
	options?: { createNewVersion?: boolean }
): Promise<void> => {
	// Resolve the current user so we can attribute new versions correctly
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// 1. Find the latest existing row for this project
	const { data: existing } = await supabase
		.from("project_resumes")
		.select("id, content")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	// Extract metadata and prepare final content
	const metadata = (content as any)._metadata || {};
	const finalContent: any = {};

	// Extract reserved keys that should be preserved at root level
	const lockedFields = (content as any)._lockedFields || {};
	const fieldStates = (content as any)._fieldStates || {};

	// Iterate over fields to construct the JSONB object
	for (const key in content) {
		if (
			key === "_metadata" ||
			key === "_lockedFields" ||
			key === "_fieldStates"
		)
			continue; // Skip metadata and state containers

		const currentValue = (content as any)[key];
		const meta = metadata[key] as
			| import("@/types/source-metadata").SourceMetadata[]
			| undefined;

		// Normalize any legacy `source`/`sources` fields into a proper `sources` array
		const toSourcesArray = (input: any): any[] => {
			if (!input) return [];
			if (Array.isArray(input)) return input;
			if (typeof input === "string") {
				const normalized = input.toLowerCase().trim();
				if (
					normalized === "user_input" ||
					normalized === "user input"
				) {
					return [{ type: "user_input" }];
				}
				return [{ type: "document", name: input }];
			}
			if (
				typeof input === "object" &&
				input !== null &&
				"type" in input
			) {
				return [input];
			}
			return [];
		};

		if (meta) {
			// If we have metadata, save the full structure using ONLY `sources`
			const metaAny: any = metadata[key];
			const metaSources =
				metaAny?.sources !== undefined
					? metaAny.sources
					: metaAny?.source;

			finalContent[key] = {
				value: currentValue,
				sources: toSourcesArray(metaSources),
				warnings: metaAny?.warnings || [],
				original_value: metaAny?.original_value ?? currentValue,
			};
		} else {
			// Check if existing content has rich format for this field
			const existingItem = existing?.content?.[key];
			if (
				existingItem &&
				typeof existingItem === "object" &&
				("value" in existingItem ||
					"source" in existingItem ||
					"sources" in existingItem)
			) {
				const existingObj: any = existingItem;
				const existingSources =
					"sources" in existingObj
						? existingObj.sources
						: "source" in existingObj
						? toSourcesArray(existingObj.source)
						: undefined;

				// Preserve existing metadata structure (normalized to `sources`) if no new metadata provided
				finalContent[key] = {
					value: currentValue,
					sources: existingSources ?? [{ type: "user_input" }],
					warnings: existingObj.warnings || [],
					original_value: existingObj.original_value ?? currentValue,
				};
			} else {
				// Save flat value if no metadata exists
				finalContent[key] = currentValue;
			}
		}
	}

	// Check if existing content is in section-grouped format
	const isExistingSectionGrouped = isGroupedFormat(existing?.content || {});

	if (existing && !options?.createNewVersion) {
		// 2a. Update in Place: Modify the current version directly
		// This ensures manual edits don't create new history entries

		let contentToSave: any;

		if (isExistingSectionGrouped) {
			// Existing content is section-grouped, need to merge flat updates into it
			// First, convert flat finalContent to section-grouped format
			const groupedUpdates = groupBySections(finalContent);

			// Merge into existing section-grouped structure
			contentToSave = { ...existing.content };
			for (const [sectionKey, sectionFields] of Object.entries(
				groupedUpdates
			)) {
				if (!contentToSave[sectionKey]) {
					contentToSave[sectionKey] = {};
				}
				contentToSave[sectionKey] = {
					...contentToSave[sectionKey],
					...sectionFields,
				};
			}

			// Preserve root-level metadata fields
			contentToSave._lockedFields = lockedFields;
			contentToSave._fieldStates = fieldStates;
		} else {
			// Existing content is flat, merge flat with flat
			contentToSave = {
				...existing.content,
				...finalContent,
				_lockedFields: lockedFields,
				_fieldStates: fieldStates,
			};
		}

		const { error } = await supabase
			.from("project_resumes")
			.update({ content: contentToSave as any })
			.eq("id", existing.id);

		if (error) {
			throw new Error(
				`Failed to update project resume: ${error.message}`
			);
		}
	} else {
		// 2b. Insert New: Brand new project resume
		// Convert flat content to section-grouped format for new resumes
		const groupedContent = groupBySections(finalContent);
		const contentToInsert = {
			...groupedContent,
			_lockedFields: lockedFields,
			_fieldStates: fieldStates,
		};

		// Mark all existing versions as superseded before inserting the new one
		await supabase
			.from("project_resumes")
			.update({ status: "superseded" })
			.eq("project_id", projectId);

		const { data: newResume, error } = await supabase
			.from("project_resumes")
			.insert({
				project_id: projectId,
				content: contentToInsert as any,
				status: "active",
				created_by: user?.id ?? null,
			})
			.select("id, project_id, version_number")
			.single();

		if (error) {
			throw new Error(
				`Failed to create project resume: ${error.message}`
			);
		}

		// Ensure the PROJECT_RESUME resource pointer is updated to this version.
		// NOTE: The resources table does not currently have a UNIQUE(project_id, resource_type)
		// constraint, so an UPSERT with an onConflict target will fail. Instead, we issue a
		// straight UPDATE scoped by project_id + resource_type. This will reliably move the
		// pointer for existing resources without relying on constraint metadata.
		const { error: resourceError } = await supabase
			.from("resources")
			.update({ current_version_id: newResume.id })
			.eq("project_id", projectId)
			.eq("resource_type", "PROJECT_RESUME");

		// We don't throw on resource error strictly, as permissions or seed state may vary,
		// but log so we can diagnose issues in non-local environments.
		if (resourceError) {
			console.warn(
				"[saveProjectResume] Failed to update PROJECT_RESUME resource pointer:",
				resourceError.message
			);
		}
	}
};

/**
 * Loads borrower resume content from the JSONB column.
 * This provides a type-safe way to fetch borrower details.
 */
export const getProjectBorrowerResume = async (
	projectId: string
): Promise<BorrowerResumeContent | null> => {
	const { data: resource, error: resourceError } = await supabase
		.from("resources")
		.select("current_version_id")
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME")
		.maybeSingle();

	if (resourceError && resourceError.code !== "PGRST116") {
		console.warn(
			"[getProjectBorrowerResume] Failed to fetch borrower resume pointer:",
			resourceError
		);
	}

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

	if (error && error.code !== "PGRST116") {
		throw new Error(`Failed to load borrower resume: ${error.message}`);
	}

	if (!data) return null;

	// Lock state now lives inside the JSONB content under _lockedFields (section locks derived from field locks)
	const content = (data.content || {}) as BorrowerResumeContent;
	return content;
};

// Helper to map borrower resume fields to sections
const BORROWER_FIELD_TO_SECTION: Record<string, string> = {
	// section_1: basic-info
	fullLegalName: "section_1",
	primaryEntityName: "section_1",
	primaryEntityStructure: "section_1",
	contactEmail: "section_1",
	contactPhone: "section_1",
	contactAddress: "section_1",
	// section_2: experience
	yearsCREExperienceRange: "section_2",
	assetClassesExperience: "section_2",
	geographicMarketsExperience: "section_2",
	totalDealValueClosedRange: "section_2",
	existingLenderRelationships: "section_2",
	bioNarrative: "section_2",
	// section_3: borrower-financials
	creditScoreRange: "section_3",
	netWorthRange: "section_3",
	liquidityRange: "section_3",
	bankruptcyHistory: "section_3",
	foreclosureHistory: "section_3",
	litigationHistory: "section_3",
	// section_4: online-presence
	linkedinUrl: "section_4",
	websiteUrl: "section_4",
	// section_5: principals (handled separately as array)
	principals: "section_5",
};

// Helper to convert flat content to section-wise format
function convertToSectionWise(flatContent: any): any {
	const sectionWise: any = {};

	for (const [fieldId, fieldValue] of Object.entries(flatContent)) {
		if (fieldId.startsWith("section_") || fieldId === "_metadata") {
			// Already section-wise or metadata, keep as-is
			sectionWise[fieldId] = fieldValue;
			continue;
		}

		const sectionId = BORROWER_FIELD_TO_SECTION[fieldId];
		if (sectionId) {
			if (!sectionWise[sectionId]) {
				sectionWise[sectionId] = {};
			}
			sectionWise[sectionId][fieldId] = fieldValue;
		} else {
			// Unknown field - put in section_other
			if (!sectionWise["section_other"]) {
				sectionWise["section_other"] = {};
			}
			sectionWise["section_other"][fieldId] = fieldValue;
		}
	}

	return sectionWise;
}

// Helper to merge flat updates into section-wise structure
function mergeIntoSectionWise(existingSectionWise: any, flatUpdates: any): any {
	const merged = existingSectionWise ? { ...existingSectionWise } : {};

	for (const [fieldId, fieldValue] of Object.entries(flatUpdates)) {
		if (fieldId.startsWith("section_") || fieldId === "_metadata") {
			// Already section-wise or metadata, merge directly
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
		if (sectionId) {
			if (!merged[sectionId]) {
				merged[sectionId] = {};
			}
			merged[sectionId][fieldId] = fieldValue;
		} else {
			// Unknown field - put in section_other
			if (!merged["section_other"]) {
				merged["section_other"] = {};
			}
			merged["section_other"][fieldId] = fieldValue;
		}
	}

	return merged;
}

export const saveProjectBorrowerResume = async (
	projectId: string,
	content: Partial<BorrowerResumeContent>,
	lockedFields?: Record<string, boolean>,
	lockedSections?: Record<string, boolean>
): Promise<void> => {
	// First, get existing content to check if it's section-wise
	const { data: existingResume } = await supabase
		.from("borrower_resumes")
		.select("content")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	const existingContent = existingResume?.content || {};
	const isExistingSectionWise = Object.keys(existingContent).some((key) =>
		key.startsWith("section_")
	);

	let contentToSave: any;
	if (isExistingSectionWise) {
		// Merge flat updates into existing section-wise structure
		contentToSave = mergeIntoSectionWise(existingContent, content as any);
	} else {
		// Convert to section-wise format
		const mergedContent = { ...existingContent, ...(content as any) };
		contentToSave = convertToSectionWise(mergedContent);
	}

	// Extract _lockedFields and _fieldStates from content if present
	const lockedFieldsFromContent = (content as any)._lockedFields || {};
	const fieldStatesFromContent = (content as any)._fieldStates || {};

	const lockedFieldsToSave = lockedFields || lockedFieldsFromContent || {};

	// Ensure lock state and field states are stored inside the JSONB content at the root
	const finalContentToSave: any = {
		...contentToSave,
		_lockedFields: lockedFieldsToSave,
		_fieldStates: fieldStatesFromContent,
	};

	const { data: resource, error: resourceError } = await supabase
		.from("resources")
		.select("id, current_version_id")
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME")
		.maybeSingle();

	if (resourceError && resourceError.code !== "PGRST116") {
		console.warn(
			"[saveProjectBorrowerResume] Failed to read resource pointer:",
			resourceError
		);
	}

	if (resource?.current_version_id) {
		const { error } = await supabase
			.from("borrower_resumes")
			.update({
				content: finalContentToSave,
			})
			.eq("id", resource.current_version_id);

		if (error) {
			throw new Error(
				`Failed to update borrower resume: ${error.message}`
			);
		}

		return;
	}

	const { data: inserted, error: insertError } = await supabase
		.from("borrower_resumes")
		.insert({
			project_id: projectId,
			content: finalContentToSave,
		})
		.select("id")
		.single();

	if (insertError) {
		throw new Error(
			`Failed to create borrower resume: ${insertError.message}`
		);
	}

	if (resource?.id) {
		const { error: pointerError } = await supabase
			.from("resources")
			.update({ current_version_id: inserted.id })
			.eq("id", resource.id);

		if (pointerError) {
			console.warn(
				"[saveProjectBorrowerResume] Failed to update resource pointer:",
				pointerError
			);
		}
	}
};

/**
 * Loads advisor resume content from the JSONB column.
 * This provides a type-safe way to fetch advisor details.
 * Now org-scoped: any advisor in the org can access it.
 */
export const getAdvisorResume = async (
	orgId: string
): Promise<AdvisorResumeContent | null> => {
	const { data, error } = await supabase
		.from("advisor_resumes")
		.select("content")
		.eq("org_id", orgId)
		.maybeSingle();

	if (error && error.code !== "PGRST116") {
		throw new Error(`Failed to load advisor resume: ${error.message}`);
	}

	return data?.content || null;
};

/**
 * Saves advisor resume content to the JSONB column.
 * This provides a type-safe way to update advisor details.
 * Now org-scoped: any advisor in the org can update it.
 */
export const saveAdvisorResume = async (
	orgId: string,
	content: Partial<AdvisorResumeContent>
): Promise<void> => {
	const existing = await getAdvisorResume(orgId);
	const mergedContent = { ...(existing || {}), ...content } as any;

	const { error } = await supabase.from("advisor_resumes").upsert(
		{
			org_id: orgId,
			content: mergedContent,
		},
		{ onConflict: "org_id" }
	);

	if (error) {
		throw new Error(`Failed to save advisor resume: ${error.message}`);
	}
};
