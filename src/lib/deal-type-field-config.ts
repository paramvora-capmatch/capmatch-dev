/**
 * Deal Type Field Configuration
 *
 * Maps resume field IDs to their applicable deal types (ground_up, refinance, or both).
 * Based on the classifications from resume_fields.md.
 *
 * @module deal-type-field-config
 */

export type DealType = 'ground_up' | 'refinance';
export type FieldDealType = DealType[];

/**
 * Maps project resume field IDs to their applicable deal types.
 * Array contains all deal types for which the field should be visible.
 */
export const projectResumeFieldDealTypes: Record<string, FieldDealType> = {
  // ============================================================================
  // Section 1: Project Identification & Basic Info
  // ============================================================================
  projectName: ['ground_up', 'refinance'],
  propertyAddressStreet: ['ground_up', 'refinance'],
  propertyAddressCity: ['ground_up', 'refinance'],
  propertyAddressState: ['ground_up', 'refinance'],
  propertyAddressZip: ['ground_up', 'refinance'],
  propertyAddressCounty: ['ground_up', 'refinance'],
  dealStatus: ['ground_up', 'refinance'],
  masterPlanName: ['ground_up'],
  ownershipType: ['ground_up', 'refinance'],
  groundLeaseTerm: ['ground_up', 'refinance'],
  groundLeaseRent: ['ground_up', 'refinance'],
  groundLessor: ['ground_up', 'refinance'],
  groundLeaseExpiration: ['ground_up', 'refinance'],
  restorationFundThreshold: ['ground_up', 'refinance'],
  assetType: ['ground_up', 'refinance'],
  constructionType: ['ground_up', 'refinance'],
  projectPhase: ['ground_up', 'refinance'],
  projectDescription: ['ground_up', 'refinance'],
  parcelNumber: ['ground_up', 'refinance'],
  constructionClass: ['ground_up', 'refinance'],
  remainingEconomicLife: ['refinance'],
  lastRenovationDate: ['refinance'],

  // ============================================================================
  // Section 2: Property Specifications
  // ============================================================================
  totalResidentialUnits: ['ground_up', 'refinance'],
  totalResidentialNRSF: ['ground_up', 'refinance'],
  averageUnitSize: ['ground_up', 'refinance'],
  totalCommercialGRSF: ['ground_up', 'refinance'],
  commercialNRSF: ['ground_up', 'refinance'],
  buildingEfficiency: ['ground_up', 'refinance'],
  buildingType: ['ground_up', 'refinance'],
  grossBuildingArea: ['ground_up', 'refinance'],
  numberOfStories: ['ground_up', 'refinance'],
  unitBalconyCount: ['ground_up', 'refinance'],
  modelUnitCount: ['ground_up', 'refinance'],
  amenityList: ['ground_up', 'refinance'],
  parkingSpaces: ['ground_up', 'refinance'],
  parkingRatio: ['ground_up', 'refinance'],
  furnishedUnits: ['ground_up', 'refinance'],
  unitWasherDryer: ['ground_up', 'refinance'],
  unitKitchenIsland: ['ground_up', 'refinance'],
  lossToLease: ['refinance'],
  shortTermRentalCount: ['refinance'],
  amenitySF: ['ground_up', 'refinance'],
  commercialParkingObligation: ['ground_up', 'refinance'],
  prohibitedCommercialUses: ['ground_up', 'refinance'],
  adaCompliantPercent: ['ground_up', 'refinance'],
  hvacSystem: ['ground_up', 'refinance'],
  roofTypeAge: ['refinance'],
  solarCapacity: ['ground_up', 'refinance'],
  evChargingStations: ['ground_up', 'refinance'],
  leedGreenRating: ['ground_up', 'refinance'],
  meteringStructure: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 3: Financial Details - Uses of Funds (Budget)
  // ============================================================================
  totalDevelopmentCost: ['ground_up'],
  totalProjectCost: ['ground_up', 'refinance'],
  purchasePrice: ['ground_up', 'refinance'],
  landAcquisition: ['ground_up'],
  baseConstruction: ['ground_up'],
  guaranteedMaximumPrice: ['ground_up'],
  constructionRetainage: ['ground_up'],
  contingency: ['ground_up'],
  designBuilderFee: ['ground_up'],
  softCosts: ['ground_up', 'refinance'],
  aeFees: ['ground_up'],
  developerFee: ['ground_up'],
  loanFees: ['ground_up', 'refinance'],
  interestReserve: ['ground_up'],
  capexBudget: ['refinance'],
  officeTIReimbursementCap: ['ground_up', 'refinance'],
  siteRestorationAllowance: ['ground_up'],

  // ============================================================================
  // Section 3: Financial Details - Sources of Funds
  // ============================================================================
  totalCapitalization: ['ground_up', 'refinance'],
  loanAmountRequested: ['ground_up', 'refinance'],
  mezzanineDebtAmount: ['ground_up', 'refinance'],
  preferredEquityAmount: ['ground_up', 'refinance'],
  sponsorEquity: ['ground_up', 'refinance'],
  taxCreditEquity: ['ground_up', 'refinance'],
  grantFundingAmount: ['ground_up', 'refinance'],
  partnerEquityBreakdown: ['ground_up', 'refinance'],
  liens: ['refinance'],

  // ============================================================================
  // Section 3: Financial Details - Loan Terms & Structure
  // ============================================================================
  lender: ['ground_up', 'refinance'],
  loanType: ['ground_up', 'refinance'],
  existingLender: ['refinance'],
  existingLoanDefeasanceFee: ['refinance'],
  requestedTerm: ['ground_up', 'refinance'],
  amortizationYears: ['ground_up', 'refinance'],
  interestRate: ['ground_up', 'refinance'],
  recoursePreference: ['ground_up', 'refinance'],
  targetLtvPercent: ['ground_up', 'refinance'],
  targetLtcPercent: ['ground_up'],
  useOfProceeds: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 3: Financial Details - Operating Expenses
  // ============================================================================
  realEstateTaxes: ['ground_up', 'refinance'],
  insurance: ['ground_up', 'refinance'],
  managementFee: ['ground_up', 'refinance'],
  reserves: ['ground_up', 'refinance'],
  t12MonthlyData: ['refinance'],
  propertyTaxHardCapAmount: ['ground_up', 'refinance'],
  utilityBillBackMethod: ['refinance'],
  commercialCAMReimbursement: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 3: Financial Details - Investment Metrics & Exit
  // ============================================================================
  exitStrategy: ['ground_up', 'refinance'],
  noiYear1: ['ground_up', 'refinance'],
  yieldOnCost: ['ground_up'],
  capRate: ['ground_up', 'refinance'],
  stabilizedValue: ['ground_up', 'refinance'],
  propertyNoiT12: ['refinance'],
  stabilizedNoiProjected: ['ground_up'],
  irr: ['ground_up', 'refinance'],
  equityMultiple: ['ground_up', 'refinance'],
  proFormaRentGrowth: ['ground_up', 'refinance'],
  proFormaExpenseInflation: ['ground_up', 'refinance'],
  sensitivityAnalysis: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 3: Financial Details - Risk Analysis
  // ============================================================================
  riskHigh: ['ground_up', 'refinance'],
  riskMedium: ['ground_up', 'refinance'],
  riskLow: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 3: Financial Details - Rent Roll
  // ============================================================================
  rentRollUnits: ['refinance'],
  totalDelinquencyAmount: ['refinance'],
  leaseRolloverSchedule: ['refinance'],
  tenantCredits_Prepayments: ['refinance'],
  nonRevenueUnitCount: ['refinance'],

  // ============================================================================
  // Section 4: Market Context
  // ============================================================================
  msaName: ['ground_up', 'refinance'],
  population3Mi: ['ground_up', 'refinance'],
  medianHHIncome: ['ground_up', 'refinance'],
  employmentSector_Education: ['ground_up', 'refinance'],
  employmentSector_HealthCare: ['ground_up', 'refinance'],
  employmentSector_Manufacturing: ['ground_up', 'refinance'],
  crimeRiskLevel: ['ground_up', 'refinance'],
  submarketName: ['ground_up', 'refinance'],
  walkabilityScore: ['ground_up', 'refinance'],
  infrastructureCatalyst: ['ground_up'],
  broadbandSpeed: ['ground_up', 'refinance'],
  submarketAbsorption: ['ground_up', 'refinance'],
  supplyPipeline: ['ground_up', 'refinance'],
  monthsOfSupply: ['ground_up', 'refinance'],
  rentComps: ['ground_up', 'refinance'],
  rentPremium: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 5: Special Considerations - Affordable Housing & Compliance
  // ============================================================================
  affordableHousing: ['ground_up', 'refinance'],
  affordableUnitsNumber: ['ground_up', 'refinance'],
  amiTargetPercent: ['ground_up', 'refinance'],
  jobCreationReportingReq: ['ground_up'],
  localLaborUtilizationReq: ['ground_up'],

  // ============================================================================
  // Section 5: Special Considerations - Incentives & Tax Credits
  // ============================================================================
  opportunityZone: ['ground_up', 'refinance'],
  taxExemption: ['ground_up', 'refinance'],
  abatementSchedule: ['ground_up', 'refinance'],
  paymentInLieuOfTaxes: ['ground_up', 'refinance'],
  abatementTriggerEvent: ['ground_up'],

  // ============================================================================
  // Section 6: Timeline & Milestones - Key Dates
  // ============================================================================
  landAcquisitionClose: ['ground_up'],
  groundbreakingDate: ['ground_up'],
  verticalStart: ['ground_up'],
  firstOccupancy: ['ground_up'],
  stabilization: ['ground_up', 'refinance'],
  totalProjectDuration: ['ground_up'],

  // ============================================================================
  // Section 6: Timeline & Milestones - Entitlements & Permitting
  // ============================================================================
  entitlements: ['ground_up'],
  finalPlans: ['ground_up'],
  permitsIssued: ['ground_up'],

  // ============================================================================
  // Section 6: Timeline & Milestones - Construction & Lease-Up Status
  // ============================================================================
  preLeasedSF: ['ground_up'],
  drawSchedule: ['ground_up'],
  absorptionProjection: ['ground_up'],

  // ============================================================================
  // Section 7: Site & Context - Land & Zoning
  // ============================================================================
  zoningDesignation: ['ground_up', 'refinance'],
  totalSiteAcreage: ['ground_up', 'refinance'],
  buildableAcreage: ['ground_up'],
  farUtilized: ['ground_up'],
  zoningMaxHeight: ['ground_up'],
  zoningMinLotWidth: ['ground_up'],
  zoningSetbacks: ['ground_up'],
  zoningCompliant: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 7: Site & Context - Physical Characteristics & Access
  // ============================================================================
  currentSiteStatus: ['ground_up', 'refinance'],
  topography: ['ground_up'],
  foundationSystem: ['ground_up'],
  roofWarrantyExpiry: ['refinance'],
  publicSpaceMaintReq: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 7: Site & Context - Environmental & Hazards (Insurance)
  // ============================================================================
  floodZone: ['ground_up', 'refinance'],
  phaseIESAFinding: ['ground_up', 'refinance'],
  wetlandsPresent: ['ground_up'],
  seismicRisk: ['ground_up', 'refinance'],
  seismicPML: ['ground_up', 'refinance'],
  earthquakeDeductible: ['ground_up', 'refinance'],
  businessIncomeCoverage: ['refinance'],
  genLiabilityAgg: ['ground_up', 'refinance'],
  umbrellaLimit: ['ground_up', 'refinance'],
  terrorismPremium: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 7: Site & Context - Infrastructure & Utilities
  // ============================================================================
  utilityAvailability: ['ground_up'],
  easements: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 8: Sponsor Information - Entity Structure
  // ============================================================================
  sponsorEntityName: ['ground_up', 'refinance'],
  syndicationStatus: ['ground_up', 'refinance'],
  sponsorStructure: ['ground_up', 'refinance'],
  equityPartner: ['ground_up', 'refinance'],
  relatedPartyTenant: ['refinance'],
  contactInfo: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 8: Sponsor Information - Track Record
  // ============================================================================
  sponsorExperience: ['ground_up', 'refinance'],
  priorDevelopments: ['ground_up'],
  sponsorExpScore: ['ground_up', 'refinance'],
  portfolioDSCR: ['ground_up', 'refinance'],

  // ============================================================================
  // Section 8: Sponsor Information - Financial Strength
  // ============================================================================
  borrowerNetWorth: ['ground_up', 'refinance'],
  guarantorLiquidity: ['ground_up', 'refinance'],
};

