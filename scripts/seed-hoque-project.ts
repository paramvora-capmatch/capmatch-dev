// scripts/seed-hoque-project.ts
// Comprehensive seed script for the Hoque (SoGood Apartments) project
// Creates complete account setup: advisor, borrower, team members, project, resumes, documents, and chat messages
// Run with: npx tsx scripts/seed-hoque-project.ts [--prod] [cleanup]

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ProjectResumeContent } from '../src/lib/project-queries';
import projectFormSchema from '../src/lib/enhanced-project-form.schema.json';
import borrowerFormSchema from '../src/lib/borrower-resume-form.schema.json';
import { computeBorrowerCompletion } from '../src/utils/resumeCompletion';

// Parse command line arguments
const args = process.argv.slice(2);
const isProduction = args.includes('--prod') || args.includes('--production');
const isCleanup = args.includes('cleanup') || args.includes('--cleanup') || args.includes('-c');

// Load environment variables based on mode
if (isProduction) {
  console.log('🌐 Production mode enabled\n');
  // Load production env file first (highest priority)
  config({ path: resolve(process.cwd(), '.env.production') });
  // Also load .env.local and .env as fallbacks
  config({ path: resolve(process.cwd(), '.env.local') });
  config({ path: resolve(process.cwd(), '.env') });
  
  // Warn if production env file doesn't exist
  const prodEnvPath = resolve(process.cwd(), '.env.production');
  if (!existsSync(prodEnvPath)) {
    console.warn('⚠️  WARNING: .env.production file not found!');
    console.warn('   Create .env.production with production credentials.');
    console.warn('   See README-seed-hoque.md for template.\n');
  }
  
  // Additional production warnings
  if (!isCleanup) {
    console.log('⚠️  WARNING: This will create real users and data in PRODUCTION!');
    console.log('⚠️  Make sure you have backups before proceeding.\n');
  }
} else {
  // Local development mode
  config({ path: resolve(process.cwd(), '.env.local') });
  config({ path: resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!supabaseUrl) {
  const envFile = isProduction ? '.env.production' : '.env.local';
  console.error('\n❌ Missing SUPABASE_URL environment variable');
  console.error(`   Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in ${envFile}`);
  process.exit(1);
}

if (!serviceRoleKey) {
  const envFile = isProduction ? '.env.production' : '.env.local';
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error(`   Please add SUPABASE_SERVICE_ROLE_KEY to ${envFile}`);
  process.exit(1);
}

// Additional validation for production
if (isProduction) {
  // Validate that we're not accidentally using localhost in production
  if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    console.error('\n❌ ERROR: Production mode detected but Supabase URL is localhost!');
    console.error(`   Current URL: ${supabaseUrl}`);
    console.error('   Production URLs should start with https://');
    process.exit(1);
  }
  
  if (!supabaseUrl.startsWith('https://')) {
    console.error('\n❌ ERROR: Production Supabase URL must start with https://');
    console.error(`   Current URL: ${supabaseUrl}`);
    process.exit(1);
  }
}

// Initialize Supabase client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// HOQUE PROJECT DATA
// ============================================================================

const HOQUE_PROJECT_NAME = 'SoGood Apartments';

/**
 * Get all field IDs from a schema
 */
function getSchemaFieldIds(schema: any): string[] {
  return Object.keys(schema.fields || {});
}

/**
 * Default value helper for project fields
 */
function getDefaultValueForProjectField(fieldId: string): any {
  // Check if it's a known array/table field
  const arrayFields = ['residentialUnitMix', 'commercialSpaceMix', 'rentComps', 'drawSchedule', 'amenityList', 'incentiveStacking', 'noiseFactors'];
  if (arrayFields.includes(fieldId)) {
    return [];
  }
  
  // Check if it's a known boolean field
  const booleanFields = ['furnishedUnits', 'affordableHousing', 'opportunityZone', 'taxExemption', 'tifDistrict', 'taxAbatement', 'paceFinancing', 'historicTaxCredits', 'newMarketsCredits', 'wetlandsPresent', 'densityBonus', 'permTakeoutPlanned'];
  if (booleanFields.includes(fieldId)) {
    return false;
  }
  
  // Check if it's a known numeric field
  const numericFields = ['totalResidentialUnits', 'totalResidentialNRSF', 'averageUnitSize', 'totalCommercialGRSF', 'grossBuildingArea', 'numberOfStories', 'parkingSpaces', 'parkingRatio', 'buildingEfficiency', 'studioCount', 'oneBedCount', 'twoBedCount', 'threeBedCount', 'lossToLease', 'adaCompliantPercent', 'solarCapacity', 'evChargingStations', 'totalDevelopmentCost', 'totalProjectCost', 'capexBudget', 'purchasePrice', 'landAcquisition', 'baseConstruction', 'contingency', 'constructionFees', 'aeFees', 'thirdPartyReports', 'legalAndOrg', 'titleAndRecording', 'taxesDuringConstruction', 'developerFee', 'loanFees', 'interestReserve', 'ffe', 'workingCapital', 'opDeficitEscrow', 'leaseUpEscrow', 'relocationCosts', 'syndicationCosts', 'enviroRemediation', 'pfcStructuringFee', 'sponsorEquity', 'taxCreditEquity', 'gapFinancing', 'equityCommittedPercent', 'loanAmountRequested', 'amortizationYears', 'interestRate', 'underwritingRate', 'interestOnlyPeriodMonths', 'targetLtvPercent', 'targetLtcPercent', 'allInRate', 'realEstateTaxes', 'insurance', 'utilitiesCosts', 'repairsAndMaintenance', 'managementFee', 'generalAndAdmin', 'payroll', 'reserves', 'marketingLeasing', 'serviceCoordination', 'noiYear1', 'propertyNoiT12', 'stabilizedNoiProjected', 'yieldOnCost', 'capRate', 'stabilizedValue', 'ltv', 'debtYield', 'dscr', 'trendedNOIYear1', 'untrendedNOIYear1', 'trendedYield', 'untrendedYield', 'inflationAssumption', 'dscrStressTest', 'ltvStressMax', 'dscrStressMin', 'portfolioLTV', 'portfolioDSCR', 'expectedHoldPeriod', 'population3Mi', 'projGrowth202429', 'popGrowth201020', 'medianHHIncome', 'renterOccupiedPercent', 'unemploymentRate', 'employerConcentration', 'walkabilityScore', 'submarketAbsorption', 'supplyPipeline', 'monthsOfSupply', 'captureRate', 'affordableUnitsNumber', 'amiTargetPercent', 'exemptionTerm', 'preLeasedSF', 'absorptionProjection', 'totalSiteAcreage', 'buildableAcreage', 'allowableFAR', 'farUtilizedPercent', 'sponsorExpScore', 'priorDevelopments', 'netWorth', 'guarantorLiquidity'];
  if (numericFields.includes(fieldId)) {
    return 0;
  }
  
  // Default to empty string for text fields
  return '';
}

// Base Hoque project resume – only fields from the schema
const hoqueProjectResumeBase: Record<string, any> = {
  projectName: 'SoGood Apartments',
  assetType: 'Mixed-Use',
  dealStatus: 'Underwriting',
  propertyAddressStreet: '2300 Hickory St',
  propertyAddressCity: 'Dallas',
  propertyAddressState: 'TX',
  propertyAddressCounty: 'Dallas County',
  propertyAddressZip: '75215',
  parcelNumber: '000472000A01B0100',
  zoningDesignation: 'PD317',
  constructionType: 'Ground-Up',
  groundbreakingDate: '2025-08-01',
  completionDate: '2027-09-30',
  totalDevelopmentCost: 29800000,
  requestedTerm: '2 Years',
  projectDescription: 'Ground-up development of Building B within the SoGood master plan, delivering 116 units over activated ground-floor innovation space between the Dallas Farmers Market and Deep Ellum.',
  projectPhase: 'Construction',
  expectedZoningChanges: 'None',
  
  // Property Specifications
  totalResidentialUnits: 116,
  totalResidentialNRSF: 59520,
  averageUnitSize: 513,
  totalCommercialGRSF: 49569,
  grossBuildingArea: 127406,
  buildingEfficiency: 82.0,
  numberOfStories: 6,
  buildingType: 'Mid-rise',
  parkingSpaces: 180,
  parkingRatio: 1.55,
  amenityList: ['Fitness center', 'Shared working space', 'Lounge', 'Outdoor terrace', 'Swimming pool'],
  // Explicit unit counts by type (in addition to detailed mix)
  studioCount: 84,
  oneBedCount: 24,
  twoBedCount: 8,
  threeBedCount: 0, // No 3-bedroom units in this development
  furnishedUnits: false,
  lossToLease: 5.0,
  adaCompliantPercent: 5.0,
  hvacSystem: 'Central',
  roofTypeAge: 'TPO, new construction',
  solarCapacity: 100,
  evChargingStations: 8,
  leedGreenRating: 'Certified',
  residentialUnitMix: [
    {
      unitType: 'S1',
      unitCount: 48,
      avgSF: 374,
      monthlyRent: 1550,
      totalSF: 48 * 374,
    },
    {
      unitType: 'S2',
      unitCount: 28,
      avgSF: 380,
      monthlyRent: 1600,
      totalSF: 28 * 380,
    },
    {
      unitType: 'S3',
      unitCount: 8,
      avgSF: 470,
      monthlyRent: 1750,
      totalSF: 8 * 470,
    },
    {
      unitType: 'A1',
      unitCount: 8,
      avgSF: 720,
      monthlyRent: 2100,
      totalSF: 8 * 720,
    },
    {
      unitType: 'A2',
      unitCount: 8,
      avgSF: 736,
      monthlyRent: 2150,
      totalSF: 8 * 736,
    },
    {
      unitType: 'A3',
      unitCount: 8,
      avgSF: 820,
      monthlyRent: 2300,
      totalSF: 8 * 820,
    },
    {
      unitType: 'B1',
      unitCount: 8,
      avgSF: 1120,
      monthlyRent: 2800,
      totalSF: 8 * 1120,
    },
  ],
  commercialSpaceMix: [
    {
      spaceType: 'Innovation Center',
      squareFootage: 30000,
      tenant: 'GSV Holdings LLC',
      leaseTerm: '15-year lease, pre-leased',
      annualRent: 900000,
    },
    {
      spaceType: 'Office 1',
      squareFootage: 6785,
      tenant: 'TBD – Creative Office',
      leaseTerm: 'To be leased',
      annualRent: 0,
    },
    {
      spaceType: 'Office 2',
      squareFootage: 5264,
      tenant: 'TBD – Professional Services',
      leaseTerm: 'To be leased',
      annualRent: 0,
    },
    {
      spaceType: 'Retail',
      squareFootage: 745,
      tenant: 'Future F&B Operator',
      leaseTerm: 'To be leased',
      annualRent: 0,
    },
  ],
  
  // Financial Details - Development Budget
  landAcquisition: 6000000,
  baseConstruction: 16950000,
  contingency: 847500,
  ffe: 580000,
  constructionFees: 174000,
  aeFees: 859800,
  thirdPartyReports: 50000,
  legalAndOrg: 50000,
  titleAndRecording: 75000,
  taxesDuringConstruction: 20000,
  workingCapital: 1900000,
  developerFee: 678000,
  pfcStructuringFee: 116000,
  loanFees: 360000,
  interestReserve: 1147500,
  opDeficitEscrow: 650000,
  leaseUpEscrow: 1300000,
  relocationCosts: 0, // No relocation required - vacant site
  syndicationCosts: 150000,
  enviroRemediation: 0, // Phase 1 ESA clean - no remediation needed
  totalProjectCost: 29807800,
  capexBudget: 16950000,
  purchasePrice: 6000000,
  
  // Sources of Funds & Loan Terms
  sponsorEquity: 11800000,
  taxCreditEquity: 0, // Not utilizing tax credits for this project
  gapFinancing: 0, // No gap financing required - fully capitalized
  equityCommittedPercent: 39.6,
  loanAmountRequested: 18000000,
  loanType: 'Senior Construction Loan',
  interestRate: 8.0,
  underwritingRate: 8.0,
  interestRateType: 'Floating',
  amortizationYears: 30,
  interestOnlyPeriodMonths: 24,
  targetLtvPercent: 44,
  targetLtcPercent: 60,
  prepaymentTerms: 'Minimum interest',
  prepaymentPremium: 'None - prepayment allowed after interest-only period',
  recoursePreference: 'Partial Recourse',
  permTakeoutPlanned: true,
  allInRate: 8.25,
  targetCloseDate: '2025-08-15',
  useOfProceeds: 'Land acquisition, vertical construction, soft costs, and financing reserves for Building B within the SoGood master plan.',
  
  // Operating Expenses & Investment Metrics
  realEstateTaxes: 34200,
  insurance: 92800,
  utilitiesCosts: 23200,
  repairsAndMaintenance: 46400,
  managementFee: 85000,
  generalAndAdmin: 40600,
  payroll: 174000,
  reserves: 23200,
  marketingLeasing: 68040,
  serviceCoordination: 10000,
  noiYear1: 2268000,
  propertyNoiT12: 0, // Ground-up development - no existing NOI
  stabilizedNoiProjected: 2268000,
  yieldOnCost: 7.6,
  capRate: 5.50,
  stabilizedValue: 41200000,
  ltv: 44,
  debtYield: 12.6,
  dscr: 1.25,
  expectedHoldPeriod: 7,
  untrendedNOIYear1: 2222640,
  trendedNOIYear1: 2313360,
  untrendedYield: 7.45,
  trendedYield: 7.76,
  inflationAssumption: 2.0,
  dscrStressTest: 1.1,
  ltvStressMax: 50.0,
  dscrStressMin: 1.1,
  portfolioLTV: 60.0,
  portfolioDSCR: 1.3,
  exitStrategy: 'Refinance',
  businessPlanSummary: 'Execute a Dallas PFC-backed workforce housing program (50% of units ≤80% AMI) inside a 6-story mixed-use podium with 30,000 SF of pre-leased Innovation Center space. The plan funds land acquisition, hard/soft costs, and reserves for a 24-month build schedule plus two 6-month extensions, targeting a refinancing or sale upon stabilization in 2027.',
  marketOverviewSummary: 'Site sits between the Dallas Farmers Market, Deep Ellum, and the CBD—walking distance to 5,000+ jobs, DART rail, and the I-30/I-45 interchange. Three-mile demographics show $85K+ median income, 6.9% population growth, and 76% renter share. The submarket has <6,000 units delivering over the next 24 months, keeping occupancy above 94%.',
  
  // Market Context
  submarketName: 'Downtown Dallas',
  msaName: 'Dallas-Fort Worth-Arlington, TX',
  population3Mi: 174270,
  popGrowth201020: 23.3,
  projGrowth202429: 6.9,
  medianHHIncome: 85906,
  renterOccupiedPercent: 76.7,
  unemploymentRate: 3.5,
  largestEmployer: 'Downtown Dallas CBD employers',
  employerConcentration: 15.0,
  crimeRiskLevel: 'Moderate',
  walkabilityScore: 92,
  infrastructureCatalyst: 'DART expansion and I-30/I-45 interchange improvements',
  broadbandSpeed: 'Fiber 1 Gbps available',
  submarketAbsorption: 500,
  supplyPipeline: 4000,
  monthsOfSupply: 7.5,
  captureRate: 2.1,
  marketConcessions: '1 month free on select units',
  northStarComp: 'SoGood Phase A and nearby Class A multifamily',
  substantialComp: 'Farmers Market Lofts (220 units, 2018, 95% occupancy) - similar location and unit mix',
  // Seed basic rent comps so the Market Context table is populated
  rentComps: [
    {
      propertyName: 'Farmers Market Lofts',
      address: '1010 S Pearl Expy, Dallas, TX',
      distance: 0.4,
      yearBuilt: 2018,
      totalUnits: 220,
      occupancyPercent: 95,
      avgRentMonth: 1900,
      rentPSF: 2.75,
    },
    {
      propertyName: 'Deep Ellum Flats',
      address: '2400 Commerce St, Dallas, TX',
      distance: 0.7,
      yearBuilt: 2020,
      totalUnits: 180,
      occupancyPercent: 94,
      avgRentMonth: 1850,
      rentPSF: 2.65,
    },
    {
      propertyName: 'Downtown Exchange',
      address: '1400 Main St, Dallas, TX',
      distance: 0.9,
      yearBuilt: 2017,
      totalUnits: 250,
      occupancyPercent: 93,
      avgRentMonth: 2000,
      rentPSF: 2.85,
    },
  ],
  
  // Special Considerations
  opportunityZone: true,
  affordableHousing: true,
  affordableUnitsNumber: 58,
  amiTargetPercent: 80,
  taxExemption: true,
  exemptionStructure: 'PFC',
  sponsoringEntity: 'Dallas Housing Finance Corporation PFC',
  exemptionTerm: 99,
  incentiveStacking: ['PFC Tax Exemption', 'Opportunity Zone'],
  tifDistrict: false,
  taxAbatement: true,
  paceFinancing: false,
  historicTaxCredits: false,
  newMarketsCredits: false,
  relocationPlan: 'N/A',
  seismicPMLRisk: '2.5% PML',
  
  // Timeline & Milestones
  landAcqClose: '2024-07-12',
  firstOccupancy: '2027-10-15',
  stabilization: '2028-03-31',
  preLeasedSF: 30000,
  entitlements: 'Approved',
  finalPlans: 'Pending',
  permitsIssued: 'Issued',
  verticalStart: '2025-08-01',
  absorptionProjection: 12,
  
  // Site & Context
  totalSiteAcreage: 2.5,
  buildableAcreage: 2.3,
  allowableFAR: 3.5,
  farUtilizedPercent: 85.0,
  densityBonus: true,
  currentSiteStatus: 'Vacant',
  siteAccess: 'Hickory St, Ferris St',
  proximityShopping: 'Farmers Market, Deep Ellum nearby',
  topography: 'Flat',
  soilConditions: 'Urban fill over clay; deep foundations recommended',
  accessPoints: 'Curb cuts on Hickory St and Ferris St',
  adjacentLandUse: 'Mixed-use, residential, and light industrial',
  viewCorridors: 'Downtown Dallas skyline and Farmers Market',
  floodZone: 'Zone X',
  wetlandsPresent: false,
  seismicRisk: 'Low',
  phaseIESAFinding: 'Clean',
  noiseFactors: ['Highway', 'Rail'],
  utilityAvailability: 'Available',
  easements: 'Utility easement along northern property line',
  // Seeded draw schedule so the Timeline table renders with rows
  drawSchedule: [
    { drawNumber: 1, percentComplete: 10, amount: 2500000 },
    { drawNumber: 2, percentComplete: 30, amount: 5000000 },
    { drawNumber: 3, percentComplete: 60, amount: 6500000 },
    { drawNumber: 4, percentComplete: 90, amount: 5500000 },
  ],
  
  // Sponsor Information
  sponsorEntityName: 'Hoque Global',
  sponsorStructure: 'General Partner',
  equityPartner: 'ACARA',
  syndicationStatus: 'In Process',
  contactInfo: 'Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)',
  sponsorExperience: 'Seasoned (3+)',
  sponsorExpScore: 8,
  priorDevelopments: 1000,
  netWorth: 50000000,
  guarantorLiquidity: 7500000,
};

/**
 * Build a complete resume object that:
 * - includes ONLY fields from the schema
 * - gives every field a non-empty value
 * - locks every such field via _lockedFields so they render green.
 */
const SCHEMA_FIELD_IDS: string[] = getSchemaFieldIds(projectFormSchema);

const hoqueProjectResume: Record<string, any> = (() => {
  const result: Record<string, any> = { ...hoqueProjectResumeBase };

  // Ensure every schema field has a non-empty value.
  for (const fieldId of SCHEMA_FIELD_IDS) {
    const current = result[fieldId];
    const isEmptyString =
      typeof current === 'string' && current.trim().length === 0;
    const isUnset = current === undefined || current === null;

    if (isUnset || isEmptyString) {
      result[fieldId] = getDefaultValueForProjectField(fieldId);
    }
  }

  // Remove any fields not in the schema
  const schemaFieldSet = new Set(SCHEMA_FIELD_IDS);
  for (const key of Object.keys(result)) {
    if (key !== '_lockedFields' && key !== '_fieldStates' && key !== '_metadata' && !schemaFieldSet.has(key)) {
      delete result[key];
    }
  }

  // Lock all form fields so they show as green/locked in the UI.
  const lockedFields: Record<string, boolean> = {};
  for (const fieldId of SCHEMA_FIELD_IDS) {
    if (result[fieldId] !== undefined && result[fieldId] !== null) {
      // Lock fields that have values (including 0 for numeric fields, as 0 is a valid value)
      if (typeof result[fieldId] === 'string' && result[fieldId].trim() !== '') {
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'number') {
        // Lock all numeric fields, including 0 (0 is a valid value that should be locked)
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'boolean') {
        lockedFields[fieldId] = true;
      } else if (Array.isArray(result[fieldId]) && result[fieldId].length > 0) {
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'object' && Object.keys(result[fieldId]).length > 0) {
        lockedFields[fieldId] = true;
      }
    }
  }

  result._lockedFields = lockedFields;

  return result;
})();

// Borrower resume - only fields from the schema
const hoqueBorrowerResumeBase: Record<string, any> = {
  fullLegalName: 'Hoque Global',
  primaryEntityName: 'Hoque Global / ACARA PFC JV',
  // Must be one of: "LLC", "LP", "S-Corp", "C-Corp", "Sole Proprietorship", "Trust", "Other"
  primaryEntityStructure: 'Other', // Partnership structure doesn't fit standard options
  contactEmail: 'info@hoqueglobal.com',
  contactPhone: '972.455.1943',
  contactAddress: '2300 Hickory St, Dallas, TX 75215',
  bioNarrative: 'Hoque Global is a Dallas-based master developer delivering catalytic mixed-use districts and workforce housing through public-private partnerships, including PFC structures with the City of Dallas. ACARA serves as capital partner, structuring Opportunity Zone-aligned investments with a $950M+ track record across Texas.',
  // Must be one of: "0-2", "3-5", "6-10", "11-15", "16+"
  yearsCREExperienceRange: '16+',
  assetClassesExperience: ['Mixed-Use', 'Multifamily', 'Office', 'Master-Planned Districts'],
  geographicMarketsExperience: ['Dallas-Fort Worth', 'Texas Triangle', 'Southeast US'],
  // Must be one of: "N/A", "<$10M", "$10M-$50M", "$50M-$100M", "$100M-$250M", "$250M-$500M", "$500M+"
  totalDealValueClosedRange: '$500M+',
  existingLenderRelationships: 'Frost Bank; Citi Community Capital; Dallas Housing Finance Corp',
  // Must be one of: "N/A", "<600", "600-649", "650-699", "700-749", "750-799", "800+"
  creditScoreRange: '700-749',
  // Must be one of: "<$1M", "$1M-$5M", "$5M-$10M", "$10M-$25M", "$25M-$50M", "$50M-$100M", "$100M+"
  netWorthRange: '$50M-$100M',
  // Must be one of: "<$100k", "$100k-$500k", "$500k-$1M", "$1M-$5M", "$5M-$10M", "$10M+"
  liquidityRange: '$5M-$10M',
  bankruptcyHistory: false,
  foreclosureHistory: false,
  litigationHistory: false,
  linkedinUrl: 'https://www.linkedin.com/company/hoque-global',
  websiteUrl: 'https://www.hoqueglobal.com',
  principalLegalName: 'Mike Hoque',
  principalRoleDefault: 'Chief Executive Officer',
  principalEmail: 'mike@hoqueglobal.com',
  ownershipPercentage: 50,
  principalBio: 'Founder leading Hoque Global\'s master plan strategy and public-private initiatives across Dallas. Delivered 1M+ SF of adaptive reuse and serves as Dallas Regional Chamber Urban Taskforce Chair.',
};

/**
 * Build borrower resume with only schema fields
 */
const BORROWER_SCHEMA_FIELD_IDS: string[] = getSchemaFieldIds(borrowerFormSchema);

const hoqueBorrowerResume: Record<string, any> = (() => {
  const result: Record<string, any> = { ...hoqueBorrowerResumeBase };

  // Ensure every schema field has a value
  for (const fieldId of BORROWER_SCHEMA_FIELD_IDS) {
    if (result[fieldId] === undefined || result[fieldId] === null) {
      // Set default values for missing fields based on field type
      if (fieldId.includes('History') || fieldId === 'bankruptcyHistory' || fieldId === 'foreclosureHistory' || fieldId === 'litigationHistory') {
        result[fieldId] = false;
      } else if (fieldId === 'ownershipPercentage') {
        // Numeric field - leave as undefined/null (don't set to 0 as that's a valid value)
        // But we need a value, so set to 0 if truly missing
        result[fieldId] = 0;
      } else if (fieldId.includes('Experience') && fieldId !== 'yearsCREExperienceRange') {
        // Array fields
        result[fieldId] = [];
      } else {
        // String fields - set to empty string
        result[fieldId] = '';
      }
    }
  }

  // Remove any fields not in the schema
  const schemaFieldSet = new Set(BORROWER_SCHEMA_FIELD_IDS);
  for (const key of Object.keys(result)) {
    if (key !== '_lockedFields' && key !== '_fieldStates' && key !== '_metadata' && !schemaFieldSet.has(key)) {
      delete result[key];
    }
  }

  // Lock all fields that have values (matching project resume logic)
  const lockedFields: Record<string, boolean> = {};
  for (const fieldId of BORROWER_SCHEMA_FIELD_IDS) {
    if (result[fieldId] !== undefined && result[fieldId] !== null) {
      // Lock fields that have values (including 0 for numeric fields, as 0 is a valid value)
      if (typeof result[fieldId] === 'string' && result[fieldId].trim() !== '') {
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'number') {
        // Lock all numeric fields, including 0 (0 is a valid value that should be locked)
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'boolean') {
        lockedFields[fieldId] = true;
      } else if (Array.isArray(result[fieldId]) && result[fieldId].length > 0) {
        lockedFields[fieldId] = true;
      } else if (typeof result[fieldId] === 'object' && Object.keys(result[fieldId]).length > 0) {
        lockedFields[fieldId] = true;
      }
    }
  }

  result._lockedFields = lockedFields;

  // Note: completenessPercent is now stored in a separate column, not in content
  // It will be calculated and set during insert

  return result;
})();

// ============================================================================
// ACCOUNT CREATION FUNCTIONS
// ============================================================================

interface OnboardResponse {
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

async function callOnboardBorrower(
  email: string,
  password: string,
  fullName: string,
  retries = 3
): Promise<OnboardResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[onboard-borrower] Retry attempt ${attempt}/${retries} for ${email}...`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        console.log(`[onboard-borrower] Calling edge function for ${email}...`);
      }
      
      const { data, error } = await supabaseAdmin.functions.invoke('onboard-borrower', {
        body: { email, password, full_name: fullName },
      });

      if (error) {
        let actualErrorMessage = error.message || String(error);
        
        // Check if it's a retryable error (502, 503, 504, or AuthRetryableFetchError)
        const isRetryable = 
          error.status === 502 || 
          error.status === 503 || 
          error.status === 504 ||
          (error as any).name === 'AuthRetryableFetchError' ||
          actualErrorMessage.includes('502') ||
          actualErrorMessage.includes('503') ||
          actualErrorMessage.includes('504');
        
        if (isRetryable && attempt < retries) {
          console.warn(`[onboard-borrower] Retryable error for ${email} (attempt ${attempt}): ${actualErrorMessage}`);
          continue; // Retry
        }
        
        if (data) {
          if (typeof data === 'object' && 'error' in data) {
            const dataError = (data as any).error;
            return { error: typeof dataError === 'string' ? dataError : JSON.stringify(dataError) };
          }
        }
        
        return { error: actualErrorMessage };
      }

      if (data && typeof data === 'object') {
        if ('error' in data) {
          const responseError = (data as any).error;
          return { 
            error: typeof responseError === 'string' 
              ? responseError 
              : JSON.stringify(responseError) 
          };
        }
        
        if ('user' in data) {
          return data as OnboardResponse;
        }
      }

      return data as OnboardResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isRetryable = 
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('AuthRetryableFetchError') ||
        errorMessage.includes('fetch');
      
      if (isRetryable && attempt < retries) {
        console.warn(`[onboard-borrower] Retryable exception for ${email} (attempt ${attempt}): ${errorMessage}`);
        continue; // Retry
      }
      
      console.error(`[onboard-borrower] Exception for ${email}:`, err);
      return { error: errorMessage };
    }
  }
  
  return { error: `Failed after ${retries} attempts` };
}

async function createAdvisorAccount(): Promise<{ userId: string; orgId: string } | null> {
  console.log('[seed] Setting up advisor account (Cody Field)...');
  
  const advisorEmail = 'cody.field@capmatch.com';
  const advisorPassword = 'password';
  const advisorName = 'Cody Field';

  // Check if advisor already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, active_org_id')
    .eq('email', advisorEmail)
    .maybeSingle();

  let advisorUserId: string;
  let advisorOrgId: string | null = null;

  if (existingProfile) {
    console.log(`[seed] Advisor already exists: ${advisorEmail} (${existingProfile.id})`);
    advisorUserId = existingProfile.id;
    advisorOrgId = existingProfile.active_org_id;
  } else {
    // Create advisor user via onboard-borrower (it handles both borrowers and advisors)
    const advisorResult = await callOnboardBorrower(advisorEmail, advisorPassword, advisorName);
    if (advisorResult.error || !advisorResult.user) {
      console.error(`[seed] ❌ Failed to create advisor: ${advisorResult.error}`);
      return null;
    }
    advisorUserId = advisorResult.user.id;
    
    // Update profile to advisor role
    await supabaseAdmin
      .from('profiles')
      .update({ app_role: 'advisor' })
      .eq('id', advisorUserId);
    
    console.log(`[seed] ✅ Created advisor: ${advisorEmail} (${advisorUserId})`);
  }

  // Create or get advisor org
  const { data: existingOrg } = await supabaseAdmin
    .from('orgs')
    .select('id')
    .eq('entity_type', 'advisor')
    .limit(1)
    .maybeSingle();

  if (existingOrg) {
    advisorOrgId = existingOrg.id;
    console.log('[seed] Advisor org already exists, using existing:', advisorOrgId);
  } else {
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('orgs')
      .insert({
        name: 'CapMatch Advisors',
        entity_type: 'advisor',
      })
      .select()
      .single();

    if (orgError) {
      console.error('[seed] Failed to create advisor org:', orgError);
      return null;
    }

    advisorOrgId = orgData.id;
    console.log('[seed] ✅ Created advisor org:', advisorOrgId);
  }

  // Add advisor to org as owner
  await supabaseAdmin
    .from('org_members')
    .upsert(
      {
        org_id: advisorOrgId,
        user_id: advisorUserId,
        role: 'owner',
      },
      { onConflict: 'org_id,user_id' }
    );

  // Update profile with active org
  await supabaseAdmin
    .from('profiles')
    .update({ active_org_id: advisorOrgId })
    .eq('id', advisorUserId);

  console.log('[seed] ✅ Advisor account setup complete');
  if (!advisorOrgId) {
    console.error('[seed] ❌ Advisor org ID is null');
    return null;
  }
  return { userId: advisorUserId, orgId: advisorOrgId };
}

/**
 * Get or create the borrower account (param.vora@capmatch.com)
 * This account is shared between the Hoque seed script and the demo seed script.
 * Both scripts can run together - they create different projects in the same account.
 */
async function getOrCreateDemoBorrowerAccount(): Promise<{ userId: string; orgId: string } | null> {
  console.log('[seed] Getting or creating borrower account (param.vora@capmatch.com)...');
  console.log('[seed] Note: This account is shared with seed-demo-data.ts');
  
  const borrowerEmail = 'param.vora@capmatch.com';
  const borrowerPassword = 'password';
  const borrowerName = 'Param Vora';

  // Check if borrower already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, active_org_id')
    .eq('email', borrowerEmail)
    .maybeSingle();

  let borrowerUserId: string;
  let borrowerOrgId: string | null = null;

  if (existingProfile) {
    console.log(`[seed] Borrower already exists: ${borrowerEmail} (${existingProfile.id})`);
    borrowerUserId = existingProfile.id;
    borrowerOrgId = existingProfile.active_org_id;
    
    if (!borrowerOrgId) {
      // Get org from org_members
      const { data: memberData } = await supabaseAdmin
        .from('org_members')
        .select('org_id')
        .eq('user_id', borrowerUserId)
        .eq('role', 'owner')
        .single();
      
      if (memberData) {
        borrowerOrgId = memberData.org_id;
      }
    }
  } else {
    const borrowerResult = await callOnboardBorrower(borrowerEmail, borrowerPassword, borrowerName);
    if (borrowerResult.error || !borrowerResult.user) {
      console.error(`[seed] ❌ Failed to create borrower: ${borrowerResult.error}`);
      return null;
    }
    borrowerUserId = borrowerResult.user.id;
    
    // Get the org that was created during onboarding
    const { data: borrowerProfile } = await supabaseAdmin
      .from('profiles')
      .select('active_org_id')
      .eq('id', borrowerUserId)
      .single();

    if (!borrowerProfile?.active_org_id) {
      console.error('[seed] ❌ Borrower org not found after onboarding');
      return null;
    }

    borrowerOrgId = borrowerProfile.active_org_id;
    console.log(`[seed] ✅ Created borrower: ${borrowerEmail} (${borrowerUserId})`);
    console.log(`[seed] ✅ Borrower org: ${borrowerOrgId}`);
  }

  if (!borrowerOrgId) {
    console.error('[seed] ❌ Borrower org ID is null');
    return null;
  }

  return { userId: borrowerUserId, orgId: borrowerOrgId };
}

// Helper to safely get service role key
function getServiceRoleKey(): string {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return serviceRoleKey;
}

// ============================================================================
// HELPER FUNCTIONS (reused from seed-demo-data.ts)
// ============================================================================

async function uploadDocumentToProject(
  projectId: string,
  orgId: string,
  filePath: string,
  fileName: string,
  rootResourceType: 'PROJECT_DOCS_ROOT' | 'BORROWER_DOCS_ROOT',
  uploadedById: string,
  originalFileName?: string
): Promise<string | null> {
  console.log(`[seed] Uploading document: ${fileName} to ${rootResourceType}...`);

  try {
    // Get the root resource
    const { data: rootResource, error: rootError } = await supabaseAdmin
      .from('resources')
      .select('id')
      .eq('project_id', projectId)
      .eq('resource_type', rootResourceType)
      .maybeSingle();

    if (rootError || !rootResource) {
      console.error(`[seed] Failed to find ${rootResourceType} resource:`, rootError);
      return null;
    }

    // Create FILE resource entry
    const { data: fileResource, error: resourceError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: orgId,
        project_id: projectId,
        parent_id: rootResource.id,
        resource_type: 'FILE',
        name: fileName,
      })
      .select()
      .single();

    if (resourceError) {
      console.error(`[seed] Failed to create file resource:`, resourceError);
      return null;
    }

    const resourceId = fileResource.id;

    // Create document version
    const { data: version, error: versionError } = await supabaseAdmin
      .from('document_versions')
      .insert({
        resource_id: resourceId,
        created_by: uploadedById,
        storage_path: 'placeholder',
      })
      .select()
      .single();

    if (versionError) {
      console.error(`[seed] Failed to create document version:`, versionError);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Mark version as active
    await supabaseAdmin
      .from('document_versions')
      .update({ status: 'active' })
      .eq('id', version.id);

    // Build storage path - use original file name for storage, display name for resource
    const storageSubdir = rootResourceType === 'BORROWER_DOCS_ROOT' ? 'borrower-docs' : 'project-docs';
    const originalFileName = filePath.split('/').pop() || fileName;
    const storageFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize for storage
    const finalStoragePath = `${projectId}/${storageSubdir}/${resourceId}/v${version.version_number}_${storageFileName}`;

    // Read file from filesystem
    if (!existsSync(filePath)) {
      console.error(`[seed] File not found: ${filePath}`);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    const fileBuffer = readFileSync(filePath);
    
    // Detect content type based on actual file path extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/pdf'; // default
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileExtension === 'pdf') {
      contentType = 'application/pdf';
    }

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(orgId)
      .upload(finalStoragePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[seed] Failed to upload file to storage:`, uploadError);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Store metadata for the document version
    const metadata = {
      size: fileBuffer.length,
      mimeType: contentType,
      uploadedAt: new Date().toISOString(),
      source: 'seed-hoque-project',
    };

    // Update version with storage path and metadata
    const { error: updateVersionError } = await supabaseAdmin
      .from('document_versions')
      .update({ 
        storage_path: finalStoragePath,
        metadata: metadata,
      })
      .eq('id', version.id);

    if (updateVersionError) {
      console.error(`[seed] Failed to update version storage path and metadata:`, updateVersionError);
      await supabaseAdmin.storage.from(orgId).remove([finalStoragePath]);
      await supabaseAdmin.from('resources').delete().eq('id', resourceId);
      return null;
    }

    // Update resource with current version
    const { error: updateResourceError } = await supabaseAdmin
      .from('resources')
      .update({ current_version_id: version.id })
      .eq('id', resourceId);

    if (updateResourceError) {
      console.error(`[seed] Failed to update resource current version:`, updateResourceError);
    }

    // Log a domain event so downstream notification plumbing sees seeded docs
    const { data: eventId, error: eventError } = await supabaseAdmin.rpc(
      'insert_document_uploaded_event',
      {
        p_actor_id: uploadedById,
        p_project_id: projectId,
        p_resource_id: resourceId,
        p_payload: {
          fileName,
          size: fileBuffer.length,
          mimeType: contentType,
          rootResourceType,
          source: 'seed-hoque-project',
        },
      }
    );

    if (eventError) {
      console.warn('[seed] Failed to log document_uploaded event during seeding', {
        projectId,
        resourceId,
        error: eventError.message,
      });
    } else if (eventId) {
      const { error: notifyError } = await supabaseAdmin.functions.invoke('notify-fan-out', {
        body: { eventId },
      });
      if (notifyError) {
        console.warn('[seed] notify-fan-out failed for seeded document', {
          eventId,
          projectId,
          resourceId,
          error: notifyError.message,
        });
      }
    }

    console.log(`[seed] ✅ Uploaded document: ${fileName}`);
    return resourceId;
  } catch (err) {
    console.error(`[seed] Exception uploading document ${fileName}:`, err);
    return null;
  }
}

