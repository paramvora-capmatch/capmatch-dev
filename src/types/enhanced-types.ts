// src/types/enhanced-types.ts

// Core Schema Types - Updated to match new schema
import type { SourceMetadata } from "./source-metadata";
export type AppRole = "borrower" | "lender" | "advisor";
export type OrgType = "borrower" | "lender" | "advisor";
export type OrgMemberRole = "owner" | "member";
export type InviteStatus = "pending" | "accepted" | "cancelled" | "expired";

// Legacy types for backward compatibility
export type EntityStructure =
	| "LLC"
	| "LP"
	| "S-Corp"
	| "C-Corp"
	| "Sole Proprietorship"
	| "Trust"
	| "Other";
export type ExperienceRange = "0-2" | "3-5" | "6-10" | "11-15" | "16+";
export type DealValueRange =
	| "<$10M"
	| "$10M-$50M"
	| "$50M-$100M"
	| "$100M-$250M"
	| "$250M-$500M"
	| "$500M+"
	| "N/A";
export type CreditScoreRange =
	| "<600"
	| "600-649"
	| "650-699"
	| "700-749"
	| "750-799"
	| "800+"
	| "N/A";
export type NetWorthRange =
	| "<$1M"
	| "$1M-$5M"
	| "$5M-$10M"
	| "$10M-$25M"
	| "$25M-$50M"
	| "$50M-$100M"
	| "$100M+";
export type LiquidityRange =
	| "<$100k"
	| "$100k-$500k"
	| "$500k-$1M"
	| "$1M-$5M"
	| "$5M-$10M"
	| "$10M+";

// New Core Profile Type (replaces BorrowerProfile)
export interface Profile {
	id: string; // UUID, FK to auth.users.id
	created_at: string;
	updated_at: string;
	full_name?: string;
	email: string;
	app_role: AppRole; // 'borrower', 'lender', or 'advisor'
	active_org_id?: string | null; // FK to orgs.id, nullable for advisors
}

// New Org Type (unified for borrower, lender, and advisor organizations)
export interface Org {
	id: string;
	created_at: string;
	updated_at: string;
	name: string;
	entity_type: OrgType; // 'borrower', 'lender', or 'advisor'
}

// New Org Member Type
export interface OrgMember {
	org_id: string;
	user_id: string;
	role: OrgMemberRole; // 'owner', 'project_manager', or 'member'
	created_at: string;
	// Additional properties added by the org store
	userName?: string;
	userEmail?: string | null;
	userRole?: AppRole;
}

// New Invite Type
export interface Invite {
	id: string;
	org_id: string;
	invited_by: string;
	invited_email: string;
	role: OrgMemberRole;
	token: string;
	status: InviteStatus;
	expires_at: string;
	accepted_at?: string | null;
	created_at: string;
	// Added by org store
	inviterName?: string;
}

// Legacy BorrowerProfile - kept for backward compatibility but deprecated
export interface BorrowerProfile {
	id: string;
	userId: string;
	fullLegalName: string;
	primaryEntityName: string;
	primaryEntityStructure: EntityStructure;
	contactEmail: string;
	contactPhone: string;
	contactAddress: string;
	bioNarrative: string;
	linkedinUrl: string;
	websiteUrl: string;
	yearsCREExperienceRange: ExperienceRange;
	assetClassesExperience: string[];
	geographicMarketsExperience: string[];
	totalDealValueClosedRange: DealValueRange;
	existingLenderRelationships: string;
	creditScoreRange: CreditScoreRange;
	netWorthRange: NetWorthRange;
	liquidityRange: LiquidityRange;
	bankruptcyHistory: boolean;
	foreclosureHistory: boolean;
	litigationHistory: boolean;
	completenessPercent: number;
	createdAt: string;
	updatedAt: string;
	// RBAC additions
	entityId: string;
	masterProfileId?: string | null;
	lastSyncedAt?: string;
	customFields?: string[];
}

// Principal Types
export type PrincipalRole =
	| "Managing Member"
	| "General Partner"
	| "Developer"
	| "Sponsor"
	| "Key Principal"
	| "Guarantor"
	| "Limited Partner"
	| "Other";

