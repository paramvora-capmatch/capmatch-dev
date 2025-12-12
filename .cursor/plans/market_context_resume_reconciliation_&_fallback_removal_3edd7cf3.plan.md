---
name: Market Context Resume Reconciliation & Fallback Removal
overview: Reconcile hardcoded market-context fields with project resume by linking existing fields, adding derivable/computed fields (calculated in backend), handling AI-generated insights (Category 3), and removing all fallback text values from market-context pages (demographics, employment, supply-demand, regulatory-incentives).
todos:
  - id: add-backend-market-status
    content: Add marketStatus calculation to Backend/services/calculation_service.py based on occupancy and supply metrics
    status: completed
  - id: add-backend-supply-pressure
    content: Add supplyPressure calculation to Backend/services/calculation_service.py based on months of supply
    status: completed
  - id: add-backend-total-incentive
    content: Add totalIncentiveValue calculation to Backend/services/calculation_service.py (sum of all incentive values)
    status: completed
  - id: add-schema-market-status
    content: Add marketStatus field to resume schema Section 4
    status: completed
  - id: add-schema-supply-pressure
    content: Add supplyPressure field to resume schema Section 4
    status: completed
  - id: add-schema-total-incentive
    content: Add totalIncentiveValue field to resume schema Section 5
    status: completed
  - id: verify-backend-insights-generation
    content: Verify backend AI insights generation includes demographicStrength1-3, demographicOpportunity1-3, targetDemographic1-3, employmentStrength1-3, employmentOpportunity1-3, targetMarket1-3, supplyStrength1-3, marketOpportunity1-3, riskFactor1-3 in database insights column
    status: completed
  - id: update-main-page-total-incentive
    content: Update main market-context page.tsx to use content?.totalIncentiveValue instead of calculating in frontend
    status: completed
    dependencies:
      - add-backend-total-incentive
      - add-schema-total-incentive
  - id: update-demographics-insights
    content: Update demographics page to use insights/content for demographicStrength1, demographicOpportunity1-3, targetDemographic1-3 instead of hardcoded fallbacks
    status: completed
    dependencies:
      - verify-backend-insights-generation
  - id: update-employment-insights
    content: Update employment page to use insights/content for employmentStrength1-3, employmentOpportunity1-3, targetMarket1-3 instead of hardcoded fallbacks
    status: completed
    dependencies:
      - verify-backend-insights-generation
  - id: update-supply-demand-status
    content: Update supply-demand page to use insights/content for marketStatus, supplyPressure instead of OMEmptyState fallbacks
    status: completed
    dependencies:
      - add-backend-market-status
      - add-backend-supply-pressure
      - add-schema-market-status
      - add-schema-supply-pressure
  - id: update-supply-demand-insights
    content: Update supply-demand page to use insights/content for supplyStrength1-3, marketOpportunity1-3, riskFactor1-3 instead of hardcoded fallbacks
    status: completed
    dependencies:
      - verify-backend-insights-generation
  - id: remove-demographics-fallbacks
    content: Remove all hardcoded fallback text from demographics/page.tsx
    status: completed
    dependencies:
      - update-demographics-insights
  - id: remove-employment-fallbacks
    content: Remove all hardcoded fallback text from employment/page.tsx
    status: completed
    dependencies:
      - update-employment-insights
  - id: remove-supply-demand-fallbacks
    content: Remove all hardcoded fallback values and OMEmptyState fallbacks from supply-demand/page.tsx
    status: completed
    dependencies:
      - update-supply-demand-status
      - update-supply-demand-insights
---

# Market Context Resume Reconciliation & Fallback Text Removal Plan

## Overview

This plan addresses four tasks for market-context pages:

1. **Category 1 Fields**: Link hardcoded values to existing resume fields
2. **Category 2 Fields**: Add derivable fields to resume schema and calculate in backend
3. **Category 3 Fields**: Handle AI-generated insights using existing OM insights architecture
4. **Remove Fallback Text**: Eliminate all fallback text values from market-context pages

## Architecture Notes

