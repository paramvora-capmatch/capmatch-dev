---
name: OM Resume Reconciliation & Fallback Removal
overview: Reconcile hardcoded OM fields with project resume by linking existing fields, adding derivable/computed fields (calculated in backend), handling AI-generated insights (Category 3), and removing all fallback text values from deal-snapshot pages.
todos:
  - id: add-backend-milestone-status
    content: Add milestoneStatus calculation to Backend/services/calculation_service.py for each milestone date field
    status: completed
  - id: add-backend-capital-timing
    content: Add capitalUseTiming calculation to Backend/services/calculation_service.py based on drawSchedule and milestone dates
    status: completed
  - id: add-backend-capital-labels
    content: Add capital source and use type label calculations to Backend/services/calculation_service.py
    status: completed
  - id: add-equity-description-field
    content: Add equityContributionDescription field to resume schema (Section 3.2 Sources of Funds)
    status: completed
  - id: add-category3-fields-schema
    content: Add Category 3 AI-generated fields to resume schema (exitStrategyRisk, exitStrategyMitigant, specialProgramsDescription, etc.)
    status: completed
  - id: update-milestones-status
    content: Update milestones page to use milestoneStatus from resume (calculated by backend) instead of hardcoded values
    status: completed
    dependencies:
      - add-backend-milestone-status
  - id: update-capital-timing
    content: Update capital-stack page to use capitalUseTiming from resume (calculated by backend) instead of hardcoded strings
    status: completed
    dependencies:
      - add-backend-capital-timing
  - id: update-capital-labels
    content: Update capital-stack page to use capital source/use labels from resume (calculated by backend) instead of hardcoded strings
    status: completed
    dependencies:
      - add-backend-capital-labels
  - id: link-origination-fee
    content: Link origination fee in page.tsx and key-terms/page.tsx to resume field (remove hardcoded 1.00%)
    status: completed
  - id: update-equity-description
    content: Update capital-stack page to use equityContributionDescription field instead of hardcoded text
    status: completed
    dependencies:
      - add-equity-description-field
  - id: update-category3-insights
    content: Update all pages to use insights from useOmContent() hook for Category 3 AI-generated fields
    status: completed
    dependencies:
      - add-category3-fields-schema
  - id: remove-capital-stack-fallbacks
    content: Remove all fallback text values from capital-stack/page.tsx (risk/mitigant fallbacks)
    status: completed
  - id: remove-risk-analysis-fallbacks
    content: Remove all fallback text values from risk-analysis/page.tsx (mitigation and monitoring fallbacks)
    status: completed
  - id: remove-key-terms-fallbacks
    content: Remove fallback text values from key-terms/page.tsx (origination fee and special programs description)
    status: completed
  - id: remove-milestones-fallbacks
    content: Remove fallback status values from milestones/page.tsx after implementing backend-calculated status
    status: completed
    dependencies:
      - update-milestones-status
  - id: remove-loan-type-fallback
    content: Remove Senior Loan fallback from capital-stack page and handle null gracefully
    status: completed
---

# OM Resume Reconciliation & Fallback Text Removal Plan

## Overview

This plan addresses four tasks:

1. **Category 1 Fields**: Link hardcoded values to existing resume fields
2. **Category 2 Fields**: Add derivable fields to resume schema and calculate in backend
3. **Category 3 Fields**: Handle AI-generated insights using existing OM insights architecture
4. **Remove Fallback Text**: Eliminate all fallback text values from deal-snapshot pages

## Architecture Notes

- **OM Insights Architecture**: Already present via `useOmContent()` hook which provides `insights` object
- **Derived Fields**: All calculations must be done in `Backend/services/calculation_service.py` and stored in resume
- **Frontend**: Should only read from resume fields, never calculate on-the-fly

## Part 1: Category 1 Fields - Link Existing Resume Fields

### 1.1 Origination Fee

- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx` (line 53)
- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/key-terms/page.tsx` (line 29)
- **Change**: Replace `"1.00%"` with `content?.originationFee ?? null`
- **Resume Field**: `originationFee` (Section 3.3)

### 1.2 Capital Sources & Uses

- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`
- **Change**: Already linked - verify all amounts come from resume fields (lines 25-65)
- **Resume Fields**: All in Section 3.1 (Uses) and 3.2 (Sources)

### 1.3 Special Programs

- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/key-terms/page.tsx` (lines 55-63)
- **Change**: Already linked - verify flags come from resume
- **Resume Fields**: `opportunityZone`, `taxExemption`, `affordableHousing`, etc. (Section 5)

### 1.4 Milestone Dates

- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx` (lines 63-67)
- **File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/milestones/page.tsx` (lines 28-34)
- **Change**: Already linked - verify all dates come from resume fields
- **Resume Fields**: All in Section 6.1 (Key Dates)

