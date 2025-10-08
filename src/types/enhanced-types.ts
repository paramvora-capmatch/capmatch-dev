// src/types/enhanced-types.ts

// Borrower Profile Types
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

export interface ProjectProfile {
  id: string;
  borrowerProfileId: string;
  assignedAdvisorUserId: string | null;
  projectName: string;
  propertyAddressStreet: string;
  propertyAddressCity: string;
  propertyAddressState: string;
  propertyAddressCounty: string;
  propertyAddressZip: string;
  assetType: string;
  projectDescription: string;
  projectPhase?: ProjectPhase;
  loanAmountRequested?: number;
  loanType: string;
  targetLtvPercent: number;
  targetLtcPercent: number;
  amortizationYears: number;
  interestOnlyPeriodMonths: number;
  interestRateType: InterestRateType;
  targetCloseDate: string;
  useOfProceeds: string;
  recoursePreference: RecoursePreference;
  purchasePrice: number | null;
  totalProjectCost: number | null;
  capexBudget: number | null;
  propertyNoiT12?: number | null;
  stabilizedNoiProjected?: number | null;
  exitStrategy?: ExitStrategy;
  businessPlanSummary: string;
  marketOverviewSummary: string;
  equityCommittedPercent?: number;
  projectStatus: ProjectStatus;
  completenessPercent: number;
  internalAdvisorNotes: string;
  borrowerProgress: number; // Keep for backward compatibility
  projectProgress: number; // Keep for backward compatibility
  createdAt: string;
  updatedAt: string;
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
  extractedMetadata: Record<string, any>;
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
  documentId: string | null;
  notes: string;
  dueDate: string | null;
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

// Message Types (REMOVED isRead)
export interface ProjectMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderType: "Borrower" | "Advisor" | "System"; // Added System type
  message: string;
  // isRead: boolean; // REMOVED
  createdAt: string;
}

// Enhanced User type with role and login source
export interface EnhancedUser {
  id?: string; // Add user's auth ID (UUID)
  email: string;
  name?: string;
  profileId?: string; // Optional: ID of the associated BorrowerProfile
  lastLogin: Date;
  role: "borrower" | "advisor" | "lender" | "admin";
  loginSource?: "direct" | "lenderline"; // Added login source tracking
}
