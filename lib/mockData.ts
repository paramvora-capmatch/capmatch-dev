// lib/mockData.ts
import { BorrowerProfile, ProjectProfile } from '../src/types/enhanced-types';

// Helper to generate consistent IDs based on email and type
const generateId = (email: string, type: 'profile' | 'project' | 'entity', index: number = 0): string => {
  const userPrefix = email.split('@')[0];
  return `${userPrefix}_${type}_${index}`;
};

const now = new Date().toISOString();

// --- Test User 1 Data (borrower1@example.com) ---
const borrower1ProfileId = generateId('borrower1@example.com', 'profile');
const borrower1EntityId = generateId('borrower1@example.com', 'entity');
const borrower1Profile: BorrowerProfile = {
  id: borrower1ProfileId,
  userId: 'borrower1@example.com',
  entityId: borrower1EntityId,
  fullLegalName: 'Borrower One Ventures LLC',
  primaryEntityName: 'Borrower One Ventures LLC',
  primaryEntityStructure: 'LLC',
  contactEmail: 'borrower1@example.com',
  contactPhone: '111-111-1111',
  contactAddress: '100 Complete St, Fullville, CA 90210',
  bioNarrative: 'Experienced borrower with a strong track record in multifamily properties across the West Coast.',
  linkedinUrl: 'https://linkedin.com/in/borrowerone',
  websiteUrl: 'https://borrowerone.com',
  yearsCREExperienceRange: '11-15',
  assetClassesExperience: ['Multifamily', 'Retail'],
  geographicMarketsExperience: ['West Coast', 'Southwest'],
  totalDealValueClosedRange: '$100M-$250M',
  existingLenderRelationships: 'Major Bank A, Regional Bank B',
  creditScoreRange: '750-799',
  netWorthRange: '$10M-$25M',
  liquidityRange: '$1M-$5M',
  bankruptcyHistory: false,
  foreclosureHistory: false,
  litigationHistory: false,
  completenessPercent: 100, // Manually set for mock data clarity
  createdAt: now,
  updatedAt: now,
};

const borrower1Project1Id = generateId('borrower1@example.com', 'project', 1);
const borrower1Project1: ProjectProfile = {
  id: borrower1Project1Id,
  borrowerProfileId: borrower1ProfileId,
  entityId: borrower1EntityId,
  assignedAdvisorUserId: 'advisor1@capmatch.com', // Assign one for consistency
  projectName: 'Downtown Highrise Acquisition',
  propertyAddressStreet: '1 Market St',
  propertyAddressCity: 'San Francisco',
  propertyAddressState: 'CA',
  propertyAddressCounty: 'San Francisco',
  propertyAddressZip: '94105',
  assetType: 'Multifamily',
  projectDescription: 'Acquisition of a 150-unit Class A multifamily building in downtown SF.',
  projectPhase: 'Acquisition',
  loanAmountRequested: 50000000,
  loanType: 'Senior Debt',
  targetLtvPercent: 65,
  targetLtcPercent: 0, // Not construction
  amortizationYears: 30,
  interestOnlyPeriodMonths: 24,
  interestRateType: 'Fixed',
  targetCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~60 days from now
  useOfProceeds: 'Acquisition of property and minor common area upgrades.',
  recoursePreference: 'Non-Recourse',
  purchasePrice: 75000000,
  totalProjectCost: 77000000,
  capexBudget: 2000000,
  propertyNoiT12: 3500000,
  stabilizedNoiProjected: 4000000,
  exitStrategy: 'Refinance',
  businessPlanSummary: 'Acquire stabilized asset, perform light common area upgrades, hold for cash flow, and refinance in 3-5 years.',
  marketOverviewSummary: 'Strong rental market in downtown SF with limited new supply.',
  equityCommittedPercent: 100,
  projectStatus: 'Matches Curated',
  completenessPercent: 100, // Manually set
  borrowerProgress: 100, // Manually set
  projectProgress: 100, // Manually set
  internalAdvisorNotes: 'Solid borrower, good asset. Should get good terms.',
  createdAt: now,
  updatedAt: now,
  projectSections: {}, // Add required properties
  borrowerSections: {} // Add required properties
};



