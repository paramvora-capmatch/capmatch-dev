---
name: Asset Profile Resume Reconciliation & Fallback Removal
overview: Reconcile hardcoded asset-profile fields with project resume by linking existing fields, adding derivable/computed fields (calculated in backend), handling AI-generated insights (Category 3), and removing all fallback text values from asset-profile pages (site-plan, amenities, unit-mix, comparables).
todos:
  - id: add-backend-height-calculation
    content: Add height calculation (storyHeight, heightLimit, actualHeight) to Backend/services/calculation_service.py
    status: completed
  - id: add-backend-zoning-compliance
    content: Add zoningCompliant calculation to Backend/services/calculation_service.py based on FAR, height, and setbacks
    status: completed
  - id: add-backend-rent-premium
    content: Add rentPremium calculation to Backend/services/calculation_service.py (project rent vs market avg)
    status: completed
  - id: add-schema-height-fields
    content: Add height fields (storyHeight, heightLimit, actualHeight) to resume schema Section 1
    status: completed
  - id: add-schema-zoning-compliance
    content: Add zoningCompliant field to resume schema Section 1
    status: completed
  - id: add-schema-market-positioning
    content: Add market positioning fields (luxuryTier, targetMarket, competitivePosition) to resume schema Section 2
    status: completed
  - id: add-schema-comparables-metrics
    content: Add comparables metrics fields (rentPremium, qualityTier, competitionLevel, demandTrend, supplyPipeline, rentGrowth) to resume schema Section 4
    status: completed
  - id: add-schema-amenity-fields
    content: Add amenity fields (commercialInnovationProgram, amenitySpaceType, amenityAccess) to resume schema Section 2
    status: completed
  - id: update-site-plan-green-space
    content: Update site-plan page to use content?.greenSpace and content?.greenSpaceRatio instead of hardcoded null
    status: completed
  - id: update-site-plan-setbacks
    content: Update site-plan page to use content?.setbackFront, setbackSide, setbackRear instead of hardcoded null object
    status: completed
  - id: update-site-plan-height
    content: Update site-plan page to use backend-calculated height fields instead of hardcoded * 10 calculation
    status: completed
    dependencies:
      - add-backend-height-calculation
      - add-schema-height-fields
  - id: update-site-plan-zoning-compliance
    content: Update site-plan page to use content?.zoningCompliant or insights?.zoningCompliant instead of OMEmptyState fallback
    status: completed
    dependencies:
      - add-backend-zoning-compliance
      - add-schema-zoning-compliance
  - id: update-amenities-commercial-program
    content: Update amenities page to use insights?.commercialInnovationProgram instead of hardcoded fallback text
    status: completed
    dependencies:
      - add-schema-amenity-fields
  - id: update-amenities-access-type
    content: Update amenities page to use content?.amenitySpaceType and amenityAccess instead of hardcoded Shared/24/7 text
    status: completed
    dependencies:
      - add-schema-amenity-fields
  - id: update-unit-mix-market-positioning
    content: Update unit-mix page to use insights/content for luxuryTier, targetMarket, competitivePosition instead of OMEmptyState fallback
    status: completed
    dependencies:
      - add-schema-market-positioning
  - id: update-comparables-metrics
    content: Update comparables page to use insights/content for rentPremium, qualityTier, competitionLevel, demandTrend, supplyPipeline, rentGrowth instead of hardcoded values
    status: completed
    dependencies:
      - add-backend-rent-premium
      - add-schema-comparables-metrics
  - id: update-comparables-differentiators
    content: Update comparables page to remove hardcoded differentiators fallback list, use only insights?.differentiators
    status: completed
  - id: remove-site-plan-fallbacks
    content: Remove all fallback values from site-plan/page.tsx (greenSpace null, setbacks null, OMEmptyState)
    status: completed
    dependencies:
      - update-site-plan-green-space
      - update-site-plan-setbacks
      - update-site-plan-zoning-compliance
  - id: remove-amenities-fallbacks
    content: Remove all fallback text values from amenities/page.tsx (Shared, 24/7, commercial program description)
    status: completed
    dependencies:
      - update-amenities-commercial-program
      - update-amenities-access-type
  - id: remove-unit-mix-fallbacks
    content: Remove all fallback values from unit-mix/page.tsx (OMEmptyState, hardcoded description text)
    status: completed
    dependencies:
      - update-unit-mix-market-positioning
  - id: remove-comparables-fallbacks
    content: Remove all hardcoded values from comparables/page.tsx (rent premium, quality tier, competition level, market trends, differentiators)
    status: completed
    dependencies:
      - update-comparables-metrics
      - update-comparables-differentiators
