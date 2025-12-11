---
name: Move Derived Fields to Resume Stage
overview: Move all derived field calculations from OM pages to resume calculation service. Derived fields are regular form fields (calculated initially, editable, locked after autofill) - no special read-only treatment.
todos:
  - id: add-missing-fields-schema
    content: Add missing fields (impactFees, totalIncentiveValue, targetMarket, heightLimit) to resume schema in field_constraints.py and enhanced-project-form.schema.json
    status: pending
  - id: add-derived-fields-schema
    content: Add all derived fields (breakEven, riskLevels, marketStatus, etc.) to resume schema in field_constraints.py and enhanced-project-form.schema.json
    status: pending
  - id: add-financial-calculations
    content: Add financial derived field calculations (breakEven, riskLevels, scenario IRRs/multiples/margins) to calculation_service.py with null checks
    status: pending
  - id: add-market-calculations
    content: Add market context derived field calculations (marketStatus, demandTrend, supplyPressure, totalJobs, avgGrowth, totalIncentiveValue) to calculation_service.py with null checks
    status: pending
  - id: add-asset-calculations
    content: Add asset profile derived field calculations (luxuryTier, competitivePosition, avgRentPSF, zoningCompliant) to calculation_service.py with null checks
    status: pending
  - id: update-om-financial-pages
    content: Update financial-sponsor and returns OM pages to read derived fields from content instead of calculating
    status: pending
  - id: update-om-market-pages
    content: Update market-context OM pages to read derived fields from content instead of calculating
    status: pending
  - id: update-om-asset-pages
    content: Update asset-profile OM pages to read derived fields from content instead of calculating
    status: pending
  - id: add-fields-to-resume-form
    content: Add all new derived fields to resume form UI in EnhancedProjectForm.tsx (editable, lockable like other fields)
    status: pending
  - id: test-calculations
    content: Test all derived field calculations with various data scenarios and edge cases
    status: pending
  - id: test-field-editing
    content: Test that derived fields can be edited and locked like other fields
    status: pending
  - id: verify-om-sync
    content: Verify derived fields are copied 1:1 from resume to OM during sync
    status: pending
---

# Move Derived Fields to Resume Stage

## Overview

Currently, many derived fields are calculated on-the-fly in OM pages. This plan moves all calculations to the resume stage so:

1. Derived fields are calculated once when resume is updated/autofilled
2. Fields are stored in resume content (same as other fields)
3. Fields are editable by users (like other fields)
4. Fields are locked after autofill (like other fields)
5. Fields are copied 1:1 to OM during sync
6. OM pages read values directly (no calculations, except AI insights)

**Important**: Derived fields are regular form fields - they are calculated initially but can be edited and locked like any other field. No special read-only treatment.

## Current State Analysis

### Fields Currently Calculated in OM Pages

**Financial/Sponsor:**

- `breakEven` - calculated from `dscr` (1/dscr * 100)
- `riskLevelUpside`, `riskLevelBase`, `riskLevelDownside` - from IRR thresholds
- `upsideIRR`, `downsideIRR` - scenario calculations (base * 1.1, base * 0.9)
- `upsideEquityMultiple`, `downsideEquityMultiple` - scenario calculations
- `upsideProfitMargin`, `downsideProfitMargin` - scenario calculations

**Market Context:**

- `marketStatus` - from `averageOccupancy` (Tight/Balanced/Soft)
- `demandTrend` - from job/pop growth (↑ Growing/→ Stable/↓ Declining)
- `supplyPressure` - from `monthsOfSupply` (Low/Moderate/High)
- `totalJobs` - sum of `majorEmployers[].employees`
- `avgGrowth` - average of `majorEmployers[].growth` percentages
- `totalIncentiveValue` - from `impactFees` or provided value

**Asset Profile:**

- `luxuryTier` - from rent PSF (Luxury/Premium/Value/Economy)
- `competitivePosition` - from rent comps percentile (Top 20%/Middle 60%/Bottom 20%)
- `avgRentPSF` - calculated from `residentialUnitMix`
- `zoningCompliant` - from FAR and height limits (Compliant/Non-Compliant)

