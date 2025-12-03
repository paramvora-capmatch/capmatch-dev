// lib/mockData.ts
import { ProjectResumeContent, BorrowerResumeContent } from '../src/lib/project-queries';

// --- Demo Borrower Data (borrower@org.com) ---
// This borrower will have both projects: the complete one and the partial one
export const demoBorrowerResume: BorrowerResumeContent = {
  fullLegalName: 'Borrower One Ventures LLC',
  primaryEntityName: 'Borrower One Ventures LLC',
  primaryEntityStructure: 'LLC',
  contactEmail: 'borrower@org.com',
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
  completenessPercent: 100,
};

// --- Complete Project (Downtown Highrise Acquisition) ---
export const completeProjectResume: ProjectResumeContent = {
  projectName: 'Downtown Highrise Acquisition',
  assetType: 'Multifamily',
  projectStatus: 'Matches Curated',
  propertyAddressStreet: '1 Market St',
  propertyAddressCity: 'San Francisco',
  propertyAddressState: 'CA',
  propertyAddressCounty: 'San Francisco',
  propertyAddressZip: '94105',
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
  totalDevelopmentCost: 77000000,
  capexBudget: 2000000,
  propertyNoiT12: 3500000,
  stabilizedNoiProjected: 4000000,
  exitStrategy: 'Refinance',
  businessPlanSummary: 'Acquire stabilized asset, perform light common area upgrades, hold for cash flow, and refinance in 3-5 years.',
  marketOverviewSummary: 'Strong rental market in downtown SF with limited new supply.',
  equityCommittedPercent: 100,
  internalAdvisorNotes: 'Solid borrower, good asset. Should get good terms.',
};

// --- Partial Project (Warehouse Development) ---
export const partialProjectResume: ProjectResumeContent = {
  projectName: 'Warehouse Development',
  assetType: 'Industrial',
  projectStatus: 'Info Gathering',
  propertyAddressStreet: '789 Industrial Ave',
  propertyAddressCity: 'Dallas',
  propertyAddressState: 'TX',
  propertyAddressCounty: 'Dallas',
  propertyAddressZip: '75201',
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
  totalDevelopmentCost: 10000000,
  capexBudget: 8500000, // Construction cost
  propertyNoiT12: 0, // Pre-development
  stabilizedNoiProjected: 800000, // Projected
  exitStrategy: 'Sale',
  businessPlanSummary: '', // Empty
  marketOverviewSummary: '', // Empty
  equityCommittedPercent: 50, // Partially committed
  internalAdvisorNotes: '',
};