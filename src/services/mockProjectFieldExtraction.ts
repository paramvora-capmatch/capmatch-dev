// src/services/mockProjectFieldExtraction.ts
/**
 * Mock API service for project field extraction
 * Returns field values in section-wise format matching backend API
 */

import { SourceMetadata } from '@/types/source-metadata';

/**
 * Section-wise field extraction response structure
 * Each section contains fields with their extraction data
 */
export interface SectionWiseExtractionResponse {
  [sectionId: string]: {
    [fieldId: string]: {
      value: any;
      sources: SourceMetadata[];
      warnings: string[];
      original_value?: any;
    };
  };
}

/**
 * Helper function to convert source string to SourceMetadata
 */
function createSourceMetadata(source: string): SourceMetadata {
  const normalized = source.toLowerCase();
  
  // User Input
  if (normalized === "user input" || normalized === "user_input") {
    return { type: "user_input" };
  }
  
  // Derived sources (calculations, extractions)
  const derivedPatterns = [
    "extract from address", "sum of", "nrsf / units", "spaces / units",
    "loan / value", "loan / tdc", "noi /", "egi -", "trended /", "untrended /",
    "geo-calc", "stress calc"
  ];
  if (derivedPatterns.some(pattern => normalized.includes(pattern))) {
    return {
      type: "derived",
      name: source,
      derivation: source,
    };
  }
  
  // External APIs
  const externalPatterns = ["api", "walk score", "census acs", "us treasury", "nps cert", "cdfi fund", "city gis"];
  if (externalPatterns.some(pattern => normalized.includes(pattern))) {
    return {
      type: "external",
      name: source,
    };
  }
  
  // Document sources (default)
  return {
    type: "document",
    name: source,
  };
}

/**
 * Mock extraction API for project resumes
 * Returns project field values with realistic data in section-wise format
 * Uses structured SourceMetadata format
 */