**Missing Fields Referenced:**

- `impactFees` - referenced but not in schema
- `totalIncentiveValue` - referenced but not in schema
- `targetMarket` - referenced but not in schema
- `heightLimit` - referenced but not in schema

## Implementation Plan

### Phase 1: Add Missing Fields to Resume Schema

**File**: `Backend/services/field_constraints.py`

Add to appropriate sections in `SECTION_FIELDS`:

```python
"special-considerations": [
    # ... existing fields ...
    "impactFees",  # String/number field for impact fees (e.g., "$12/SF")
    "totalIncentiveValue",  # Number field for total incentive value
],
"property-specs": [
    # ... existing fields ...
    "targetMarket",  # String field (e.g., "Young Professionals")
],
"site-context": [
    # ... existing fields ...
    "heightLimit",  # Number field for height limit in feet
],
```

**File**: `Frontend/src/lib/enhanced-project-form.schema.json`

Add field definitions for these new fields in the appropriate sections with appropriate field types (text, number, etc.).

### Phase 2: Add Derived Fields to Resume Schema

**File**: `Backend/services/field_constraints.py`

Add derived fields to appropriate sections:

```python
"financials": [
    # ... existing fields ...
    "breakEven",  # Number - calculated from DSCR
    "riskLevelBase", "riskLevelUpside", "riskLevelDownside",  # String - Low/Medium/High
    "upsideIRR", "downsideIRR",  # Number - scenario IRRs
    "upsideEquityMultiple", "downsideEquityMultiple",  # Number - scenario multiples
    "upsideProfitMargin", "downsideProfitMargin",  # Number - scenario margins
],
"market-context": [
    # ... existing fields ...
    "marketStatus",  # String - Tight/Balanced/Soft
    "demandTrend",  # String - ↑ Growing/→ Stable/↓ Declining
    "supplyPressure",  # String - Low/Moderate/High
    "totalJobs",  # Number - sum of major employers
    "avgGrowth",  # Number - average growth percentage
],
"property-specs": [
    # ... existing fields ...
    "luxuryTier",  # String - Luxury/Premium/Value/Economy
    "competitivePosition",  # String - Top 20%/Middle 60%/Bottom 20%
    "avgRentPSF",  # Number - average rent per square foot
],
"site-context": [
    # ... existing fields ...
    "zoningCompliant",  # String - Compliant/Non-Compliant
],
```

**File**: `Frontend/src/lib/enhanced-project-form.schema.json`

Add field definitions for all derived fields with appropriate types and UI components (text inputs, selects, etc.).

### Phase 3: Add Calculations to Resume Calculation Service

**File**: `Backend/services/calculation_service.py`

Add new calculation functions after line 283. These calculations will populate the fields initially, but users can edit them later:

```python
# --- Section 3.7: Financial Derived Metrics ---

# Break-even - 1 / DSCR * 100
dscr_value = get_value('dscr')
if dscr_value and dscr_value > 0:
    break_even = round((1 / dscr_value) * 100, 1)
    existing_break_even = get_value('breakEven')
    if existing_break_even is None:
        derived_fields['breakEven'] = format_field_with_source(
            value=break_even,
            source=create_derived_source('1 / DSCR')
        )

# Risk Levels - from IRR thresholds
irr_base = get_value('irr')
if irr_base is not None:
    if irr_base >= 25:
        risk_level_base = 'Low'
    elif irr_base >= 15:
        risk_level_base = 'Medium'
    else:
        risk_level_base = 'High'
    
    if get_value('riskLevelBase') is None:
        derived_fields['riskLevelBase'] = format_field_with_source(
            value=risk_level_base,
            source=create_derived_source('IRR Threshold')
        )
    
    # Upside scenario (IRR * 1.1)
    upside_irr = irr_base * 1.1
    if upside_irr >= 25:
        risk_level_upside = 'Low'
    elif upside_irr >= 15:
        risk_level_upside = 'Medium'
    else:
        risk_level_upside = 'High'
    
    if get_value('riskLevelUpside') is None:
        derived_fields['riskLevelUpside'] = format_field_with_source(
            value=risk_level_upside,
            source=create_derived_source('IRR Threshold (Upside)')
        )
    
    if get_value('upsideIRR') is None:
        derived_fields['upsideIRR'] = format_field_with_source(
            value=round(upside_irr, 2),
            source=create_derived_source('Base IRR * 1.1')
        )
    
    # Downside scenario (IRR * 0.9)
    downside_irr = irr_base * 0.9
    if downside_irr >= 25:
        risk_level_downside = 'Low'
    elif downside_irr >= 15:
        risk_level_downside = 'Medium'
    else:
        risk_level_downside = 'High'
    
    if get_value('riskLevelDownside') is None:
        derived_fields['riskLevelDownside'] = format_field_with_source(
            value=risk_level_downside,
            source=create_derived_source('IRR Threshold (Downside)')
        )
    
    if get_value('downsideIRR') is None:
        derived_fields['downsideIRR'] = format_field_with_source(
            value=round(downside_irr, 2),
            source=create_derived_source('Base IRR * 0.9')
        )

# Equity Multiple scenarios
equity_multiple_base = get_value('equityMultiple')
if equity_multiple_base is not None:
    if get_value('upsideEquityMultiple') is None:
        derived_fields['upsideEquityMultiple'] = format_field_with_source(
            value=round(equity_multiple_base * 1.1, 2),
            source=create_derived_source('Base * 1.1')
        )
    if get_value('downsideEquityMultiple') is None:
        derived_fields['downsideEquityMultiple'] = format_field_with_source(
            value=round(equity_multiple_base * 0.9, 2),
            source=create_derived_source('Base * 0.9')
        )

# Profit Margin scenarios
stabilized_value = get_value('stabilizedValue')
tdc = get_value('totalDevelopmentCost')
if stabilized_value and tdc and tdc > 0:
    if get_value('upsideProfitMargin') is None:
        derived_fields['upsideProfitMargin'] = format_field_with_source(
            value=round(((stabilized_value * 1.02) - tdc) / tdc * 100, 2),
            source=create_derived_source('Upside Scenario')
        )
    if get_value('downsideProfitMargin') is None:
        derived_fields['downsideProfitMargin'] = format_field_with_source(
            value=round(((stabilized_value * 0.97) - tdc) / tdc * 100, 2),
            source=create_derived_source('Downside Scenario')
        )

# --- Section 4: Market Context Derived Metrics ---

# Market Status - from averageOccupancy
market_context = project_data.get('marketContextDetails', {})
supply_analysis = market_context.get('supplyAnalysis', {})
average_occupancy = supply_analysis.get('averageOccupancy')
if average_occupancy and get_value('marketStatus') is None:
    try:
        occ_value = float(str(average_occupancy).replace('%', ''))
        if occ_value >= 95:
            market_status = 'Tight'
        elif occ_value >= 90:
            market_status = 'Balanced'
        else:
            market_status = 'Soft'
        derived_fields['marketStatus'] = format_field_with_source(
            value=market_status,
            source=create_derived_source('Occupancy Threshold')
        )
    except (ValueError, TypeError):
        pass

# Demand Trend - from job/pop growth
if get_value('demandTrend') is None:
    job_growth = get_value('projGrowth202429', 0)
    pop_growth = get_value('popGrowth201020', 0)
    avg_growth = (job_growth + pop_growth) / 2
    if avg_growth >= 5:
        demand_trend = '↑ Growing'
    elif avg_growth >= 0:
        demand_trend = '→ Stable'
    else:
        demand_trend = '↓ Declining'
    derived_fields['demandTrend'] = format_field_with_source(
        value=demand_trend,
        source=create_derived_source('Job/Pop Growth Avg')
    )

# Supply Pressure - from monthsOfSupply
months_supply = get_value('monthsOfSupply')
if months_supply is not None and get_value('supplyPressure') is None:
    if months_supply <= 6:
        supply_pressure = 'Low'
    elif months_supply <= 12:
        supply_pressure = 'Moderate'
    else:
        supply_pressure = 'High'
    derived_fields['supplyPressure'] = format_field_with_source(
        value=supply_pressure,
        source=create_derived_source('Months of Supply')
    )

# Total Jobs - sum of majorEmployers.employees
major_employers = market_context.get('majorEmployers', [])
if major_employers and get_value('totalJobs') is None:
    total_jobs = sum(emp.get('employees', 0) or 0 for emp in major_employers)
    if total_jobs > 0:
        derived_fields['totalJobs'] = format_field_with_source(
            value=total_jobs,
            source=create_derived_source('Sum of Employers')
        )
    
    # Average Growth - average of majorEmployers.growth
    growth_values = []
    for emp in major_employers:
        growth_str = emp.get('growth', '')
        if growth_str:
            try:
                # Extract numeric value from string like "+8.2%" or "8.2%"
                growth_num = float(growth_str.replace('%', '').replace('+', '').replace('-', ''))
                growth_values.append(growth_num)
            except (ValueError, TypeError):
                pass
    if growth_values and get_value('avgGrowth') is None:
        avg_growth_employers = sum(growth_values) / len(growth_values)
        derived_fields['avgGrowth'] = format_field_with_source(
            value=round(avg_growth_employers, 1),
            source=create_derived_source('Avg of Employers')
        )

# Total Incentive Value - from impactFees or provided value
if get_value('totalIncentiveValue') is None:
    total_incentive = get_value('totalIncentiveValue')
    if total_incentive is None or total_incentive == 0:
        impact_fees = get_value('impactFees')
        if impact_fees:
            # Try to extract numeric value from string like "$12/SF"
            try:
                if isinstance(impact_fees, str):
                    # Extract number, multiply by 1000 (assuming $/SF * 1000 SF = total)
                    impact_num = float(impact_fees.replace('$', '').replace('/SF', '').strip())
                    # This is a rough calculation - may need adjustment based on actual SF
                    calculated_incentive = impact_num * 1000
                    derived_fields['totalIncentiveValue'] = format_field_with_source(
                        value=round(calculated_incentive, 0),
                        source=create_derived_source('From Impact Fees')
                    )
            except (ValueError, TypeError):
                pass

# --- Section 5: Asset Profile Derived Metrics ---

# Average Rent PSF - from residentialUnitMix
residential_unit_mix = project_data.get('residentialUnitMix', [])
if residential_unit_mix and get_value('avgRentPSF') is None:
    rent_psf_values = []
    for unit in residential_unit_mix:
        monthly_rent = unit.get('monthlyRent', '')
        avg_sf = unit.get('avgSF', 0)
        if monthly_rent and avg_sf and avg_sf > 0:
            try:
                # Extract numeric rent value
                rent_str = str(monthly_rent).replace('$', '').replace(',', '').strip()
                rent_num = float(rent_str)
                rent_psf = rent_num / avg_sf
                rent_psf_values.append(rent_psf)
            except (ValueError, TypeError):
                pass
    if rent_psf_values:
        avg_rent_psf = sum(rent_psf_values) / len(rent_psf_values)
        derived_fields['avgRentPSF'] = format_field_with_source(
            value=round(avg_rent_psf, 2),
            source=create_derived_source('Unit Mix Avg')
        )
        
        # Luxury Tier - from avgRentPSF
        if avg_rent_psf >= 3.0:
            luxury_tier = 'Luxury'
        elif avg_rent_psf >= 2.0:
            luxury_tier = 'Premium'
        elif avg_rent_psf >= 1.5:
            luxury_tier = 'Value'
        else:
            luxury_tier = 'Economy'
        
        if get_value('luxuryTier') is None:
            derived_fields['luxuryTier'] = format_field_with_source(
                value=luxury_tier,
                source=create_derived_source('Rent PSF Tier')
            )
        
        # Competitive Position - from rent comps
        rent_comps = project_data.get('rentComps', [])
        if rent_comps and get_value('competitivePosition') is None:
            comp_rents = [c.get('rentPSF', 0) or 0 for c in rent_comps if c.get('rentPSF', 0) > 0]
            if comp_rents:
                sorted_rents = sorted(comp_rents + [avg_rent_psf])
                percentile = (sorted_rents.index(avg_rent_psf) / len(sorted_rents)) * 100
                if percentile >= 80:
                    competitive_position = 'Top 20%'
                elif percentile >= 20:
                    competitive_position = 'Middle 60%'
                else:
                    competitive_position = 'Bottom 20%'
                derived_fields['competitivePosition'] = format_field_with_source(
                    value=competitive_position,
                    source=create_derived_source('Rent Comps Percentile')
                )

# Zoning Compliance - from FAR and height limits
if get_value('zoningCompliant') is None:
    far_used = get_value('farUtilizedPercent', 0)
    far_allowed = get_value('allowableFAR', 999)
    number_of_stories = get_value('numberOfStories', 0)
    height_limit = get_value('heightLimit', 999)
    
    height_actual = number_of_stories * 10  # Approximate 10ft per story
    zoning_compliant = (far_used <= far_allowed) and (height_actual <= height_limit)
    
    derived_fields['zoningCompliant'] = format_field_with_source(
        value='Compliant' if zoning_compliant else 'Non-Compliant',
        source=create_derived_source('FAR & Height Check')
    )
```

