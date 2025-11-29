// src/services/mockProjectFieldExtraction.ts
/**
 * Mock API service for project field extraction
 * Returns field values in the same format as the backend extraction API
 * This simulates what the backend would return after extracting data from documents
 */

export interface ExtractedFieldValue {
  value: any;
  source?: string | null;
  warnings?: string[];
}

export interface ProjectFieldExtractionResponse {
  [fieldId: string]: ExtractedFieldValue | any;
}

/**
 * Mock extraction API that returns all project fields with realistic values
 * Based on SoGood Apartments project data
 */
export const extractProjectFields = async (
  projectId: string,
  documentPaths?: string[]
): Promise<ProjectFieldExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return comprehensive field extraction results
  // Format matches backend: { fieldId: { value, source, warnings } } or flat { fieldId: value }
  // Fields with "User Input" source are left empty (null/empty string) as they can't be filled by AI
  const rawFields: ProjectFieldExtractionResponse = {
    // Section 1: Project Identification & Basic Info
    projectName: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    assetType: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    projectStatus: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    propertyAddressStreet: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    propertyAddressCity: {
      value: "Dallas",
      source: "Extract from Address",
      warnings: [],
    },
    propertyAddressState: {
      value: "TX",
      source: "Extract from Address",
      warnings: [],
    },
    propertyAddressZip: {
      value: "75215",
      source: "Extract from Address",
      warnings: [],
    },
    propertyAddressCounty: {
      value: "Dallas County",
      source: "Title Commitment",
      warnings: [],
    },
    parcelNumber: {
      value: "R-12345-67890, R-12345-67891",
      source: "ALTA Survey",
      warnings: [],
    },
    zoningDesignation: {
      value: "MU-3",
      source: "Zoning Letter",
      warnings: [],
    },
    currentZoning: {
      value: "MU-3",
      source: "Zoneomics API",
      warnings: [],
    },
    expectedZoningChanges: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    projectType: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    primaryAssetClass: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    constructionType: {
      value: "Ground-Up",
      source: "Arch Plans",
      warnings: [],
    },
    projectPhase: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    groundbreakingDate: {
      value: "2025-08-01",
      source: "Construction Schedule",
      warnings: [],
    },
    completionDate: {
      value: "2027-09-30",
      source: "Construction Schedule",
      warnings: [],
    },
    totalDevelopmentCost: {
      value: 29807800,
      source: "Sum of Budget",
      warnings: [],
    },
    loanAmountRequested: {
      value: 18000000,
      source: "Sources & Uses",
      warnings: [],
    },
    loanType: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    requestedLoanTerm: {
      value: "2 years",
      source: "Term Sheet",
      warnings: [],
    },
    masterPlanName: {
      value: "SoGood Master Planned Development",
      source: "Marketing Brochure",
      warnings: [],
    },
    phaseNumber: {
      value: "Building B",
      source: "Site Plan",
      warnings: [],
    },
    syndicationStatus: {
      value: "Committed",
      source: "Equity Commitment",
      warnings: [],
    },
    guarantorNames: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    projectDescription: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },

    // Section 2: Property Specifications
    totalResidentialUnits: {
      value: 116,
      source: "Sum of Unit Mix",
      warnings: [],
    },
    totalResidentialNRSF: {
      value: 59520,
      source: "Sum of Unit SF",
      warnings: [],
    },
    averageUnitSize: {
      value: 513,
      source: "NRSF / Units",
      warnings: [],
    },
    totalCommercialGRSF: {
      value: 49569,
      source: "Arch Plans",
      warnings: [],
    },
    grossBuildingArea: {
      value: 127406,
      source: "Arch Plans",
      warnings: [],
    },
    numberOfStories: {
      value: 6,
      source: "Elevations",
      warnings: [],
    },
    buildingType: {
      value: "Mid-rise",
      source: "Arch Plans",
      warnings: [],
    },
    parkingSpaces: {
      value: 180,
      source: "Site Plan",
      warnings: [],
    },
    parkingRatio: {
      value: 1.55,
      source: "Spaces / Units",
      warnings: [],
    },
    parkingType: {
      value: "Structured",
      source: "Site Plan",
      warnings: [],
    },
    amenityList: {
      value: ["Pool", "Gym", "Coworking", "Rooftop Deck"],
      source: "Arch Plans",
      warnings: [],
    },
    amenitySF: {
      value: 8500,
      source: "Sum of Areas",
      warnings: [],
    },
    adaCompliantUnitsPercent: {
      value: 5.0,
      source: "Arch Plans",
      warnings: [],
    },
    leedSustainabilityRating: {
      value: "Pending",
      source: "Arch Plans",
      warnings: [],
    },

    // Section 2.1: Residential Unit Mix
    residentialUnitMix: {
      value: [
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
      ],
      source: "Arch Plans",
      warnings: [],
    },

    // Section 2.2: Commercial Space Mix
    commercialSpaceMix: {
      value: [
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
      ],
      source: "Arch Plans",
      warnings: [],
    },

    // Section 3.1: Development Budget
    landAcquisition: {
      value: 3500000,
      source: "Purchase Agmt",
      warnings: [],
    },
    baseConstruction: {
      value: 18500000,
      source: "Budget",
      warnings: [],
    },
    contingency: {
      value: 925000,
      source: "Budget",
      warnings: [],
    },
    ffe: {
      value: 450000,
      source: "Budget",
      warnings: [],
    },
    constructionFees: {
      value: 1200000,
      source: "Budget",
      warnings: [],
    },
    aeFees: {
      value: 850000,
      source: "Budget",
      warnings: [],
    },
    thirdPartyReports: {
      value: 125000,
      source: "Budget",
      warnings: [],
    },
    legalAndOrg: {
      value: 200000,
      source: "Budget",
      warnings: [],
    },
    titleAndRecording: {
      value: 75000,
      source: "Budget",
      warnings: [],
    },
    taxesDuringConstruction: {
      value: 150000,
      source: "Budget",
      warnings: [],
    },
    workingCapital: {
      value: 300000,
      source: "Budget",
      warnings: [],
    },
    developerFee: {
      value: 1192312,
      source: "Budget",
      warnings: [],
    },
    pfcStructuringFee: {
      value: 250000,
      source: "Budget",
      warnings: [],
    },
    loanFees: {
      value: 360000,
      source: "Budget",
      warnings: [],
    },
    interestReserve: {
      value: 1800000,
      source: "Budget",
      warnings: [],
    },
    relocationCosts: {
      value: 0,
      source: "Relocation Plan",
      warnings: [],
    },
    syndicationCosts: {
      value: 238000,
      source: "Equity Commit",
      warnings: [],
    },
    enviroRemediation: {
      value: 0,
      source: "Phase II ESA",
      warnings: [],
    },

    // Section 3.2: Sources of Funds
    seniorLoanAmount: {
      value: 18000000,
      source: "Sources & Uses",
      warnings: [],
    },
    sponsorEquity: {
      value: 11807800,
      source: "Sources & Uses",
      warnings: [],
    },
    taxCreditEquity: {
      value: 0,
      source: "Equity Commit",
      warnings: [],
    },
    gapFinancing: {
      value: 0,
      source: "Sources & Uses",
      warnings: [],
    },

    // Section 3.3: Loan Terms
    interestRate: {
      value: 6.5,
      source: "Term Sheet",
      warnings: [],
    },
    underwritingRate: {
      value: 8.5,
      source: "Term Sheet",
      warnings: [],
    },
    amortization: {
      value: "IO",
      source: "Term Sheet",
      warnings: [],
    },
    prepaymentTerms: {
      value: "No prepayment penalty after year 1",
      source: "Term Sheet",
      warnings: [],
    },
    recourse: {
      value: "Full Recourse",
      source: "Term Sheet",
      warnings: [],
    },
    permTakeoutPlanned: {
      value: true,
      source: "Term Sheet",
      warnings: [],
    },
    allInRate: {
      value: 7.2,
      source: "Term Sheet",
      warnings: [],
    },

    // Legacy Financial Fields
    targetLtvPercent: {
      value: 43.7,
      source: "Loan / Value",
      warnings: [],
    },
    targetLtcPercent: {
      value: 60.4,
      source: "Loan / TDC",
      warnings: [],
    },
    amortizationYears: {
      value: 30,
      source: "Term Sheet",
      warnings: [],
    },
    interestOnlyPeriodMonths: {
      value: 24,
      source: "Term Sheet",
      warnings: [],
    },
    interestRateType: {
      value: "Fixed",
      source: "Term Sheet",
      warnings: [],
    },
    targetCloseDate: {
      value: "2024-12-15",
      source: "Term Sheet",
      warnings: [],
    },
    useOfProceeds: {
      value: "Construction financing for ground-up development of 116-unit mixed-use project",
      source: "Term Sheet",
      warnings: [],
    },
    recoursePreference: {
      value: "Full Recourse",
      source: "Term Sheet",
      warnings: [],
    },
    purchasePrice: {
      value: 3500000,
      source: "Purchase Agmt",
      warnings: [],
    },
    totalProjectCost: {
      value: 29807800,
      source: "Sum of Budget",
      warnings: [],
    },
    capexBudget: {
      value: 450000,
      source: "Budget",
      warnings: [],
    },
    propertyNoiT12: {
      value: 0,
      source: "N/A - New Construction",
      warnings: [],
    },
    stabilizedNoiProjected: {
      value: 2268000,
      source: "Proforma",
      warnings: [],
    },
    exitStrategy: {
      value: "Hold for long-term cash flow, potential sale after stabilization at 5-7 year mark",
      source: "Business Plan",
      warnings: [],
    },
    businessPlanSummary: {
      value: "Develop and operate a high-quality mixed-use property in the rapidly growing Deep Ellum submarket. Target market-rate and affordable units (80% AMI) with strong retail and office components. Projected stabilization within 18 months of first occupancy.",
      source: "Business Plan",
      warnings: [],
    },
    marketOverviewSummary: {
      value: "Deep Ellum/Farmers Market submarket is experiencing strong population growth (12.5% 2010-2020, 8.3% projected 2024-2029) with high renter occupancy (68.5%). The area benefits from proximity to downtown Dallas employment centers, excellent walkability (Walk Score 85), and upcoming infrastructure improvements including DART Rail Extension.",
      source: "Market Study",
      warnings: [],
    },
    equityCommittedPercent: {
      value: 39.6,
      source: "Equity Commit",
      warnings: [],
    },
    internalAdvisorNotes: {
      value: "Strong sponsor with proven track record. Project benefits from tax abatement and affordable housing incentives. Market fundamentals are solid with strong absorption projections.",
      source: "Advisor Notes",
      warnings: [],
    },

    // Section 3.5: Operating Expenses
    realEstateTaxes: {
      value: 450000,
      source: "Proforma",
      warnings: [],
    },
    insurance: {
      value: 125000,
      source: "Proforma",
      warnings: [],
    },
    utilities: {
      value: 180000,
      source: "Proforma",
      warnings: [],
    },
    repairsAndMaintenance: {
      value: 95000,
      source: "Proforma",
      warnings: [],
    },
    managementFee: {
      value: 113400,
      source: "Proforma",
      warnings: [],
    },
    generalAndAdmin: {
      value: 75000,
      source: "Proforma",
      warnings: [],
    },
    payroll: {
      value: 120000,
      source: "Proforma",
      warnings: [],
    },
    reserves: {
      value: 29000,
      source: "Proforma",
      warnings: [],
    },
    marketingLeasing: {
      value: 68040,
      source: "Proforma",
      warnings: [],
    },
    serviceCoordination: {
      value: 0,
      source: "Proforma",
      warnings: [],
    },

    // Section 3.6: Investment Metrics
    noiYear1: {
      value: 2268000,
      source: "EGI - Total Exp",
      warnings: [],
    },
    yieldOnCost: {
      value: 7.6,
      source: "NOI / TDC",
      warnings: [],
    },
    capRate: {
      value: 5.5,
      source: "Appraisal",
      warnings: [],
    },
    stabilizedValue: {
      value: 41200000,
      source: "NOI / Cap Rate",
      warnings: [],
    },
    ltv: {
      value: 43.7,
      source: "Loan / Value",
      warnings: [],
    },
    debtYield: {
      value: 12.6,
      source: "NOI / Loan",
      warnings: [],
    },
    dscr: {
      value: 1.25,
      source: "NOI / Debt Svc",
      warnings: [],
    },
    trendedNOIYear1: {
      value: 2313360,
      source: "Proforma",
      warnings: [],
    },
    untrendedNOIYear1: {
      value: 2222640,
      source: "Proforma",
      warnings: [],
    },
    trendedYield: {
      value: 7.76,
      source: "Trended / TDC",
      warnings: [],
    },
    untrendedYield: {
      value: 7.45,
      source: "Untrended / TDC",
      warnings: [],
    },
    inflationAssumption: {
      value: 2.0,
      source: "Proforma",
      warnings: [],
    },
    dscrStressTest: {
      value: 1.08,
      source: "Stress Calc",
      warnings: [],
    },
    portfolioLTV: {
      value: 65.0,
      source: "Sponsor FS",
      warnings: [],
    },

    // Section 4: Market Context
    submarketName: {
      value: "Deep Ellum / Farmers Market",
      source: "Market Study",
      warnings: [],
    },
    distanceToCBD: {
      value: 1.2,
      source: "Geo-calc",
      warnings: [],
    },
    distanceToEmployment: {
      value: "0.5 miles to Downtown Dallas",
      source: "Market Study",
      warnings: [],
    },
    distanceToTransit: {
      value: 0.3,
      source: "Geo-calc",
      warnings: [],
    },
    walkabilityScore: {
      value: 85,
      source: "Walk Score",
      warnings: [],
    },
    population3Mi: {
      value: 125000,
      source: "Census ACS",
      warnings: [],
    },
    popGrowth201020: {
      value: 12.5,
      source: "Census ACS",
      warnings: [],
    },
    projGrowth202429: {
      value: 8.3,
      source: "Census ACS",
      warnings: [],
    },
    medianHHIncome: {
      value: 62500,
      source: "Census ACS",
      warnings: [],
    },
    renterOccupiedPercent: {
      value: 68.5,
      source: "Census ACS",
      warnings: [],
    },
    bachelorsDegreePercent: {
      value: 42.3,
      source: "Census ACS",
      warnings: [],
    },
    absorptionRate: {
      value: 12,
      source: "Market Study",
      warnings: [],
    },
    penetrationRate: {
      value: 2.1,
      source: "Market Study",
      warnings: [],
    },
    northStarComp: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    infrastructureProject: {
      value: "DART Rail Extension",
      source: "Market Study",
      warnings: [],
    },
    projectBudget: {
      value: 250000000,
      source: "Market Study",
      warnings: [],
    },
    infraCompletion: {
      value: "2026",
      source: "Market Study",
      warnings: [],
    },

    // Section 4.3: Rent Comps
    rentComps: {
      value: [
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
      ],
      source: "Market Study",
      warnings: [],
    },

    // Section 4.4: Sale Comps
    saleComps: {
      value: [
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
      ],
      source: "Appraisal",
      warnings: [],
    },

    // Section 5: Special Considerations
    opportunityZone: {
      value: false,
      source: "US Treasury",
      warnings: [],
    },
    affordableHousing: {
      value: true,
      source: "Reg Agreement",
      warnings: [],
    },
    affordableUnitsNumber: {
      value: 58,
      source: "Reg Agreement",
      warnings: [],
    },
    amiTargetPercent: {
      value: 80,
      source: "Reg Agreement",
      warnings: [],
    },
    taxExemption: {
      value: true,
      source: "Incentive Agmt",
      warnings: [],
    },
    exemptionStructure: {
      value: "PFC",
      source: "Incentive Agmt",
      warnings: [],
    },
    sponsoringEntity: {
      value: "SoGood MMD",
      source: "Incentive Agmt",
      warnings: [],
    },
    structuringFee: {
      value: 250000,
      source: "Budget",
      warnings: [],
    },
    exemptionTerm: {
      value: 15,
      source: "Incentive Agmt",
      warnings: [],
    },
    incentiveStacking: {
      value: ["LIHTC", "Section 8"],
      source: "Incentive Agmt",
      warnings: [],
    },
    tifDistrict: {
      value: false,
      source: "City GIS",
      warnings: [],
    },
    taxAbatement: {
      value: true,
      source: "Incentive Agmt",
      warnings: [],
    },
    paceFinancing: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    historicTaxCredits: {
      value: false,
      source: "NPS Cert",
      warnings: [],
    },
    newMarketsCredits: {
      value: false,
      source: "CDFI Fund",
      warnings: [],
    },
    relocationPlan: {
      value: "N/A",
      source: "Relocation Plan",
      warnings: [],
    },
    seismicPMLRisk: {
      value: "2.5% PML",
      source: "Eng Report",
      warnings: [],
    },

    // Section 6: Timeline & Milestones
    landAcqClose: {
      value: "2024-12-15",
      source: "Settlement Stmt",
      warnings: [],
    },
    entitlements: {
      value: "Approved",
      source: "Zoning Letter",
      warnings: [],
    },
    finalPlans: {
      value: "Approved",
      source: "Arch Contract",
      warnings: [],
    },
    permitsIssued: {
      value: "Issued",
      source: "Building Permits",
      warnings: [],
    },
    verticalStart: {
      value: "2025-10-01",
      source: "Schedule",
      warnings: [],
    },
    substantialComp: {
      value: "2027-08-15",
      source: "Schedule",
      warnings: [],
    },
    firstOccupancy: {
      value: "2027-10-15",
      source: "Schedule",
      warnings: [],
    },
    stabilization: {
      value: "2028-03-31",
      source: "Proforma",
      warnings: [],
    },
    preLeasedSF: {
      value: 19669,
      source: "Lease Agmt",
      warnings: [],
    },
    drawSchedule: {
      value: [
        { drawNumber: 1, percentComplete: 10, amount: 1800000 },
        { drawNumber: 2, percentComplete: 25, amount: 2700000 },
        { drawNumber: 3, percentComplete: 50, amount: 3600000 },
        { drawNumber: 4, percentComplete: 75, amount: 3600000 },
        { drawNumber: 5, percentComplete: 100, amount: 6300000 },
      ],
      source: "Const Contract",
      warnings: [],
    },
    absorptionProjection: {
      value: 12,
      source: "Market Study",
      warnings: [],
    },
    opDeficitEscrow: {
      value: 650000,
      source: "6 Mos OpEx",
      warnings: [],
    },
    leaseUpEscrow: {
      value: 1300000,
      source: "6-12 Mos",
      warnings: [],
    },

    // Section 7: Site & Context
    totalSiteAcreage: {
      value: 2.85,
      source: "ALTA Survey",
      warnings: [],
    },
    currentSiteStatus: {
      value: "Vacant",
      source: "Phase I ESA",
      warnings: [],
    },
    topography: {
      value: "Flat",
      source: "Survey",
      warnings: [],
    },
    environmental: {
      value: "Clean",
      source: "Phase I ESA",
      warnings: [],
    },
    utilities: {
      value: "Available",
      source: "Civil Plans",
      warnings: [],
    },
    utilityCapacity: {
      value: "Water: 500 GPM available, Sewer: 600 GPM capacity",
      source: "Civil Plans",
      warnings: [],
    },
    geotechSoilsRep: {
      value: "Suitable bearing capacity, no special foundation requirements",
      source: "Soils Report",
      warnings: [],
    },
    floodZone: {
      value: "Zone X",
      source: "ALTA Survey",
      warnings: [],
    },
    siteAccess: {
      value: "Primary access from Hickory St, secondary from Commerce St",
      source: "Civil Plans",
      warnings: [],
    },
    proximityShopping: {
      value: "0.2 miles to Deep Ellum retail district",
      source: "Market Study",
      warnings: [],
    },
    proximityRestaurants: {
      value: "0.1 miles to multiple restaurants and cafes",
      source: "Market Study",
      warnings: [],
    },
    proximityParks: {
      value: "0.3 miles to Farmers Market Park",
      source: "Market Study",
      warnings: [],
    },
    proximitySchools: {
      value: "0.5 miles to elementary school, 1.2 miles to high school",
      source: "Market Study",
      warnings: [],
    },
    proximityHospitals: {
      value: "1.5 miles to Baylor University Medical Center",
      source: "Market Study",
      warnings: [],
    },
    topEmployers: {
      value: "Downtown Dallas (0.5 mi), Deep Ellum tech companies (0.3 mi)",
      source: "Market Study",
      warnings: [],
    },

    // Section 8: Sponsor Information
    sponsorEntityName: {
      value: "Hoque Global",
      source: "Org Chart",
      warnings: [],
    },
    sponsorStructure: {
      value: "General Partner",
      source: "Org Chart",
      warnings: [],
    },
    equityPartner: {
      value: "ACARA",
      source: "Org Chart",
      warnings: [],
    },
    contactInfo: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    sponsorExpScore: {
      value: 8,
      source: "Prior Units",
      warnings: [],
    },
    priorDevelopments: {
      value: null, // User Input - leave empty
      source: "User Input",
      warnings: [],
    },
    netWorth: {
      value: 45000000,
      source: "Financials",
      warnings: [],
    },
    guarantorLiquidity: {
      value: 2500000,
      source: "Guarantor FS",
      warnings: [],
    },
    portfolioDSCR: {
      value: 1.35,
      source: "Sponsor FS",
      warnings: [],
    },
  };
  
  // Filter out fields with "User Input" source - set their values to null/empty
  const filteredFields: ProjectFieldExtractionResponse = {};
  for (const [key, fieldData] of Object.entries(rawFields)) {
    if (fieldData && typeof fieldData === "object" && "source" in fieldData) {
      const normalizedSource = fieldData.source?.toLowerCase() || "";
      if (normalizedSource === "user input" || normalizedSource === "user_input") {
        // Set value to null for User Input fields
        filteredFields[key] = {
          ...fieldData,
          value: null,
        };
      } else {
        filteredFields[key] = fieldData;
      }
    } else {
      filteredFields[key] = fieldData;
    }
  }
  
  return filteredFields;
};

/**
 * Extract fields for a specific section
 */
export const extractProjectFieldsBySection = async (
  projectId: string,
  sectionId: string,
  documentPaths?: string[]
): Promise<ProjectFieldExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Get all fields
  const allFields = await extractProjectFields(projectId, documentPaths);

  // Filter by section (simplified - in real implementation, would use section mapping)
  // For now, return all fields
  return allFields;
};