export const extractProjectFields = async (
  projectId: string,
  documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Helper to create field data
  const createField = (value: any, source: string, warnings: string[] = []): {
    value: any;
    sources: SourceMetadata[];
    warnings: string[];
    original_value: any;
  } => ({
    value,
    sources: [createSourceMetadata(source)],
    warnings,
    original_value: value,
  });

  // Return project field extraction results in section-wise format
  // Format: { section_1: { fieldId: { value, sources, warnings, original_value } } }
  const sectionWiseFields: SectionWiseExtractionResponse = {
    section_1: {
      // Basic Info - Project Identification
      projectName: createField(null, "User Input"),
      assetType: createField(null, "User Input"),
      projectStatus: createField(null, "User Input"),
      propertyAddressStreet: createField(null, "User Input"),
      propertyAddressCity: createField("Dallas", "Extract from Address"),
      propertyAddressState: createField("TX", "Extract from Address"),
      propertyAddressZip: createField("75215", "Extract from Address"),
      propertyAddressCounty: createField("Dallas County", "Title Commitment"),
      parcelNumber: createField("R-12345-67890, R-12345-67891", "ALTA Survey"),
      zoningDesignation: createField("MU-3", "Zoning Letter"),
      currentZoning: createField("MU-3", "Zoneomics API"),
      expectedZoningChanges: createField(null, "User Input"),
      projectType: createField(null, "User Input"),
      primaryAssetClass: createField(null, "User Input"),
      constructionType: createField("Ground-Up", "Arch Plans"),
      projectPhase: createField(null, "User Input"),
      groundbreakingDate: createField("2025-08-01", "Construction Schedule"),
      completionDate: createField("2027-09-30", "Construction Schedule"),
      totalDevelopmentCost: createField(29807800, "Sum of Budget"),
      loanAmountRequested: createField(18000000, "Sources & Uses"),
      loanType: createField(null, "User Input"),
      requestedLoanTerm: createField("2 years", "Term Sheet"),
      masterPlanName: createField("SoGood Master Planned Development", "Marketing Brochure"),
      phaseNumber: createField("Building B", "Site Plan"),
      syndicationStatus: createField("Committed", "Equity Commitment"),
      guarantorNames: createField(null, "User Input"),
      projectDescription: createField(null, "User Input"),
    },
    section_2: {
      // Property Specifications
      totalResidentialUnits: createField(116, "Sum of Unit Mix"),
      totalResidentialNRSF: createField(59520, "Sum of Unit SF"),
      averageUnitSize: createField(513, "NRSF / Units"),
      totalCommercialGRSF: createField(49569, "Arch Plans"),
      grossBuildingArea: createField(127406, "Arch Plans"),
      numberOfStories: createField(6, "Elevations"),
      buildingType: createField("Mid-rise", "Arch Plans"),
      parkingSpaces: createField(180, "Site Plan"),
      parkingRatio: createField(1.55, "Spaces / Units"),
      parkingType: createField("Structured", "Site Plan"),
      amenityList: createField(["Pool", "Gym", "Coworking", "Rooftop Deck"], "Arch Plans"),
      amenitySF: createField(8500, "Sum of Areas"),
      adaCompliantUnitsPercent: createField(5.0, "Arch Plans"),
      leedSustainabilityRating: createField("Pending", "Arch Plans"),
      residentialUnitMix: createField([
        {
          unitType: "Studio S1",
          unitCount: 12,
          avgSF: 450,
          monthlyRent: 1200,
          totalSF: 5400,
          percentOfTotal: 10.3,
          affordabilityStatus: "Market Rate",
          affordableUnitsCount: 0,
          amiTargetPercent: null,
          rentBumpSchedule: "$2.67 to $2.89",
        },
        {
          unitType: "1BR A1",
          unitCount: 46,
          avgSF: 550,
          monthlyRent: 1500,
          totalSF: 25300,
          percentOfTotal: 39.7,
          affordabilityStatus: "Affordable @ 80% AMI",
          affordableUnitsCount: 23,
          amiTargetPercent: 80,
          rentBumpSchedule: "$2.73 to $3.15",
        },
        {
          unitType: "2BR B1",
          unitCount: 58,
          avgSF: 990,
          monthlyRent: 2200,
          totalSF: 57420,
          percentOfTotal: 50.0,
          affordabilityStatus: "Affordable @ 80% AMI",
          affordableUnitsCount: 29,
          amiTargetPercent: 80,
          rentBumpSchedule: "$2.22 to $2.56",
        },
      ], "Arch Plans"),
      commercialSpaceMix: createField([
        {
          spaceType: "Retail",
          squareFootage: 19669,
          tenant: "GSV Holdings",
          leaseTerm: "10 years",
          annualRent: 590070,
          tiAllowance: 500000,
        },
        {
          spaceType: "Office",
          squareFootage: 29900,
          tenant: null,
          leaseTerm: null,
          annualRent: null,
          tiAllowance: null,
        },
      ], "Arch Plans"),
    },
    section_3: {
      // Development Budget & Financial Details
      landAcquisition: createField(3500000, "Purchase Agmt"),
      baseConstruction: createField(18500000, "Budget"),
      contingency: createField(925000, "Budget"),
      ffe: createField(450000, "Budget"),
      constructionFees: createField(1200000, "Budget"),
      aeFees: createField(850000, "Budget"),
      thirdPartyReports: createField(125000, "Budget"),
      legalAndOrg: createField(200000, "Budget"),
      titleAndRecording: createField(75000, "Budget"),
      taxesDuringConstruction: createField(150000, "Budget"),
      workingCapital: createField(300000, "Budget"),
      developerFee: createField(1192312, "Budget"),
      pfcStructuringFee: createField(250000, "Budget"),
      loanFees: createField(360000, "Budget"),
      interestReserve: createField(1800000, "Budget"),
      relocationCosts: createField(0, "Relocation Plan"),
      syndicationCosts: createField(238000, "Equity Commit"),
      enviroRemediation: createField(0, "Phase II ESA"),
      // Sources of Funds
      seniorLoanAmount: createField(18000000, "Sources & Uses"),
      sponsorEquity: createField(11807800, "Sources & Uses"),
      taxCreditEquity: createField(0, "Equity Commit"),
      gapFinancing: createField(0, "Sources & Uses"),
      // Loan Terms
      interestRate: createField(6.5, "Term Sheet"),
      underwritingRate: createField(8.5, "Term Sheet"),
      amortization: createField("IO", "Term Sheet"),
      prepaymentTerms: createField("No prepayment penalty after year 1", "Term Sheet"),
      recourse: createField("Full Recourse", "Term Sheet"),
      permTakeoutPlanned: createField(true, "Term Sheet"),
      allInRate: createField(7.2, "Term Sheet"),
      // Legacy Financial Fields
      targetLtvPercent: createField(43.7, "Loan / Value"),
      targetLtcPercent: createField(60.4, "Loan / TDC"),
      amortizationYears: createField(30, "Term Sheet"),
      interestOnlyPeriodMonths: createField(24, "Term Sheet"),
      interestRateType: createField("Fixed", "Term Sheet"),
      targetCloseDate: createField("2024-12-15", "Term Sheet"),
      useOfProceeds: createField("Construction financing for ground-up development of 116-unit mixed-use project", "Term Sheet"),
      recoursePreference: createField("Full Recourse", "Term Sheet"),
      purchasePrice: createField(3500000, "Purchase Agmt"),
      totalProjectCost: createField(29807800, "Sum of Budget"),
      capexBudget: createField(450000, "Budget"),
      propertyNoiT12: createField(0, "N/A - New Construction"),
      stabilizedNoiProjected: createField(2268000, "Proforma"),
      exitStrategy: createField("Hold for long-term cash flow, potential sale after stabilization at 5-7 year mark", "Business Plan"),
      businessPlanSummary: createField("Develop and operate a high-quality mixed-use property in the rapidly growing Deep Ellum submarket. Target market-rate and affordable units (80% AMI) with strong retail and office components. Projected stabilization within 18 months of first occupancy.", "Business Plan"),
      marketOverviewSummary: createField("Deep Ellum/Farmers Market submarket is experiencing strong population growth (12.5% 2010-2020, 8.3% projected 2024-2029) with high renter occupancy (68.5%). The area benefits from proximity to downtown Dallas employment centers, excellent walkability (Walk Score 85), and upcoming infrastructure improvements including DART Rail Extension.", "Market Study"),
      equityCommittedPercent: createField(39.6, "Equity Commit"),
      internalAdvisorNotes: createField("Strong sponsor with proven track record. Project benefits from tax abatement and affordable housing incentives. Market fundamentals are solid with strong absorption projections.", "Advisor Notes"),
      // Operating Expenses
      realEstateTaxes: createField(450000, "Proforma"),
      insurance: createField(125000, "Proforma"),
      utilities: createField(180000, "Proforma"),
      repairsAndMaintenance: createField(95000, "Proforma"),
      managementFee: createField(113400, "Proforma"),
      generalAndAdmin: createField(75000, "Proforma"),
      payroll: createField(120000, "Proforma"),
      reserves: createField(29000, "Proforma"),
      marketingLeasing: createField(68040, "Proforma"),
      serviceCoordination: createField(0, "Proforma"),
      // Investment Metrics
      noiYear1: createField(2268000, "EGI - Total Exp"),
      yieldOnCost: createField(7.6, "NOI / TDC"),
      capRate: createField(5.5, "Appraisal"),
      stabilizedValue: createField(41200000, "NOI / Cap Rate"),
      ltv: createField(43.7, "Loan / Value"),
      debtYield: createField(12.6, "NOI / Loan"),
      dscr: createField(1.25, "NOI / Debt Svc"),
      trendedNOIYear1: createField(2313360, "Proforma"),
      untrendedNOIYear1: createField(2222640, "Proforma"),
      trendedYield: createField(7.76, "Trended / TDC"),
      untrendedYield: createField(7.45, "Untrended / TDC"),
      inflationAssumption: createField(2.0, "Proforma"),
      dscrStressTest: createField(1.08, "Stress Calc"),
      portfolioLTV: createField(65.0, "Sponsor FS"),
    },
    section_4: {
      // Market Context
      submarketName: createField("Deep Ellum / Farmers Market", "Market Study"),
      distanceToCBD: createField(1.2, "Geo-calc"),
      distanceToEmployment: createField("0.5 miles to Downtown Dallas", "Market Study"),
      distanceToTransit: createField(0.3, "Geo-calc"),
      walkabilityScore: createField(85, "Walk Score"),
      population3Mi: createField(125000, "Census ACS"),
      popGrowth201020: createField(12.5, "Census ACS"),
      projGrowth202429: createField(8.3, "Census ACS"),
      medianHHIncome: createField(62500, "Census ACS"),
      renterOccupiedPercent: createField(68.5, "Census ACS"),
      bachelorsDegreePercent: createField(42.3, "Census ACS"),
      absorptionRate: createField(12, "Market Study"),
      penetrationRate: createField(2.1, "Market Study"),
      northStarComp: createField(null, "User Input"),
      infrastructureProject: createField("DART Rail Extension", "Market Study"),
      projectBudget: createField(250000000, "Market Study"),
      infraCompletion: createField("2026", "Market Study"),
      rentComps: createField([
        {
          propertyName: "The Alexan Deep Ellum",
          address: "2800 Commerce St, Dallas, TX 75226",
          distance: 0.4,
          yearBuilt: 2019,
          totalUnits: 245,
          occupancyPercent: 95.5,
          avgRentMonth: 1850,
          rentPSF: 3.36,
          concessions: "1 month free",
        },
        {
          propertyName: "The Brady",
          address: "2600 Main St, Dallas, TX 75226",
          distance: 0.6,
          yearBuilt: 2020,
          totalUnits: 180,
          occupancyPercent: 97.2,
          avgRentMonth: 1950,
          rentPSF: 3.55,
          concessions: "None",
        },
      ], "Market Study"),
      saleComps: createField([
        {
          propertyName: "The Alexan Deep Ellum",
          salePricePerUnit: 355000,
          capRate: 5.2,
          saleDate: "2023-06-15",
        },
        {
          propertyName: "The Brady",
          salePricePerUnit: 365000,
          capRate: 5.4,
          saleDate: "2023-09-20",
        },
      ], "Appraisal"),
    },
    section_5: {
      // Special Considerations
      opportunityZone: createField(false, "US Treasury"),
      affordableHousing: createField(true, "Reg Agreement"),
      affordableUnitsNumber: createField(58, "Reg Agreement"),
      amiTargetPercent: createField(80, "Reg Agreement"),
      taxExemption: createField(true, "Incentive Agmt"),
      exemptionStructure: createField("PFC", "Incentive Agmt"),
      sponsoringEntity: createField("SoGood MMD", "Incentive Agmt"),
      structuringFee: createField(250000, "Budget"),
      exemptionTerm: createField(15, "Incentive Agmt"),
      incentiveStacking: createField(["LIHTC", "Section 8"], "Incentive Agmt"),
      tifDistrict: createField(false, "City GIS"),
      taxAbatement: createField(true, "Incentive Agmt"),
      paceFinancing: createField(null, "User Input"),
      historicTaxCredits: createField(false, "NPS Cert"),
      newMarketsCredits: createField(false, "CDFI Fund"),
      relocationPlan: createField("N/A", "Relocation Plan"),
      seismicPMLRisk: createField("2.5% PML", "Eng Report"),
    },
    section_6: {
      // Timeline & Milestones
      landAcqClose: createField("2024-12-15", "Settlement Stmt"),
      entitlements: createField("Approved", "Zoning Letter"),
      finalPlans: createField("Approved", "Arch Contract"),
      permitsIssued: createField("Issued", "Building Permits"),
      verticalStart: createField("2025-10-01", "Schedule"),
      substantialComp: createField("2027-08-15", "Schedule"),
      firstOccupancy: createField("2027-10-15", "Schedule"),
      stabilization: createField("2028-03-31", "Proforma"),
      preLeasedSF: createField(19669, "Lease Agmt"),
      drawSchedule: createField([
        { drawNumber: 1, percentComplete: 10, amount: 1800000 },
        { drawNumber: 2, percentComplete: 25, amount: 2700000 },
        { drawNumber: 3, percentComplete: 50, amount: 3600000 },
        { drawNumber: 4, percentComplete: 75, amount: 3600000 },
        { drawNumber: 5, percentComplete: 100, amount: 6300000 },
      ], "Const Contract"),
      absorptionProjection: createField(12, "Market Study"),
      opDeficitEscrow: createField(650000, "6 Mos OpEx"),
      leaseUpEscrow: createField(1300000, "6-12 Mos"),
    },
    section_7: {
      // Site & Context
      totalSiteAcreage: createField(2.85, "ALTA Survey"),
      currentSiteStatus: createField("Vacant", "Phase I ESA"),
      topography: createField("Flat", "Survey"),
      environmental: createField("Clean", "Phase I ESA"),
      utilities: createField("Available", "Civil Plans"),
      utilityCapacity: createField("Water: 500 GPM available, Sewer: 600 GPM capacity", "Civil Plans"),
      geotechSoilsRep: createField("Suitable bearing capacity, no special foundation requirements", "Soils Report"),
      floodZone: createField("Zone X", "ALTA Survey"),
      siteAccess: createField("Primary access from Hickory St, secondary from Commerce St", "Civil Plans"),
      proximityShopping: createField("0.2 miles to Deep Ellum retail district", "Market Study"),
      proximityRestaurants: createField("0.1 miles to multiple restaurants and cafes", "Market Study"),
      proximityParks: createField("0.3 miles to Farmers Market Park", "Market Study"),
      proximitySchools: createField("0.5 miles to elementary school, 1.2 miles to high school", "Market Study"),
      proximityHospitals: createField("1.5 miles to Baylor University Medical Center", "Market Study"),
      topEmployers: createField("Downtown Dallas (0.5 mi), Deep Ellum tech companies (0.3 mi)", "Market Study"),
    },
    section_8: {
      // Sponsor Information
      sponsorEntityName: createField("Hoque Global", "Org Chart"),
      sponsorStructure: createField("General Partner", "Org Chart"),
      equityPartner: createField("ACARA", "Org Chart"),
      contactInfo: createField(null, "User Input"),
      sponsorExpScore: createField(8, "Prior Units"),
      priorDevelopments: createField(null, "User Input"),
      netWorth: createField(45000000, "Financials"),
      guarantorLiquidity: createField(2500000, "Guarantor FS"),
      portfolioDSCR: createField(1.35, "Sponsor FS"),
    },
  };
  
  return sectionWiseFields;
};

/**
 * Extract fields for a specific section
 */
export const extractProjectFieldsBySection = async (
  projectId: string,
  sectionId: string,
  documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Get all fields
  const allFields = await extractProjectFields(projectId, documentPaths);

  // Return only the requested section
  return {
    [sectionId]: allFields[sectionId] || {},
  };
};