**Key Point**: All calculations check `if get_value('fieldName') is None` to only populate if field is empty, allowing users to override calculated values.

### Phase 4: Update OM Pages to Read from Content

**Files to Update**: All OM page files that currently calculate values

**Pattern**: Replace calculations with direct reads from `content`

**Example - Financial Sponsor Page** (`Frontend/src/app/project/om/[id]/dashboard/financial-sponsor/page.tsx`):

```typescript
// Before:
{(() => {
  const dscr = content?.dscr;
  const breakEven = dscr ? Math.round((1 / dscr) * 100) : 78;
  return <p className="font-medium">{breakEven}%</p>;
})()}

// After:
<p className="font-medium">{content?.breakEven ?? 78}%</p>
```

**Example - Returns Page** (`Frontend/src/app/project/om/[id]/dashboard/financial-sponsor/returns/page.tsx`):

```typescript
// Before:
const getRiskLevel = (irr: number | null) => {
  if (!irr) return 'Medium';
  if (irr >= 25) return 'Low';
  if (irr >= 15) return 'Medium';
  return 'High';
};
const upsideRisk = getRiskLevel(upsideScenario?.irr ?? null);

// After:
const upsideRisk = content?.riskLevelUpside ?? 'Medium';
const baseRisk = content?.riskLevelBase ?? 'Medium';
const downsideRisk = content?.riskLevelDownside ?? 'Medium';
```

