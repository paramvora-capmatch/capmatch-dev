---
name: Convert OM Frontend to Flat Fields Only
overview: Convert all OM frontend pages to use flat fields only, add missing flat fields to schema, update frontend pages to read from flat fields, and ensure AI insights are properly configured.
todos: []
---

# Convert OM Frontend to Flat Fields Only

## Overview

The OM frontend currently expects nested data structures (`marketContextDetails.demographicProfile`, `marketContextDetails.supplyAnalysis`, `marketContextDetails.majorEmployers`, `capitalStackData`, `dealSnapshotDetails.riskMatrix`) that don't exist in the backend. All data is stored flat. This plan converts all pages to read from flat fields, adds missing fields to the schema, and ensures AI insights are properly configured.

## Current State Analysis

### Pages Using Nested Structures (Need Conversion)

1. **Demographics Page** (`Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`)

- Expects: `marketContextDetails.demographicProfile.{oneMile, threeMile, fiveMile, growthTrends}`
- Has: `population3Mi`, `medianHHIncome`, `projGrowth202429`
- Missing: `population1Mi`, `population5Mi`, `medianIncome1Mi`, `medianIncome5Mi`, `medianAge*`, `incomeGrowth5yr`, `jobGrowth5yr`, `renterShare`, `bachelorsShare`

2. **Supply-Demand Page** (`Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`)

- Expects: `marketContextDetails.supplyAnalysis.{currentInventory, underConstruction, planned24Months, averageOccupancy, deliveryByQuarter}`
- Missing: All fields

3. **Employment Page** (`Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`)

- Expects: `marketContextDetails.majorEmployers[]`
- Missing: `majorEmployers` array field

4. **Capital Stack Page** (`Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`)

- Expects: `capitalStackData.{base, upside, downside}.{sources, uses, debtTerms}`
- Has: All individual fields exist flat, but page expects nested structure

5. **Risk Analysis Page** (`Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx`)

- Expects: `dealSnapshotDetails.riskMatrix.{high, medium, low}[]`
- Missing: `riskHigh`, `riskMedium`, `riskLow` array fields (or single `riskMatrix` array with severity field)

6. **Deal Snapshot Overview Page** (`Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx`)

- Also references: `dealSnapshotDetails.riskMatrix` for risk count
- Needs: Same flat fields as Risk Analysis page

### Pages Already Using Flat Fields (Correct)

- Sources & Uses Page - builds from flat fields ✅
- Sponsor Profile Page - builds from flat fields ✅
- Returns Page - builds from flat fields ✅
- Market Context Overview - has fallbacks ✅

## Implementation Plan

### Phase 1: Add Missing Flat Fields to Schema

#### 1.1 Demographics Fields

Add to `Backend/schemas/json/enhanced-project-form.schema.json`:

- `population1Mi` (number) - Population within 1-mile radius
- `population5Mi` (number) - Population within 5-mile radius
- `medianIncome1Mi` (number) - Median income within 1-mile radius
- `medianIncome5Mi` (number) - Median income within 5-mile radius
- `medianAge1Mi` (number) - Median age within 1-mile radius
- `medianAge3Mi` (number) - Median age within 3-mile radius
- `medianAge5Mi` (number) - Median age within 5-mile radius
- `incomeGrowth5yr` (number) - 5-year income growth percentage
- `jobGrowth5yr` (number) - 5-year job growth percentage
- `renterShare` (string) - Renter share percentage (e.g., "76.7% (3-mi)")
- `bachelorsShare` (string) - Bachelor's degree share percentage (e.g., "50.2% (3-mi)")

**Location**: Add to section 4.1 "Demographics & Economy" subsection and main "Market Context" fields array.

#### 1.2 Supply-Demand Fields

Add to schema:

- `currentInventory` (number) - Current inventory units
- `underConstruction` (number) - Units under construction
- `planned24Months` (number) - Units planned in next 24 months
- `averageOccupancy` (string) - Average occupancy percentage (e.g., "94.2%")
- `deliveryByQuarter` (array) - Array of `{quarter: string, units: number}` objects

**Location**: Add to section 4.3 "Supply & Demand" subsection and main "Market Context" fields array.

#### 1.3 Employment Fields

Add to schema:

- `majorEmployers` (array) - Array of `{name: string, employees: number, growth: string, distance: string}` objects

**Location**: Add to section 4.1 "Demographics & Economy" subsection and main "Market Context" fields array.

#### 1.4 Risk Analysis Fields

Add to schema:

- `riskHigh` (array) - Array of `{risk: string, mitigation: string, probability: string}` objects for high-severity risks
- `riskMedium` (array) - Array of `{risk: string, mitigation: string, probability: string}` objects for medium-severity risks
- `riskLow` (array) - Array of `{risk: string, mitigation: string, probability: string}` objects for low-severity risks

**Alternative approach**: Single `riskMatrix` array field with `{risk: string, mitigation: string, probability: string, severity: "high" | "medium" | "low"}` objects, then filter by severity in frontend.

**Location**: Add to section 3 "Deal Snapshot" or create new subsection 3.4 "Risk Analysis" and add to main "Deal Snapshot" fields array.

### Phase 2: Update Extraction Service

Update `Backend/services/extraction_service.py`:

- Add new fields to appropriate type lists (`number`, `string`, `array`)
- For `deliveryByQuarter`, `majorEmployers`, and risk arrays (`riskHigh`, `riskMedium`, `riskLow`), ensure they're treated as arrays in schema generation

### Phase 3: Update Field Section Mapping

Update `Backend/services/field_section_mapping.py`:

- Add mappings for all new fields to appropriate sections (mostly "market-context")

### Phase 4: Update Frontend Pages

#### 4.1 Demographics Page

Update `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`:

- Remove nested structure access (`marketContextDetails.demographicProfile`)
- Read directly from `content`:
- `content?.population1Mi`, `content?.population3Mi`, `content?.population5Mi`
- `content?.medianIncome1Mi`, `content?.medianHHIncome`, `content?.medianIncome5Mi`
- `content?.medianAge1Mi`, `content?.medianAge3Mi`, `content?.medianAge5Mi`
- `content?.incomeGrowth5yr`, `content?.jobGrowth5yr` (use `projGrowth202429` as fallback for population growth)
- `content?.renterShare`, `content?.bachelorsShare`
- Read insights from `insights` object:
- `insights?.demographicStrength1/2/3`
- `insights?.demographicOpportunity1/2/3`
- `insights?.targetDemographic1/2/3`

#### 4.2 Supply-Demand Page

Update `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`:

- Remove nested structure access (`marketContextDetails.supplyAnalysis`)
- Read directly from `content`:
- `content?.currentInventory`
- `content?.underConstruction`
- `content?.planned24Months`
- `content?.averageOccupancy`
- `content?.deliveryByQuarter` (array)

#### 4.3 Employment Page

Update `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`:

- Remove nested structure access (`marketContextDetails.majorEmployers`)
- Read directly from `content`:
- `content?.majorEmployers` (array)
- Read insights from `insights` object:
- `insights?.employmentStrength1/2/3`
- `insights?.employmentOpportunity1/2/3`
- `insights?.targetMarket1/2/3`

#### 4.4 Capital Stack Page

Update `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`:

- Remove nested structure access (`content?.capitalStackData`)
- Build `capitalStackData` object from flat fields:
- **Sources**: Build from `loanAmountRequested`, `sponsorEquity`, `taxCreditEquity`, `gapFinancing`
- **Uses**: Build from `landAcquisition`, `baseConstruction`, `contingency`, `constructionFees`, `aeFees`, `developerFee`, `interestReserve`, `workingCapital`, `opDeficitEscrow`, etc.
- **Debt Terms**: Build from `loanType`, `lender`, `interestRate`, `floorRate`, `requestedTerm`, `extensions`, `recourse`, `originationFee`, `exitFee`, `interestReserve`, `taxInsuranceReserve`, `capExReserve`
- **Total Capitalization**: Use `content?.totalCapitalization` or calculate from sources
- **Scenarios**: Build base/upside/downside from flat fields (similar to Returns page)

