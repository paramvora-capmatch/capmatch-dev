// src/lib/project-queries.ts
import { supabase } from "../../lib/supabaseClient";
import { ProjectProfile, ProjectMessage, Principal } from "@/types/enhanced-types";

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
  projectType?: string; // Multi-select: Mixed-Use, Retail, Office, etc.
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
  
  // Section 2.1: Residential Unit Mix (stored as array)
  residentialUnitMix?: Array<{
    unitType: string; // e.g., "S1", "Studio", "1BR"
    unitCount: number;
    avgSF: number;
    monthlyRent?: number;
    totalSF?: number; // Derived: Count * SF
    percentOfTotal?: number; // Derived: Count / Total Units
  }>;
  
  // Section 2.2: Commercial Space Mix (stored as array)
  commercialSpaceMix?: Array<{
    spaceType: string; // e.g., "Retail", "Office"
    squareFootage: number;
    tenant?: string;
    leaseTerm?: string;
    annualRent?: number;
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
  
  // Section 3.2: Sources of Funds
  seniorLoanAmount?: number;
  sponsorEquity?: number;
  
  // Section 3.3: Loan Terms
  interestRate?: number; // Percentage
  underwritingRate?: number; // Percentage
  amortization?: string; // IO, 30yr, 25yr
  prepaymentTerms?: string;
  recourse?: string; // Full, Partial, Non
  permTakeoutPlanned?: boolean;
  
  // Section 3.5: Operating Expenses (Proforma Year 1)
  realEstateTaxes?: number;
  insurance?: number;
  utilities?: number;
  repairsAndMaintenance?: number;
  managementFee?: number;
  generalAndAdmin?: number;
  payroll?: number;
  reserves?: number;
  
  // Section 3.6: Investment Metrics
  noiYear1?: number; // Derived: EGI - Total Exp
  yieldOnCost?: number; // Derived: NOI / TDC
  capRate?: number; // Percentage
  stabilizedValue?: number; // Derived: NOI / Cap Rate
  ltv?: number; // Derived: Loan / Value
  debtYield?: number; // Derived: NOI / Loan
  dscr?: number; // Derived: NOI / Debt Svc
  
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
  
  // Section 6: Timeline & Milestones
  landAcqClose?: string; // Date
  entitlements?: string; // Approved/Pending
  finalPlans?: string; // Approved/Pending
  permitsIssued?: string; // Issued/Pending
  verticalStart?: string; // Date
  firstOccupancy?: string; // Date
  stabilization?: string; // Date
  preLeasedSF?: number;
  
  // Section 7: Site & Context
  totalSiteAcreage?: number; // Decimal
  currentSiteStatus?: string; // Vacant/Existing
  topography?: string; // Flat/Sloped
  environmental?: string; // Clean/Remediation
  siteAccess?: string; // Text
  proximityShopping?: string; // Text
  proximityRestaurants?: string; // Text
  proximityParks?: string; // Text
  proximitySchools?: string; // Text
  proximityHospitals?: string; // Text
  
  // Section 8: Sponsor Information
  sponsorEntityName?: string;
  sponsorStructure?: string; // GP/LP
  equityPartner?: string;
  contactInfo?: string;
  
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
export const getProjectWithResume = async (projectId: string): Promise<ProjectProfile> => {
  // Fetch core project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  // Fetch detailed project data from resume
  const { data: resume, error: resumeError } = await supabase
    .from('project_resumes')
    .select('content')
    .eq('project_id', projectId)
    .single();

  // Resume not found is OK (project might not have detailed data yet)
  if (resumeError && resumeError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch project resume: ${resumeError.message}`);
  }

  const resumeContent: ProjectResumeContent = resume?.content || {};

  const { data: borrowerResume, error: borrowerResumeError } = await supabase
    .from('borrower_resumes')
    .select('content')
    .eq('project_id', projectId)
    .maybeSingle();

  if (borrowerResumeError && borrowerResumeError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch borrower resume: ${borrowerResumeError.message}`);
  }

  const borrowerResumeContent: BorrowerResumeContent = borrowerResume?.content || {};
  const borrowerProgress = Math.round(
    (borrowerResumeContent.completenessPercent as number | undefined) ?? 0
  );

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
      projectStatus: resumeContent.projectStatus || "Draft",
      
      // Type-safe overrides for enum fields
      interestRateType: (resumeContent.interestRateType as any) || "Not Specified",
      recoursePreference: (resumeContent.recoursePreference as any) || "Flexible",
      exitStrategy: resumeContent.exitStrategy as any,
      
      // Load completenessPercent from DB, fallback to 0 if not stored
      completenessPercent: resumeContent.completenessPercent ?? 0,
      internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
      borrowerProgress,
      projectSections: resumeContent.projectSections || {},
      borrowerSections: borrowerResumeContent || {},
    } as ProjectProfile;
};

