// scripts/seed-hoque-project.ts
// Comprehensive seed script for the Hoque (SoGood Apartments) project
// Creates complete account setup: advisor, borrower, team members, project, resumes, documents, and chat messages
// Run with: npx tsx scripts/seed-hoque-project.ts [--prod] [cleanup]

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProjectResumeContent } from '../src/lib/project-queries';

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

const hoqueProjectResume: ProjectResumeContent & Record<string, any> = {
  projectName: 'SoGood Apartments',
  assetType: 'Mixed-Use (Retail, Office, Multifamily)',
  projectStatus: 'Advisor Review',
  propertyAddressStreet: '2300 Hickory St',
  propertyAddressCity: 'Dallas',
  propertyAddressState: 'TX',
  propertyAddressCounty: 'Dallas County',
  propertyAddressZip: '75215',
  parcelNumber: '000472000A01B0100',
  zoningDesignation: 'PD317',
  projectType: 'Mixed-Use (Retail, Office and Multifamily)',
  primaryAssetClass: 'Multifamily',
  constructionType: 'Ground-Up',
  groundbreakingDate: '2025-08-01',
  completionDate: '2027-09-30',
  totalDevelopmentCost: 29800000,
  requestedLoanTerm: '2 Years',
  masterPlanName: 'SoGood Master Planned Development',
  phaseNumber: 'Building B',
  projectDescription: 'Ground-up development of Building B within the SoGood master plan, delivering 116 units over activated ground-floor innovation space between the Dallas Farmers Market and Deep Ellum.',
  projectPhase: 'Construction',
  
  // Property Specifications
  totalResidentialUnits: 116,
  totalResidentialNRSF: 59520,
  averageUnitSize: 513,
  totalCommercialGRSF: 49569,
  grossBuildingArea: 127406,
  numberOfStories: 6,
  buildingType: 'Mid-rise / Podium',
  parkingSpaces: 180,
  parkingRatio: 1.55,
  parkingType: 'Structured',
  amenityList: ['Fitness center', 'Shared working space', 'Lounge', 'Outdoor terrace', 'Swimming pool'],
  amenitySF: 35264,
  residentialUnitMix: [
    { unitType: 'S1', type: 'Studio', units: 48, avgSF: 374 },
    { unitType: 'S2', type: 'Studio', units: 28, avgSF: 380 },
    { unitType: 'S3', type: 'Studio', units: 8, avgSF: 470 },
    { unitType: 'A1', type: '1BR', units: 8, avgSF: 720 },
    { unitType: 'A2', type: '1BR', units: 8, avgSF: 736 },
    { unitType: 'A3', type: '1BR', units: 8, avgSF: 820 },
    { unitType: 'B1', type: '2BR', units: 8, avgSF: 1120 },
  ],
  commercialSpaceMix: [
    { spaceType: 'Innovation Center', squareFootage: 30000, tenant: 'GSV Holdings LLC' },
    { spaceType: 'Office 1', squareFootage: 6785 },
    { spaceType: 'Office 2', squareFootage: 5264 },
    { spaceType: 'Retail', squareFootage: 745 },
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
  
  // Sources of Funds & Loan Terms
  seniorLoanAmount: 18000000,
  sponsorEquity: 11800000,
  interestRate: 8.00,
  underwritingRate: 8.00,
  amortization: 'Interest-Only for Construction',
  prepaymentTerms: 'Minimum interest',
  recourse: 'Partial Recourse',
  permTakeoutPlanned: true,
  
  // Operating Expenses & Investment Metrics
  realEstateTaxes: 34200,
  insurance: 92800,
  utilities: 23200,
  repairsAndMaintenance: 46400,
  managementFee: 85000,
  generalAndAdmin: 40600,
  payroll: 174000,
  reserves: 23200,
  noiYear1: 2268000,
  yieldOnCost: 7.6,
  capRate: 5.50,
  stabilizedValue: 41200000,
  ltv: 44,
  debtYield: 12.6,
  dscr: 1.25,
  
  // Loan Info
  loanAmountRequested: 18000000,
  loanType: 'Senior Construction Loan',
  targetLtvPercent: 44,
  targetLtcPercent: 60,
  amortizationYears: 30,
  interestOnlyPeriodMonths: 24,
  interestRateType: 'Floating',
  targetCloseDate: '2025-08-15',
  useOfProceeds: 'Land acquisition, vertical construction, soft costs, and financing reserves for Building B within the SoGood master plan.',
  recoursePreference: 'Partial Recourse',
  
  // Financials
  purchasePrice: 6000000,
  totalProjectCost: 29807800,
  capexBudget: 16950000,
  propertyNoiT12: 0,
  stabilizedNoiProjected: 2268000,
  exitStrategy: 'Refinance',
  businessPlanSummary: 'Execute a Dallas PFC-backed workforce housing program (50% of units ≤80% AMI) inside a 6-story mixed-use podium with 30,000 SF of pre-leased Innovation Center space. The plan funds land acquisition, hard/soft costs, and reserves for a 24-month build schedule plus two 6-month extensions, targeting a refinancing or sale upon stabilization in 2027.',
  marketOverviewSummary: 'Site sits between the Dallas Farmers Market, Deep Ellum, and the CBD—walking distance to 5,000+ jobs, DART rail, and the I-30/I-45 interchange. Three-mile demographics show $85K+ median income, 6.9% population growth, and 76% renter share. The submarket has <6,000 units delivering over the next 24 months, keeping occupancy above 94%.',
  equityCommittedPercent: 39.6,
  
  // Market Context
  submarketName: 'Downtown Dallas',
  population3Mi: 174270,
  popGrowth201020: 23.3,
  projGrowth202429: 6.9,
  medianHHIncome: 85906,
  renterOccupiedPercent: 76.7,
  bachelorsDegreePercent: 50.2,
  
  // Special Considerations
  opportunityZone: true,
  affordableHousing: true,
  affordableUnitsNumber: 58,
  amiTargetPercent: 80,
  taxExemption: true,
  taxAbatement: true,
  paceFinancing: false,
  historicTaxCredits: false,
  newMarketsCredits: false,
  
  // Timeline & Milestones & Site & Context
  firstOccupancy: '2027-10-15',
  stabilization: '2028-03-31',
  preLeasedSF: 30000,
  entitlements: 'Approved',
  permitsIssued: 'Issued',
  totalSiteAcreage: 2.5,
  currentSiteStatus: 'Vacant',
  siteAccess: 'Hickory St, Ferris St',
  proximityShopping: 'Farmers Market, Deep Ellum nearby',
  
  // Sponsor Information & Metadata
  sponsorEntityName: 'Hoque Global',
  sponsorStructure: 'General Partner',
  equityPartner: 'ACARA',
  contactInfo: 'Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)',
  completenessPercent: 100,
  internalAdvisorNotes: 'Seeded via scripts/seed-hoque-project.ts',
  
  // Additional sections
  projectSections: {
    timeline: [
      { phase: 'Site Control & PFC Approval', date: '2024-07-12' },
      { phase: 'Design Development Complete', date: '2024-11-01' },
      { phase: 'Debt Marketing & DD', date: '2025-02-28' },
      { phase: 'Groundbreaking', date: '2025-08-01' },
      { phase: 'Topping Out', date: '2026-11-15' },
      { phase: 'Substantial Completion', date: '2027-09-30' },
    ],
    scenarioReturns: {
      base: { irr: 17.5, equityMultiple: 1.95, debtYield: 12.6, exitCap: 5.5 },
      upside: { irr: 21.2, equityMultiple: 2.30, debtYield: 13.8, exitCap: 5.25 },
      downside: { irr: 13.4, equityMultiple: 1.60, debtYield: 11.0, exitCap: 5.85 },
    },
    capitalStackHighlights: {
      loanAmount: 18000000,
      totalDevelopmentCost: 29807800,
      equityRequirement: 11807800,
      ltv: 44,
      ltc: 60,
      notes: 'Senior construction facility with two 6-month extensions and partial recourse completion guaranty.',
    },
    marketMetrics: {
      oneMile: { population: 38500, medianIncome: 72000, medianAge: 32 },
      threeMile: { population: 174270, medianIncome: 85906, medianAge: 33 },
      fiveMile: { population: 410000, medianIncome: 79500, medianAge: 34 },
      growthTrends: { population5yr: '6.9%', income5yr: '8.4%', job5yr: '12.1%' },
      renterShare: '76.7%',
      avgOccupancy: '94.2%',
      supplyPipeline: [
        { quarter: 'Q4 2024', units: 620 },
        { quarter: 'Q1 2025', units: 880 },
        { quarter: 'Q3 2025', units: 950 },
        { quarter: 'Q1 2026', units: 760 },
        { quarter: 'Q3 2026', units: 890 },
      ],
    },
    certifications: [
      { name: 'Opportunity Zone', status: 'Qualified' },
      { name: 'Dallas PFC Tax Exemption', status: 'Executed' },
      { name: 'Workforce Housing Covenant', status: '50% ≤80% AMI' },
    ],
    amenities: [
      { name: 'Resort-Style Pool', size: '3,200 SF', description: 'Heated saltwater pool with cabanas overlooking the courtyard.' },
      { name: 'Fitness Center', size: '2,500 SF', description: '24/7 performance studio with functional training + Peloton.' },
      { name: 'Sky Lounge', size: '1,800 SF', description: 'Indoor/outdoor lounge with downtown skyline views.' },
      { name: 'Co-Working Space', size: '1,200 SF', description: 'Private offices, maker space, and conference rooms.' },
      { name: 'Pet Spa', size: '400 SF', description: 'Wash stations with on-site grooming.' },
      { name: 'Package Concierge', size: '300 SF', description: 'Smart lockers with cold storage for meal delivery.' },
    ],
    commercialProgram: [
      { name: 'Innovation Center (GSV Holdings)', size: '30,000 SF', status: 'Pre-leased', use: 'Flex / Education' },
      { name: 'Office Suite 1', size: '6,785 SF', status: 'Marketed', use: 'Creative Office' },
      { name: 'Office Suite 2', size: '5,264 SF', status: 'Marketed', use: 'Professional Services' },
      { name: 'Retail Bay', size: '745 SF', status: 'Targeting local operator', use: 'Food & Beverage' },
    ],
  },
};

const hoqueBorrowerResume = {
  fullLegalName: 'Hoque Global',
  primaryEntityName: 'Hoque Global / ACARA PFC JV',
  primaryEntityStructure: 'Master Developer + Public Facility Corporation Partnership',
  contactEmail: 'info@hoqueglobal.com',
  contactPhone: '972.455.1943',
  contactAddress: '2300 Hickory St, Dallas, TX 75215',
  bioNarrative: 'Hoque Global is a Dallas-based master developer delivering catalytic mixed-use districts and workforce housing through public-private partnerships, including PFC structures with the City of Dallas. ACARA serves as capital partner, structuring Opportunity Zone-aligned investments with a $950M+ track record across Texas.',
  yearsCREExperienceRange: '20+ years',
  assetClassesExperience: ['Mixed-Use', 'Multifamily', 'Office', 'Master-Planned Districts'],
  geographicMarketsExperience: ['Dallas-Fort Worth', 'Texas Triangle', 'Southeast US'],
  totalDealValueClosedRange: '$950M+',
  existingLenderRelationships: 'Frost Bank; Citi Community Capital; Dallas Housing Finance Corp',
  creditScoreRange: '720-760',
  netWorthRange: '$50M+',
  liquidityRange: '$5M - $10M',
  bankruptcyHistory: false,
  foreclosureHistory: false,
  litigationHistory: false,
  completenessPercent: 100,
  borrowerSections: {
    principals: [
      {
        name: 'Mike Hoque',
        role: 'Chief Executive Officer',
        experience: '22 years',
        bio: 'Founder leading Hoque Global\'s master plan strategy and public-private initiatives across Dallas.',
        education: 'BBA, University of Texas at Dallas',
        specialties: ['Master Planning', 'Public-Private Partnerships', 'Mixed-Use Development'],
        achievements: ['Delivered 1M+ SF of adaptive reuse', 'Dallas Regional Chamber Urban Taskforce Chair'],
      },
      {
        name: 'Joel Heikenfeld',
        role: 'Managing Director, ACARA',
        experience: '18 years',
        bio: 'Capital markets lead for ACARA structuring Opportunity Zone and PFC executions in Texas.',
        education: 'MBA, SMU Cox School of Business',
        specialties: ['Capital Markets', 'Workforce Housing', 'PFC Structures'],
        achievements: ['Structured $300M+ in tax-exempt executions', 'Board Member, Dallas HFC'],
      },
    ],
    trackRecord: [
      { project: 'SoGood Phase A', year: 2023, units: 190, irr: '21.5%', type: 'Mixed-Use' },
      { project: 'Hamilton Station Lofts', year: 2021, units: 165, irr: '20.3%', type: 'Multifamily' },
      { project: 'South Side Flats', year: 2020, units: 230, irr: '22.8%', type: 'Multifamily' },
      { project: 'Farmers Market West', year: 2019, units: 210, irr: '19.7%', type: 'Mixed-Use' },
      { project: 'Lamar Urban Lofts', year: 2018, units: 150, irr: '24.0%', type: 'Adaptive Reuse' },
    ],
    references: [
      { firm: 'Frost Bank', relationship: 'Construction Lender', years: '6+' },
      { firm: 'Citi Community Capital', relationship: 'Permanent / Agency Lender', years: '4+' },
      { firm: 'Dallas Housing Finance Corp', relationship: 'PFC Partner', years: '5+' },
    ],
  },
};

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
  fullName: string
): Promise<OnboardResponse> {
  try {
    console.log(`[onboard-borrower] Calling edge function for ${email}...`);
    const { data, error } = await supabaseAdmin.functions.invoke('onboard-borrower', {
      body: { email, password, full_name: fullName },
    });

    if (error) {
      let actualErrorMessage = error.message || String(error);
      
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
    console.error(`[onboard-borrower] Exception for ${email}:`, err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
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

async function createHoqueGlobalMember(orgId: string): Promise<string | null> {
  console.log('[seed] Creating Hoque Global member account...');
  
  const memberEmail = 'info@hoqueglobal.com';
  const memberPassword = 'password';
  const memberName = 'Hoque Global';

  // Check if user already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', memberEmail)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    console.log(`[seed] Hoque Global member already exists: ${memberEmail} (${existingProfile.id})`);
    userId = existingProfile.id;
  } else {
    // Create user via auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: memberEmail,
      password: memberPassword,
      email_confirm: true,
      user_metadata: { full_name: memberName },
    });

    if (authError || !authUser.user) {
      console.error(`[seed] Failed to create Hoque Global member:`, authError);
      return null;
    }

    userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: memberEmail,
        full_name: memberName,
        app_role: 'borrower',
        active_org_id: orgId,
      });

    if (profileError) {
      console.error(`[seed] Failed to create Hoque Global profile:`, profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return null;
    }

    console.log(`[seed] ✅ Created Hoque Global member: ${memberEmail} (${userId})`);
  }

  // Add to org_members as member (not owner)
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
    console.error(`[seed] Failed to add Hoque Global to org:`, memberError);
    return null;
  }

  // Ensure active_org_id is set
  await supabaseAdmin
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('id', userId);

  console.log(`[seed] ✅ Hoque Global member setup complete: ${memberEmail}`);
  return userId;
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

  // Mark any existing active resumes as superseded (project resumes now support versioning)
  await supabaseAdmin
    .from('project_resumes')
    .update({ status: 'superseded' })
    .eq('project_id', projectId)
    .eq('status', 'active');

  // Insert new resume with versioning fields
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('project_resumes')
    .insert({
      project_id: projectId,
      content: hoqueProjectResume as any,
      status: 'active',
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

  // Mark any existing active resumes as superseded (borrower resumes now support versioning)
  await supabaseAdmin
    .from('borrower_resumes')
    .update({ status: 'superseded' })
    .eq('project_id', projectId)
    .eq('status', 'active');

  // Insert new resume with versioning fields
  // version_number will be auto-assigned by trigger
  const { error } = await supabaseAdmin
    .from('borrower_resumes')
    .insert({
      project_id: projectId,
      content: hoqueBorrowerResume as any,
      status: 'active',
      created_by: createdById,
    });

  if (error) {
    console.error(`[seed] Failed to insert borrower resume:`, error);
    return false;
  }

  console.log(`[seed] ✅ Updated borrower resume`);
  return true;
}

async function seedDocuments(
  projectId: string,
  orgId: string,
  uploadedById: string
): Promise<Record<string, string>> {
  console.log(`[seed] Seeding documents for SoGood Apartments...`);

  const documents: Record<string, string> = {};

  // Map actual file names to meaningful document names
  const documentPaths = [
    // Project documents - from context/SoGood and docs/so-good-apartments
    { file: 'Northmarq Hoque Loan Request Package - SoGood - 5.6.25.pdf', name: 'Loan Request Package', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'SoGood 2021_05_18_SoGood.pdf', name: 'SoGood Master Plan - Concept', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'Concept Combined (1).pdf', name: 'Building B - Concept Drawings', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'SoGood Tracts (2).pdf', name: 'Site Plan - SoGood Tracts', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'SoGood Building B - Pro Forma.xlsx', name: 'Building B - Pro Forma', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'SGCMMD - PFC Memorandum (SoGood) 4874-2859-9225 v.2.pdf', name: 'PFC Memorandum - SoGood', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'HB 2071 Summary.pdf', name: 'HB 2071 Summary - PFC Legislation', type: 'PROJECT_DOCS_ROOT' as const },
    
    // Additional documents from docs/so-good-apartments
    { file: 'alta_survey.pdf', name: 'ALTA Survey', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'appraisal_summary.pdf', name: 'Appraisal Summary', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'architectural_plan_abstract.pdf', name: 'Architectural Plan Abstract', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'construction_draw_schedule.xlsx', name: 'Construction Draw Schedule', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'construction_schedule.pdf', name: 'Construction Schedule', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'development_budget.xlsx', name: 'Development Budget', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'geotechnical_report.pdf', name: 'Geotechnical Report', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'images.pdf', name: 'Project Images', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'incentive_agreement.docx', name: 'Incentive Agreement', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'market_study.pdf', name: 'Market Study', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'operating_proforma.xlsx', name: 'Operating Pro Forma', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'phase_1_esa.pdf', name: 'Phase 1 ESA', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'purchase_and_sale_agreement.docx', name: 'Purchase and Sale Agreement', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'regulatory_agreement.docx', name: 'Regulatory Agreement', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'relocation_plan.docx', name: 'Relocation Plan', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'rent_comp_survey.pdf', name: 'Rent Comp Survey', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'rent_roll.xlsx', name: 'Rent Roll', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'sales_comparables.xlsx', name: 'Sales Comparables', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'site_plan_abstract.pdf', name: 'Site Plan Abstract', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'sources_uses.xlsx', name: 'Sources & Uses', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'sponsor_financials.xlsx', name: 'Sponsor Financials', type: 'BORROWER_DOCS_ROOT' as const },
    { file: 'sponsor_org_chart.docx', name: 'Sponsor Org Chart', type: 'BORROWER_DOCS_ROOT' as const },
    { file: 'term_sheet.docx', name: 'Term Sheet', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'title_commitment.docx', name: 'Title Commitment', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'utility_letter.docx', name: 'Utility Letter', type: 'PROJECT_DOCS_ROOT' as const },
    { file: 'zoning_verification_letter.docx', name: 'Zoning Verification Letter', type: 'PROJECT_DOCS_ROOT' as const },
  ];

  // Try to find documents in common locations (prioritize context/SoGood and docs/so-good-apartments)
  const possibleBasePaths = [
    resolve(process.cwd(), '../../context/SoGood'),
    resolve(process.cwd(), '../context/SoGood'),
    resolve(process.cwd(), './docs/so-good-apartments'),
    resolve(process.cwd(), '../docs/so-good-apartments'),
    resolve(process.cwd(), '../../CapMatch-Extra/SoGood'),
    resolve(process.cwd(), '../CapMatch-Extra/SoGood'),
    resolve(process.cwd(), '../SampleLoanPackage/SoGood'),
    resolve(process.cwd(), './hoque-docs'),
    resolve(process.cwd(), '../hoque-docs'),
  ];

  // Check multiple base paths - documents might be in different locations
  const foundBasePaths: string[] = [];
  for (const path of possibleBasePaths) {
    if (existsSync(path)) {
      foundBasePaths.push(path);
      console.log(`[seed] Found document directory: ${path}`);
    }
  }

  if (foundBasePaths.length === 0) {
    console.log(`[seed] ⚠️  No document directory found. Skipping document upload.`);
    console.log(`[seed]    To upload documents, place them in one of:`);
    possibleBasePaths.forEach(p => console.log(`[seed]    - ${p}`));
    return documents;
  }

  // Try to find each document in any of the found base paths
  for (const doc of documentPaths) {
    let filePath: string | null = null;
    let foundInPath: string | null = null;
    
    // Check each found base path for this document
    for (const basePath of foundBasePaths) {
      const testPath = join(basePath, doc.file);
      if (existsSync(testPath)) {
        filePath = testPath;
        foundInPath = basePath;
        break;
      }
    }
    
    if (filePath && foundInPath) {
      // Extract file extension from the actual file path
      const fileExtension = doc.file.split('.').pop()?.toLowerCase();
      // Append extension to the display name so edit button logic works correctly
      const fileNameWithExtension = fileExtension 
        ? `${doc.name}.${fileExtension}`
        : doc.name;
      
      const resourceId = await uploadDocumentToProject(
        projectId,
        orgId,
        filePath,
        fileNameWithExtension,
        doc.type,
        uploadedById
      );
      if (resourceId) {
        documents[doc.name] = resourceId;
      }
    } else {
      console.log(`[seed] ⚠️  Document not found in any directory: ${doc.file}`);
    }
  }

  console.log(`[seed] ✅ Seeded ${Object.keys(documents).length} documents`);
  return documents;
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
  
  // Get document IDs for references
  const loanPackageId = documents['Loan Request Package'];
  const proFormaId = documents['Building B - Pro Forma'];
  const pfcMemoId = documents['PFC Memorandum - SoGood'];
  const conceptDrawingsId = documents['Building B - Concept Drawings'];
  const sitePlanId = documents['Site Plan - SoGood Tracts'];
  const masterPlanId = documents['SoGood Master Plan - Concept'];
  const hb2071Id = documents['HB 2071 Summary - PFC Legislation'];

  // Realistic chat messages about the SoGood Apartments deal
  const messages = [
    // Initial project kickoff
    {
      userId: borrowerId,
      content: `Hi @[Cody Field](user:${advisorId})! Excited to work with you on SoGood Apartments Building B. I've uploaded the @[Loan Request Package](doc:${loanPackageId || ''}) which has all the key details for our 116-unit mixed-use development. This is Building B in the SoGood master plan, located between the Dallas Farmers Market and Deep Ellum.`,
      resourceIds: loanPackageId ? [loanPackageId] : [],
    },
    {
      userId: advisorId,
      content: `Hi team! Thanks for getting everything uploaded. I've reviewed the loan request package - this is a strong deal. The PFC structure with 50% workforce housing is compelling, and having 30,000 SF pre-leased to GSV Holdings is great for lender comfort. What's our timeline for debt marketing?`,
      resourceIds: [],
    },
    {
      userId: borrowerId,
      content: `We're targeting Q1 2025 for debt marketing kickoff. Site control and PFC approval are complete as of July 2024. I've also uploaded the @[SoGood Master Plan - Concept](doc:${masterPlanId || ''}) so you can see how Building B fits into the overall development. Groundbreaking is scheduled for August 2025.`,
      resourceIds: masterPlanId ? [masterPlanId] : [],
    },
    
    // PFC discussion
    {
      userId: advisorId,
      content: `The PFC structure is really going to help with underwriting. I've reviewed the @[PFC Memorandum - SoGood](doc:${pfcMemoId || ''}) - having that tax exemption executed is a huge benefit. That's going to significantly improve NOI and exit value. The @[HB 2071 Summary - PFC Legislation](doc:${hb2071Id || ''}) shows the legislative framework is solid.`,
      resourceIds: [pfcMemoId, hb2071Id].filter(Boolean),
    },
    {
      userId: borrowerId,
      content: `Exactly. The PFC structure through the City of Dallas Housing Finance Corp gives us property tax exemption, which is critical for the workforce housing component. We're targeting 50% of units at ≤80% AMI, which aligns perfectly with the PFC program and makes us eligible for agency lending on the permanent side.`,
      resourceIds: [],
    },
    
    // Financial discussion
    {
      userId: advisorId,
      content: `I've been reviewing the @[Building B - Pro Forma](doc:${proFormaId || ''}) - $18M loan request against $29.8M TDC is 60% LTC, which is reasonable for construction. Your base case shows 17.5% IRR with 44% LTV at stabilization. The partial recourse structure should help with pricing.`,
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
      content: `The location between Farmers Market and Deep Ellum is excellent. I've looked at the @[Site Plan - SoGood Tracts](doc:${sitePlanId || ''}) - the site access from Hickory St and Ferris St works well. The @[Building B - Concept Drawings](doc:${conceptDrawingsId || ''}) show a solid 6-story podium design with good amenity spaces.`,
      resourceIds: [sitePlanId, conceptDrawingsId].filter(Boolean),
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
          content: `Setting up a dedicated thread for construction updates. Our GC is lined up and ready to break ground in August 2025. Key milestone: topping out by November 2026. The @[Building B - Concept Drawings](doc:${conceptDrawingsId || ''}) show the full scope - 6-story podium with structured parking.`,
          resourceIds: conceptDrawingsId ? [conceptDrawingsId] : [],
        },
        {
          userId: advisorId,
          content: `Good idea to have a separate thread. Lenders will want regular construction updates. Are you planning monthly progress reports? Also, I noticed the @[Site Plan - SoGood Tracts](doc:${sitePlanId || ''}) shows good site access - that should help with construction logistics.`,
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
          content: `Starting lender outreach thread. I'm identifying potential lenders who specialize in: 1) Mixed-use construction, 2) PFC/tax-exempt structures, 3) Workforce housing. The @[Loan Request Package](doc:${loanPackageId || ''}) is comprehensive - I'll use this for initial outreach. Target list coming next week.`,
          resourceIds: loanPackageId ? [loanPackageId] : [],
        },
        {
          userId: borrowerId,
          content: `Thanks! We have existing relationships with Frost Bank and Citi Community Capital. Should we prioritize those or cast a wider net? The @[PFC Memorandum - SoGood](doc:${pfcMemoId || ''}) details the tax exemption structure which should be attractive to lenders.`,
          resourceIds: pfcMemoId ? [pfcMemoId] : [],
        },
        {
          userId: advisorId,
          content: `Let's leverage those relationships but also expand. Given the deal size ($18M) and structure, there are several regional banks and specialty lenders who'd be competitive. The PFC structure is a key selling point - having that tax exemption executed removes a lot of execution risk. I'll coordinate initial outreach and prioritize lenders familiar with PFC deals.`,
          resourceIds: [],
        },
        {
          userId: borrowerId,
          content: `Sounds good. The @[Building B - Pro Forma](doc:${proFormaId || ''}) shows strong returns - 17.5% base case IRR with multiple exit scenarios. That should help with lender underwriting.`,
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

    // 3. Create storage folder
    const { error: storageError } = await supabaseAdmin.storage
      .from(ownerOrgId)
      .upload(`${projectId}/.placeholder`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain;charset=UTF-8',
      });

    if (storageError && !storageError.message?.toLowerCase().includes('already exists')) {
      console.warn(`[seed] Warning: Storage folder creation failed (non-critical):`, storageError.message);
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

    // Step 2.5: Create Hoque Global as a member (not owner)
    console.log('\n📋 Step 2.5: Creating Hoque Global member account...');
    const hoqueGlobalMemberId = await createHoqueGlobalMember(borrowerOrgId);
    if (!hoqueGlobalMemberId) {
      console.warn('[seed] ⚠️  Failed to create Hoque Global member (continuing anyway)');
    }

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
    console.log('\n📋 Step 4.5: Seeding OM data...');
    const { error: omError } = await supabaseAdmin
      .from('om')
      .upsert(
        {
          project_id: projectId,
          content: hoqueProjectResume as any, // OM uses same content as project resume
        },
        { onConflict: 'project_id' }
      );

    if (omError) {
      console.warn(`[seed] ⚠️  Failed to seed OM data:`, omError.message);
    } else {
      console.log(`[seed] ✅ Seeded OM data`);
    }

    // Step 5: Seed documents
    console.log('\n📋 Step 5: Seeding documents...');
    const documents = await seedDocuments(projectId, borrowerOrgId, borrowerId);

    // Step 6: Seed team members
    console.log('\n📋 Step 6: Seeding team members...');
    const memberIds = await seedTeamMembers(projectId, borrowerOrgId, borrowerId);
    
    // Add Hoque Global member to the project if it was created
    if (hoqueGlobalMemberId) {
      memberIds.push(hoqueGlobalMemberId);
      // Grant project access to Hoque Global member
      await grantMemberProjectAccess(projectId, hoqueGlobalMemberId, borrowerId);
    }

    // Step 7: Seed chat messages
    console.log('\n📋 Step 7: Seeding chat messages...');
    await seedChatMessages(projectId, advisorId, borrowerId, memberIds, documents);

    // Summary
    console.log('\n✅ Hoque (SoGood Apartments) complete account seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Advisor: cody.field@capmatch.com (password: password)`);
    console.log(`   Project Owner: param.vora@capmatch.com (password: password)`);
    console.log(`   Hoque Global Member: info@hoqueglobal.com (password: password)`);
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
    const hoqueGlobalEmail = 'info@hoqueglobal.com';
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

    // Step 4: Delete Hoque Global member (but keep borrower account - shared with demo script)
    console.log('\n📋 Step 4: Deleting Hoque Global member...');
    try {
      const { data: hoqueProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', hoqueGlobalEmail)
        .maybeSingle();

      if (hoqueProfile) {
        // Remove from org_members
        await supabaseAdmin
          .from('org_members')
          .delete()
          .eq('user_id', hoqueProfile.id);
        
        // Delete project access
        await supabaseAdmin
          .from('project_access_grants')
          .delete()
          .eq('user_id', hoqueProfile.id);
        
        // Delete permissions
        await supabaseAdmin
          .from('permissions')
          .delete()
          .eq('user_id', hoqueProfile.id);
        
        // Delete chat participants
        await supabaseAdmin
          .from('chat_thread_participants')
          .delete()
          .eq('user_id', hoqueProfile.id);
        
        // Delete user
        await supabaseAdmin.auth.admin.deleteUser(hoqueProfile.id);
        console.log(`[cleanup] ✅ Deleted Hoque Global member: ${hoqueGlobalEmail}`);
      }
    } catch (err) {
      console.warn(`[cleanup] Could not delete Hoque Global member:`, err);
    }

    // Step 5: Skip advisor cleanup (advisor is shared with demo script)
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