## Part 2: Category 2 Fields - Add to Resume & Calculate in Backend

### 2.1 Milestone Status (Backend Calculation Required)

**Current**: Hardcoded status values (`"completed"`, `"current"`, `"upcoming"`)

**Solution**: Calculate in backend, store in resume

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Fields**: Add `milestoneStatus` field for each milestone:
- `landAcqStatus` (calculated from `landAcqClose`)
- `entitlementsStatus` (calculated from `entitlementsDate`)
- `groundbreakingStatus` (calculated from `groundbreakingDate`)
- `verticalStartStatus` (calculated from `verticalStart`)
- `firstOccupancyStatus` (calculated from `firstOccupancy`)
- `completionStatus` (calculated from `completionDate`)
- `stabilizationStatus` (calculated from `stabilization`)
- **Calculation Logic**:
- Compare milestone date to current date
- `date < currentDate` → `"completed"`
- `date ≈ currentDate` (within 30 days) → `"current"`  
- `date > currentDate` → `"upcoming"`
- **Schema Update**: Add status fields to Section 6.1 in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read `content?.landAcqStatus ?? null` instead of hardcoded values
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/milestones/page.tsx` (lines 28-34)

### 2.2 Capital Use Timing (Backend Calculation Required)

**Current**: Hardcoded timing strings (`"Month 0"`, `"Months 1-24"`)

**Solution**: Calculate in backend, store in resume

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Fields**: Add `capitalUseTiming` object/mapping for each use type:
- Store as structured data: `{ "landAcquisition": "Month 0", "baseConstruction": "Months 1-24", ... }`
- Or add individual fields: `landAcqTiming`, `baseConstructionTiming`, etc.
- **Calculation Logic**:
- Use `drawSchedule` if available (already in resume Section 6.3)
- Otherwise, derive from dates:
- One-time costs (Land Acquisition, Interest Reserve, Working Capital, etc.) → `"Month 0"` or `"At Closing"`
- Construction period costs → Calculate from `groundbreakingDate` to `completionDate` → `"Months X-Y"`
- **Schema Update**: Add timing fields to Section 3.1 in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read from resume instead of hardcoded strings
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx` (lines 68-87)

### 2.3 Capital Source/Use Type Labels (Backend Calculation Required)

**Current**: Hardcoded type names (`"Sponsor Equity"`, `"Land Acquisition"`, etc.)

**Solution**: Calculate in backend, store in resume

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Fields**: Add type label fields for each capital source and use:
- **Capital Sources**: 
- `loanTypeLabel` (calculated from `loanType` field - e.g., "Senior Loan", "Mezzanine", etc.)
- `sponsorEquityLabel` (default: "Sponsor Equity")
- `taxCreditEquityLabel` (default: "Tax Credit Equity")
- `gapFinancingLabel` (default: "Gap Financing")
- **Capital Uses**:
- `landAcquisitionLabel` (default: "Land Acquisition")
- `baseConstructionLabel` (default: "Base Construction")
- `contingencyLabel` (default: "Contingency")
- `constructionFeesLabel` (default: "Construction Fees")
- `aeFeesLabel` (default: "A&E Fees")
- `developerFeeLabel` (default: "Developer Fee")
- `interestReserveLabel` (default: "Interest Reserve")
- `workingCapitalLabel` (default: "Working Capital")
- `opDeficitEscrowLabel` (default: "Op. Deficit Escrow")
- `leaseUpEscrowLabel` (default: "Lease-Up Escrow")
- `ffeLabel` (default: "FF&E")
- `thirdPartyReportsLabel` (default: "Third Party Reports")
- `legalAndOrgLabel` (default: "Legal & Org")
- `titleAndRecordingLabel` (default: "Title & Recording")
- `taxesDuringConstructionLabel` (default: "Taxes During Construction")
- `loanFeesLabel` (default: "Loan Fees")
- `relocationCostsLabel` (default: "Relocation Costs")
- `syndicationCostsLabel` (default: "Syndication Costs")
- `enviroRemediationLabel` (default: "Enviro. Remediation")
- `pfcStructuringFeeLabel` (default: "PFC Structuring Fee")
- **Calculation Logic**:
- For `loanTypeLabel`: Use `loanType` field value if available, otherwise use field metadata to generate label
- For all other labels: Use standardized labels from field metadata or default values
- Store labels in resume for consistency and to allow customization if needed
- **Schema Update**: Add label fields to Section 3.1 (Uses) and 3.2 (Sources) in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read from resume instead of hardcoded strings
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx` (lines 33-36, 68-87)

### 2.4 Equity Contribution Description (Needs New Field)

**Current**: Hardcoded `"Contribution: Cash & ground lease"`

**Solution**: Add new field to resume

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx` (line 231)
- **New Resume Field**:
- **Field ID**: `equityContributionDescription`
- **Section**: 3.2 Sources of Funds
- **Type**: Text/Textarea
- **Label**: "Equity Contribution Description"
- **Schema Update**: Add to `Backend/schemas/json/enhanced-project-form.schema.json` in Section 3.2
- **Implementation**: Replace hardcoded text with `content?.equityContributionDescription ?? null`