/**
 * Maps borrower resume field IDs to their applicable deal types.
 * All borrower fields are marked 'both' per resume_fields.md spec.
 */
export const borrowerResumeFieldDealTypes: Record<string, FieldDealType> = {
  // ============================================================================
  // Identity & Contact
  // ============================================================================
  fullLegalName: ['ground_up', 'refinance'],
  primaryEntityName: ['ground_up', 'refinance'],
  contactEmail: ['ground_up', 'refinance'],
  contactPhone: ['ground_up', 'refinance'],
  primaryEntityStructure: ['ground_up', 'refinance'],
  contactAddress: ['ground_up', 'refinance'],

  // ============================================================================
  // Experience & Track Record
  // ============================================================================
  yearsCREExperienceRange: ['ground_up', 'refinance'],
  yearFounded: ['ground_up', 'refinance'],
  activeProjects: ['ground_up', 'refinance'],
  totalAUM: ['ground_up', 'refinance'],
  totalSqFtManaged: ['ground_up', 'refinance'],
  totalDealValueClosedRange: ['ground_up', 'refinance'],
  bioNarrative: ['ground_up', 'refinance'],
  trackRecord: ['ground_up', 'refinance'],
  assetClassesExperience: ['ground_up', 'refinance'],
  geographicMarketsExperience: ['ground_up', 'refinance'],
  existingLenderRelationships: ['ground_up', 'refinance'],

  // ============================================================================
  // Financial Position
  // ============================================================================
  creditScoreRange: ['ground_up', 'refinance'],
  netWorthRange: ['ground_up', 'refinance'],
  totalAssets: ['ground_up', 'refinance'],
  totalLiabilities: ['ground_up', 'refinance'],
  liquidityRange: ['ground_up', 'refinance'],
  totalLiquidAssets: ['ground_up', 'refinance'],
  contingentLiabilities: ['ground_up', 'refinance'],
  scheduleOfRealEstateOwned: ['ground_up', 'refinance'],

  // ============================================================================
  // Legal & Credit History
  // ============================================================================
  bankruptcyHistory: ['ground_up', 'refinance'],
  foreclosureHistory: ['ground_up', 'refinance'],
  litigationHistory: ['ground_up', 'refinance'],

  // ============================================================================
  // Online Presence
  // ============================================================================
  linkedinUrl: ['ground_up', 'refinance'],
  websiteUrl: ['ground_up', 'refinance'],

  // ============================================================================
  // Principal Information
  // ============================================================================
  principalLegalName: ['ground_up', 'refinance'],
  principalRoleDefault: ['ground_up', 'refinance'],
  principalEmail: ['ground_up', 'refinance'],
  ownershipPercentage: ['ground_up', 'refinance'],
  principalBio: ['ground_up', 'refinance'],
  principalSpecialties: ['ground_up', 'refinance'],

  // ============================================================================
  // References
  // ============================================================================
  references: ['ground_up', 'refinance'],
};