**Example - Market Context Page** (`Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx`):

```typescript
// Before:
const totalJobs = content?.marketContextDetails?.majorEmployers?.reduce((sum: number, e: any) => sum + (e.employees ?? 0), 0) ?? 42000;
const avgGrowth = content?.marketContextDetails?.majorEmployers?.length 
  ? (() => {
      const growths = content.marketContextDetails.majorEmployers
        .map((e: any) => parseFloat(e.growth?.replace(/[^\d.-]/g, '') || '0'))
        .filter((n: number) => !isNaN(n));
      return growths.length ? growths.reduce((a: number, b: number) => a + b, 0) / growths.length : 8.2;
    })()
  : 8.2;

// After:
const totalJobs = content?.totalJobs ?? 42000;
const avgGrowth = content?.avgGrowth ?? 8.2;
```

**Files to Update**:

1. `Frontend/src/app/project/om/[id]/dashboard/financial-sponsor/page.tsx` - breakEven
2. `Frontend/src/app/project/om/[id]/dashboard/financial-sponsor/returns/page.tsx` - risk levels, scenario values
3. `Frontend/src/app/project/om/[id]/dashboard/market-context/page.tsx` - totalJobs, avgGrowth, totalIncentive
4. `Frontend/src/app/project/om/[id]/dashboard/market-context/supply-demand/page.tsx` - marketStatus, demandTrend, supplyPressure
5. `Frontend/src/app/project/om/[id]/dashboard/asset-profile/unit-mix/page.tsx` - luxuryTier, competitivePosition, avgRentPSF
6. `Frontend/src/app/project/om/[id]/dashboard/asset-profile/site-plan/page.tsx` - zoningCompliant

