// src/lib/project-queries.ts
import { supabase } from "../../lib/supabaseClient";
import { ProjectProfile, ProjectMessage } from "@/types/enhanced-types";

// =============================================================================
// JSONB Content Type Definitions
// =============================================================================

/**
 * Defines the structure of project_resumes.content JSONB column
 * This preserves all the fields from the original DTO mapper
 */
export interface ProjectResumeContent {
  // Basic project info
  projectName: string;
  assetType: string;
  projectStatus: string;
  
  // Address fields
  propertyAddressStreet?: string;
  propertyAddressCity?: string;
  propertyAddressState?: string;
  propertyAddressCounty?: string;
  propertyAddressZip?: string;
  
  // Project details
  projectDescription?: string;
  projectPhase?: string;
  
  // Financial fields
  loanAmountRequested?: number;
  loanType?: string;
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
  
  // Progress tracking
  completenessPercent?: number;
  internalAdvisorNotes?: string;
  borrowerProgress?: number;
  projectProgress?: number;
  
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
  
  // Progress tracking
  completenessPercent?: number;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
  masterProfileId?: string;
  lastSyncedAt?: string;
  customFields?: string[];
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

  // Combine core project fields with resume content
  return {
    // Core project fields (from projects table)
    id: project.id,
    owner_org_id: project.owner_org_id,
    assignedAdvisorUserId: project.assigned_advisor_id,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    
    // Detailed fields (from project_resumes.content JSONB)
    projectName: resumeContent.projectName || project.name, // Fallback to core name
    assetType: resumeContent.assetType || "",
    projectStatus: resumeContent.projectStatus || "Draft",
    propertyAddressStreet: resumeContent.propertyAddressStreet || "",
    propertyAddressCity: resumeContent.propertyAddressCity || "",
    propertyAddressState: resumeContent.propertyAddressState || "",
    propertyAddressCounty: resumeContent.propertyAddressCounty || "",
    propertyAddressZip: resumeContent.propertyAddressZip || "",
    projectDescription: resumeContent.projectDescription || "",
    projectPhase: resumeContent.projectPhase,
    loanAmountRequested: resumeContent.loanAmountRequested,
    loanType: resumeContent.loanType || "",
    targetLtvPercent: resumeContent.targetLtvPercent,
    targetLtcPercent: resumeContent.targetLtcPercent,
    amortizationYears: resumeContent.amortizationYears,
    interestOnlyPeriodMonths: resumeContent.interestOnlyPeriodMonths,
    interestRateType: resumeContent.interestRateType as any || "Not Specified",
    targetCloseDate: resumeContent.targetCloseDate,
    useOfProceeds: resumeContent.useOfProceeds || "",
    recoursePreference: resumeContent.recoursePreference as any || "Flexible",
    purchasePrice: resumeContent.purchasePrice,
    totalProjectCost: resumeContent.totalProjectCost,
    capexBudget: resumeContent.capexBudget,
    propertyNoiT12: resumeContent.propertyNoiT12,
    stabilizedNoiProjected: resumeContent.stabilizedNoiProjected,
    exitStrategy: resumeContent.exitStrategy as any,
    businessPlanSummary: resumeContent.businessPlanSummary || "",
    marketOverviewSummary: resumeContent.marketOverviewSummary || "",
    equityCommittedPercent: resumeContent.equityCommittedPercent,
    completenessPercent: resumeContent.completenessPercent || 0,
    internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
    borrowerProgress: resumeContent.borrowerProgress || 0,
    projectProgress: resumeContent.projectProgress || 0,
    projectSections: resumeContent.projectSections || {},
    borrowerSections: resumeContent.borrowerSections || {},
  };
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

  // Create a map of resume content by project ID
  const resumeMap = new Map<string, ProjectResumeContent>();
  resumes?.forEach((resume: any) => {
    resumeMap.set(resume.project_id, resume.content || {});
  });

  // Combine projects with their resume content
  return projects?.map((project: any) => {
    const resumeContent = resumeMap.get(project.id) || {} as ProjectResumeContent;
    
    return {
      // Core project fields
      id: project.id,
      owner_org_id: project.owner_org_id,
      assignedAdvisorUserId: project.assigned_advisor_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      
      // Detailed fields from resume
      projectName: resumeContent.projectName || project.name,
      assetType: resumeContent.assetType || "",
      projectStatus: resumeContent.projectStatus || "Draft",
      propertyAddressStreet: resumeContent.propertyAddressStreet || "",
      propertyAddressCity: resumeContent.propertyAddressCity || "",
      propertyAddressState: resumeContent.propertyAddressState || "",
      propertyAddressCounty: resumeContent.propertyAddressCounty || "",
      propertyAddressZip: resumeContent.propertyAddressZip || "",
      projectDescription: resumeContent.projectDescription || "",
      projectPhase: resumeContent.projectPhase,
      loanAmountRequested: resumeContent.loanAmountRequested,
      loanType: resumeContent.loanType || "",
      targetLtvPercent: resumeContent.targetLtvPercent,
      targetLtcPercent: resumeContent.targetLtcPercent,
      amortizationYears: resumeContent.amortizationYears,
      interestOnlyPeriodMonths: resumeContent.interestOnlyPeriodMonths,
      interestRateType: resumeContent.interestRateType as any || "Not Specified",
      targetCloseDate: resumeContent.targetCloseDate,
      useOfProceeds: resumeContent.useOfProceeds || "",
      recoursePreference: resumeContent.recoursePreference as any || "Flexible",
      purchasePrice: resumeContent.purchasePrice,
      totalProjectCost: resumeContent.totalProjectCost,
      capexBudget: resumeContent.capexBudget,
      propertyNoiT12: resumeContent.propertyNoiT12,
      stabilizedNoiProjected: resumeContent.stabilizedNoiProjected,
      exitStrategy: resumeContent.exitStrategy as any,
      businessPlanSummary: resumeContent.businessPlanSummary || "",
      marketOverviewSummary: resumeContent.marketOverviewSummary || "",
      equityCommittedPercent: resumeContent.equityCommittedPercent,
      completenessPercent: resumeContent.completenessPercent || 0,
      internalAdvisorNotes: resumeContent.internalAdvisorNotes || "",
      borrowerProgress: resumeContent.borrowerProgress || 0,
      projectProgress: resumeContent.projectProgress || 0,
      projectSections: resumeContent.projectSections || {},
      borrowerSections: resumeContent.borrowerSections || {},
      
      // Legacy field
      borrowerProfileId: undefined,
    };
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
export const getBorrowerResume = async (
  orgId: string
): Promise<BorrowerResumeContent | null> => {
  const { data, error } = await supabase
    .from('borrower_resumes')
    .select('content')
    .eq('org_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No row found
      return null;
    }
    throw new Error(`Failed to load borrower resume: ${error.message}`);
  }

  return data?.content || null;
};

/**
 * Saves borrower resume content to the JSONB column.
 * This provides a type-safe way to update borrower details.
 */
export const saveBorrowerResume = async (
  orgId: string, 
  content: Partial<BorrowerResumeContent>
): Promise<void> => {
  // Fetch existing content to avoid overwriting fields that were not provided
  const existing = await getBorrowerResume(orgId);
  const mergedContent = { ...(existing || {}), ...content } as any;

  const { error } = await supabase
    .from('borrower_resumes')
    .upsert(
      { 
        org_id: orgId, 
        content: mergedContent // Merge to preserve existing JSONB fields
      }, 
      { onConflict: 'org_id' }
    );

  if (error) {
    throw new Error(`Failed to save borrower resume: ${error.message}`);
  }
};