---

# Asset Profile Resume Reconciliation & Fallback Text Removal Plan

## Overview

This plan addresses four tasks for asset-profile pages:

1. **Category 1 Fields**: Link hardcoded values to existing resume fields
2. **Category 2 Fields**: Add derivable fields to resume schema and calculate in backend
3. **Category 3 Fields**: Handle AI-generated insights using existing OM insights architecture
4. **Remove Fallback Text**: Eliminate all fallback text values from asset-profile pages

## Architecture Notes

- **OM Insights Architecture**: Already present via `useOmContent()` hook which provides `{ content, insights }` object
- **Derived Fields**: All calculations must be done in `Backend/services/calculation_service.py` and stored in resume
- **Frontend**: Should only read from resume fields, never calculate on-the-fly
- **Schema Fields**: Many fields already exist in `Backend/schemas/json/enhanced-project-form.schema.json` (greenSpace, setbackFront, setbackSide, setbackRear, greenSpaceRatio)

## Part 1: Category 1 Fields - Link Existing Resume Fields

### 1.1 Site Plan - Green Space & Setbacks

- **File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx`
- **Current Issues**:
- Line 20: `greenSpace = null; // Not directly available in flat fields` - hardcoded null
- Lines 29-33: `setbacks` object with all null values - hardcoded placeholders
- Line 233: Green Space Ratio shows `{greenSpace ?? null}` which is always null
- **Resume Fields**: Already exist in schema:
- `greenSpace` (SF) - Line 1612-1614
- `setbackFront`, `setbackSide`, `setbackRear` (ft) - Lines 1616-1627
- `greenSpaceRatio` (%) - Lines 1628-1631
- **Change**: 
- Replace line 20: `const greenSpace = content?.greenSpace ? `${formatLocale(content.greenSpace)} SF` : null;`
- Replace lines 29-33: Use `content?.setbackFront`, `content?.setbackSide`, `content?.setbackRear`
- Update line 233: Use `content?.greenSpaceRatio` or calculate from greenSpace/totalSiteAcreage

### 1.2 Site Plan - Height Calculation

- **File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx`
- **Current Issue**: 
- Lines 25-26: Hardcoded `* 10` calculation (10ft per story assumption)
- `heightLimit = parseFloat(String(content?.numberOfStories ?? '0')) * 10`
- `actualHeight = parseFloat(String(content?.numberOfStories ?? '0')) * 10`
- **Solution**: Add backend-calculated fields OR use actual height fields if they exist
- **New Resume Fields** (Category 2 - see Part 2):
- `heightLimit` (ft) - calculated or from zoning
- `actualHeight` (ft) - calculated from numberOfStories * storyHeight or actual measurement
- `storyHeight` (ft) - average height per story (default 10ft if not specified)

### 1.3 Site Plan - Zoning Compliance

- **File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx`
- **Current Issue**: Line 260: `{content?.zoningCompliant || <OMEmptyState />}` - fallback to OMEmptyState
- **Resume Field**: Check if `zoningCompliant` exists in schema, if not add as Category 2 field
- **Change**: Use `content?.zoningCompliant ?? null` or `insights?.zoningCompliant ?? content?.zoningCompliant ?? null`

### 1.4 Amenities - Commercial Innovation Program