- **OM Insights Architecture**: Already present via `useOmContent()` hook which provides `{ content, insights }` object
- **AI Insights Storage**: AI-generated insights are stored in the database `insights` column for the OM, NOT in the resume schema
- **Resume Content**: The `content` object contains resume fields from the project resume schema
- **Insights Content**: The `insights` object contains AI-generated fields from the database `insights` column
- **Derived Fields**: All calculations must be done in `Backend/services/calculation_service.py` and stored in resume (content)
- **Frontend**: Should only read from resume fields (content) or insights (database), never calculate on-the-fly
- **Schema Fields**: Many fields already exist in `Backend/schemas/json/enhanced-project-form.schema.json` (for resume content only)

## Part 1: Category 1 Fields - Link Existing Resume Fields

### 1.1 Demographics Page - Income Tier Thresholds

- **File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`
- **Current Issue**: Lines 277-280: Hardcoded income tier thresholds `$40K`, `$60K`, `$80K`, `$100K+`
- **Solution**: These are UI display thresholds, not data fields. Should be configurable or removed if not needed. If they represent actual income bands, add fields to schema.
- **Change**: Either remove hardcoded thresholds or add `incomeTierThresholds` array to schema/insights

### 1.2 Employment Page - Market Impact Thresholds

- **File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`
- **Current Issue**: Lines 169-175: Hardcoded employee count thresholds (10000, 5000, 2000) for "Major", "Significant", "Moderate" classifications
- **Solution**: These are UI logic thresholds. Should be configurable constants or derived from market data.
- **Change**: Move thresholds to constants or add `marketImpactThresholds` to schema/insights

### 1.3 Supply-Demand Page - Market Status Fields

- **File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`
- **Current Issue**: Lines 352, 358, 364: Using `OMEmptyState` fallbacks for `marketStatus`, `demandTrend`, `supplyPressure`
- **Resume Fields**: `demandTrend` exists in schema (line 1780), but `marketStatus` and `supplyPressure` need to be added
- **Change**: Use `insights?.marketStatus ?? content?.marketStatus ?? null` (and same for `supplyPressure`)

## Part 2: Category 2 Fields - Add to Resume & Calculate in Backend

### 2.1 Supply-Demand - Market Status (Backend Calculation Required)

**Current**: Fallback to OMEmptyState

**Solution**: Calculate in backend based on occupancy and supply metrics

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Field**: `marketStatus` (Text: "Tight", "Balanced", "Soft", "Oversupplied")
- **Calculation Logic**:
- Compare occupancy vs market average (95%+ = "Tight", 90-95% = "Balanced", 85-90% = "Soft", <85% = "Oversupplied")
- Consider supply pipeline vs absorption rate
- Determine market status
- **Schema Update**: Add to Section 4 (Market Context) in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read from resume
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx` (line 352)

### 2.2 Supply-Demand - Supply Pressure (Backend Calculation Required)

**Current**: Fallback to OMEmptyState

**Solution**: Calculate in backend based on supply/demand balance

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Field**: `supplyPressure` (Text: "High", "Moderate", "Low")
- **Calculation Logic**:
- Calculate months of supply: `(currentInventory + underConstruction + planned24Months) / absorptionRate`
- <6 months = "Low" pressure
- 6-12 months = "Moderate" pressure
- >12 months = "High" pressure
- **Schema Update**: Add to Section 4 (Market Context)
- **Frontend**: Read from resume
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx` (line 364)

### 2.3 Regulatory-Incentives - Total Incentive Value (Backend Calculation Required)

**Current**: Calculated in frontend (line 57-60 of main page.tsx)

**Solution**: Calculate in backend, store in resume

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Field**: `totalIncentiveValue` (Number, $)
- **Calculation Logic**:
- Sum all incentive values (tax exemption value, abatement value, TIF value, etc.)
- Store as single calculated field
- **Schema Update**: Add to Section 5 (Special Considerations)
- **Frontend**: Read from resume instead of calculating
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx` (lines 57-60)

### 2.4 Regulatory-Incentives - Impact Fees

**Current**: Read from content (line 56 of main page.tsx)

**Solution**: Verify field exists in schema, if not add it

- **Resume Field**: `impactFees` (Text/Number)
- **Schema Update**: Verify exists in Section 5, add if missing
- **Frontend**: Already reading from content correctly

## Part 3: Category 3 Fields - AI-Generated Insights

**Architecture**: OM insights are already available via `useOmContent()` hook which returns `{ content, insights }`. The `insights` object contains AI-generated fields stored in the database `insights` column for the OM. These fields are NOT part of the resume schema.