/**
 * Checks if a field should be visible for a given deal type.
 *
 * @param fieldId - The field ID to check
 * @param dealType - The project's deal type
 * @param isProjectField - True for project resume fields, false for borrower resume fields
 * @returns True if the field should be visible
 */
export function isFieldVisibleForDealType(
  fieldId: string,
  dealType: DealType,
  isProjectField: boolean = true
): boolean {
  const config = isProjectField
    ? projectResumeFieldDealTypes
    : borrowerResumeFieldDealTypes;

  const fieldDealTypes = config[fieldId];

  // If field not found in config, show it (fail-open for backwards compatibility)
  if (!fieldDealTypes) {
    return true;
  }

  // Check if the current deal type is included in the field's allowed types
  return fieldDealTypes.includes(dealType);
}

/**
 * Filters a list of field IDs to only those visible for the given deal type.
 *
 * @param fieldIds - Array of field IDs to filter
 * @param dealType - The project's deal type
 * @param isProjectField - True for project resume fields, false for borrower resume fields
 * @returns Filtered array of visible field IDs
 */
export function filterFieldsForDealType(
  fieldIds: string[],
  dealType: DealType,
  isProjectField: boolean = true
): string[] {
  return fieldIds.filter((id) =>
    isFieldVisibleForDealType(id, dealType, isProjectField)
  );
}

/**
 * Gets the deal type classification for a specific field.
 *
 * @param fieldId - The field ID to look up
 * @param isProjectField - True for project resume fields, false for borrower resume fields
 * @returns The field's deal type classification array
 */
export function getFieldDealType(
  fieldId: string,
  isProjectField: boolean = true
): FieldDealType {
  const config = isProjectField
    ? projectResumeFieldDealTypes
    : borrowerResumeFieldDealTypes;

  // Default to showing for both if not found
  return config[fieldId] ?? ['ground_up', 'refinance'];
}

/**
 * Counts how many fields are visible for a given deal type.
 *
 * @param fieldIds - Array of field IDs to count
 * @param dealType - The project's deal type
 * @param isProjectField - True for project resume fields, false for borrower resume fields
 * @returns Count of visible fields
 */
export function countVisibleFieldsForDealType(
  fieldIds: string[],
  dealType: DealType,
  isProjectField: boolean = true
): number {
  return filterFieldsForDealType(fieldIds, dealType, isProjectField).length;
}
