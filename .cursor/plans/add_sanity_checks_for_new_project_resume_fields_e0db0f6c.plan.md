---
name: Add Sanity Checks for New Project Resume Fields
overview: Add comprehensive sanity checks for all new project resume fields based on the provided metadata. This includes source divergence thresholds, logic checks, and derived value checks for fields across all sections (Project Identification, Property Specifications, Financial Details, Market Context, Special Considerations, Timeline, Site & Context, and Sponsor Information).
todos:

- id: add-section1-checks
content: "Add sanity checks for Section 1 (Project Identification): masterPlanName, parcelNumber, verify projectDescription"
status: pending
- id: add-section2-checks
content: "Add sanity checks for Section 2 (Property Specifications): Update grossBuildingArea, numberOfStories; Add commercialSpaceMix, parkingType, amenity fields, luxuryTier, targetMarket, competitivePosition, unitPlanDescription"
status: pending
- id: add-section3-checks
content: "Add sanity checks for Section 3 (Financial Details): Uses of Funds fields, Sources of Funds fields, Loan Terms fields, Operating Expenses fields, Investment Metrics fields, Risk Analysis fields"
status: pending
- id: add-section4-checks
content: "Add sanity checks for Section 4 (Market Context): Demographics fields, Location fields, Supply & Demand fields"
status: pending
- id: add-section5-checks
content: "Add sanity checks for Section 5 (Special Considerations): Affordable Housing fields, Incentives & Tax Credits fields"
status: pending
- id: add-section6-checks
content: "Add sanity checks for Section 6 (Timeline & Milestones): Key Dates fields, Entitlements fields, Construction & Lease-Up fields"
status: pending
- id: add-section7-checks
content: "Add sanity checks for Section 7 (Site & Context): Land & Zoning fields, Physical Characteristics fields, Environmental fields, Infrastructure fields"
status: pending
- id: add-section8-checks
content: "Add sanity checks for Section 8 (Sponsor Information): Entity Structure fields, Track Record fields, Financial Strength fields"
status: pending
- id: add-helper-functions
content: "Add helper functions: _check_commercial_space_mix_sum, _check_capital_use_timing_sum, _check_total_op_expenses_sum, _check_parcel_number_format, _check_derived_debt_service, _check_derived_trended_yield, _check_derived_untrended_yield"
status: pending
- id: verify-field-names
content: Verify all field names match camelCase format used in codebase by checking against project-resume-field-metadata.ts
status: pending
---

# Add Sanity Checks for New Project Resume Fields

## Context

The user has recently added many new fields to the project resume system but hasn't added sanity checks for them. Based on the provided field metadata table, we need to add sanity checks to `Backend/services/sanity_check_config.py` for all missing fields.

## Current State

- Sanity checks exist for some fields (e.g., `projectName`, `projectDescription`, `grossBuildingArea`, `numberOfStories`, `amenitySF`)
- Many new fields from the metadata table are missing sanity checks
- The sanity check system supports: source divergence checks (exact match, percentage difference, semantic match, etc.), logic checks (business rules), and derived value checks

## Implementation Plan

### File to Modify

- `Backend/services/sanity_check_config.py` - Add new FieldCheck entries to `PROJECT_SANITY_CHECKS` dictionary

### Section 1: Project Identification & Basic Info

**1.1 Add missing field: `masterPlanName`**

- Source divergence: Semantic Match < 90%
- Logic checks: None (optional field)

**1.2 Update existing: `projectDescription`**

- Already exists but ensure it matches requirements (Warn if < 50 characters)

**1.3 Add missing field: `parcelNumber`**

- Source divergence: Exact Match
- Logic checks: Warn if format is invalid (should handle comma-separated values)

### Section 2: Property Specifications

**2.1 Update existing: `grossBuildingArea`**

- Already exists, but ensure logic check: Must be >= `netRentableSF` (totalResidentialNRSF)

**2.2 Update existing: `numberOfStories`**

- Update logic check: Warn if `buildingType` is "High-rise" and this is < 7

**2.3 Add missing field: `commercialSpaceMix`** (Table)

- Source divergence: N/A (table)
- Logic checks: Sum of `Square Footage` must equal `totalCommercialGRSF` (helper function needed)

**2.4 Add missing fields: Amenities**

- `parkingType`: Optional, Exact Match
- `amenitySF`: Already exists, add logic: Warn if > 10% of `totalResidentialNRSF`
- `totalAmenities`: Derived field, count from amenity list
- `amenityAvgSize`: Derived field, SF / Count
- `amenitySpaceType`: Optional, Exact Match
- `amenityAccess`: Optional, Exact Match

**2.5 Add missing fields: Marketing & Positioning**