### Phase 5: Add Fields to Resume Form UI

**File**: `Frontend/src/components/forms/EnhancedProjectForm.tsx` or relevant form component

Add the new derived fields to the form in their appropriate sections:

- **Financial Section**: Add `breakEven`, `riskLevelBase`, `riskLevelUpside`, `riskLevelDownside`, `upsideIRR`, `downsideIRR`, `upsideEquityMultiple`, `downsideEquityMultiple`, `upsideProfitMargin`, `downsideProfitMargin`
- **Market Context Section**: Add `marketStatus`, `demandTrend`, `supplyPressure`, `totalJobs`, `avgGrowth`, `totalIncentiveValue`
- **Asset Profile Section**: Add `luxuryTier`, `competitivePosition`, `avgRentPSF`
- **Site Context Section**: Add `zoningCompliant`
- **Special Considerations Section**: Add `impactFees`, `totalIncentiveValue`
- **Property Specs Section**: Add `targetMarket`
- **Site Context Section**: Add `heightLimit`

These fields should:

- Be editable like any other field
- Support the same field types (text, number, select, etc.)
- Lock after autofill like other fields
- Have appropriate validation and formatting

**No special treatment** - they are regular form fields that happen to be calculated initially.

### Phase 6: Testing & Validation

1. **Resume Calculation**: Verify all derived fields are calculated correctly when resume is updated/autofilled
2. **Resume Form**: Verify derived fields appear in form and are editable
3. **Field Locking**: Verify derived fields lock after autofill like other fields
4. **OM Sync**: Verify derived fields are copied 1:1 to OM during sync
5. **OM Display**: Verify OM pages read values directly without calculation
6. **User Edits**: Verify users can edit derived fields and changes persist
7. **Edge Cases**: Test with missing data, null values, edge thresholds

## Data Flow

```
Resume Update/Autofill
    ↓
calculation_service.py calculates deI have a task of reconciling the OM with the project resume. There are some fields in the OM which are hardcoded right now. So we need to handle them by doing three things
```

1. If the field is already present in the resume, we just need to link it

2. If the field is not present in the resume, but can be added to it, we need to add it in the right section and subsection

3. If the field is not present in the resume and its not something that can be added, we need to generate it with AI like insights, summary, that kind of stuff

Your current task is to check if all this has been implemented

Current list:

## Hardcoded red text values in OM pages

### 1. Dashboard (`/dashboard/page.tsx`)

- Line 386: IRR percentage values for upside/downside scenarios (calculated, but displayed in red)

### 2. Market Context Overview (`/market-context/page.tsx`)

Demographics quadrant:

- Line 41: `425,000` (Population)

- Line 45: `+14.2%` (5yr Growth)

- Line 49: `32.5` (Median Age)

- Line 53: `45%` (College Grad%)

Employment quadrant:

- Line 71: `3.2%` (Unemployment)

- Line 75: `+3.5%` (Job Growth)

- Line 79: `42,000` (Total Jobs)

- Line 83: `+8.2%` (Avg Growth)

Supply Pipeline quadrant:

- Line 101: `2,450` (Units U/C)

