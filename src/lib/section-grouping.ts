/**
 * Section Grouping Utilities
 * 
 * Handles conversion between flat field structure and section-grouped structure
 * for storage in the database.
 */

// Map section IDs to section numbers for storage
const SECTION_ID_TO_NUMBER: Record<string, string> = {
  "basic-info": "section_1",
  "property-specs": "section_2",
  "dev-budget": "section_3_1",
  "loan-info": "section_3_2",
  "financials": "section_3_3",
  "market-context": "section_4",
  "special-considerations": "section_5",
  "timeline": "section_6",
  "site-context": "section_7",
  "sponsor-info": "section_8",
};

// Map field IDs to section IDs (from EnhancedProjectForm.tsx getSectionFieldIds)
export const FIELD_TO_SECTION: Record<string, string> = {
  // Section 1: Project Identification & Basic Info
  "projectName": "basic-info",
  "propertyAddressStreet": "basic-info",
  "propertyAddressCity": "basic-info",
  "propertyAddressState": "basic-info",
  "propertyAddressZip": "basic-info",
  "propertyAddressCounty": "basic-info",
  "parcelNumber": "basic-info",
  "zoningDesignation": "basic-info",
  "primaryAssetClass": "basic-info",
  "constructionType": "basic-info",
  "groundbreakingDate": "basic-info",
  "completionDate": "basic-info",
  "totalDevelopmentCost": "basic-info",
  "loanAmountRequested": "basic-info",
  "loanType": "basic-info",
  "requestedLoanTerm": "basic-info",
  "masterPlanName": "basic-info",
  "phaseNumber": "basic-info",
  "projectDescription": "basic-info",
  "projectPhase": "basic-info",
  "assetType": "basic-info",
  
  // Section 2: Property Specifications
  "totalResidentialUnits": "property-specs",
  "totalResidentialNRSF": "property-specs",
  "averageUnitSize": "property-specs",
  "totalCommercialGRSF": "property-specs",
  "grossBuildingArea": "property-specs",
  "numberOfStories": "property-specs",
  "buildingType": "property-specs",
  "parkingSpaces": "property-specs",
  "parkingRatio": "property-specs",
  "parkingType": "property-specs",
  "amenityList": "property-specs",
  "amenitySF": "property-specs",
  
  // Section 3: Financial Details
  "landAcquisition": "dev-budget",
  "baseConstruction": "dev-budget",
  "contingency": "dev-budget",
  "ffe": "dev-budget",
  "softCostsTotal": "dev-budget",
  "constructionFees": "dev-budget",
  "aeFees": "dev-budget",
  "thirdPartyReports": "dev-budget",
  "legalOrg": "dev-budget",
  "titleRecording": "dev-budget",
  "taxesDuringConst": "dev-budget",
  "workingCapital": "dev-budget",
  "developerFee": "dev-budget",
  "pfcStructuringFee": "dev-budget",
  "financingCosts": "dev-budget",
  "interestReserve": "dev-budget",
  "sponsorEquity": "financials",
  "interestRate": "loan-info",
  "underwritingRate": "loan-info",
  "prepaymentTerms": "loan-info",
  "permTakeoutPlanned": "loan-info",
  "realEstateTaxes": "financials",
  "insurance": "financials",
  "utilitiesCosts": "financials",
  "repairsMaint": "financials",
  "managementFee": "financials",
  "generalAdmin": "financials",
  "payroll": "financials",
  "reserves": "financials",
  "noiYear1": "financials",
  "yieldOnCost": "financials",
  "capRate": "financials",
  "stabilizedValue": "financials",
  "ltv": "financials",
  "debtYield": "financials",
  "dscr": "financials",
  "purchasePrice": "financials",
  "totalProjectCost": "financials",
  "capexBudget": "financials",
  "equityCommittedPercent": "financials",
  "propertyNoiT12": "financials",
  "stabilizedNoiProjected": "financials",
  "exitStrategy": "financials",
  "businessPlanSummary": "financials",
  "marketOverviewSummary": "financials",
  "targetLtvPercent": "loan-info",
  "targetLtcPercent": "loan-info",
  "amortizationYears": "loan-info",
  "interestOnlyPeriodMonths": "loan-info",
  "interestRateType": "loan-info",
  "targetCloseDate": "loan-info",
  "recoursePreference": "loan-info",
  "useOfProceeds": "loan-info",
  
  // Section 4: Market Context
  "submarketName": "market-context",
  "distanceToCBD": "market-context",
  "distanceToEmployment": "market-context",
  "distanceToTransit": "market-context",
  "walkabilityScore": "market-context",
  "population3Mi": "market-context",
  "popGrowth201020": "market-context",
  "projGrowth202429": "market-context",
  "medianHHIncome": "market-context",
  "renterOccupiedPercent": "market-context",
  "bachelorsDegreePercent": "market-context",
  "rentComps": "market-context",
  
  // Section 5: Special Considerations
  "opportunityZone": "special-considerations",
  "affordableHousing": "special-considerations",
  "affordableUnitsNumber": "special-considerations",
  "amiTargetPercent": "special-considerations",
  "taxExemption": "special-considerations",
  "tifDistrict": "special-considerations",
  "taxAbatement": "special-considerations",
  "paceFinancing": "special-considerations",
  "historicTaxCredits": "special-considerations",
  "newMarketsCredits": "special-considerations",
  
  // Section 6: Timeline & Milestones
  "landAcqClose": "timeline",
  "entitlements": "timeline",
  "finalPlans": "timeline",
  "permitsIssued": "timeline",
  "groundbreaking": "timeline",
  "verticalStart": "timeline",
  "firstOccupancy": "timeline",
  "stabilization": "timeline",
  "preLeasedSF": "timeline",
  
  // Section 7: Site & Context
  "totalSiteAcreage": "site-context",
  "currentSiteStatus": "site-context",
  "topography": "site-context",
  "environmental": "site-context",
  "siteAccess": "site-context",
  "proximityShopping": "site-context",
  "proximityRestaurants": "site-context",
  "proximityParks": "site-context",
  "proximitySchools": "site-context",
  "proximityHospitals": "site-context",
  
  // Section 8: Sponsor Information
  "sponsorEntityName": "sponsor-info",
  "sponsorStructure": "sponsor-info",
  "equityPartner": "sponsor-info",
  "contactInfo": "sponsor-info",
};