// --- Test User 2 Data (borrower2@example.com) ---
const borrower2ProfileId = generateId('borrower2@example.com', 'profile');
const borrower2EntityId = generateId('borrower2@example.com', 'entity');
const borrower2Profile: BorrowerProfile = {
  id: borrower2ProfileId,
  userId: 'borrower2@example.com',
  entityId: borrower2EntityId,
  fullLegalName: 'Borrower Two Properties',
  primaryEntityName: 'Borrower Two Properties',
  primaryEntityStructure: 'LP',
  contactEmail: 'borrower2@example.com',
  contactPhone: '222-222-2222',
  contactAddress: '50 Halfway Dr, Midpoint, TX 75001',
  bioNarrative: '', // Empty
  linkedinUrl: '', // Empty
  websiteUrl: '', // Empty
  yearsCREExperienceRange: '3-5',
  assetClassesExperience: ['Industrial'],
  geographicMarketsExperience: ['Southwest'],
  totalDealValueClosedRange: '$10M-$50M',
  existingLenderRelationships: '', // Empty
  creditScoreRange: '700-749',
  netWorthRange: '$5M-$10M',
  liquidityRange: '$500k-$1M',
  bankruptcyHistory: false,
  foreclosureHistory: false,
  litigationHistory: true, // Set one flag
  completenessPercent: 50, // Manually set
  createdAt: now,
  updatedAt: now,
};

const borrower2Project1Id = generateId('borrower2@example.com', 'project', 1);
const borrower2Project1: ProjectProfile = {
  id: borrower2Project1Id,
  borrowerProfileId: borrower2ProfileId,
  entityId: borrower2EntityId,
  assignedAdvisorUserId: 'advisor2@capmatch.com',
  projectName: 'Warehouse Development',
  propertyAddressStreet: '789 Industrial Ave',
  propertyAddressCity: 'Dallas',
  propertyAddressState: 'TX',
  propertyAddressCounty: 'Dallas',
  propertyAddressZip: '75201',
  assetType: 'Industrial',
  projectDescription: 'Ground-up development of a 100,000 sqft warehouse.',
  projectPhase: 'Development',
  loanAmountRequested: 8000000,
  loanType: '',
  targetLtvPercent: 0, // LTC more relevant
  targetLtcPercent: 75,
  amortizationYears: 0, // IO during construction
  interestOnlyPeriodMonths: 18,
  interestRateType: 'Floating',
  targetCloseDate: '', // Empty
  useOfProceeds: 'Land acquisition and construction costs.',
  recoursePreference: 'Partial Recourse',
  purchasePrice: 1500000, // Land cost
  totalProjectCost: 10000000,
  capexBudget: 8500000, // Construction cost
  propertyNoiT12: 0, // Pre-development
  stabilizedNoiProjected: 800000, // Projected
  exitStrategy: 'Sale',
  businessPlanSummary: '', // Empty
  marketOverviewSummary: '', // Empty
  equityCommittedPercent: 50, // Partially committed
  projectStatus: 'Info Gathering',
  completenessPercent: 50, // Manually set
  borrowerProgress: 70, // Address, basic loan info done
  projectProgress: 30, // Financials/plan/dates missing
  internalAdvisorNotes: '',
  createdAt: now,
  updatedAt: now,
  projectSections: {}, // Add required properties
  borrowerSections: {} // Add required properties
};

// --- Export Mock Data ---
export const mockProfiles: Record<string, BorrowerProfile> = {
  'borrower1@example.com': borrower1Profile,
  'borrower2@example.com': borrower2Profile,
};

export const mockProjects: Record<string, ProjectProfile[]> = {
  'borrower1@example.com': [borrower1Project1],
  'borrower2@example.com': [borrower2Project1],
};