- **File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/amenities/page.tsx`
- **Current Issue**: Line 198: Hardcoded fallback text `"30,000 SF Innovation Center plus flexible office/retail bays"`
- **Resume Field**: `commercialInnovationProgram` (may need to add to schema as Category 3)
- **Change**: Use `insights?.commercialInnovationProgram ?? content?.commercialInnovationProgram ?? null`

### 1.5 Unit Mix - Market Positioning Fields

- **File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/unit-mix/page.tsx`
- **Current Issues**: 
- Lines 313, 319, 325: Using `content?.luxuryTier || <OMEmptyState />` with fallback
- Fields: `luxuryTier`, `targetMarket`, `competitivePosition`
- **Resume Fields**: Check if these exist in schema, if not add as Category 2 or 3 fields
- **Change**: Use `insights?.luxuryTier ?? content?.luxuryTier ?? null` (and same for targetMarket, competitivePosition)

## Part 2: Category 2 Fields - Add to Resume & Calculate in Backend

### 2.1 Site Plan - Height Fields (Backend Calculation Required)

**Current**: Hardcoded `* 10` calculation for height

**Solution**: Calculate in backend, store in resume

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Fields**:
- `storyHeight` (ft) - Average height per story (default: 10ft if not specified)
- `heightLimit` (ft) - Maximum allowed height from zoning (if available) or calculated
- `actualHeight` (ft) - Calculated: `numberOfStories * storyHeight` or actual measurement
- **Calculation Logic**:
- If `storyHeight` exists in content, use it
- Otherwise, default to 10ft per story
- Calculate `actualHeight = numberOfStories * storyHeight`
- `heightLimit` should come from zoning data if available, otherwise null
- **Schema Update**: Add to Section 1 (Site & Zoning) in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read from resume instead of calculating
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx` (lines 25-26, 39-40)

### 2.2 Site Plan - Zoning Compliance (Backend Calculation Required)

**Current**: Fallback to OMEmptyState

**Solution**: Calculate in backend based on zoning rules

- **Backend Implementation**: `Backend/services/calculation_service.py`
- **New Resume Field**: `zoningCompliant` (Boolean or Text: "Compliant", "Non-Compliant", "Conditional")
- **Calculation Logic**:
- Compare actual FAR vs allowed FAR
- Compare actual height vs height limit
- Compare setbacks vs required setbacks
- Determine compliance status
- **Schema Update**: Add to Section 1 (Site & Zoning)
- **Frontend**: Read from resume
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx` (line 260)

### 2.3 Unit Mix - Market Positioning Fields

**Current**: Fallback to OMEmptyState

**Solution**: Add fields to resume schema (may be Category 3 if AI-generated)

- **New Resume Fields**:
- `luxuryTier` (Text/Dropdown: "Luxury", "Premium", "Standard", etc.)
- `targetMarket` (Text: e.g., "Young Professionals", "Families", etc.)
- `competitivePosition` (Text: e.g., "Market Leader", "Competitive", etc.)
- **Schema Update**: Add to Section 2 (Unit Mix) in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Frontend**: Read from resume or insights
- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/unit-mix/page.tsx` (lines 313, 319, 325)

## Part 3: Category 3 Fields - AI-Generated Insights

**Architecture**: OM insights are already available via `useOmContent()` hook which returns `{ content, insights }`. The `insights` object contains AI-generated fields.

### 3.1 Amenities - Commercial Innovation Program Description

**Current**: Hardcoded fallback text in amenities page (line 198)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/amenities/page.tsx` (line 198)
- **Implementation**: 
- Use `insights?.commercialInnovationProgram ?? content?.commercialInnovationProgram ?? null`
- Remove hardcoded fallback text
- **Schema Update**: Add `commercialInnovationProgram` to Section 2 (Amenities) as optional field
- **Backend**: Ensure AI insights generation includes this field when commercial spaces are detected

### 3.2 Comparables - Differentiators

**Current**: Hardcoded fallback list in comparables page (lines 314-324)