/**
 * Fetches multiple projects with their resume content.
 * This replaces the array mapping pattern used in the stores.
 */
export const getProjectsWithResumes = async (projectIds: string[]): Promise<ProjectProfile[]> => {
  if (projectIds.length === 0) return [];

  // Fetch core project data
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds);

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  // Fetch all resume data
  const { data: resumes, error: resumesError } = await supabase
    .from('project_resumes')
    .select('project_id, content')
    .in('project_id', projectIds);

  if (resumesError) {
    throw new Error(`Failed to fetch project resumes: ${resumesError.message}`);
  }

  const { data: borrowerResumes, error: borrowerResumesError } = await supabase
    .from('borrower_resumes')
    .select('project_id, content')
    .in('project_id', projectIds);

  if (borrowerResumesError) {
    throw new Error(`Failed to fetch borrower resumes: ${borrowerResumesError.message}`);
  }

  // Create a map of resume content by project ID
  const resumeMap = new Map<string, ProjectResumeContent>();
  resumes?.forEach((resume: any) => {
    resumeMap.set(resume.project_id, resume.content || {});
  });

  const borrowerResumeMap = new Map<string, BorrowerResumeContent>();
  borrowerResumes?.forEach((resume: any) => {
    borrowerResumeMap.set(resume.project_id, resume.content || {});
  });

  // Combine projects with their resume content
  return projects?.map((project: any) => {
    const resumeContent = resumeMap.get(project.id) || {} as ProjectResumeContent;
    const borrowerResumeContent = borrowerResumeMap.get(project.id) || {} as BorrowerResumeContent;
    const borrowerProgress = Math.round(
      (borrowerResumeContent.completenessPercent as number | undefined) ?? 0
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
      projectStatus: resumeContent.projectStatus || "Draft",
      
      // Type-safe overrides for enum fields
      interestRateType: (resumeContent.interestRateType as any) || "Not Specified",
      recoursePreference: (resumeContent.recoursePreference as any) || "Flexible",
      exitStrategy: resumeContent.exitStrategy as any,
      
      // Load completenessPercent from DB, fallback to 0 if not stored
      completenessPercent: resumeContent.completenessPercent ?? 0,
      internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
      borrowerProgress,
      projectSections: resumeContent.projectSections || {},
      borrowerSections: borrowerResumeContent || {},
      
      // Legacy field
      borrowerProfileId: undefined,
    } as ProjectProfile;
  }) || [];
};

/**
 * Fetches project messages with sender information.
 * This replaces dbMessageToProjectMessage and handles the join properly.
 */
export const getProjectMessages = async (threadId: string): Promise<ProjectMessage[]> => {
  const { data: messages, error } = await supabase
    .from('project_messages')
    .select(`
      id,
      thread_id,
      user_id,
      content,
      created_at,
      sender:profiles(id, full_name, email)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return messages?.map((msg: any) => ({
    id: msg.id,
    thread_id: msg.thread_id,
    user_id: msg.user_id,
    content: msg.content,
    created_at: msg.created_at,
  })) || [];
};

/**
 * Saves project resume content to the JSONB column.
 * This provides a type-safe way to update project details.
 */
export const saveProjectResume = async (
  projectId: string, 
  content: Partial<ProjectResumeContent>
): Promise<void> => {
  const { error } = await supabase
    .from('project_resumes')
    .upsert(
      { 
        project_id: projectId, 
        content: content as any // Cast to any for JSONB storage
      }, 
      { onConflict: 'project_id' }
    );

  if (error) {
    throw new Error(`Failed to save project resume: ${error.message}`);
  }
};

/**
 * Loads borrower resume content from the JSONB column.
 * This provides a type-safe way to fetch borrower details.
 */
export const getProjectBorrowerResume = async (
  projectId: string
): Promise<BorrowerResumeContent | null> => {
  const { data, error } = await supabase
    .from('borrower_resumes')
    .select('content')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load borrower resume: ${error.message}`);
  }

  return data?.content || null;
};

export const saveProjectBorrowerResume = async (
  projectId: string,
  content: Partial<BorrowerResumeContent>
): Promise<void> => {
  const existing = await getProjectBorrowerResume(projectId);
  const mergedContent = { ...(existing || {}), ...content } as any;

  const { error } = await supabase
    .from('borrower_resumes')
    .upsert(
      {
        project_id: projectId,
        content: mergedContent,
      },
      { onConflict: 'project_id' }
    );

  if (error) {
    throw new Error(`Failed to save borrower resume: ${error.message}`);
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
    .from('advisor_resumes')
    .select('content')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
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

  const { error } = await supabase
    .from('advisor_resumes')
    .upsert(
      {
        org_id: orgId,
        content: mergedContent,
      },
      { onConflict: 'org_id' }
    );

  if (error) {
    throw new Error(`Failed to save advisor resume: ${error.message}`);
  }
};