- `luxuryTier`: Optional dropdown, Exact Match
- `targetMarket`: Optional text, Semantic Match < 80%
- `competitivePosition`: Optional dropdown, Exact Match
- `unitPlanDescription`: Optional textarea, Semantic Match < 60%

### Section 3: Financial Details

**3.1 Uses of Funds - Add missing fields**

- `totalProjectCost`: Required, derived, must equal sum of Uses, > 1.0% difference
- `capexBudget`: Optional, > 5.0% difference, Warn if > 0 for Ground-up
- `purchasePrice`: Required, > 1.0% difference, Must be > 0 if Phase is "Acquisition"
- `constructionFees`: Optional, > 5.0% difference, Warn if > 10% of Hard Costs
- `aeFees`: Required, > 5.0% difference, Warn if > 8% of Hard Costs
- `thirdPartyReports`: Optional, > 5.0% difference
- `legalAndOrg`: Optional, > 5.0% difference
- `titleAndRecording`: Optional, > 5.0% difference
- `taxesDuringConstruction`: Optional, > 5.0% difference
- `loanFees`: Required, > 5.0% difference, Warn if missing
- `ffe`: Optional, > 5.0% difference
- `workingCapital`: Optional, > 5.0% difference
- `opDeficitEscrow`: Optional, > 5.0% difference
- `leaseUpEscrow`: Optional, > 5.0% difference
- `relocationCosts`: Optional, > 5.0% difference
- `syndicationCosts`: Optional, > 5.0% difference
- `enviroRemediation`: Optional, > 5.0% difference, Warn if `phaseIESAFinding` is REC and this is 0
- `pfcStructuringFee`: Optional, > 5.0% difference, Warn if `taxExemption` is True and this is 0
- `capitalUseTiming`: Table, sum must equal TDC

**3.2 Sources of Funds - Add missing fields**

- `totalCapitalization`: Required, derived, must equal `totalUses`, > 1.0% difference
- `taxCreditEquity`: Already exists, add: Warn if > 0 and no Tax Credits selected
- `equityCommittedPercent`: Optional percent, > 5.0% points
- `equityContribution`: Derived, must equal `totalCapitalization` - Debt, > 1.0% difference

**3.3 Loan Terms & Structure - Add missing fields**

- `lender`: Optional text, Exact Match
- `floorRate`: Optional percent, > 0.125% points, Warn if > `interestRate`
- `interestRateType`: Required dropdown, Exact Match, If "Floating", `floorRate` recommended
- `interestOnlyPeriod`: Optional integer, Exact Match, Must be <= `requestedTerm` * 12
- `extensions`: Optional text, Exact Match
- `targetLtvPercent`: Already exists
- `targetLtcPercent`: Already exists
- `loanToCost`: Derived percent, Loan / TDC, > 1.0% points
- `prepaymentTerms`: Optional text, Semantic Match < 80%
- `prepaymentPremium`: Optional currency, > 5.0% difference
- `originationFee`: Optional percent, > 0.1% points
- `exitFee`: Optional percent, > 0.1% points
- `completionGuaranty`: Optional text, Exact Match
- `allInRate`: Already exists
- `targetCloseDate`: Already exists
- `useOfProceeds`: Optional textarea, Semantic Match < 60%

**3.4 Operating Expenses - Add missing/update fields**

- `taxInsuranceRes`: Optional currency, > 5.0% difference
- `utilitiesCosts`: Required, > 5.0% difference (already exists as `utilitiesCosts`)
- `repairsAndMaintenance`: Required, > 5.0% difference (already exists)
- `generalAndAdmin`: Required, > 5.0% difference (already exists)
- `payroll`: Required, > 5.0% difference (need to verify field name)
- `capExReserve`: Optional currency, > 5.0% difference
- `marketingLeasing`: Already exists as `marketingLeasing`
- `serviceCoordination`: Already exists
- `totalOpExpenses`: Derived, must equal sum of expenses, > 1.0% difference

**3.5 Investment Metrics & Exit - Add missing fields**

- `propertyNoiT12`: Optional currency, > 5.0% difference
- `stabilizedNoiProjected`: Required, > 5.0% difference, Should be > `noiYear1`
- `debtYield`: Already exists
- `debtService`: Derived currency, Annual P&I, > 1.0% difference
- `irr`: Required percent, > 0.5% points, Warn if < 10%
- `equityMultiple`: Required decimal, > 0.1 difference, Warn if < 1.5x
- `trendedNoiYear1`: Optional currency, > 2.0% difference
- `untrendedNoiYear1`: Optional currency, > 2.0% difference
- `trendedYield`: Optional derived percent, Trended NOI / Cost, > 0.1% points
- `untrendedYield`: Optional derived percent, Untrended NOI / Cost, > 0.1% points
- `inflationAssumption`: Already exists, update: Warn if > 5% or < 1%
- `dscrStressTest`: Already exists
- `ltvStressMax`: Optional percent, > 1.0% points (field exists)
- `dscrStressMin`: Optional decimal, > 0.05 difference (field exists)
- `portfolioLtv`: Optional percent, > 5.0% points
- `portfolioDscr`: Optional decimal, > 0.1 difference
- `businessPlanSummary`: Required textarea, Semantic Match < 60%, Warn if empty