**Solution**: Use insights from OM insights architecture

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/comparables/page.tsx` (lines 307-326)
- **Implementation**: 
- Already using `insights?.differentiators` - remove hardcoded fallback list
- Change: `{insights?.differentiators ?? content?.differentiators ?? null}`
- **Schema Update**: Verify `differentiators` exists in Section 4 (Comparables) as optional field
- **Backend**: Ensure AI insights generation includes this field

### 3.3 Comparables - Market Positioning Metrics

**Current**: Hardcoded values in comparables page (lines 292, 296, 300, 334, 338, 342)

**Solution**: Use insights or calculated fields from resume

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/comparables/page.tsx`
- **Hardcoded Values**:
- Line 292: `"+15%"` - Rent Premium
- Line 296: `"Luxury"` - Quality Tier
- Line 300: `"Moderate"` - Competition Level
- Line 334: `"↑ Growing"` - Demand Trend
- Line 338: `"<6K units (24mo)"` - Supply Pipeline
- Line 342: `"+6.9% (5yr)"` - Rent Growth
- **New Resume Fields** (Category 2 or 3):
- `rentPremium` (%) - Calculated: (project rent - market avg rent) / market avg rent * 100
- `qualityTier` (Text) - AI-generated or from content
- `competitionLevel` (Text) - AI-generated: "Low", "Moderate", "High"
- `demandTrend` (Text) - AI-generated: "Growing", "Stable", "Declining"
- `supplyPipeline` (Text) - AI-generated description of upcoming supply
- `rentGrowth` (Text) - AI-generated or calculated historical rent growth
- **Schema Update**: Add to Section 4 (Comparables) in `Backend/schemas/json/enhanced-project-form.schema.json`
- **Backend**: Calculate `rentPremium` in `calculation_service.py`, generate others via AI insights
- **Frontend**: Read from resume or insights instead of hardcoded values

### 3.4 Amenities - Space Type & Access

**Current**: Hardcoded "Shared" and "24/7" text in amenities page (lines 178, 182)

**Solution**: Add fields to resume or use insights

- **Location**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/amenities/page.tsx` (lines 178, 182)
- **New Resume Fields** (may be per-amenity or general):
- `amenitySpaceType` (Text) - "Shared", "Private", "Semi-Private", etc.
- `amenityAccess` (Text) - "24/7", "Business Hours", "Reserved", etc.
- **Alternative**: These could be part of amenityList array structure if each amenity has different access
- **Schema Update**: Add to Section 2 (Amenities) or enhance amenityList structure
- **Frontend**: Read from resume or use default values only if not specified

## Part 4: Remove All Fallback Text Values

### 4.1 Site Plan Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx`

- **Line 20**: Remove hardcoded `greenSpace = null` - use `content?.greenSpace ?? null`
- **Lines 29-33**: Remove hardcoded null setbacks object - use `content?.setbackFront`, etc.
- **Line 233**: Remove hardcoded null for greenSpaceRatio - use `content?.greenSpaceRatio ?? null`
- **Line 260**: Remove `|| <OMEmptyState />` fallback - use `content?.zoningCompliant ?? null` or `insights?.zoningCompliant ?? content?.zoningCompliant ?? null`

### 4.2 Amenities Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/amenities/page.tsx`

- **Line 178**: Remove hardcoded `"Shared"` text - use `content?.amenitySpaceType ?? null` or per-amenity field
- **Line 182**: Remove hardcoded `"24/7"` text - use `content?.amenityAccess ?? null` or per-amenity field
- **Line 198**: Remove hardcoded fallback text `"30,000 SF Innovation Center plus flexible office/retail bays"` - use `insights?.commercialInnovationProgram ?? content?.commercialInnovationProgram ?? null`

### 4.3 Unit Mix Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/unit-mix/page.tsx`

- **Line 313**: Remove `|| <OMEmptyState />` - use `insights?.luxuryTier ?? content?.luxuryTier ?? null`
- **Line 319**: Remove `|| <OMEmptyState />` - use `insights?.targetMarket ?? content?.targetMarket ?? null`
- **Line 325**: Remove `|| <OMEmptyState />` - use `insights?.competitivePosition ?? content?.competitivePosition ?? null`
- **Line 338**: Remove hardcoded description text `"Breakdown of S, A, and B series layouts from the Hoque OM"` - use `insights?.unitPlanDescription ?? content?.unitPlanDescription ?? null` or remove if not needed

### 4.4 Comparables Page