export interface Principal {
	id: string;
	borrowerProfileId: string;
	principalLegalName: string;
	principalRoleDefault: PrincipalRole;
	principalBio: string;
	principalEmail: string;
	ownershipPercentage: number;
	creditScoreRange: CreditScoreRange;
	netWorthRange: NetWorthRange;
	liquidityRange: LiquidityRange;
	bankruptcyHistory: boolean;
	foreclosureHistory: boolean;
	specialties?: string[];
	achievements?: string[];
	education?: string;
	pfsDocumentId: string | null;
	createdAt: string;
	updatedAt: string;
}

// Project Types
export type ProjectPhase =
	| "Acquisition"
	| "Refinance"
	| "Construction"
	| "Bridge"
	| "Development"
	| "Value-Add"
	| "Other";
export type InterestRateType = "Fixed" | "Floating" | "Not Specified";
export type RecoursePreference =
	| "Full Recourse"
	| "Partial Recourse"
	| "Non-Recourse"
	| "Flexible";
export type ExitStrategy =
	| "Sale"
	| "Refinance"
	| "Long-Term Hold"
	| "Undecided";
export type ProjectStatus =
	| "Draft"
	| "Info Gathering"
	| "Advisor Review"
	| "Matches Curated"
	| "Introductions Sent"
	| "Term Sheet Received"
	| "Closed"
	| "Withdrawn"
	| "Stalled";

// New Project Type (matches new schema)
export interface Project {
	id: string;
	created_at: string;
	updated_at: string;
	name: string;
	owner_org_id: string; // FK to orgs.id
	assigned_advisor_id?: string | null; // FK to profiles.id
	deal_type: 'ground_up' | 'refinance'; // Deal type classification
}

// New Resume Types
export interface BorrowerResume {
	id: string;
	project_id: string; // FK to projects.id (1-to-1 with project, was previously org_id)
	content?: Record<string, unknown>; // JSONB
	created_at: string;
	updated_at: string;
}

export interface ProjectResume {
	id: string;
	project_id: string; // FK to projects.id (1-to-1 with project)
	content?: Record<string, unknown>; // JSONB
	created_at: string;
	updated_at: string;
}

// New Document Permission Types
export interface DocumentPermission {
	id: string;
	project_id: string; // FK to projects.id
	user_id: string; // FK to profiles.id
	document_path: string;
	created_at: string;
}

export interface LenderDocumentAccess {
	id: string;
	project_id: string; // FK to projects.id
	lender_org_id: string; // FK to orgs.id
	document_path: string;
	granted_by: string; // FK to profiles.id
	created_at: string;
}

// New Chat Types
export interface ChatThread {
	id: string;
	project_id: string; // FK to projects.id
	topic?: string;
	created_at: string;
}

export interface ChatThreadParticipant {
	thread_id: string; // FK to chat_threads.id
	user_id: string; // FK to profiles.id
	created_at: string;
}

export interface ProjectMessage {
	id: number; // BIGSERIAL
	thread_id: string; // FK to chat_threads.id
	project_id?: string; // Not in DB table, populated via join with chat_threads
	user_id?: string | null; // FK to profiles.id (SET NULL on user delete)
	content?: string;
	created_at: string;
	reply_to?: number | null; // FK to project_messages.id (the message being replied to)
}

export interface MessageAttachment {
	id: number; // BIGSERIAL
	message_id: number; // FK to project_messages.id
	document_path: string;
	created_at: string;
}

export interface Notification {
	id: number; // BIGSERIAL
	user_id: string; // FK to profiles.id
	event_id: number; // FK to domain_events.id
	title: string;
	body?: string | null;
	link_url?: string | null;
	payload?: Record<string, unknown> | null;
	read_at?: string | null;
	created_at: string;
}

