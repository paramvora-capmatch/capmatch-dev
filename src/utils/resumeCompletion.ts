// src/utils/resumeCompletion.ts
import { AdvisorResumeContent, BorrowerResumeContent, ProjectResumeContent } from "@/lib/project-queries";
import { ProjectProfile } from "@/types/enhanced-types";

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const isStringFilled = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const isArrayFilled = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

const isNumberFilled = (value: unknown): boolean =>
  typeof value === "number" && !Number.isNaN(value);

const isBooleanAnswered = (value: unknown): value is boolean =>
  value === true || value === false;

const isSameValue = (left: unknown, right: unknown): boolean => {
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => item === right[index]);
  }
  return left === right;
};

const valueProvided = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (isStringFilled(value)) return true;
  if (isArrayFilled(value)) return true;
  if (isNumberFilled(value)) return true;
  if (isBooleanAnswered(value)) return true;
  return false;
};

export const BORROWER_REQUIRED_FIELDS: (keyof BorrowerResumeContent)[] = [
  "fullLegalName",
  "primaryEntityName",
  "primaryEntityStructure",
  "contactEmail",
  "contactPhone",
  "contactAddress",
  "bioNarrative",
  "linkedinUrl",
  "websiteUrl",
  "yearsCREExperienceRange",
  "assetClassesExperience",
  "geographicMarketsExperience",
  "totalDealValueClosedRange",
  "existingLenderRelationships",
  "creditScoreRange",
  "netWorthRange",
  "liquidityRange",
  "bankruptcyHistory",
  "foreclosureHistory",
  "litigationHistory",
];

export const BORROWER_PLACEHOLDER_VALUES: Partial<
  Record<keyof BorrowerResumeContent, unknown>
> = {
  primaryEntityStructure: "LLC",
  yearsCREExperienceRange: "0-2",
  totalDealValueClosedRange: "N/A",
  creditScoreRange: "N/A",
  netWorthRange: "<$1M",
  liquidityRange: "<$100k",
  bankruptcyHistory: false,
  foreclosureHistory: false,
  litigationHistory: false,
};

export const isBorrowerPlaceholderValue = (
  field: keyof BorrowerResumeContent,
  value: unknown
): boolean => {
  if (!BORROWER_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
  return isSameValue(value, BORROWER_PLACEHOLDER_VALUES[field]);
};

export const computeBorrowerCompletion = (
  data: Partial<BorrowerResumeContent> | null | undefined
): number => {
  const source = data || {};
  const total = BORROWER_REQUIRED_FIELDS.length;
  if (total === 0) return 0;

  let answered = 0;
  BORROWER_REQUIRED_FIELDS.forEach((field) => {
    const value = source[field];
    if (!valueProvided(value)) return;

    // Count all provided values, including placeholders, without requiring confirmation
    answered += 1;
  });

  return clampPercent((answered / total) * 100);
};

export const PROJECT_REQUIRED_FIELDS: (keyof ProjectProfile)[] = [
  // Section 1: Basic Info (existing critical fields)
  "projectName",
  "propertyAddressStreet",
  "propertyAddressCity",
  "propertyAddressState",
  "propertyAddressZip",
  "assetType",
  "projectDescription",
  "projectPhase",
  
  // Section 1: Additional Basic Info (new critical fields)
  "parcelNumber",
  "zoningDesignation",
  "constructionType",
  "groundbreakingDate",
  "completionDate",
  "totalDevelopmentCost",
  
  // Section 2: Loan Info (existing critical fields)
  "loanAmountRequested",
  "loanType",
  "targetLtvPercent",
  "targetCloseDate",
  "useOfProceeds",
  "recoursePreference",
  
  // Section 2: Property Specifications (new critical fields)
  "totalResidentialUnits",
  "grossBuildingArea",
  "numberOfStories",
  "parkingSpaces",
  
  // Section 3: Financial Details (existing critical fields)
  "exitStrategy",
  "businessPlanSummary",
  
  // Section 3: Development Budget (new critical fields)
  "landAcquisition",
  "baseConstruction",
  "totalProjectCost",
  
  // Section 5: Sponsor Information (new critical fields)
  "sponsorEntityName",
];

export const PROJECT_PLACEHOLDER_VALUES: Partial<
  Record<keyof ProjectProfile, unknown>
> = {
  assetType: "Multifamily",
  interestRateType: "Not Specified",
  recoursePreference: "Flexible",
  exitStrategy: "Undecided",
};

export const isProjectPlaceholderValue = (
  field: keyof ProjectProfile,
  value: unknown
): boolean => {
  if (!PROJECT_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
  return isSameValue(value, PROJECT_PLACEHOLDER_VALUES[field]);
};

export const computeProjectCompletion = (
  project: Partial<ProjectProfile> | null | undefined
): number => {
  const source = project || {};
  const total = PROJECT_REQUIRED_FIELDS.length;
  if (total === 0) return 0;

  let answered = 0;
  PROJECT_REQUIRED_FIELDS.forEach((field) => {
    const value = source[field];
    if (!valueProvided(value)) return;

    // Count all provided values, including placeholders, without requiring confirmation
    answered += 1;
  });

  return clampPercent((answered / total) * 100);
};

export const ADVISOR_REQUIRED_FIELDS: (keyof AdvisorResumeContent)[] = [
  "name",
  "title",
  "email",
  "phone",
  "bio",
  "specialties",
  "yearsExperience",
  "linkedinUrl",
  "websiteUrl",
  "company",
  "location",
];

export const ADVISOR_PLACEHOLDER_VALUES: Partial<
  Record<keyof AdvisorResumeContent, unknown>
> = {
  yearsExperience: 0,
  specialties: [],
};

export const isAdvisorPlaceholderValue = (
  field: keyof AdvisorResumeContent,
  value: unknown
): boolean => {
  if (!ADVISOR_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
  return isSameValue(value, ADVISOR_PLACEHOLDER_VALUES[field]);
};

export const computeAdvisorCompletion = (
  data: Partial<AdvisorResumeContent> | null | undefined
): number => {
  const source = data || {};
  const total = ADVISOR_REQUIRED_FIELDS.length;
  if (total === 0) return 0;

  let answered = 0;
  ADVISOR_REQUIRED_FIELDS.forEach((field) => {
    const value = source[field];
    if (!valueProvided(value)) return;

    // Count all provided values, including placeholders, without requiring confirmation
    answered += 1;
  });

  return clampPercent((answered / total) * 100);
};