/**
 * Converts flat field structure to section-grouped structure
 */
export function groupBySections(flatData: Record<string, any>): Record<string, Record<string, any>> {
  const grouped: Record<string, Record<string, any>> = {};
  
  for (const [fieldId, fieldValue] of Object.entries(flatData)) {
    // Skip special fields
    if (fieldId.startsWith('_') || fieldId === 'projectSections' || fieldId === 'borrowerSections') {
      continue;
    }
    
    const sectionId = FIELD_TO_SECTION[fieldId];
    if (sectionId) {
      const sectionKey = SECTION_ID_TO_NUMBER[sectionId] || `section_unknown`;
      if (!grouped[sectionKey]) {
        grouped[sectionKey] = {};
      }
      grouped[sectionKey][fieldId] = fieldValue;
    } else {
      // Field doesn't have a section mapping - put in a catch-all section
      if (!grouped["section_other"]) {
        grouped["section_other"] = {};
      }
      grouped["section_other"][fieldId] = fieldValue;
    }
  }
  
  return grouped;
}

/**
 * Converts section-grouped structure back to flat field structure
 */
export function ungroupFromSections(groupedData: Record<string, any>): Record<string, any> {
  const flat: Record<string, any> = {};
  
  for (const [sectionKey, sectionData] of Object.entries(groupedData)) {
    if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
      // It's a section object with fields
      for (const [fieldId, fieldValue] of Object.entries(sectionData)) {
        flat[fieldId] = fieldValue;
      }
    } else {
      // Legacy format - section key might be a field name directly
      flat[sectionKey] = sectionData;
    }
  }
  
  return flat;
}

/**
 * Checks if data is in section-grouped format
 */
export function isGroupedFormat(data: Record<string, any>): boolean {
  return Object.keys(data).some(key => key.startsWith('section_'));
}