## Part 3: Category 3 Fields - AI-Generated Insights

**Architecture**: OM insights are already available via `useOmContent()` hook which returns `{ content, insights }`. The `insights` object contains AI-generated fields.

### 3.1 Exit Strategy Risk & Mitigant

**Current**: Hardcoded text in capital-stack page (lines 441-446)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx` (lines 441-446)
- **Implementation**: 
- Use `insights?.exitStrategyRisk ?? content?.exitStrategyRisk ?? null`
- Use `insights?.exitStrategyMitigant ?? content?.exitStrategyMitigant ?? null`
- **Schema Update**: Add to `Backend/schemas/json/enhanced-project-form.schema.json` in Section 3.6 (Risk Analysis) as optional fields
- **Backend**: Ensure AI insights generation includes these fields when generating risk analysis

### 3.2 Special Programs Description

**Current**: Hardcoded fallback text in key-terms page (line 291)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/key-terms/page.tsx` (line 291)
- **Implementation**: 
- Use `insights?.specialProgramsDescription ?? content?.specialProgramsDescription ?? null`
- **Schema Update**: Add `specialProgramsDescription` to Section 5 (Special Considerations) as optional field
- **Backend**: Ensure AI insights generation includes this field when special programs are detected

### 3.3 Risk Mitigation & Monitoring Strategies

**Current**: Hardcoded fallback arrays in risk-analysis page (lines 235-237, 254-256)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx`
- **Implementation**: 
- Use `insights?.riskMitigation1 ?? content?.riskMitigation1 ?? null` (and 2, 3)
- Use `insights?.riskMonitoring1 ?? content?.riskMonitoring1 ?? null` (and 2, 3)
- **Schema Update**: Add to Section 3.6 (Risk Analysis) as optional fields
- **Backend**: Ensure AI insights generation includes these fields when generating risk analysis

### 3.4 Capital Risk & Mitigant Fields

**Current**: Hardcoded fallback text in capital-stack page (lines 405, 408, 417, 420, 429, 432)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`
- **Implementation**: 
- Already using `insights?.capitalRisk1 ?? content?.capitalRisk1 ?? fallback` - remove fallback
- Already using `insights?.capitalMitigant1 ?? content?.capitalMitigant1 ?? fallback` - remove fallback
- Same for capitalRisk2/Mitigant2 and capitalRisk3/Mitigant3
- **Schema Update**: Verify these fields exist in Section 3.6 (Risk Analysis)
- **Backend**: Ensure AI insights generation includes these fields

## Part 4: Remove All Fallback Text Values

### 3.1 Capital Stack Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`

- **Lines 405, 408**: Remove fallback `'Cost overruns and delays could strain cash flow'` and `'Fixed-price GMP contract with experienced contractor'`
- Change: `{insights?.capitalRisk1 ?? content?.capitalRisk1 ?? null}`
- Change: `{insights?.capitalMitigant1 ?? content?.capitalMitigant1 ?? null}`

- **Lines 417, 420**: Remove fallback `'Rising SOFR could increase debt service costs'` and `'12-month interest reserve and rate floor protection'`
- Change: `{insights?.capitalRisk2 ?? content?.capitalRisk2 ?? null}`
- Change: `{insights?.capitalMitigant2 ?? content?.capitalMitigant2 ?? null}`

- **Lines 429, 432**: Remove fallback `'Insufficient pre-leasing could delay permanent financing'` and `'Strong market fundamentals and marketing plan'`
- Change: `{insights?.capitalRisk3 ?? content?.capitalRisk3 ?? null}`
- Change: `{insights?.capitalMitigant3 ?? content?.capitalMitigant3 ?? null}`

- **Lines 441-446**: Remove hardcoded Exit Strategy Risk text (not using content/insights at all)
- Change: Use `insights?.exitStrategyRisk ?? content?.exitStrategyRisk ?? null`
- Change: Use `insights?.exitStrategyMitigant ?? content?.exitStrategyMitigant ?? null`
- **Note**: These fields may need to be added to resume schema or generated via AI

### 4.2 Risk Analysis Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx`

- **Lines 235-237**: Remove fallback array for risk mitigation
- Change: `const insight = insights?.[field] ?? content?.[field] ?? null;`
- Remove: `const fallback = idx === 0 ? 'Fixed-price GMP contract with contingency' : ...`

