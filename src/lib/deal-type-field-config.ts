/**
 * Deal Type Field Configuration
 *
 * Maps resume field IDs to their applicable deal types (ground_up, refinance, or both).
 * Based on the classifications from resume_fields.md.
 *
 * @module deal-type-field-config
 */

export type DealType = 'ground_up' | 'refinance';
export type FieldDealType = 'both' | 'ground_up' | 'refinance';

/**
 * Maps project resume field IDs to their applicable deal types.
 * - 'both': Field appears for all deal types
 * - 'ground_up': Field only appears for new development/construction deals
 * - 'refinance': Field only appears for stabilized assets/acquisitions
 */
export const projectResumeFieldDealTypes: Record<string, FieldDealType> = {
  // ============================================================================
  // Section 1: Project Identification & Basic Info
  // ============================================================================
  projectName: 'both',
  propertyAddressStreet: 'both',
  propertyAddressCity: 'both',
  propertyAddressState: 'both',
  propertyAddressZip: 'both',
  propertyAddressCounty: 'both',
  dealStatus: 'both',
  masterPlanName: 'ground_up',
  ownershipType: 'both',
  groundLeaseTerm: 'both',
  groundLeaseRent: 'both',
  groundLessor: 'both',
  groundLeaseExpiration: 'both',
  restorationFundThreshold: 'both',
  assetType: 'both',
  constructionType: 'both',
  projectPhase: 'both',
  projectDescription: 'both',
  parcelNumber: 'both',
  constructionClass: 'both',
  remainingEconomicLife: 'refinance',
  lastRenovationDate: 'refinance',

  // ============================================================================
  // Section 2: Property Specifications
  // ============================================================================
  totalResidentialUnits: 'both',
  totalResidentialNRSF: 'both',
  averageUnitSize: 'both',
  totalCommercialGRSF: 'both',
  commercialNRSF: 'both',
  buildingEfficiency: 'both',
  buildingType: 'both',
  grossBuildingArea: 'both',
  numberOfStories: 'both',
  unitBalconyCount: 'both',
  modelUnitCount: 'both',
  amenityList: 'both',
  parkingSpaces: 'both',
  parkingRatio: 'both',
  furnishedUnits: 'both',
  unitWasherDryer: 'both',
  unitKitchenIsland: 'both',
  lossToLease: 'refinance',
  shortTermRentalCount: 'refinance',
  amenitySF: 'both',
  commercialParkingObligation: 'both',
  prohibitedCommercialUses: 'both',
  adaCompliantPercent: 'both',
  hvacSystem: 'both',
  roofTypeAge: 'refinance',
  solarCapacity: 'both',
  evChargingStations: 'both',
  leedGreenRating: 'both',
  meteringStructure: 'both',

  // ============================================================================
  // Section 3: Financial Details - Uses of Funds (Budget)
  // ============================================================================
  totalDevelopmentCost: 'ground_up',
  totalProjectCost: 'both',
  purchasePrice: 'both',
  landAcquisition: 'ground_up',
  baseConstruction: 'ground_up',
  guaranteedMaximumPrice: 'ground_up',
  constructionRetainage: 'ground_up',
  contingency: 'ground_up',
  designBuilderFee: 'ground_up',
  softCosts: 'both',
  aeFees: 'ground_up',
  developerFee: 'ground_up',
  loanFees: 'both',
  interestReserve: 'ground_up',
  capexBudget: 'refinance',
  officeTIReimbursementCap: 'both',
  siteRestorationAllowance: 'ground_up',

  // ============================================================================
  // Section 3: Financial Details - Sources of Funds
  // ============================================================================
  totalCapitalization: 'both',
  loanAmountRequested: 'both',
  mezzanineDebtAmount: 'both',
  preferredEquityAmount: 'both',
  sponsorEquity: 'both',
  taxCreditEquity: 'both',
  grantFundingAmount: 'both',
  partnerEquityBreakdown: 'both',
  liens: 'refinance',

  // ============================================================================
  // Section 3: Financial Details - Loan Terms & Structure
  // ============================================================================
  lender: 'both',
  loanType: 'both',
  existingLender: 'refinance',
  existingLoanDefeasanceFee: 'refinance',
  requestedTerm: 'both',
  amortizationYears: 'both',
  interestRate: 'both',
  recoursePreference: 'both',
  targetLtvPercent: 'both',
  targetLtcPercent: 'ground_up',
  useOfProceeds: 'both',

  // ============================================================================
  // Section 3: Financial Details - Operating Expenses
  // ============================================================================
  realEstateTaxes: 'both',
  insurance: 'both',
  managementFee: 'both',
  reserves: 'both',
  t12MonthlyData: 'refinance',
  propertyTaxHardCapAmount: 'both',
  utilityBillBackMethod: 'refinance',
  commercialCAMReimbursement: 'both',

  // ============================================================================
  // Section 3: Financial Details - Investment Metrics & Exit
  // ============================================================================
  exitStrategy: 'both',
  noiYear1: 'both',
  yieldOnCost: 'ground_up',
  capRate: 'both',
  stabilizedValue: 'both',
  propertyNoiT12: 'refinance',
  stabilizedNoiProjected: 'ground_up',
  irr: 'both',
  equityMultiple: 'both',
  proFormaRentGrowth: 'both',
  proFormaExpenseInflation: 'both',
  sensitivityAnalysis: 'both',

  // ============================================================================
  // Section 3: Financial Details - Risk Analysis
  // ============================================================================
  riskHigh: 'both',
  riskMedium: 'both',
  riskLow: 'both',

  // ============================================================================
  // Section 3: Financial Details - Rent Roll
  // ============================================================================
  rentRollUnits: 'refinance',
  totalDelinquencyAmount: 'refinance',
  leaseRolloverSchedule: 'refinance',
  tenantCredits_Prepayments: 'refinance',
  nonRevenueUnitCount: 'refinance',

  // ============================================================================
  // Section 4: Market Context
  // ============================================================================
  msaName: 'both',
  population3Mi: 'both',
  medianHHIncome: 'both',
  employmentSector_Education: 'both',
  employmentSector_HealthCare: 'both',
  employmentSector_Manufacturing: 'both',
  crimeRiskLevel: 'both',
  submarketName: 'both',
  walkabilityScore: 'both',
  infrastructureCatalyst: 'ground_up',
  broadbandSpeed: 'both',
  submarketAbsorption: 'both',
  supplyPipeline: 'both',
  monthsOfSupply: 'both',
  rentComps: 'both',
  rentPremium: 'both',

  // ============================================================================
  // Section 5: Special Considerations - Affordable Housing & Compliance
  // ============================================================================
  affordableHousing: 'both',
  affordableUnitsNumber: 'both',
  amiTargetPercent: 'both',
  jobCreationReportingReq: 'ground_up',
  localLaborUtilizationReq: 'ground_up',

  // ============================================================================
  // Section 5: Special Considerations - Incentives & Tax Credits
  // ============================================================================
  opportunityZone: 'both',
  taxExemption: 'both',
  abatementSchedule: 'both',
  paymentInLieuOfTaxes: 'both',
  abatementTriggerEvent: 'ground_up',

  // ============================================================================
  // Section 6: Timeline & Milestones - Key Dates
  // ============================================================================
  landAcquisitionClose: 'ground_up',
  groundbreakingDate: 'ground_up',
  verticalStart: 'ground_up',
  firstOccupancy: 'ground_up',
  stabilization: 'both',
  totalProjectDuration: 'ground_up',

  // ============================================================================
  // Section 6: Timeline & Milestones - Entitlements & Permitting
  // ============================================================================
  entitlements: 'ground_up',
  finalPlans: 'ground_up',
  permitsIssued: 'ground_up',

  // ============================================================================
  // Section 6: Timeline & Milestones - Construction & Lease-Up Status
  // ============================================================================
  preLeasedSF: 'ground_up',
  drawSchedule: 'ground_up',
  absorptionProjection: 'ground_up',

  // ============================================================================
  // Section 7: Site & Context - Land & Zoning
  // ============================================================================
  zoningDesignation: 'both',
  totalSiteAcreage: 'both',
  buildableAcreage: 'ground_up',
  farUtilized: 'ground_up',
  zoningMaxHeight: 'ground_up',
  zoningMinLotWidth: 'ground_up',
  zoningSetbacks: 'ground_up',
  zoningCompliant: 'both',

  // ============================================================================
  // Section 7: Site & Context - Physical Characteristics & Access
  // ============================================================================
  currentSiteStatus: 'both',
  topography: 'ground_up',
  foundationSystem: 'ground_up',
  roofWarrantyExpiry: 'refinance',
  publicSpaceMaintReq: 'both',

  // ============================================================================
  // Section 7: Site & Context - Environmental & Hazards (Insurance)
  // ============================================================================
  floodZone: 'both',
  phaseIESAFinding: 'both',
  wetlandsPresent: 'ground_up',
  seismicRisk: 'both',
  seismicPML: 'both',
  earthquakeDeductible: 'both',
  businessIncomeCoverage: 'refinance',
  genLiabilityAgg: 'both',
  umbrellaLimit: 'both',
  terrorismPremium: 'both',

  // ============================================================================
  // Section 7: Site & Context - Infrastructure & Utilities
  // ============================================================================
  utilityAvailability: 'ground_up',
  easements: 'both',

  // ============================================================================
  // Section 8: Sponsor Information - Entity Structure
  // ============================================================================
  sponsorEntityName: 'both',
  syndicationStatus: 'both',
  sponsorStructure: 'both',
  equityPartner: 'both',
  relatedPartyTenant: 'refinance',
  contactInfo: 'both',

  // ============================================================================
  // Section 8: Sponsor Information - Track Record
  // ============================================================================
  sponsorExperience: 'both',
  priorDevelopments: 'ground_up',
  sponsorExpScore: 'both',
  portfolioDSCR: 'both',

  // ============================================================================
  // Section 8: Sponsor Information - Financial Strength
  // ============================================================================
  borrowerNetWorth: 'both',
  guarantorLiquidity: 'both',
};