**3.6 Risk Analysis - Add missing fields**

- `riskHigh`: Optional list
- `riskMedium`: Optional list
- `riskLow`: Optional list

### Section 4: Market Context

**4.1 Demographics & Economy - Add missing fields**

- `population1Mi`: Optional integer, > 10.0% difference
- `population5Mi`: Optional integer, > 10.0% difference
- `projGrowth5Yr`: Optional percent, > 0.5% points
- `popGrowth201020`: Optional percent, > 0.5% points
- `medianIncome1Mi`: Optional currency, > 10.0% difference
- `medianIncome5Mi`: Optional currency, > 10.0% difference
- `medianAge1Mi`: Optional integer, > 2 Years
- `medianAge3Mi`: Optional integer, > 2 Years
- `medianAge5Mi`: Optional integer, > 2 Years
- `incomeGrowth5Yr`: Optional percent, > 0.5% points
- `jobGrowth5Yr`: Optional percent, > 0.5% points
- `renterShare`: Optional percent, > 2.0% points
- `bachelorsShare`: Optional percent, > 2.0% points
- `renterOccupiedPercent`: Already exists
- `largestEmployer`: Optional text, Exact Match
- `employerConcentration`: Optional percent, > 2.0% points, Warn if > 20%
- `majorEmployers`: Optional list, Set Similarity < 80%
- `crimeRiskLevel`: Optional dropdown, Exact Match

**4.2 Location & Connectivity - Add missing fields**

- `submarketName`: Required text, Exact Match
- `walkabilityScore`: Already exists
- `infrastructureCatalyst`: Optional text, Semantic Match < 80%
- `broadbandSpeed`: Optional text, Exact Match
- `distanceToCbd`: Optional decimal, > 0.5 Difference
- `distanceToEmployment`: Optional decimal, > 0.5 Difference
- `distanceToTransit`: Optional decimal, > 0.2 Difference

**4.3 Supply & Demand - Add missing fields**

- `captureRate`: Optional percent, > 1.0% points, Warn if > 20%
- `currentInventory`: Optional integer, > 5.0% difference
- `underConstruction`: Optional integer, > 5.0% difference
- `planned24Months`: Optional integer, > 5.0% difference
- `averageOccupancy`: Optional percent, > 1.0% points
- `deliveryByQuarter`: Table
- `marketConcessions`: Optional text, Exact Match
- `northStarComp`: Optional text, Exact Match
- `substantialComp`: Optional text, Exact Match
- `rentComps`: Required table
- `avgCapRate`: Optional percent, > 0.25% points
- `rentPremium`: Optional derived percent, Subject vs Market, > 2.0% points
- `qualityTier`: Optional dropdown, Exact Match
- `competitionLevel`: Optional dropdown, Exact Match
- `demandTrend`: Optional dropdown, Exact Match
- `marketStatus`: Optional dropdown, Exact Match
- `supplyPressure`: Optional dropdown, Exact Match
- `rentGrowth`: Optional percent, > 0.5% points
- `marketOverviewSummary`: Optional textarea, Semantic Match < 60%

### Section 5: Special Considerations

**5.1 Affordable Housing & Compliance - Add missing fields**

- `amiTargetPercent`: Already exists, update: Required if `affordableHousing` is True
- `relocationPlan`: Optional dropdown, Exact Match

**5.2 Incentives & Tax Credits - Add missing fields**

- `exemptionStructure`: Already referenced, add check: Required if `taxExemption` is True
- `sponsoringEntity`: Optional text, Exact Match
- `exemptionTerm`: Optional integer, Exact Match
- `incentiveStacking`: Optional text, Exact Match
- `tifDistrict`: Optional boolean, Exact Match
- `taxAbatement`: Optional boolean, Exact Match
- `paceFinancing`: Optional boolean, Exact Match
- `historicTaxCredits`: Optional boolean, Exact Match
- `newMarketsCredits`: Optional boolean, Exact Match
- `seismicPmlRisk`: Optional percent, > 1.0% points, Warn if > 20% (note: appears twice in metadata)
- `totalIncentiveValue`: Optional derived currency, Total $, > 5.0% difference
- `specialProgramsDesc`: Optional textarea, Semantic Match < 60%
- `impactFees`: Optional currency, > 5.0% difference

### Section 6: Timeline & Milestones