**File**: `Frontend/src/app/project/om/[id]/dashboard/asset-profile/comparables/page.tsx`

- **Line 292**: Remove hardcoded `"+15%"` - use `insights?.rentPremium ?? content?.rentPremium ?? null`
- **Line 296**: Remove hardcoded `"Luxury"` - use `insights?.qualityTier ?? content?.qualityTier ?? null`
- **Line 300**: Remove hardcoded `"Moderate"` - use `insights?.competitionLevel ?? content?.competitionLevel ?? null`
- **Lines 314-324**: Remove hardcoded differentiators list - already using `insights?.differentiators`, just remove fallback
- **Line 334**: Remove hardcoded `"↑ Growing"` - use `insights?.demandTrend ?? content?.demandTrend ?? null`
- **Line 338**: Remove hardcoded `"<6K units (24mo)"` - use `insights?.supplyPipeline ?? content?.supplyPipeline ?? null`
- **Line 342**: Remove hardcoded `"+6.9% (5yr)"` - use `insights?.rentGrowth ?? content?.rentGrowth ?? null`

## Implementation Order

1. **Backend Calculations**: Add height calculations, zoning compliance, and rent premium calculations to `Backend/services/calculation_service.py`
2. **Update Resume Schema**: Add all new fields (height fields, zoning compliance, market positioning, comparables metrics, amenity access/type)
3. **Update Asset Profile Pages**: Link to resume fields and insights (Category 1, 2, 3)
4. **Remove All Fallback Text**: Eliminate fallback values systematically
5. **Test**: Verify each page handles missing data gracefully

## Files to Modify

### Backend Files

- `Backend/services/calculation_service.py` (add height, zoning compliance, and rent premium calculations)
- `Backend/schemas/json/enhanced-project-form.schema.json` (add all new fields)

### Frontend Files

- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/page.tsx` (main overview - verify no hardcoded values)
- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/amenities/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/unit-mix/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/comparables/page.tsx`
- `Frontend/src/app/project/om/[id]/dashboard/asset-profile/media/page.tsx` (verify no issues)

### Schema Fields to Add

**Section 1 (Site & Zoning)**:

- `storyHeight` (Number, ft) - Average height per story
- `heightLimit` (Number, ft) - Maximum allowed height from zoning
- `actualHeight` (Number, ft) - Calculated actual building height
- `zoningCompliant` (Text/Dropdown: "Compliant", "Non-Compliant", "Conditional") - Compliance status

**Section 2 (Amenities)**:

- `commercialInnovationProgram` (Text/Textarea) - Description of commercial/innovation program
- `amenitySpaceType` (Text) - "Shared", "Private", "Semi-Private", etc.
- `amenityAccess` (Text) - "24/7", "Business Hours", "Reserved", etc.

**Section 2 (Unit Mix)**:

- `luxuryTier` (Text/Dropdown) - "Luxury", "Premium", "Standard", etc.
- `targetMarket` (Text) - Target demographic description
- `competitivePosition` (Text) - Market position description
- `unitPlanDescription` (Text/Textarea) - Optional description of unit plans

**Section 4 (Comparables)**:

- `rentPremium` (Number, %) - Calculated rent premium vs market average
- `qualityTier` (Text) - Quality classification
- `competitionLevel` (Text) - "Low", "Moderate", "High"
- `demandTrend` (Text) - "Growing", "Stable", "Declining"
- `supplyPipeline` (Text/Textarea) - Description of upcoming supply
- `rentGrowth` (Text) - Historical rent growth description
- `differentiators` (Text/Textarea) - Already may exist, verify

## Testing Considerations

- Test with missing data to ensure graceful null handling
- Verify backend height calculation with various story counts and story heights
- Ensure backend zoning compliance calculation works with various FAR/height scenarios
- Test that removing fallbacks doesn't break UI when fields are empty
- Verify insights are properly generated and accessible via `useOmContent()` hook
- Test Category 3 fields (AI-generated) are displayed when available in insights
- Ensure backend calculations are triggered on resume updates
- Test greenSpace and greenSpaceRatio calculations/display
- Verify setbacks display correctly when values are present