// Legacy ProjectProfile - kept for backward compatibility but deprecated
// Extended to include all ProjectResumeContent fields for type safety
export interface ProjectProfile {
	id: string;
	owner_org_id: string; // The org_id that owns the project
	projectName: string;
	assetType: string;
	projectStatus: string; // Legacy field, maps to dealStatus for backward compatibility
	createdAt: string;
	updatedAt: string;
	// New resource IDs
	projectDocsResourceId?: string | null;
	projectResumeResourceId?: string | null;
	deal_type?: 'ground_up' | 'refinance'; // Deal type classification
	// Optional fields
	assignedAdvisorUserId?: string | null;
	// Legacy `borrowerProfileId` no longer exists, but keep for older mock data compatibility
	borrowerProfileId?: string;
	propertyAddressStreet?: string | null;
	propertyAddressCity?: string | null;
	propertyAddressState?: string | null;
	propertyAddressCounty?: string | null;
	propertyAddressZip?: string | null;
	projectDescription?: string | null;
	projectPhase?: string | null;
	loanAmountRequested?: number | null;
	loanType?: string | null;
	targetLtvPercent?: number | null;
	targetLtcPercent?: number | null;
	amortizationYears?: number | null;
	interestOnlyPeriodMonths?: number | null;
	interestRateType?: InterestRateType | null;
	targetCloseDate?: string | null;
	useOfProceeds?: string | null;
	recoursePreference?: RecoursePreference | null;
	purchasePrice?: number | null;
	totalProjectCost?: number | null;
	capexBudget?: number | null;
	propertyNoiT12?: number | null;
	stabilizedNoiProjected?: number | null;
	exitStrategy?: ExitStrategy | null;
	businessPlanSummary?: string | null;
	marketOverviewSummary?: string | null;
	equityCommittedPercent?: number | null;
	completenessPercent?: number | null;
	internalAdvisorNotes?: string | null;
	borrowerProgress?: number | null;
	projectSections?: any; // Add for consistency with mock data
	borrowerSections?: any; // Add for consistency with mock data
	// RBAC additions

	// Extended fields from ProjectResumeContent (for type safety)
	parcelNumber?: string;
	zoningDesignation?: string;
	expectedZoningChanges?: string;
	constructionType?: string;
	groundbreakingDate?: string;
	completionDate?: string;
	totalDevelopmentCost?: number;
	requestedTerm?: string;
	dealStatus?: string;
	syndicationStatus?: string;
	sponsorExperience?: string;
	ltvStressMax?: number;
	dscrStressMin?: number;
	expectedHoldPeriod?: number;
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
	buildingEfficiency?: number;
	studioCount?: number;
	oneBedCount?: number;
	twoBedCount?: number;
	threeBedCount?: number;
	furnishedUnits?: boolean;
	lossToLease?: number;
	adaCompliantUnitsPercent?: number;
	adaCompliantPercent?: number;
	hvacSystem?: string;
	roofTypeAge?: string;
	solarCapacity?: number;
	evChargingStations?: number;
	leedSustainabilityRating?: string;
	leedGreenRating?: string;
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
	bachelorsShare?: number;
	msaName?: string;
	unemploymentRate?: number;
	largestEmployer?: string;
	employerConcentration?: number;
	submarketAbsorption?: number;
	supplyPipeline?: number;
	monthsOfSupply?: number;
	captureRate?: number;
	marketConcessions?: string;
	absorptionRate?: number;
	penetrationRate?: number;
	northStarComp?: string;
	infrastructureProject?: string;
	infrastructureCatalyst?: string;
	broadbandSpeed?: string;
	crimeRiskLevel?: string;
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
	buildableAcreage?: number;
	allowableFAR?: number;
	farUtilizedPercent?: number;
	densityBonus?: boolean;
	soilConditions?: string;
	wetlandsPresent?: boolean;
	seismicRisk?: string;
	phaseIESAFinding?: string;
	utilityAvailability?: string;
	easements?: string;
	accessPoints?: string;
	adjacentLandUse?: string;
	noiseFactors?: string[];
	viewCorridors?: string[];
	topEmployers?: string;
	sponsorEntityName?: string;
	sponsorStructure?: string;
	equityPartner?: string;
	contactInfo?: string;
	sponsorExpScore?: number;
	priorDevelopments?: number;
	netWorth?: number;
	guarantorLiquidity?: number;
	portfolioDSCR?: number;