**Important**: AI insights are generated by the backend and stored in the database `insights` column. They are NOT added to the resume schema. The frontend reads them via the `insights` object from `useOmContent()`.

### 3.1 Demographics - Market Insights

**Current**: Hardcoded fallback text in demographics page

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`
- **Lines 306-311**: `demographicStrength1` with fallback `'Young professional demographic'`
- **Lines 318-329**: `demographicOpportunity1-3` with hardcoded fallbacks
- **Lines 336-347**: `targetDemographic1-3` with hardcoded fallbacks
- **Implementation**: 
- Use `insights?.demographicStrength1 ?? content?.demographicStrength1 ?? null` (remove fallback text)
- Use `insights?.demographicOpportunity1 ?? content?.demographicOpportunity1 ?? null` (remove fallback text)
- Use `insights?.targetDemographic1 ?? content?.targetDemographic1 ?? null` (remove fallback text)
- **Backend**: Ensure AI insights generation includes these fields in the database `insights` column
- **Note**: These fields are NOT added to the resume schema - they exist only in the database `insights` column

### 3.2 Employment - Market Impact Analysis

**Current**: Hardcoded fallback text in employment page

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`
- **Lines 260-272**: `employmentStrength1-3` with hardcoded fallbacks
- **Lines 278-290**: `employmentOpportunity1-3` with hardcoded fallbacks
- **Lines 296-308**: `targetMarket1-3` with hardcoded fallbacks
- **Implementation**: 
- Use `insights?.employmentStrength1 ?? content?.employmentStrength1 ?? null` (remove fallback text)
- Use `insights?.employmentOpportunity1 ?? content?.employmentOpportunity1 ?? null` (remove fallback text)
- Use `insights?.targetMarket1 ?? content?.targetMarket1 ?? null` (remove fallback text)
- **Backend**: Ensure AI insights generation includes these fields in the database `insights` column
- **Note**: These fields are NOT added to the resume schema - they exist only in the database `insights` column

### 3.3 Supply-Demand - Market Insights

**Current**: Hardcoded fallback text in supply-demand page

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`
- **Lines 387-399**: `supplyStrength1-3` with hardcoded fallbacks
- **Lines 407-419**: `marketOpportunity1-3` with hardcoded fallbacks
- **Lines 425-436**: Hardcoded risk factors list (should be `riskFactor1-3`)
- **Implementation**: 
- Use `insights?.supplyStrength1 ?? content?.supplyStrength1 ?? null` (remove fallback text)
- Use `insights?.marketOpportunity1 ?? content?.marketOpportunity1 ?? null` (remove fallback text)
- Replace hardcoded risk factors with `insights?.riskFactor1 ?? content?.riskFactor1 ?? null`
- **Backend**: Ensure AI insights generation includes these fields in the database `insights` column
- **Note**: These fields are NOT added to the resume schema - they exist only in the database `insights` column

## Part 4: Remove All Fallback Text Values

### 4.1 Main Market Context Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx`

- **Lines 57-60**: Remove frontend calculation of `totalIncentiveValue` - use `content?.totalIncentiveValue ?? null`
- All other fields already use proper null handling with `OMEmptyState` - these are acceptable

### 4.2 Demographics Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`

- **Line 309**: Remove hardcoded fallback `'Young professional demographic'` - use `insights?.demographicStrength1 ?? content?.demographicStrength1 ?? null`
- **Lines 319-321**: Remove hardcoded fallback text for `demographicOpportunity1-3`
- **Lines 337-339**: Remove hardcoded fallback text for `targetDemographic1-3`
- **Lines 277-280**: Remove or make configurable hardcoded income tier thresholds

### 4.3 Employment Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`

- **Lines 261-263**: Remove hardcoded fallback text for `employmentStrength1-3`
- **Lines 279-281**: Remove hardcoded fallback text for `employmentOpportunity1-3`
- **Lines 297-299**: Remove hardcoded fallback text for `targetMarket1-3`
- **Lines 169-175**: Move hardcoded market impact thresholds to constants or config

### 4.4 Supply-Demand Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`