#### 4.5 Risk Analysis Page

Update `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx`:

- Remove nested structure access (`dealSnapshotDetails.riskMatrix`)
- Read directly from `content`:
  - `content?.riskHigh` (array)
  - `content?.riskMedium` (array)
  - `content?.riskLow` (array)
- Build `riskMatrix` object from flat arrays:
  ```typescript
  const riskMatrix = {
    high: content?.riskHigh ?? [],
    medium: content?.riskMedium ?? [],
    low: content?.riskLow ?? []
  };
  ```

- Read insights from `insights` object:
  - `insights?.riskMitigation1/2/3`
  - `insights?.riskMonitoring1/2/3`

#### 4.6 Deal Snapshot Overview Page

Update `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx`:

- Remove nested structure access (`dealSnapshotDetails.riskMatrix`)
- Calculate risk count from flat arrays:
  ```typescript
  const riskCount = (content?.riskHigh?.length ?? 0) + (content?.riskMedium?.length ?? 0);
  ```


### Phase 5: Update Mock Data

Update `Backend/misc/mock_data/project_resume_mock_complete.json`:

- Add sample values for all new fields
- Ensure `deliveryByQuarter`, `majorEmployers`, and risk arrays (`riskHigh`, `riskMedium`, `riskLow`) have sample data

### Phase 6: Verify AI Insights

Verify `Backend/services/om_insight_service.py`:

- Confirm `demographicStrength`, `demographicOpportunity`, `targetDemographic` insights are configured ✅
- Confirm `employmentStrength`, `employmentOpportunity`, `targetMarket` insights are configured ✅
- Confirm `riskMitigation` and `riskMonitoring` insights are configured ✅
- No changes needed - insights already exist

### Phase 7: Update Market Context Overview Page

Update `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx`:

- Remove fallback to nested structure (keep only flat field access)
- Update to use new flat fields where applicable

## Files to Modify

### Backend

1. `Backend/schemas/json/enhanced-project-form.schema.json` - Add field definitions
2. `Backend/services/extraction_service.py` - Add type definitions
3. `Backend/services/field_section_mapping.py` - Add field mappings
4. `Backend/misc/mock_data/project_resume_mock_complete.json` - Add sample data

### Frontend

1. `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx` - Convert to flat fields
2. `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx` - Convert to flat fields
3. `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx` - Convert to flat fields
4. `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx` - Build from flat fields
5. `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx` - Convert to flat fields
6. `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx` - Update risk count calculation
7. `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx` - Remove nested fallbacks

## Testing Checklist

- [ ] Demographics page displays all radius data (1mi, 3mi, 5mi)
- [ ] Growth trends display correctly
- [ ] Supply-demand page displays all metrics
- [ ] Employment page displays major employers list
- [ ] Capital stack page builds scenarios from flat fields
- [ ] Risk analysis page displays all risk categories (high, medium, low)
- [ ] Deal snapshot overview page shows correct risk count
- [ ] All insights display correctly
- [ ] Mock data populates all fields
- [ ] No console errors related to undefined nested structures

## Notes

- All data is already stored flat in the database (confirmed in `om_sync_service.py`)
- No backend transformation needed - frontend just needs to read flat fields
- AI insights are already configured - no changes needed
- Capital stack scenarios (base/upside/downside) may need calculation logic similar to Returns page
- Risk arrays can be stored as separate arrays (`riskHigh`, `riskMedium`, `riskLow`) or as a single `riskMatrix` array with severity field - choose based on extraction ease