- Line 105: `4,200` (24mo Pipeline)

- Line 109: `12,500` (Current Supply)

- Line 113: `93.5%` (Occupancy)

Regulatory/Incentives quadrant:

- Line 131: `Qualified` (Opportunity Zone)

- Line 137: `10 Years` (Tax Abatement)

- Line 142: `$12/SF` (Impact Fees)

- Line 147: `$2.4M` (Total Incentive Value)

### 3. Supply & Demand (`/market-context/supply-demand/page.tsx`)

Market status labels:

- Lines 353-356: `Tight`, `Balanced`, `Soft` (Market Status)

- Line 363: `↑ Growing` (Demand Trend)

- Line 369: `Moderate` (Supply Pressure)

Market insights:

- Line 394: `Limited new supply in Deep Ellum/Farmers Market corridor`

- Line 398: `Downtown Dallas occupancy above 94%`

- Line 402: `<6,000 units delivering over next 24 months`

- Line 414: `Strong job growth in Downtown Dallas (12.1% 5-year)`

- Line 418: `Workforce housing demand with PFC tax exemption`

- Line 422: `Proximity to DART rail and I-30/I-45 interchange`

- Line 432: `Pipeline delivery timing`

- Line 436: `Economic sensitivity`

- Line 440: `Interest rate impact`

### 4. Demographics (`/market-context/demographics/page.tsx`)

Market insights:

- Line 280: `Young professional demographic`

- Line 290: `Proximity to Downtown Dallas employers (AT&T, JP Morgan, Baylor Medical)`

- Line 294: `Walkability to Farmers Market and Deep Ellum entertainment district`

- Line 298: `Limited new supply in Deep Ellum/Farmers Market corridor`

- Line 308: `Downtown Dallas professionals (25-35)`

- Line 312: `Workforce housing eligible households (≤80% AMI)`

- Line 316: `Healthcare, finance, and tech workers`

### 5. Employment (`/market-context/employment/page.tsx`)

Market impact analysis:

- Line 261: `Strong tech sector presence`

- Line 265: `Healthcare employment stability`

- Line 269: `Financial services growth`

- Line 279: `High-income tech workers`

- Line 283: `Growing employment base`

- Line 287: `Walking distance to AT&T Discovery District, Baylor Medical, and Dallas County Government`

- Line 297: `Downtown Dallas professionals (AT&T, JP Morgan Chase)`

- Line 301: `Healthcare workers (Baylor Medical Center)`

- Line 305: `Government employees (Dallas County)`

### 6. Financial & Sponsor (`/financial-sponsor/page.tsx`)

- Line 209: `78%` (Break-even)

### 7. Returns (`/financial-sponsor/returns/page.tsx`)

Risk level labels:

- Line 204: `Low` (Upside Risk Level)

- Line 251: `Medium` (Base Risk Level)

- Line 298: `High` (Downside Risk Level)

- Line 366: `Low Risk` (Sensitivity table)

- Line 400: `Medium Risk` (Sensitivity table)

- Line 435: `High Risk` (Sensitivity table)

Return drivers:

- Line 460: `Strong market fundamentals`

- Line 464: `Premium location & amenities`

- Line 468: `Experienced development team`

- Line 478: `Construction cost overruns`

- Line 482: `Market timing risks`

- Line 486: `Interest rate volatility`

- Line 498: `Fixed-price contracts`

- Line 502: `Pre-leasing commitments`

- Line 506: `Interest rate hedging`

### 8. Sponsor Profile (`/financial-sponsor/sponsor-profile/page.tsx`)

- Lines 209, 215: `Available upon request` (Contact Information)

- Line 502: `Proven track record across multiple projects`

- Line 515: `Strong IRR performance (18-26%)`

- Line 524: `Consistent project delivery`

- Line 537: `Established lender relationships`

- Line 541: `Strong local market knowledge`

- Line 545: `Reputation for quality execution`