/**
 * Maps borrower resume field IDs to their applicable deal types.
 * All borrower fields are marked 'both' per resume_fields.md spec.
 */
export const borrowerResumeFieldDealTypes: Record<string, FieldDealType> = {
  // ============================================================================
  // Identity & Contact
  // ============================================================================
  fullLegalName: 'both',
  primaryEntityName: 'both',
  contactEmail: 'both',
  contactPhone: 'both',
  primaryEntityStructure: 'both',
  contactAddress: 'both',

  // ============================================================================
  // Experience & Track Record
  // ============================================================================
  yearsCREExperienceRange: 'both',
  yearFounded: 'both',
  activeProjects: 'both',
  totalAUM: 'both',
  totalSqFtManaged: 'both',
  totalDealValueClosedRange: 'both',
  bioNarrative: 'both',
  trackRecord: 'both',
  assetClassesExperience: 'both',
  geographicMarketsExperience: 'both',
  existingLenderRelationships: 'both',

  // ============================================================================
  // Financial Position
  // ============================================================================
  creditScoreRange: 'both',
  netWorthRange: 'both',
  totalAssets: 'both',
  totalLiabilities: 'both',
  liquidityRange: 'both',
  totalLiquidAssets: 'both',
  contingentLiabilities: 'both',
  scheduleOfRealEstateOwned: 'both',

  // ============================================================================
  // Legal & Credit History
  // ============================================================================
  bankruptcyHistory: 'both',
  foreclosureHistory: 'both',
  litigationHistory: 'both',

  // ============================================================================
  // Online Presence
  // ============================================================================
  linkedinUrl: 'both',
  websiteUrl: 'both',

  // ============================================================================
  // Principal Information
  // ============================================================================
  principalLegalName: 'both',
  principalRoleDefault: 'both',
  principalEmail: 'both',
  ownershipPercentage: 'both',
  principalBio: 'both',
  principalSpecialties: 'both',

  // ============================================================================
  // References
  // ============================================================================
  references: 'both',
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

  const fieldDealType = config[fieldId];

  // If field not found in config, show it (fail-open for backwards compatibility)
  if (!fieldDealType) {
    return true;
  }

  // 'both' fields are always visible
  if (fieldDealType === 'both') {
    return true;
  }

  // Otherwise, match the deal type
  return fieldDealType === dealType;
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
 * @returns The field's deal type classification, or 'both' if not found
 */
export function getFieldDealType(
  fieldId: string,
  isProjectField: boolean = true
): FieldDealType {
  const config = isProjectField
    ? projectResumeFieldDealTypes
    : borrowerResumeFieldDealTypes;

  return config[fieldId] ?? 'both';
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
