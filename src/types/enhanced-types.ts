// src/types/enhanced-types.ts

// Core Schema Types - Updated to match new schema
export type AppRole = 'borrower' | 'lender' | 'advisor';
export type OrgType = 'borrower' | 'lender' | 'advisor';
export type OrgMemberRole = 'owner' | 'project_manager' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

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
  userEmail?: string;
  userRole?: string;
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
}

// New Resume Types
export interface BorrowerResume {
  id: string;
  org_id: string; // FK to orgs.id (1-to-1 with borrower org)
  content?: any; // JSONB
  created_at: string;
  updated_at: string;
}

export interface ProjectResume {
  id: string;
  project_id: string; // FK to projects.id (1-to-1 with project)
  content?: any; // JSONB
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
  user_id?: string | null; // FK to profiles.id (SET NULL on user delete)
  content?: string;
  created_at: string;
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
  content: string;
  read_at?: string | null;
  link_url?: string;
  created_at: string;
}

// Legacy ProjectProfile - kept for backward compatibility but deprecated
export interface ProjectProfile {
  id: string;
  borrowerProfileId?: string; // Made optional - projects owned by entities
  entityId: string;
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
  loanAmountRequested: number | null;
  loanType: string;
  targetLtvPercent: number | null;
  targetLtcPercent: number | null;
  amortizationYears: number | null;
  interestOnlyPeriodMonths: number | null;
  interestRateType: InterestRateType;
  targetCloseDate: string | null;
  useOfProceeds: string;
  recoursePreference: RecoursePreference;
  purchasePrice: number | null;
  totalProjectCost: number | null;
  capexBudget: number | null;
  propertyNoiT12: number | null;
  stabilizedNoiProjected: number | null;
  exitStrategy?: ExitStrategy;
  businessPlanSummary: string;
  marketOverviewSummary: string;
  equityCommittedPercent: number | null;
  projectStatus: ProjectStatus;
  completenessPercent: number;
  internalAdvisorNotes: string;
  borrowerProgress: number; // Keep for backward compatibility
  projectProgress: number; // Keep for backward compatibility
  createdAt: string;
  updatedAt: string;
  projectSections?: any; // Add for consistency with mock data
  borrowerSections?: any; // Add for consistency with mock data
  // RBAC additions
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

// Legacy Message Types - kept for backward compatibility but deprecated
export interface LegacyProjectMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderType: "Borrower" | "Advisor" | "System"; // Added System type
  // Optional display metadata resolved from profiles/entity membership
  senderDisplayName?: string;
  senderEmail?: string;
  message: string;
  createdAt: string;
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


// Legacy RBAC Types - kept for backward compatibility but deprecated
export interface BorrowerEntity {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BorrowerEntityMember {
  id: string;
  entityId: string;
  userId: string;
  role: OrgMemberRole;
  invitedBy: string;
  invitedAt: string;
  inviteToken?: string;
  inviteExpiresAt?: string;
  acceptedAt?: string | null;
  status: InviteStatus;
  userEmail?: string;
  userName?: string;
  projectPermissions?: string[]; // Array of project IDs for member role
  invitedEmail?: string; // Email that was invited (for pending invites)
  inviterEmail?: string; // Email of person who sent invite
  inviterName?: string; // Name of person who sent invite
}

export type PermissionType = 'file' | 'folder';

// Legacy DocumentPermission - kept for backward compatibility but deprecated
export interface LegacyDocumentPermission {
  id: string;
  entityId: string;
  projectId: string;
  documentPath: string;
  userId: string;
  grantedBy: string;
  grantedAt: string;
  permissionType: PermissionType;
}