async function createChatMessage(
  threadId: string,
  userId: string,
  content: string,
  resourceIds?: string[]
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('insert_thread_message', {
      p_thread_id: threadId,
      p_user_id: userId,
      p_content: content,
      p_resource_ids: resourceIds || [],
      p_reply_to: null,
    });

    if (error) {
      console.error(`[seed] Failed to create chat message:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[seed] Exception creating chat message:`, err);
    return false;
  }
}

async function createThread(
  projectId: string,
  topic: string,
  participantIds: string[]
): Promise<string | null> {
  try {
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('chat_threads')
      .insert({
        project_id: projectId,
        topic,
      })
      .select()
      .single();

    if (threadError) {
      console.error(`[seed] Failed to create thread:`, threadError);
      return null;
    }

    // Add participants
    const participants = participantIds.map((userId) => ({
      thread_id: thread.id,
      user_id: userId,
    }));

    const { error: participantsError } = await supabaseAdmin
      .from('chat_thread_participants')
      .insert(participants);

    if (participantsError) {
      console.error(`[seed] Failed to add participants:`, participantsError);
      // Continue anyway
    }

    return thread.id;
  } catch (err) {
    console.error(`[seed] Exception creating thread:`, err);
    return null;
  }
}

async function createMemberUser(
  email: string,
  password: string,
  fullName: string,
  orgId: string
): Promise<string | null> {
  console.log(`[seed] Creating member user: ${email}...`);

  try {
    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      console.log(`[seed] Member already exists: ${email} (${existingProfile.id})`);
      userId = existingProfile.id;
    } else {
      // Create user via auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authUser.user) {
        console.error(`[seed] Failed to create member user:`, authError);
        return null;
      }

      userId = authUser.user.id;

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          app_role: 'borrower',
          active_org_id: orgId,
        });

      if (profileError) {
        console.error(`[seed] Failed to create member profile:`, profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return null;
      }

      console.log(`[seed] ✅ Created member user: ${email} (${userId})`);
    }

    // Add to org_members
    const { error: memberError } = await supabaseAdmin
      .from('org_members')
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          role: 'member',
        },
        { onConflict: 'org_id,user_id' }
      );

    if (memberError) {
      console.error(`[seed] Failed to add member to org:`, memberError);
      return null;
    }

    // Ensure active_org_id is set
    await supabaseAdmin
      .from('profiles')
      .update({ active_org_id: orgId })
      .eq('id', userId);

    console.log(`[seed] ✅ Member user setup complete: ${email}`);
    return userId;
  } catch (err) {
    console.error(`[seed] Exception creating member user ${email}:`, err);
    return null;
  }
}