### 9. Key Terms (`/deal-snapshot/key-terms/page.tsx`)

- Line 190: `1.00%` (Origination Fee - hardcoded as placeholder)

- Line 284: `Opportunity Zone benefits, Dallas PFC lease, and workforce housing covenant tied to the Hoque structure.`

- Line 327: `Qualified` / `In Structuring` (Special Programs badges)

### 10. Risk Analysis (`/deal-snapshot/risk-analysis/page.tsx`)

Risk mitigation:

- Line 229: `Fixed-price GMP contract with contingency`

- Line 233: `Strong pre-leasing commitments`

- Line 237: `Full entitlement and permits secured`

- Line 248: `Monthly construction cost reviews`

- Line 252: `Quarterly market demand analysis`

- Line 256: `Regular entitlement compliance checks`

### 11. Capital Stack (`/deal-snapshot/capital-stack/page.tsx`)

Risk & mitigants:

- Line 295: `Cost overruns and delays could strain cash flow` (Construction Risk)

- Line 299: `Fixed-price GMP contract with experienced contractor` (Construction Mitigant)

- Line 309: `Rising SOFR could increase debt service costs` (Interest Rate Risk)

- Line 313: `12-month interest reserve and rate floor protection` (Interest Rate Mitigant)

- Line 323: `Insufficient pre-leasing could delay permanent financing` (Pre-Leasing Risk)

- Line 327: `Strong market fundamentals and marketing plan` (Pre-Leasing Mitigant)

- Line 337: `Market conditions may not support target exit cap rate` (Exit Strategy Risk)

- Line 341: `Multiple exit strategies (sale, refinance, hold)` (Exit Strategy Mitigant)

### 12. Deal Snapshot (`/deal-snapshot/page.tsx`)

- Line 244: `No risk flags identified` (Placeholder text)

### 13. Unit Mix (`/asset-profile/unit-mix/page.tsx`)

Market positioning:

- Line 311: `Premium` (Luxury Tier badge)

- Line 315: `Young Professionals` (Target Market badge)

- Line 319: `Top 20%` (Competitive Position badge)

### 14. Site Plan (`/asset-profile/site-plan/page.tsx`)

- Line 258: `Compliant` (Zoning Compliance badge)

---

---

## Values likely from project resume (not AI-generated)

These should come from the project resume rather than AI:

1. Deal-specific terms:

- Origination fee (`1.00%` in key-terms) — should be from loan terms

- Break-even (`78%`) — should be calculated from financial model

- Special program descriptions — should be from project details

2. Sponsor information:

- Contact info (`Available upon request`) — placeholder, should be from sponsor data

- Sponsor strengths/achievements — should be from sponsor profile

3. Risk mitigants:

- Specific contract terms (e.g., "Fixed-price GMP contract") — should be from deal documents

- Reserve amounts and structures — should be from loan terms

4. Regulatory/incentive values:

- `$12/SF` (Impact Fees) — should be from project costs

- `$2.4M` (Total Incentive Value) — should be calculated from incentives

- `10 Years` (Tax Abatement term) — should be from incentive documentsrived fields (only if empty)

↓

Derived fields stored in resume content (editable)

↓

Resume Form displays fields (editable, lockable)

↓

User can edit derived fields (optional)

↓

om_sync_service.py copies fields 1:1 to OM

↓

OM content contains all derived fields

↓

OM pages read values directly (no calculation)

## Benefits

1. **Single Source of Truth**: Calculations happen once at resume stage
2. **Consistency**: Resume and OM show same values
3. **Performance**: No on-the-fly calculations when viewing OM
4. **User Control**: Users can edit derived fields if needed
5. **Maintainability**: Calculation logic centralized in one place
6. **Auditability**: Derived fields have source metadata showing calculation method

## Migration Notes

- Existing OM data will need recalculation when resumes are next updated/autofilled
- Derived fields will be calculated automatically on next resume save/autofill
- No data migration needed - fields will populate naturally
- Users can override calculated values by editing fields manually