	// Metadata container for rich data (value + source + warnings)
	_metadata?: Record<string, FieldMetadata>;
	// Locked fields container (fieldId -> true)
	_lockedFields?: Record<string, boolean>;
	// _lockedSections removed - section locks are derived from field locks
	// Field states container (fieldId -> { state: "WHITE" | "BLUE" | "GREEN", locked: boolean, source: "ai" | "user_input" | null })
	_fieldStates?: Record<string, { state: "WHITE" | "BLUE" | "GREEN"; locked: boolean; source: "ai" | "user_input" | null }>;
}

// Project Principal Types
export interface ProjectPrincipal {
	id: string;
	projectId: string;
	principalId: string;
	roleInProject: PrincipalRole;
	guarantyDetails: string | null;
	isKeyPrincipal: boolean;
	isPrimaryContact: boolean;
	createdAt: string;
}

// Document Types
export type DocumentCategory =
	| "PFS"
	| "SREO"
	| "Tax Returns"
	| "Entity Docs"
	| "Rent Roll"
	| "Financials"
	| "Pro Forma"
	| "Plans"
	| "Budget"
	| "Market Study"
	| "Appraisal"
	| "Environmental"
	| "Title"
	| "Survey"
	| "Purchase Agreement"
	| "Other";

export interface Document {
	id: string;
	uploaderUserId: string;
	fileName: string;
	fileType: string;
	fileSizeBytes: number;
	storagePath: string;
	documentCategory: DocumentCategory;
	extractedMetadata: Record<string, unknown>;
	createdAt: string;
	uploadedAt: string;
}

// Document Requirement Status
export type DocumentRequirementStatus =
	| "Required"
	| "Pending Upload"
	| "Uploaded"
	| "In Review"
	| "Approved"
	| "Rejected"
	| "Not Applicable";

export interface ProjectDocumentRequirement {
	id: string;
	projectId: string;
	requiredDocType: DocumentCategory;
	status: DocumentRequirementStatus;
	documentId?: string | null;
	notes: string;
	dueDate?: string | null;
	lastUpdated: string;
}

// Advisor Types
export interface Advisor {
	id: string;
	userId: string;
	name: string;
	title: string;
	email: string;
	phone: string;
	bio: string;
	avatar: string;
	specialties: string[];
	yearsExperience: number;
	createdAt: string;
	updatedAt: string;
}

// Enhanced User type with role and login source - Updated for new schema
export interface EnhancedUser {
	id?: string; // Add user's auth ID (UUID)
	email: string;
	name?: string;
	profileId?: string; // Optional: ID of the associated Profile
	lastLogin: Date;
	role: AppRole; // Now uses AppRole type
	loginSource?: "direct" | "lenderline"; // Added login source tracking
	isDemo?: boolean; // Flag for demo users
	// RBAC additions
	activeOrgId?: string | null; // for context switching
	orgMemberships?: OrgMember[]; // loaded on login
}

export type PermissionType = "file" | "folder";

export type Permission = "view" | "edit";

export type FilePermissionOverride = {
	resource_id: string;
	permission: Permission | "none";
};

// Field Metadata Types for warnings and source tracking
// Matches backend rich format: { value, source, warnings, other_values }
export interface FieldMetadata {
	value: any;
	// Primary source for the current value. When undefined, the UI treats it
	// as user_input by default (see sanitize*Profile helpers).
	source?: SourceMetadata | null;
	// Any warnings attached to this value (sanity / divergence checks).
	warnings?: string[];
	// Alternative values from other sources (e.g. document vs KB).
	other_values?: Array<{ value: any; source: SourceMetadata }>;
}

export type ProjectGrant = {
	projectId: string;
	permissions: {
		resource_type: string; // e.g., 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT'
		permission: Permission; // 'view' | 'edit'
	}[];
	// Per-file overrides. If absent for a file, root Project Docs permission applies.
	fileOverrides?: FilePermissionOverride[];
	// Back-compat: exclusions (maps to permission 'none')
	exclusions?: string[];
};

export type OrgGrant = {
	permissions: {
		resource_type: "BORROWER_RESUME" | "BORROWER_DOCS_ROOT";
		permission: Permission;
	}[];
	fileOverrides?: FilePermissionOverride[];
	exclusions?: string[]; // org-level FILE resource_ids to set 'none'
};