- **Line 352**: Remove `|| <OMEmptyState />` - use `insights?.marketStatus ?? content?.marketStatus ?? null`
- **Line 358**: Remove `|| <OMEmptyState />` - use `insights?.demandTrend ?? content?.demandTrend ?? null` (already exists)
- **Line 364**: Remove `|| <OMEmptyState />` - use `insights?.supplyPressure ?? content?.supplyPressure ?? null`
- **Lines 388-390**: Remove hardcoded fallback text for `supplyStrength1-3`
- **Lines 408-410**: Remove hardcoded fallback text for `marketOpportunity1-3`
- **Lines 425-436**: Replace hardcoded risk factors list with `insights?.riskFactor1-3 ?? content?.riskFactor1-3 ?? null`

### 4.5 Regulatory-Incentives Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/market-context/regulatory-incentives/page.tsx`

- **Status**: Already clean - only displays data if it exists, no hardcoded fallbacks

## Implementation Order

1. **Backend Calculations**: Add market status, supply pressure, and total incentive value calculations to `Backend/services/calculation_service.py` (stored in resume)
2. **Update Resume Schema**: Add calculated fields to resume schema (market status, supply pressure, total incentive value) - NOT insight fields
3. **Verify Backend Insights**: Ensure backend AI insights generation includes all insight fields in database `insights` column
4. **Update Market Context Pages**: Link to resume fields (content) and insights (database) (Category 1, 2, 3)
5. **Remove All Fallback Text**: Eliminate fallback values systematically
6. **Test**: Verify each page handles missing data gracefully

## Files to Modify

### Backend Files

- `Backend/services/calculation_service.py` (add market status, supply pressure, and total incentive value calculations - stored in resume)
- `Backend/schemas/json/enhanced-project-form.schema.json` (add calculated fields: market status, supply pressure, total incentive value)
- Backend AI insights generation service (verify includes all insight fields in database `insights` column)

### Frontend Files

- `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx` (remove totalIncentiveValue calculation)
- `Frontend/src/app/project/om/[id]/dashboard/market-context/demographics/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/market-context/employment/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/market-context/regulatory-incentives/page.tsx` (verify no issues)

### Schema Fields to Add (Resume Schema Only)

**Section 4 (Market Context)**:

- `marketStatus` (Text/Dropdown: "Tight", "Balanced", "Soft", "Oversupplied") - Calculated, stored in resume
- `supplyPressure` (Text/Dropdown: "High", "Moderate", "Low") - Calculated, stored in resume

**Section 5 (Special Considerations)**:

- `totalIncentiveValue` (Number, $) - Calculated sum of all incentives, stored in resume
- `impactFees` (Text/Number) - Verify exists, add if missing

### AI Insights Fields (Database `insights` Column - NOT in Resume Schema)

These fields are generated by backend AI and stored in the database `insights` column. They are accessed via `useOmContent().insights`:

- `demographicStrength1-3` (Text) - AI-generated, stored in database `insights` column
- `demographicOpportunity1-3` (Text) - AI-generated, stored in database `insights` column
- `targetDemographic1-3` (Text) - AI-generated, stored in database `insights` column
- `employmentStrength1-3` (Text) - AI-generated, stored in database `insights` column
- `employmentOpportunity1-3` (Text) - AI-generated, stored in database `insights` column
- `targetMarket1-3` (Text) - AI-generated, stored in database `insights` column
- `supplyStrength1-3` (Text) - AI-generated, stored in database `insights` column
- `marketOpportunity1-3` (Text) - AI-generated, stored in database `insights` column
- `riskFactor1-3` (Text) - AI-generated, stored in database `insights` column

## Testing Considerations

- Test with missing data to ensure graceful null handling
- Verify backend market status calculation with various occupancy scenarios
- Ensure backend supply pressure calculation works with various supply/demand scenarios
- Test that removing fallbacks doesn't break UI when fields are empty
- Verify insights are properly generated by backend AI and stored in database `insights` column
- Verify insights are accessible via `useOmContent().insights` hook
- Test Category 3 fields (AI-generated) are displayed when available in `insights` object
- Ensure backend calculations (market status, supply pressure, total incentive value) are triggered on resume updates and stored in resume
- Test total incentive value calculation sums all incentive types correctly
- Verify market status and supply pressure display correctly when values are present in resume (content)
- Verify AI-generated insights display correctly when values are present in database `insights` column