- **Lines 254-256**: Remove fallback array for risk monitoring
- Change: `const insight = insights?.[field] ?? content?.[field] ?? null;`
- Remove: `const fallback = idx === 0 ? 'Monthly construction cost reviews' : ...`

### 3.3 Key Terms Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/key-terms/page.tsx`

- **Line 195**: Remove fallback `'1.00%'` for origination fee
- Change: `const originationFee = content?.originationFee ?? (content?.loanFees ? ... : null);`
- Remove: `: '1.00%'`

- **Line 291**: Remove fallback `'Opportunity Zone benefits, Dallas PFC lease, and workforce housing covenant tied to the Hoque structure.'`
- Change: `{insights?.specialProgramsDescription ?? content?.specialProgramsDescription ?? null}`

### 4.4 Milestones Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/milestones/page.tsx`

- **Lines 110, 117**: Remove fallback `'upcoming'` in status checks
- Change: `{getStatusIcon(milestone.status ?? null)}` (handle null in component)
- Change: `{getStatusColor(milestone.status ?? null)}` (handle null in component)
- **Note**: After implementing Part 1.1, status will always be calculated, so these fallbacks become unnecessary

### 4.5 Capital Stack - Loan Type Fallback

**File**: `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`

- **Line 33**: Remove fallback `"Senior Loan"`
- Change: `{ type: content?.loanType ?? null, ... }`
- Handle null case in UI (show empty or placeholder)

## Implementation Order

1. **Backend Calculations**: Add milestone status, capital use timing, and capital source/use label calculations to `Backend/services/calculation_service.py`
2. **Update Resume Schema**: Add all new fields (milestone status fields, capital use timing, equityContributionDescription, Category 3 fields)
3. **Update OM Pages**: Link to resume fields and insights (Category 1, 2, 3)
4. **Remove All Fallback Text**: Eliminate fallback values systematically
5. **Test**: Verify each page handles missing data gracefully

## Files to Modify

### Backend Files

- `Backend/services/calculation_service.py` (add milestone status and capital use timing calculations)
- `Backend/schemas/json/enhanced-project-form.schema.json` (add all new fields)

### Frontend Files

- `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/key-terms/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/milestones/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/deal-snapshot/risk-analysis/page.tsx`

### Schema Fields to Add

**Section 3.1 (Uses of Funds)**:

- `capitalUseTiming` (object/mapping) OR individual timing fields per use type
- Capital use label fields: `landAcquisitionLabel`, `baseConstructionLabel`, `contingencyLabel`, `constructionFeesLabel`, `aeFeesLabel`, `developerFeeLabel`, `interestReserveLabel`, `workingCapitalLabel`, `opDeficitEscrowLabel`, `leaseUpEscrowLabel`, `ffeLabel`, `thirdPartyReportsLabel`, `legalAndOrgLabel`, `titleAndRecordingLabel`, `taxesDuringConstructionLabel`, `loanFeesLabel`, `relocationCostsLabel`, `syndicationCostsLabel`, `enviroRemediationLabel`, `pfcStructuringFeeLabel` (Text)

**Section 3.2 (Sources of Funds)**:

- `equityContributionDescription` (Text/Textarea)
- Capital source label fields: `loanTypeLabel`, `sponsorEquityLabel`, `taxCreditEquityLabel`, `gapFinancingLabel` (Text)

**Section 3.6 (Risk Analysis)**:

- `exitStrategyRisk` (Text)
- `exitStrategyMitigant` (Text)
- `capitalRisk1`, `capitalRisk2`, `capitalRisk3` (Text) - verify exist
- `capitalMitigant1`, `capitalMitigant2`, `capitalMitigant3` (Text) - verify exist
- `riskMitigation1`, `riskMitigation2`, `riskMitigation3` (Text)
- `riskMonitoring1`, `riskMonitoring2`, `riskMonitoring3` (Text)

**Section 5 (Special Considerations)**:

- `specialProgramsDescription` (Text/Textarea)

**Section 6.1 (Key Dates)**:

- `landAcqStatus`, `entitlementsStatus`, `groundbreakingStatus`, `verticalStartStatus`, `firstOccupancyStatus`, `completionStatus`, `stabilizationStatus` (Dropdown: "completed", "current", "upcoming")

## Testing Considerations

- Test with missing data to ensure graceful null handling
- Verify backend milestone status calculation with various date scenarios
- Ensure backend timing calculations work with and without drawSchedule
- Test that removing fallbacks doesn't break UI when fields are empty
- Verify insights are properly generated and accessible via `useOmContent()` hook
- Test Category 3 fields (AI-generated) are displayed when available in insights
- Ensure backend calculations are triggered on resume updates