**6.1 Key Dates - Add missing fields**

- `verticalStart`: Required date, > 14 Days, Must be > `groundbreaking`
- `firstOccupancy`: Required date, > 30 Days, Must be > `verticalStart`
- `landAcqStatus`: Optional dropdown, Exact Match
- `entitlementsStatus`: Optional dropdown, Exact Match
- `groundbreakingStatus`: Optional dropdown, Exact Match
- `verticalStartStatus`: Optional dropdown, Exact Match
- `firstOccupancyStatus`: Optional dropdown, Exact Match
- `completionStatus`: Optional dropdown, Exact Match
- `stabilizationStatus`: Optional dropdown, Exact Match

**6.2 Entitlements & Permitting - Add missing fields**

- `entitlementsDate`: Optional date, > 30 Days
- `finalPlans`: Required text, Exact Match

**6.3 Construction & Lease-Up Status - Add missing fields**

- `preLeasedSF`: Already exists
- `drawSchedule`: Table
- `absorptionProjection`: Already exists

### Section 7: Site & Context

**7.1 Land & Zoning - Add missing fields**

- `parcelNumber`: Already covered in Section 1
- `expectedZoningChanges`: Already exists
- `allowableFar`: Required decimal, > 0.1 Difference (may be `farUtilizedPercent` or separate field)
- `densityBonus`: Optional boolean, Exact Match (may already exist)
- `greenSpace`: Optional integer, > 5.0% difference
- `setbackFront`: Optional integer, Exact Match
- `setbackSide`: Optional integer, Exact Match
- `setbackRear`: Optional integer, Exact Match
- `greenSpaceRatio`: Optional derived percent, Green/Site %, > 1.0% points
- `storyHeight`: Optional integer, Exact Match
- `heightLimit`: Optional integer, Exact Match
- `actualHeight`: Optional integer, Exact Match, Must be <= `heightLimit` (unless variance)
- `zoningCompliant`: Required dropdown, Exact Match, Warn if Non-Compliant

**7.2 Physical Characteristics & Access - Add missing fields**

- `currentSiteStatus`: Required dropdown, Exact Match
- `topography`: Required dropdown, Exact Match
- `soilConditions`: Optional text, Semantic Match < 60%
- `accessPoints`: Optional text, Exact Match
- `siteAccess`: Optional text, Semantic Match < 80%
- `proximityShopping`: Optional text, Semantic Match < 80%
- `adjacentLandUse`: Required text, Semantic Match < 80%
- `viewCorridors`: Optional text, Semantic Match < 80%

**7.3 Environmental & Hazards - Add missing fields**

- `wetlandsPresent`: Required boolean, Exact Match, If True, permits check
- `seismicRisk`: Required dropdown, Exact Match
- `seismicPmlRisk`: Optional percent (already covered in 5.2)
- `noiseFactors`: Optional text, Semantic Match < 80%

**7.4 Infrastructure & Utilities - Add missing fields**

- `utilityAvailability`: Required dropdown, Exact Match, If None, warn
- `easements`: Required text, Semantic Match < 80%

### Section 8: Sponsor Information

**8.1 Entity Structure - Add missing fields**

- `sponsorStructure`: Required text, Exact Match
- `equityPartner`: Optional text, Exact Match
- `contactInfo`: Required textarea

**8.2 Track Record - Add missing fields**

- `sponsorExpScore`: Optional derived integer, 0-10, Exact Match
- `portfolioDscr`: Already covered in 3.5, add: Warn if < 1.2

**8.3 Financial Strength - Add missing fields**

- `portfolioLtv`: Already covered in 3.5, add: Warn if > 75%

### Helper Functions Needed

1. `_check_commercial_space_mix_sum(v, data)` - Verify commercial space mix table sums to totalCommercialGRSF
2. `_check_capital_use_timing_sum(v, data)` - Verify capital use timing table sums to TDC
3. `_check_total_op_expenses_sum(v, data)` - Verify total operating expenses equals sum
4. `_check_parcel_number_format(v)` - Validate parcel number format
5. `_check_derived_debt_service(v, data)` - Calculate and verify debt service
6. `_check_derived_trended_yield(v, data)` - Calculate and verify trended yield
7. `_check_derived_untrended_yield(v, data)` - Calculate and verify untrended yield

### Implementation Notes

1. Field names should match the camelCase format used in the codebase (e.g., `masterPlanName`, `parcelNumber`)
2. For fields that already exist, review and update as needed rather than duplicate
3. For derived fields, ensure `derived_from` is properly set
4. For table fields, logic checks will need to handle array/table structures
5. Some fields may have slightly different names in the actual codebase - verify against field metadata file
6. Threshold values should match the requirements provided by the user
7. Logic checks should return None when check passes, or a warning message string when it fails