async function grantMemberProjectAccess(
  projectId: string,
  memberId: string,
  grantedById: string
): Promise<boolean> {
  console.log(`[seed] Granting project access to member: ${memberId} for project: ${projectId}...`);

  try {
    const { error: grantError } = await supabaseAdmin.rpc('grant_project_access', {
      p_project_id: projectId,
      p_user_id: memberId,
      p_granted_by_id: grantedById,
      p_permissions: [
        { resource_type: 'PROJECT_RESUME', permission: 'edit' },
        { resource_type: 'PROJECT_DOCS_ROOT', permission: 'edit' },
        { resource_type: 'BORROWER_RESUME', permission: 'edit' },
        { resource_type: 'BORROWER_DOCS_ROOT', permission: 'edit' },
      ],
    });

    if (grantError) {
      console.error(`[seed] Failed to grant project access:`, grantError);
      return false;
    }

    console.log(`[seed] ✅ Granted project access to member`);
    return true;
  } catch (err) {
    console.error(`[seed] Exception granting project access:`, err);
    return false;
  }
}

// ============================================================================
// MAIN SEEDING FUNCTIONS
// ============================================================================

async function seedProjectResume(projectId: string, createdById: string): Promise<boolean> {
  console.log(`[seed] Updating project resume for SoGood Apartments...`);

  // Calculate completeness_percent (stored in column, not content)
  // Extract locked_fields from content (now stored in column, not content)
  const lockedFields = hoqueProjectResume._lockedFields || {};
  const { _lockedFields, ...contentWithoutLockedFields } = hoqueProjectResume;

  const { computeProjectCompletion } = await import('../src/utils/resumeCompletion');
  const completenessPercent = computeProjectCompletion(
    hoqueProjectResume,
    lockedFields
  );

  // Insert new resume version
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('project_resumes')
    .insert({
      project_id: projectId,
      content: contentWithoutLockedFields,
      locked_fields: lockedFields,
      completeness_percent: completenessPercent,
      created_by: createdById,
    });

  if (error) {
    console.error(`[seed] Failed to insert project resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated project resume`);
  return true;
}

async function seedBorrowerResume(projectId: string, createdById: string): Promise<boolean> {
  console.log(`[seed] Updating borrower resume for SoGood Apartments...`);

  // Ensure borrower root resources exist
  const { error: rootError } = await supabaseAdmin.rpc('ensure_project_borrower_roots', {
    p_project_id: projectId,
  });

  if (rootError) {
    console.warn(`[seed] Warning: Failed to ensure borrower root resources:`, rootError.message);
  }

  // Extract locked_fields from content (now stored in column, not content)
  const borrowerLockedFields = hoqueBorrowerResume._lockedFields || {};
  const { _lockedFields, ...borrowerContentWithoutLockedFields } = hoqueBorrowerResume;

  // Calculate completeness_percent (stored in column, not content)
  const { computeBorrowerCompletion } = await import('../src/utils/resumeCompletion');
  const completenessPercent = computeBorrowerCompletion(
    hoqueBorrowerResume,
    borrowerLockedFields
  );

  // Insert new resume version
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('borrower_resumes')
    .insert({
      project_id: projectId,
      content: borrowerContentWithoutLockedFields,
      locked_fields: borrowerLockedFields,
      completeness_percent: completenessPercent,
      created_by: createdById,
    });

  if (error) {
    console.error(`[seed] Failed to insert borrower resume:`, error);
    return false;
  }

  const lockedCount = hoqueBorrowerResume._lockedFields ? Object.keys(hoqueBorrowerResume._lockedFields).length : 0;
  console.log(`[seed] ✅ Updated borrower resume (locked fields: ${lockedCount})`);
  return true;
}

async function seedDocuments(
  projectId: string,
  orgId: string,
  uploadedById: string
): Promise<Record<string, string>> {
  console.log(`[seed] Seeding documents for SoGood Apartments...`);

  const documents: Record<string, string> = {};

  // Project documents - from docs/so-good-apartments/project/
  const projectDocuments = [
    { file: 'alta_survey.pdf', name: 'ALTA Survey' },
    { file: 'appraisal_summary.pdf', name: 'Appraisal Summary' },
    { file: 'architectural_plan_abstract.docx', name: 'Architectural Plan Abstract' },
    { file: 'construction_draw_schedule.xlsx', name: 'Construction Draw Schedule' },
    { file: 'construction_schedule.pdf', name: 'Construction Schedule' },
    { file: 'development_budget.xlsx', name: 'Development Budget' },
    { file: 'geotechnical_report.docx', name: 'Geotechnical Report' },
    { file: 'images.pdf', name: 'Project Images' },
    { file: 'incentive_agreement.docx', name: 'Incentive Agreement' },
    { file: 'market_study.docx', name: 'Market Study' },
    { file: 'operating_proforma.xlsx', name: 'Operating Pro Forma' },
    { file: 'phase_1_esa.docx', name: 'Phase 1 ESA' },
    { file: 'purchase_and_sale_agreement.docx', name: 'Purchase and Sale Agreement' },
    { file: 'regulatory_agreement.docx', name: 'Regulatory Agreement' },
    { file: 'relocation_plan.docx', name: 'Relocation Plan' },
    { file: 'rent_comp_survey.pdf', name: 'Rent Comp Survey' },
    { file: 'rent_roll.xlsx', name: 'Rent Roll' },
    { file: 'sales_comparables.xlsx', name: 'Sales Comparables' },
    { file: 'site_plan_abstract.docx', name: 'Site Plan Abstract' },
    { file: 'sources_uses.xlsx', name: 'Sources & Uses' },
    { file: 'sponsor_financials.xlsx', name: 'Sponsor Financials' },
    { file: 'sponsor_org_chart.docx', name: 'Sponsor Org Chart' },
    { file: 'term_sheet.docx', name: 'Term Sheet' },
    { file: 'title_commitment.docx', name: 'Title Commitment' },
    { file: 'utility_letter.docx', name: 'Utility Letter' },
    { file: 'zoning_verification_letter.docx', name: 'Zoning Verification Letter' },
  ];

  // Borrower documents - from docs/so-good-apartments/borrower/
  const borrowerDocuments = [
    { file: 'entity_structure.docx', name: 'Entity Structure' },
    { file: 'operating_agreement.docx', name: 'Operating Agreement' },
    { file: 'personal_financial_statement.xlsx', name: 'Personal Financial Statement' },
    { file: 'principals.docx', name: 'Principals' },
    { file: 'reo_track_record.xlsx', name: 'REO Track Record' },
    { file: 'sponsor_track_record.xlsx', name: 'Sponsor Track Record' },
  ];

  // Possible base paths for docs/so-good-apartments
  const possibleBasePaths = [
    resolve(process.cwd(), './docs/so-good-apartments'),
    resolve(process.cwd(), '../docs/so-good-apartments'),
    resolve(process.cwd(), '../../docs/so-good-apartments'),
  ];

  // Find the base path
  let basePath: string | null = null;
  for (const path of possibleBasePaths) {
    if (existsSync(path)) {
      basePath = path;
      console.log(`[seed] Found document directory: ${path}`);
      break;
    }
  }

  if (!basePath) {
    console.log(`[seed] ⚠️  No document directory found. Skipping document upload.`);
    console.log(`[seed]    To upload documents, place them in one of:`);
    possibleBasePaths.forEach(p => console.log(`[seed]    - ${p}`));
    return documents;
  }

  // Upload project documents
  const projectPath = join(basePath, 'project');
  if (existsSync(projectPath)) {
    for (const doc of projectDocuments) {
      const filePath = join(projectPath, doc.file);
      if (existsSync(filePath)) {
        const fileExtension = doc.file.split('.').pop()?.toLowerCase();
        const fileNameWithExtension = fileExtension 
          ? `${doc.name}.${fileExtension}`
          : doc.name;
        
        const resourceId = await uploadDocumentToProject(
          projectId,
          orgId,
          filePath,
          fileNameWithExtension,
          'PROJECT_DOCS_ROOT',
          uploadedById
        );
        if (resourceId) {
          documents[doc.name] = resourceId;
        }
      } else {
        console.log(`[seed] ⚠️  Project document not found: ${doc.file}`);
      }
    }
  } else {
    console.log(`[seed] ⚠️  Project documents directory not found: ${projectPath}`);
  }

  // Upload borrower documents
  const borrowerPath = join(basePath, 'borrower');
  if (existsSync(borrowerPath)) {
    for (const doc of borrowerDocuments) {
      const filePath = join(borrowerPath, doc.file);
      if (existsSync(filePath)) {
        const fileExtension = doc.file.split('.').pop()?.toLowerCase();
        const fileNameWithExtension = fileExtension 
          ? `${doc.name}.${fileExtension}`
          : doc.name;
        
        const resourceId = await uploadDocumentToProject(
          projectId,
          orgId,
          filePath,
          fileNameWithExtension,
          'BORROWER_DOCS_ROOT',
          uploadedById
        );
        if (resourceId) {
          documents[doc.name] = resourceId;
        }
      } else {
        console.log(`[seed] ⚠️  Borrower document not found: ${doc.file}`);
      }
    }
  } else {
    console.log(`[seed] ⚠️  Borrower documents directory not found: ${borrowerPath}`);
  }

  console.log(`[seed] ✅ Seeded ${Object.keys(documents).length} documents`);
  return documents;
}

async function seedImages(
  projectId: string,
  orgId: string
): Promise<void> {
  console.log(`[seed] Seeding images for SoGood Apartments...`);

  // Possible base paths for hoque-images directory
  const possibleImagePaths = [
    resolve(process.cwd(), '../../hoque-images'),
    resolve(process.cwd(), '../hoque-images'),
    resolve(process.cwd(), './hoque-images'),
  ];

  let hoqueImagesPath: string | null = null;
  for (const path of possibleImagePaths) {
    if (existsSync(path)) {
      hoqueImagesPath = path;
      console.log(`[seed] Found hoque-images directory: ${path}`);
      break;
    }
  }

  if (!hoqueImagesPath) {
    console.log(`[seed] ⚠️  No hoque-images directory found. Skipping image upload.`);
    console.log(`[seed]    To upload images, place them in one of:`);
    possibleImagePaths.forEach(p => console.log(`[seed]    - ${p}`));
    return;
  }

  // Supported image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // Upload architectural diagrams
  const archDiagramsPath = join(hoqueImagesPath, 'architectural-diagrams');
  if (existsSync(archDiagramsPath)) {
    console.log(`[seed] Uploading architectural diagrams...`);
    const archFiles = readdirSync(archDiagramsPath).filter(file => {
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    for (const file of archFiles) {
      const filePath = join(archDiagramsPath, file);
      const stats = statSync(filePath);
      if (stats.isFile()) {
        try {
          const fileBuffer = readFileSync(filePath);
          const storagePath = `${projectId}/architectural-diagrams/${file}`;
          
          // Detect content type
          const lastDot = file.toLowerCase().lastIndexOf('.');
          const ext = lastDot >= 0 ? file.toLowerCase().substring(lastDot) : '';
          let contentType = 'image/jpeg';
          if (ext === '.png') contentType = 'image/png';
          else if (ext === '.gif') contentType = 'image/gif';
          else if (ext === '.webp') contentType = 'image/webp';

          const { error: uploadError } = await supabaseAdmin.storage
            .from(orgId)
            .upload(storagePath, fileBuffer, {
              contentType,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message?.toLowerCase().includes('already exists')) {
              console.log(`[seed]   ⚠️  ${file} already exists, skipping`);
            } else {
              console.error(`[seed]   ❌ Failed to upload ${file}:`, uploadError.message);
            }
          } else {
            console.log(`[seed]   ✅ Uploaded: ${file}`);
          }
        } catch (err) {
          console.error(`[seed]   ❌ Exception uploading ${file}:`, err);
        }
      }
    }
  } else {
    console.log(`[seed] ⚠️  architectural-diagrams folder not found in hoque-images directory`);
  }

  // Upload site images
  const siteImagesPath = join(hoqueImagesPath, 'site-images');
  if (existsSync(siteImagesPath)) {
    console.log(`[seed] Uploading site images...`);
    const siteFiles = readdirSync(siteImagesPath).filter(file => {
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    for (const file of siteFiles) {
      const filePath = join(siteImagesPath, file);
      const stats = statSync(filePath);
      if (stats.isFile()) {
        try {
          const fileBuffer = readFileSync(filePath);
          const storagePath = `${projectId}/site-images/${file}`;
          
          // Detect content type
          const lastDot = file.toLowerCase().lastIndexOf('.');
          const ext = lastDot >= 0 ? file.toLowerCase().substring(lastDot) : '';
          let contentType = 'image/jpeg';
          if (ext === '.png') contentType = 'image/png';
          else if (ext === '.gif') contentType = 'image/gif';
          else if (ext === '.webp') contentType = 'image/webp';

          const { error: uploadError } = await supabaseAdmin.storage
            .from(orgId)
            .upload(storagePath, fileBuffer, {
              contentType,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message?.toLowerCase().includes('already exists')) {
              console.log(`[seed]   ⚠️  ${file} already exists, skipping`);
            } else {
              console.error(`[seed]   ❌ Failed to upload ${file}:`, uploadError.message);
            }
          } else {
            console.log(`[seed]   ✅ Uploaded: ${file}`);
          }
        } catch (err) {
          console.error(`[seed]   ❌ Exception uploading ${file}:`, err);
        }
      }
    }
  } else {
    console.log(`[seed] ⚠️  site-images folder not found in hoque-images directory`);
  }

  console.log(`[seed] ✅ Completed image upload`);
}

async function seedChatMessages(
  projectId: string,
  advisorId: string,
  borrowerId: string,
  memberIds: string[],
  documents: Record<string, string>
): Promise<void> {
  console.log(`[seed] Seeding chat messages for SoGood Apartments...`);

  // Get or create General thread
  let { data: generalThread } = await supabaseAdmin
    .from('chat_threads')
    .select('id')
    .eq('project_id', projectId)
    .eq('topic', 'General')
    .maybeSingle();

  if (!generalThread) {
    const threadId = await createThread(projectId, 'General', [advisorId, borrowerId, ...memberIds]);
    if (!threadId) {
      console.error(`[seed] Failed to create General thread`);
      return;
    }
    generalThread = { id: threadId };
  } else {
    // Ensure all participants are added
    const allParticipantIds = [advisorId, borrowerId, ...memberIds];
    for (const userId of allParticipantIds) {
      await supabaseAdmin
        .from('chat_thread_participants')
        .upsert(
          { thread_id: generalThread.id, user_id: userId },
          { onConflict: 'thread_id,user_id' }
        );
    }
  }

  const threadId = generalThread.id;
  
  // Get document IDs for references (using new document names)
  const proFormaId = documents['Operating Pro Forma'];
  const sitePlanId = documents['Site Plan Abstract'];
  const architecturalPlanId = documents['Architectural Plan Abstract'];
  const marketStudyId = documents['Market Study'];
  const termSheetId = documents['Term Sheet'];
  const sourcesUsesId = documents['Sources & Uses'];

  // Realistic chat messages about the SoGood Apartments deal
  const messages = [
    // Initial project kickoff
    {
      userId: borrowerId,
      content: `Hi @[Cody Field](user:${advisorId})! Excited to work with you on SoGood Apartments Building B. I've uploaded the key documents including the @[Term Sheet](doc:${termSheetId || ''}) and @[Sources & Uses](doc:${sourcesUsesId || ''}) which have all the key details for our 116-unit mixed-use development. This is Building B in the SoGood master plan, located between the Dallas Farmers Market and Deep Ellum.`,
      resourceIds: [termSheetId, sourcesUsesId].filter(Boolean),
    },
    {
      userId: advisorId,
      content: `Hi team! Thanks for getting everything uploaded. I've reviewed the term sheet - this is a strong deal. The PFC structure with 50% workforce housing is compelling, and having 30,000 SF pre-leased to GSV Holdings is great for lender comfort. What's our timeline for debt marketing?`,
      resourceIds: [],
    },
    {
      userId: borrowerId,
      content: `We're targeting Q1 2025 for debt marketing kickoff. Site control and PFC approval are complete as of July 2024. I've also uploaded the @[Market Study](doc:${marketStudyId || ''}) so you can see the market context. Groundbreaking is scheduled for August 2025.`,
      resourceIds: marketStudyId ? [marketStudyId] : [],
    },
    
    // PFC discussion
    {
      userId: advisorId,
      content: `The PFC structure is really going to help with underwriting. I've reviewed the incentive agreement - having that tax exemption executed is a huge benefit. That's going to significantly improve NOI and exit value. The regulatory agreement shows the framework is solid.`,
      resourceIds: [],
    },
    {
      userId: borrowerId,
      content: `Exactly. The PFC structure through the City of Dallas Housing Finance Corp gives us property tax exemption, which is critical for the workforce housing component. We're targeting 50% of units at ≤80% AMI, which aligns perfectly with the PFC program and makes us eligible for agency lending on the permanent side.`,
      resourceIds: [],
    },
    
    // Financial discussion
    {
      userId: advisorId,
      content: `I've been reviewing the @[Operating Pro Forma](doc:${proFormaId || ''}) - $18M loan request against $29.8M TDC is 60% LTC, which is reasonable for construction. Your base case shows 7.6% yield on cost with 44% LTV at stabilization. The partial recourse structure should help with pricing.`,
      resourceIds: proFormaId ? [proFormaId] : [],
    },
    {
      userId: borrowerId,
      content: `Yes, we're comfortable with partial recourse. We have strong relationships with Frost Bank and Citi Community Capital from previous deals, including SoGood Phase A. The pro forma shows stabilized NOI around $2.27M with a 5.5% cap rate, getting us to a $41.2M exit value.`,
      resourceIds: [],
    },
    
    // Design and site discussion
    {
      userId: advisorId,
      content: `The location between Farmers Market and Deep Ellum is excellent. I've looked at the @[Site Plan Abstract](doc:${sitePlanId || ''}) - the site access from Hickory St and Ferris St works well. The @[Architectural Plan Abstract](doc:${architecturalPlanId || ''}) shows a solid 6-story podium design with good amenity spaces.`,
      resourceIds: [sitePlanId, architecturalPlanId].filter(Boolean),
    },
    {
      userId: borrowerId,
      content: `Thanks! The design maximizes the site while keeping costs reasonable. We're delivering 116 units with 59,520 SF residential, plus 49,569 SF of commercial. The amenity package includes a resort-style pool, fitness center, sky lounge, and co-working space - all totaling 35,264 SF.`,
      resourceIds: [],
    },
    
    // Innovation Center discussion
    {
      userId: advisorId,
      content: `The 30,000 SF Innovation Center pre-lease to GSV Holdings is a real differentiator. Having that much commercial space locked up before groundbreaking reduces lease-up risk significantly. What's the lease term?`,
      resourceIds: [],
    },
    {
      userId: borrowerId,
      content: `It's a 15-year lease with GSV Holdings. They're an education/flex space operator, and they're expanding their Dallas footprint. We're also marketing the two office suites (6,785 SF and 5,264 SF) and have interest from a few creative office users. The retail bay at 745 SF is targeted for a local food & beverage operator.`,
      resourceIds: [],
    },
    
    // Timeline and next steps
    {
      userId: advisorId,
      content: `Sounds great. So timeline-wise: we have design development wrapping up in November, then debt marketing starting Q1 2025, with closing targeted for August 2025 to align with groundbreaking. That gives us about 6 months for lender outreach and due diligence.`,
      resourceIds: [],
    },
    {
      userId: borrowerId,
      content: `That's the plan. We'll have final construction drawings by end of Q1, and permits should be issued by Q2. The construction schedule calls for topping out in November 2026, then substantial completion September 2027. First occupancy target is October 2027, with stabilization by Q1 2028.`,
      resourceIds: [],
    },
    {
      userId: advisorId,
      content: `Perfect. I'll start putting together a targeted lender list - focusing on construction lenders comfortable with mixed-use, PFC structures, and workforce housing. Given your track record with SoGood Phase A and the pre-leasing, I think we'll have strong interest. Let me know if there are any specific lenders you want prioritized.`,
      resourceIds: [],
    },
  ];

  // Create messages with slight delays to simulate real conversation timing
  for (const message of messages) {
    await createChatMessage(threadId, message.userId, message.content, message.resourceIds);
    // Small delay to space out messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Create additional threads for specific topics
  if (memberIds.length > 0) {
    const constructionThreadId = await createThread(
      projectId,
      'Construction & Timeline',
      [advisorId, borrowerId, ...memberIds]
    );

    if (constructionThreadId) {
      const constructionMessages = [
        {
          userId: borrowerId,
          content: `Setting up a dedicated thread for construction updates. Our GC is lined up and ready to break ground in August 2025. Key milestone: topping out by November 2026. The @[Architectural Plan Abstract](doc:${architecturalPlanId || ''}) shows the full scope - 6-story podium with structured parking.`,
          resourceIds: architecturalPlanId ? [architecturalPlanId] : [],
        },
        {
          userId: advisorId,
          content: `Good idea to have a separate thread. Lenders will want regular construction updates. Are you planning monthly progress reports? Also, I noticed the @[Site Plan Abstract](doc:${sitePlanId || ''}) shows good site access - that should help with construction logistics.`,
          resourceIds: sitePlanId ? [sitePlanId] : [],
        },
        {
          userId: borrowerId,
          content: `Yes, we'll provide monthly draw requests and progress photos. Our GC has experience with lender reporting requirements. The site is well-positioned with access from both Hickory St and Ferris St, which helps with material delivery and staging.`,
          resourceIds: [],
        },
      ];

      for (const message of constructionMessages) {
        await createChatMessage(constructionThreadId, message.userId, message.content, message.resourceIds);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const financingThreadId = await createThread(
      projectId,
      'Financing & Lender Outreach',
      [advisorId, borrowerId, ...memberIds]
    );

    if (financingThreadId) {
      const financingMessages = [
        {
          userId: advisorId,
          content: `Starting lender outreach thread. I'm identifying potential lenders who specialize in: 1) Mixed-use construction, 2) PFC/tax-exempt structures, 3) Workforce housing. The @[Term Sheet](doc:${termSheetId || ''}) and @[Sources & Uses](doc:${sourcesUsesId || ''}) are comprehensive - I'll use these for initial outreach. Target list coming next week.`,
          resourceIds: [termSheetId, sourcesUsesId].filter(Boolean),
        },
        {
          userId: borrowerId,
          content: `Thanks! We have existing relationships with Frost Bank and Citi Community Capital. Should we prioritize those or cast a wider net? The incentive agreement details the tax exemption structure which should be attractive to lenders.`,
          resourceIds: [],
        },
        {
          userId: advisorId,
          content: `Let's leverage those relationships but also expand. Given the deal size ($18M) and structure, there are several regional banks and specialty lenders who'd be competitive. The PFC structure is a key selling point - having that tax exemption executed removes a lot of execution risk. I'll coordinate initial outreach and prioritize lenders familiar with PFC deals.`,
          resourceIds: [],
        },
        {
          userId: borrowerId,
          content: `Sounds good. The @[Operating Pro Forma](doc:${proFormaId || ''}) shows strong returns - 7.6% yield on cost with multiple exit scenarios. That should help with lender underwriting.`,
          resourceIds: proFormaId ? [proFormaId] : [],
        },
      ];

      for (const message of financingMessages) {
        await createChatMessage(financingThreadId, message.userId, message.content, message.resourceIds);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`[seed] ✅ Seeded chat messages`);
}

async function createProject(
  ownerOrgId: string,
  projectName: string,
  assignedAdvisorId: string | null,
  creatorId: string
): Promise<string | null> {
  console.log(`[seed] Creating project: ${projectName}...`);

  try {
    // 1. Create the project record
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name: projectName,
        owner_org_id: ownerOrgId,
        assigned_advisor_id: assignedAdvisorId,
      })
      .select()
      .single();

    if (projectError) {
      console.error(`[seed] Failed to create project record:`, projectError);
      return null;
    }

    const projectId = project.id;
    console.log(`[seed] ✅ Created project record: ${projectId}`);

    // 2. Create empty project resume (will be updated later)
    const { error: resumeError } = await supabaseAdmin
      .from('project_resumes')
      .insert({ project_id: projectId, content: {} });

    if (resumeError) {
      console.error(`[seed] Failed to create project resume:`, resumeError);
      await supabaseAdmin.from('projects').delete().eq('id', projectId);
      return null;
    }

    // 3. Create storage folders (project root, architectural-diagrams, site-images)
    const { error: storageError } = await supabaseAdmin.storage
      .from(ownerOrgId)
      .upload(`${projectId}/.placeholder`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8',
      });

    if (storageError && !storageError.message?.toLowerCase().includes('already exists')) {
      console.warn(`[seed] Warning: Storage folder creation failed (non-critical):`, storageError.message);
    }

    // Create architectural-diagrams folder
    const { error: archDiagramsError } = await supabaseAdmin.storage
      .from(ownerOrgId)
      .upload(`${projectId}/architectural-diagrams/.keep`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8',
      });

    if (archDiagramsError && !archDiagramsError.message?.toLowerCase().includes('already exists')) {
      console.warn(`[seed] Warning: architectural-diagrams folder creation failed (non-critical):`, archDiagramsError.message);
    }

    // Create site-images folder
    const { error: siteImagesError } = await supabaseAdmin.storage
      .from(ownerOrgId)
      .upload(`${projectId}/site-images/.keep`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8',
      });

    if (siteImagesError && !siteImagesError.message?.toLowerCase().includes('already exists')) {
      console.warn(`[seed] Warning: site-images folder creation failed (non-critical):`, siteImagesError.message);
    }

    // 4. Create PROJECT_RESUME resource
    const { data: projectResumeResource, error: resumeResourceError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: ownerOrgId,
        project_id: projectId,
        resource_type: 'PROJECT_RESUME',
        name: `${projectName} Resume`,
      })
      .select()
      .single();

    if (resumeResourceError) {
      console.error(`[seed] Failed to create PROJECT_RESUME resource:`, resumeResourceError);
    }

    // 5. Create PROJECT_DOCS_ROOT resource
    const { data: projectDocsRootResource, error: docsRootError } = await supabaseAdmin
      .from('resources')
      .insert({
        org_id: ownerOrgId,
        project_id: projectId,
        resource_type: 'PROJECT_DOCS_ROOT',
        name: `${projectName} Documents`,
      })
      .select()
      .single();

    if (docsRootError) {
      console.error(`[seed] Failed to create PROJECT_DOCS_ROOT resource:`, docsRootError);
    }

    // 6. Ensure borrower root resources
    const { error: borrowerRootError } = await supabaseAdmin.rpc('ensure_project_borrower_roots', {
      p_project_id: projectId,
    });

    if (borrowerRootError) {
      console.warn(`[seed] Warning: Failed to ensure borrower root resources:`, borrowerRootError.message);
    }

    // 7. Grant creator access
    const { error: grantError } = await supabaseAdmin
      .from('project_access_grants')
      .insert({
        project_id: projectId,
        org_id: ownerOrgId,
        user_id: creatorId,
        granted_by: creatorId,
      });

    if (grantError) {
      console.warn(`[seed] Warning: Failed to grant project access:`, grantError.message);
    }

    // 8. Grant permissions on resources
    if (projectResumeResource?.id) {
      await supabaseAdmin.from('permissions').upsert({
        resource_id: projectResumeResource.id,
        user_id: creatorId,
        permission: 'edit',
        granted_by: creatorId,
      });
    }

    if (projectDocsRootResource?.id) {
      await supabaseAdmin.from('permissions').upsert({
        resource_id: projectDocsRootResource.id,
        user_id: creatorId,
        permission: 'edit',
        granted_by: creatorId,
      });
    }

    // 9. Create default chat thread
    const { data: chatThread, error: chatThreadError } = await supabaseAdmin
      .from('chat_threads')
      .insert({
        project_id: projectId,
        topic: 'General',
      })
      .select()
      .single();

    if (!chatThreadError && chatThread) {
      const participants = [{ thread_id: chatThread.id, user_id: creatorId }];
      if (assignedAdvisorId) {
        participants.push({ thread_id: chatThread.id, user_id: assignedAdvisorId });
      }
      await supabaseAdmin.from('chat_thread_participants').insert(participants);
    }

    console.log(`[seed] ✅ Created project: ${projectName} (${projectId})`);
    return projectId;
  } catch (err) {
    console.error(`[seed] Exception creating project ${projectName}:`, err);
    return null;
  }
}

async function seedTeamMembers(projectId: string, orgId: string, ownerId: string): Promise<string[]> {
  console.log(`[seed] Seeding team members for SoGood Apartments...`);
  console.log(`[seed] Note: Using same member accounts as seed-demo-data.ts for compatibility`);

  const memberEmails = [
    { email: 'aryan.jain@capmatch.com', name: 'Aryan Jain', role: 'Team Member' },
    { email: 'sarthak.karandikar@capmatch.com', name: 'Sarthak Karandikar', role: 'Team Member' },
    { email: 'kabeer.merchant@capmatch.com', name: 'Kabeer Merchant', role: 'Team Member' },
  ];

  const memberIds: string[] = [];

  for (const member of memberEmails) {
    const userId = await createMemberUser(member.email, 'password', member.name, orgId);
    if (userId) {
      memberIds.push(userId);
      
      // Grant project access
      await grantMemberProjectAccess(projectId, userId, ownerId);
      
      // Add to General chat thread
      const { data: generalThread } = await supabaseAdmin
        .from('chat_threads')
        .select('id')
        .eq('project_id', projectId)
        .eq('topic', 'General')
        .maybeSingle();

      if (generalThread) {
        await supabaseAdmin
          .from('chat_thread_participants')
          .upsert(
            { thread_id: generalThread.id, user_id: userId },
            { onConflict: 'thread_id,user_id' }
          );
      }
    }
  }

  console.log(`[seed] ✅ Seeded ${memberIds.length} team members`);
  return memberIds;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedHoqueProject(): Promise<void> {
  console.log('🌱 Starting Hoque (SoGood Apartments) complete account seed...\n');
  console.log('📝 Note: This script uses the same borrower and advisor accounts as seed-demo-data.ts');
  console.log('📝 Both scripts can be run together - they create different projects in the same accounts\n');

  try {
    // Step 1: Create advisor account and org
    // Note: Uses same advisor as demo script (cody.field@capmatch.com)
    console.log('📋 Step 1: Creating advisor account (Cody Field)...');
    const advisorInfo = await createAdvisorAccount();
    if (!advisorInfo) {
      console.error('[seed] ❌ Failed to create advisor account');
      return;
    }
    const { userId: advisorId, orgId: advisorOrgId } = advisorInfo;

    // Step 2: Get or create borrower account (param.vora@capmatch.com)
    // This uses the same account as the demo script, so both scripts can work together
    console.log('\n📋 Step 2: Getting/creating borrower account (param.vora@capmatch.com)...');
    const borrowerInfo = await getOrCreateDemoBorrowerAccount();
    if (!borrowerInfo) {
      console.error('[seed] ❌ Failed to get/create borrower account');
      return;
    }
    const { userId: borrowerId, orgId: borrowerOrgId } = borrowerInfo;

    // Step 3: Create SoGood Apartments project
    console.log('\n📋 Step 3: Creating SoGood Apartments project...');
    const projectId = await createProject(
      borrowerOrgId,
      HOQUE_PROJECT_NAME,
      advisorId,
      borrowerId
    );

    if (!projectId) {
      console.error('[seed] ❌ Failed to create project');
      return;
    }

    // Grant advisor permissions
    const { error: permError } = await supabaseAdmin.rpc('grant_advisor_project_permissions', {
      p_project_id: projectId,
      p_advisor_id: advisorId,
      p_granted_by_id: advisorId,
    });

    if (permError) {
      console.warn(`[seed] Warning: Failed to grant advisor permissions:`, permError.message);
    }

    // Step 4: Seed project and borrower resumes
    console.log('\n📋 Step 4: Seeding project and borrower resumes...');
    await seedProjectResume(projectId, borrowerId);
    await seedBorrowerResume(projectId, borrowerId);

    // Step 4.5: Seed OM data (single row per project, no versioning)
    // OM uses same content as project resume but without _lockedFields
    // Also merges borrower resume data (flat format)
    console.log('\n📋 Step 4.5: Seeding OM data...');
    const omContent: Record<string, any> = { ...hoqueProjectResume };
    // Remove _lockedFields and _fieldStates from OM content (OM doesn't track locks)
    delete omContent._lockedFields;
    delete omContent._fieldStates;
    delete omContent.completenessPercent;
    
    // Merge borrower resume data into OM (flat format, same as backend sync)
    const borrowerContent: Record<string, any> = { ...hoqueBorrowerResume };
    delete borrowerContent._lockedFields;
    delete borrowerContent._fieldStates;
    delete borrowerContent.completenessPercent;
    
    // Merge borrower fields into OM content (filter out metadata fields)
    for (const key in borrowerContent) {
      if (!key.startsWith('_') && key !== 'completenessPercent' && key !== 'projectSections' && key !== 'borrowerSections') {
        omContent[key] = borrowerContent[key];
      }
    }
    
    const { error: omError } = await supabaseAdmin
      .from('om')
      .upsert(
        {
          project_id: projectId,
          content: omContent,
        },
        { onConflict: 'project_id' }
      );

    if (omError) {
      console.warn(`[seed] ⚠️  Failed to seed OM data:`, omError.message);
    } else {
      console.log(`[seed] ✅ Seeded OM data (includes project + borrower resume fields)`);
    }

    // Step 5: Seed documents
    console.log('\n📋 Step 5: Seeding documents...');
    const documents = await seedDocuments(projectId, borrowerOrgId, borrowerId);

    // Step 5.5: Seed images
    console.log('\n📋 Step 5.5: Seeding images...');
    await seedImages(projectId, borrowerOrgId);

    // Step 6: Seed team members
    console.log('\n📋 Step 6: Seeding team members...');
    const memberIds = await seedTeamMembers(projectId, borrowerOrgId, borrowerId);

    // Step 7: Seed chat messages
    console.log('\n📋 Step 7: Seeding chat messages...');
    await seedChatMessages(projectId, advisorId, borrowerId, memberIds, documents);

    // Summary
    console.log('\n✅ Hoque (SoGood Apartments) complete account seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Advisor: cody.field@capmatch.com (password: password)`);
    console.log(`   Project Owner: param.vora@capmatch.com (password: password)`);
    console.log(`   Project: ${HOQUE_PROJECT_NAME} (${projectId})`);
    console.log(`   Project Resume: ✅ Seeded (100% complete)`);
    console.log(`   Borrower Resume: ✅ Seeded (100% complete)`);
    console.log(`   OM Data: ✅ Seeded`);
    console.log(`   Documents: ✅ ${Object.keys(documents).length} documents`);
    console.log(`   Team Members: ✅ ${memberIds.length} members`);
    console.log(`   Chat Messages: ✅ Seeded in General and topic threads`);
    console.log('\n🎉 The Hoque project is now fully seeded in the borrower account!');
  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

async function cleanupHoqueAccounts(): Promise<void> {
  console.log('🧹 Starting Hoque project cleanup...\n');

  try {
    const borrowerEmail = 'param.vora@capmatch.com';
    const advisorEmail = 'cody.field@capmatch.com';
    const teamMemberEmails = [
      'aryan.jain@capmatch.com',
      'sarthak.karandikar@capmatch.com',
      'kabeer.merchant@capmatch.com',
    ];

    // Step 1: Find and delete SoGood Apartments project
    // Note: This only deletes the Hoque project, not the demo projects
    console.log('📋 Step 1: Deleting SoGood Apartments project...');
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name, owner_org_id')
      .eq('name', HOQUE_PROJECT_NAME);

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      let borrowerOrgId: string | null = null;

      for (const project of projects) {
        borrowerOrgId = project.owner_org_id;
        
        // Delete chat data
        const { data: threads } = await supabaseAdmin
          .from('chat_threads')
          .select('id')
          .eq('project_id', project.id);

        if (threads && threads.length > 0) {
          const threadIds = threads.map(t => t.id);
          await supabaseAdmin.from('chat_thread_participants').delete().in('thread_id', threadIds);
          await supabaseAdmin.from('chat_threads').delete().eq('project_id', project.id);
        }

        // Delete resources
        const { data: resources } = await supabaseAdmin
          .from('resources')
          .select('id')
          .eq('project_id', project.id);

        if (resources && resources.length > 0) {
          const resourceIds = resources.map(r => r.id);
          await supabaseAdmin.from('permissions').delete().in('resource_id', resourceIds);
          await supabaseAdmin.from('resources').delete().in('id', resourceIds);
        }

        // Delete resumes
        await supabaseAdmin.from('project_resumes').delete().eq('project_id', project.id);
        await supabaseAdmin.from('borrower_resumes').delete().eq('project_id', project.id);

        // Delete OM data
        await supabaseAdmin.from('om').delete().eq('project_id', project.id);

        // Delete project access grants
        await supabaseAdmin.from('project_access_grants').delete().in('project_id', projectIds);
      }

      // Delete projects
      await supabaseAdmin.from('projects').delete().in('id', projectIds);
      console.log(`[cleanup] ✅ Deleted ${projects.length} project(s)`);
      
      // Note: We do NOT delete the borrower account (param.vora@capmatch.com) or its org
      // as it's shared with the demo script and may have other projects
    } else {
      console.log('[cleanup] No SoGood Apartments projects found');
    }

    // Step 3: Skip team member cleanup (team members are shared with demo script)
    // Note: We do NOT delete team member accounts as they're shared with the demo script
    console.log('\n📋 Step 3: Skipping team member cleanup...');
    console.log(`[cleanup] ⚠️  Preserving team member accounts - shared with demo script:`);
    for (const email of teamMemberEmails) {
      console.log(`[cleanup]   - ${email}`);
    }
    console.log(`[cleanup] Note: Only Hoque project access will be removed (project deletion handles this)`);

    // Step 4: Skip advisor cleanup (advisor is shared with demo script)
    // Note: We do NOT delete the advisor account (cody.field@capmatch.com) or its org
    // as it's shared with the demo script and may be used by other projects
    console.log('\n📋 Step 5: Skipping advisor cleanup...');
    console.log(`[cleanup] ⚠️  Preserving advisor account (${advisorEmail}) - shared with demo script`);

    console.log('\n✅ Hoque project cleanup completed!');
    console.log('🌱 Note: Borrower account (param.vora@capmatch.com) was NOT deleted.');
    console.log('🌱 Note: This account is shared with the demo script, so it is preserved.');
    console.log('🌱 You can now run the seed script again for a fresh start.');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    throw error;
  }
}

// ============================================================================
// CLI HANDLING
// ============================================================================

async function main() {
  // Production confirmation
  if (isProduction && !isCleanup) {
    console.log('⚠️  PRODUCTION MODE DETECTED');
    console.log(`   Database: ${supabaseUrl}`);
    const key = getServiceRoleKey();
    console.log(`   Service Role Key: ${key.substring(0, 20)}...`);
    console.log('\n⚠️  This will create real users and data in PRODUCTION!');
    console.log('⚠️  Make sure you have backups before proceeding.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    // Wait 5 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Proceeding with production seed...\n');
  }

  if (isCleanup) {
    if (isProduction) {
      console.log('⚠️  PRODUCTION CLEANUP MODE');
      console.log(`   Database: ${supabaseUrl}`);
      console.log('⚠️  This will DELETE all Hoque accounts and data from PRODUCTION!');
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Proceeding with production cleanup...\n');
    }
    
    await cleanupHoqueAccounts();
    console.log('\n✨ Cleanup done!');
  } else {
    await seedHoqueProject();
    console.log('\n✨ Done!');
    if (isProduction) {
      console.log('\n📝 Next steps:');
      console.log('   1. Change user passwords (default is "password")');
      console.log('   2. Verify data in Supabase Dashboard');
      console.log('   3. Test login with created accounts');
    }
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedHoqueProject, cleanupHoqueAccounts };

