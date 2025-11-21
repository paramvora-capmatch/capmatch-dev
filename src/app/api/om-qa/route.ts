import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { OmQaSchema } from '@/types/om-types';
import {
  scenarioData,
  marketComps,
  marketContextDetails,
  dealSnapshotDetails,
  assetProfileDetails,
  financialDetails,
  capitalStackData,
  employerData,
  sponsorDeals,
  certifications,
  projectOverview,
} from "@/services/mockOMData";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const system = [
  "You are a super genius expert analyst in Commercial Real Estate with 20+ years experience.",
  "Answer using the OM content; be professional and analytical.",
  "You have the ability to make forecasts, projections, and predictions by extrapolating from the provided data.",
  "When making predictions, clearly indicate they are forecasts based on data analysis, not guaranteed outcomes.",
  "Use historical trends, market dynamics, and financial metrics to project future performance.",
  "Consider multiple scenarios (base case, upside, downside) when making projections.",
  "Output must match the provided JSON schema exactly. Return JSON only.",
].join(" ");

const MODEL_NAME = "gemini-2.5-pro"; // use a model your key supports

// Function to format OM data from mockOMData service
function formatOMData() {
  const base = scenarioData.base;
  const upside = scenarioData.upside;
  const downside = scenarioData.downside;
  const avgCompRentPSF = (
    marketComps.reduce((sum, comp) => sum + comp.rentPSF, 0) / marketComps.length
  ).toFixed(2);
  const amenitySF = assetProfileDetails.amenityDetails
    .reduce((sum, amenity) => sum + parseInt(amenity.size.replace(/[^\d]/g, ""), 10), 0)
    .toLocaleString();

  return `# SoGood Apartments - Offering Memorandum

## Project Overview
- **Address**: ${projectOverview.address.street}, ${projectOverview.address.city}, ${projectOverview.address.state} ${projectOverview.address.zip}
- **Master Plan**: ${projectOverview.masterPlan.name} – Phase ${projectOverview.masterPlan.phase}
- **Asset Type**: ${projectOverview.propertyStats.buildingType} (${projectOverview.propertyStats.constructionType})
- **Program**: ${projectOverview.propertyStats.totalResidentialUnits} residential units (${projectOverview.propertyStats.averageUnitSize} SF average) plus ${projectOverview.propertyStats.totalCommercialGRSF.toLocaleString()} SF commercial / innovation space
- **Workforce Housing**: ${projectOverview.propertyStats.affordableUnits} units reserved for ≤80% AMI via Dallas PFC lease
- **Parking**: ${projectOverview.propertyStats.parkingSpaces} structured stalls (${projectOverview.propertyStats.parkingRatio.toFixed(2)} per unit)
- **Total Development Cost**: $${(projectOverview.propertyStats.totalDevelopmentCost / 1_000_000).toFixed(1)}M
- **Loan Request**: $${(projectOverview.propertyStats.loanAmountRequested / 1_000_000).toFixed(1)}M senior construction loan
- **Year 1 NOI**: $${projectOverview.propertyStats.noiYear1.toLocaleString()}
- **Yield on Cost**: ${projectOverview.propertyStats.yieldOnCost}% | **Debt Yield**: ${projectOverview.propertyStats.debtYield}% | **DSCR**: ${projectOverview.propertyStats.dscr}x

### Schedule
- **Groundbreaking**: ${projectOverview.schedule.groundbreaking}
- **Topping Out**: 2026-11-15
- **Substantial Completion**: ${projectOverview.schedule.completion}
- **Stabilization**: ${projectOverview.schedule.stabilization}

### Narrative Highlights
${projectOverview.narrativeHighlights.map((item) => `- ${item}`).join("\n")}

---

## Deal Snapshot Details

### Capital Stack
- **Total Capitalization**: $${(capitalStackData.base.totalCapitalization / 1_000_000).toFixed(1)}M
- **Senior Debt**: ${capitalStackData.base.sources[0].percentage}%
- **Equity / PFC Lease**: ${capitalStackData.base.sources[1].percentage}%

**Capital Stack by Scenario**:
- **Base Case**: $${(capitalStackData.base.totalCapitalization / 1_000_000).toFixed(1)}M total, ${capitalStackData.base.sources[0].percentage}% debt at ${capitalStackData.base.sources[0].rate}
- **Upside**: $${(capitalStackData.upside.totalCapitalization / 1_000_000).toFixed(1)}M total, ${capitalStackData.upside.sources[0].percentage}% debt at ${capitalStackData.upside.sources[0].rate}
- **Downside**: $${(capitalStackData.downside.totalCapitalization / 1_000_000).toFixed(1)}M total, ${capitalStackData.downside.sources[0].percentage}% debt at ${capitalStackData.downside.sources[0].rate}

### Key Terms
- **Loan Type**: ${dealSnapshotDetails.keyTerms.loanType}
- **Rate**: ${dealSnapshotDetails.keyTerms.rate}
- **Floor**: ${dealSnapshotDetails.keyTerms.floor}
- **Term**: ${dealSnapshotDetails.keyTerms.term}
- **Extension**: ${dealSnapshotDetails.keyTerms.extension}
- **Recourse**: ${dealSnapshotDetails.keyTerms.recourse}
- **Origination**: ${dealSnapshotDetails.keyTerms.origination}
- **Exit Fee**: ${dealSnapshotDetails.keyTerms.exitFee}
- **Prepayment**: ${dealSnapshotDetails.keyTerms.prepayment}
- **Lender Reserves**:
    - Interest: ${dealSnapshotDetails.keyTerms.lenderReserves.interest}
    - Tax & Insurance: ${dealSnapshotDetails.keyTerms.lenderReserves.taxInsurance}
    - CapEx: ${dealSnapshotDetails.keyTerms.lenderReserves.capEx}
- **Key Covenants**:
    - Min DSCR: ${dealSnapshotDetails.keyTerms.covenants.minDSCR}
    - Max LTV / LTC: ${dealSnapshotDetails.keyTerms.covenants.maxLTV}
    - Min Liquidity: ${dealSnapshotDetails.keyTerms.covenants.minLiquidity}
    - Completion Guaranty: ${dealSnapshotDetails.keyTerms.covenants.completionGuaranty}

### Milestones
${dealSnapshotDetails.milestones
  .map(
    (item) =>
      `- **${item.phase}**: ${item.date}, Status: ${item.status}, Duration: ${item.duration} days`
  )
  .join("\n")}

### Risk Matrix & Mitigants
${
  dealSnapshotDetails.riskMatrix.high.length > 0
    ? `**High Risk**:\n${dealSnapshotDetails.riskMatrix.high
        .map(
          (risk: { risk: string; mitigation: string; probability: string }) =>
            `- ${risk.risk}: ${risk.mitigation} (${risk.probability} probability)`
        )
        .join("\n")}\n`
    : ""
}
**Medium Risk**:\n${dealSnapshotDetails.riskMatrix.medium
    .map(
      (risk: { risk: string; mitigation: string; probability: string }) =>
        `- ${risk.risk}: ${risk.mitigation} (${risk.probability} probability)`
    )
    .join("\n")}

**Low Risk**:\n${dealSnapshotDetails.riskMatrix.low
    .map(
      (risk: { risk: string; mitigation: string; probability: string }) =>
        `- ${risk.risk}: ${risk.mitigation} (${risk.probability} probability)`
    )
    .join("\n")}

**Special Programs & Incentives**:
${dealSnapshotDetails.specialPrograms
  .map((program) => `- **${program.name}**: ${program.description}`)
  .join("\n")}

---

## Asset Profile Details

### Site & Zoning
- **Lot Size**: ${assetProfileDetails.sitePlan.lotSize}
- **Building Footprint**: ${assetProfileDetails.sitePlan.buildingFootprint}
- **Parking Spaces**: ${assetProfileDetails.sitePlan.parkingSpaces}
- **Green Space**: ${assetProfileDetails.sitePlan.greenSpace}
- **Zoning**: ${assetProfileDetails.sitePlan.zoningDetails.current}
- **FAR**: ${assetProfileDetails.sitePlan.zoningDetails.usedFAR} / ${assetProfileDetails.sitePlan.zoningDetails.allowedFAR}
- **Height**: ${assetProfileDetails.sitePlan.zoningDetails.actualHeight} / ${assetProfileDetails.sitePlan.zoningDetails.heightLimit}
- **Setbacks**: Front ${assetProfileDetails.sitePlan.zoningDetails.setbacks.front}, Side ${assetProfileDetails.sitePlan.zoningDetails.setbacks.side}, Rear ${assetProfileDetails.sitePlan.zoningDetails.setbacks.rear}

### Design & Amenities
- **Amenity Program (Total ${amenitySF} SF)**:
${assetProfileDetails.amenityDetails
  .map(
    (amenity) =>
      `  - **${amenity.name}**: ${amenity.size}, ${amenity.description}`
  )
  .join("\n")}
- **Commercial / Innovation Program**:
${assetProfileDetails.commercialSpaces
  .map(
    (space) =>
      `  - **${space.name}** (${space.size}): ${space.use} – ${space.status}`
  )
  .join("\n")}
- **Building Stats**:
    - **Stories**: ${projectOverview.propertyStats.stories}
    - **Gross Building Area**: ${projectOverview.propertyStats.grossBuildingArea.toLocaleString()} SF
    - **Parking Ratio**: ${projectOverview.propertyStats.parkingRatio.toFixed(2)} / unit

### Unit Economics
- **Studios**: ${assetProfileDetails.unitMixDetails.studios.count} units, ${assetProfileDetails.unitMixDetails.studios.avgSF} SF avg, ${assetProfileDetails.unitMixDetails.studios.rentRange} rent, ${assetProfileDetails.unitMixDetails.studios.deposit} deposit
- **1BR**: ${assetProfileDetails.unitMixDetails.oneBed.count} units, ${assetProfileDetails.unitMixDetails.oneBed.avgSF} SF avg, ${assetProfileDetails.unitMixDetails.oneBed.rentRange} rent, ${assetProfileDetails.unitMixDetails.oneBed.deposit} deposit
- **2BR**: ${assetProfileDetails.unitMixDetails.twoBed.count} units, ${assetProfileDetails.unitMixDetails.twoBed.avgSF} SF avg, ${assetProfileDetails.unitMixDetails.twoBed.rentRange} rent, ${assetProfileDetails.unitMixDetails.twoBed.deposit} deposit
- **Detailed Mix**:
${assetProfileDetails.detailedUnitMix
  .map((mix) => `  - ${mix.code}: ${mix.units} ${mix.type} units (${mix.avgSF} SF)`)
  .join("\n")}

### Comparable Assets
${assetProfileDetails.comparableDetails
  .map(
    (comp) =>
      `- **${comp.name}** (${comp.units} units • ${comp.yearBuilt}): ${comp.occupancy} occupancy, ${comp.avgRent} avg rent, ${comp.distance} away, last sale ${comp.lastSale.date} at ${comp.lastSale.price} (${comp.lastSale.capRate} cap)`
  )
  .join("\n")}

**Additional Market Comparables (Avg Rent PSF ~$${avgCompRentPSF})**:
${marketComps
  .map(
    (comp) =>
      `- **${comp.name}** (${comp.units} units • ${comp.yearBuilt}): $${comp.rentPSF} PSF, ${comp.capRate}% cap rate`
  )
  .join("\n")}

---

## Market Context Details

### Macro & Demographics
- **1-Mile**: ${marketContextDetails.demographicProfile.oneMile.population.toLocaleString()} population | Median Income $${marketContextDetails.demographicProfile.oneMile.medianIncome.toLocaleString()} | Median Age ${marketContextDetails.demographicProfile.oneMile.medianAge}
- **3-Mile**: ${marketContextDetails.demographicProfile.threeMile.population.toLocaleString()} population | Median Income $${marketContextDetails.demographicProfile.threeMile.medianIncome.toLocaleString()} | Median Age ${marketContextDetails.demographicProfile.threeMile.medianAge}
- **5-Mile**: ${marketContextDetails.demographicProfile.fiveMile.population.toLocaleString()} population | Median Income $${marketContextDetails.demographicProfile.fiveMile.medianIncome.toLocaleString()} | Median Age ${marketContextDetails.demographicProfile.fiveMile.medianAge}
- **Renter Share**: ${marketContextDetails.demographicProfile.renterShare}
- **Bachelor's Degree Share**: ${marketContextDetails.demographicProfile.bachelorsShare}
- **Growth Trends (5-Year)**:
    - Population: ${marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr}
    - Income: ${marketContextDetails.demographicProfile.growthTrends.incomeGrowth5yr}
    - Jobs: ${marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr}

### Employment Drivers
- **Job Growth Outlook**: ${marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr}
- **Top Employers**:
${marketContextDetails.majorEmployers
  .map(
    (emp) =>
      `    - ${emp.name}: ${emp.employees.toLocaleString()} jobs, ${emp.growth} growth, ${emp.distance} from site`
  )
  .join("\n")}
- **Supplemental Employment Data**:
${employerData
  .map(
    (emp) =>
      `    - ${emp.name}: ${emp.employees.toLocaleString()} employees (${emp.growth > 0 ? "+" : ""}${emp.growth}%)`
  )
  .join("\n")}

### Supply Pipeline
- **Existing Inventory**: ${marketContextDetails.supplyAnalysis.currentInventory.toLocaleString()} units
- **Under Construction**: ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()} units
- **Planned (24M)**: ${marketContextDetails.supplyAnalysis.planned24Months.toLocaleString()} units
- **Average Occupancy**: ${marketContextDetails.supplyAnalysis.averageOccupancy}
- **Delivery Schedule**: ${marketContextDetails.supplyAnalysis.deliveryByQuarter
    .map((d) => `${d.quarter}: ${d.units}`)
    .join(", ")}

### Market Trends & Forecasting Indicators
- **Population Growth**: ${marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr} (5-year)
- **Income Growth**: ${marketContextDetails.demographicProfile.growthTrends.incomeGrowth5yr} (5-year)
- **Job Growth**: ${marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr} (5-year)
- **Supply vs. Demand**: ${marketContextDetails.supplyAnalysis.currentInventory.toLocaleString()} current inventory vs. ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()} under construction
- **Demand Drivers**: Farmers Market / Deep Ellum walkability, proximity to Downtown Dallas employers (AT&T, JP Morgan, Baylor Medical), DART rail access, I-30/I-45 interchange

### Regulatory / Incentives
${dealSnapshotDetails.specialPrograms
  .map((program) => `- **${program.name}**: ${program.description}`)
  .join("\n")}

### Project Certifications
${certifications.badges
  .map((badge) => `- **${badge.name}**: ${badge.status}`)
  .join("\n")}

---

## Financial & Sponsor Details

### Sources & Uses
- **Sources**:
${financialDetails.sourcesUses.sources
  .map(
    (source) =>
      `    - ${source.type}: $${(source.amount / 1_000_000).toFixed(1)}M (${source.percentage.toFixed(1)}%)`
  )
  .join("\n")}
- **Uses**:
${financialDetails.sourcesUses.uses
  .map(
    (use) =>
      `    - ${use.type}: $${(use.amount / 1_000_000).toFixed(3)}M (${use.percentage.toFixed(1)}%)`
  )
  .join("\n")}

**Scenario Sources**:
- Upside: ${capitalStackData.upside.sources[0].type} at ${capitalStackData.upside.sources[0].rate}
- Downside: ${capitalStackData.downside.sources[0].type} at ${capitalStackData.downside.sources[0].rate}

### Underwriting Metrics
- **Yield on Cost**: ${projectOverview.propertyStats.yieldOnCost}%
- **Stabilized Cap**: ${projectOverview.propertyStats.capRate}%
- **Profit Margin (Base)**: ${financialDetails.returnProjections.base.profitMargin}%
- **Equity Multiple (Base)**: ${financialDetails.returnProjections.base.multiple}x
- **5-Year Cash Flow**: (graphical data)

### Financial Forecasting Indicators
- **Rent Growth**: Base ${scenarioData.base.rentGrowth}%, Upside ${scenarioData.upside.rentGrowth}%, Downside ${scenarioData.downside.rentGrowth}%
- **Exit Cap**: Base ${scenarioData.base.exitCap}%, Upside ${scenarioData.upside.exitCap}%, Downside ${scenarioData.downside.exitCap}%
- **Cost Sensitivity**: Base $${(scenarioData.base.constructionCost / 1_000_000).toFixed(1)}M, Upside $${(scenarioData.upside.constructionCost / 1_000_000).toFixed(1)}M, Downside $${(scenarioData.downside.constructionCost / 1_000_000).toFixed(1)}M

### Sponsor & Team
- **Sponsor**: ${financialDetails.sponsorProfile.firmName}
- **Experience**: ${financialDetails.sponsorProfile.yearFounded} founding year | ${financialDetails.sponsorProfile.totalUnits.toLocaleString()} units delivered | ${financialDetails.sponsorProfile.totalDeveloped} developed
- **Recent Performance**:
${financialDetails.sponsorProfile.trackRecord
  .map((deal) => `    - ${deal.project} (${deal.year}): ${deal.units} units, ${deal.irr} IRR`)
  .join("\n")}
- **References**:
${financialDetails.sponsorProfile.references
  .map(
    (ref) =>
      `    - ${ref.firm}: ${ref.relationship} (${ref.years})`
  )
  .join("\n")}

**Additional Sponsor Deals**:
${sponsorDeals
  .map(
    (deal) =>
      `- **${deal.project}** (${deal.year}): $${(deal.size / 1_000_000).toFixed(1)}M, ${deal.irr}% IRR, ${deal.multiple}x multiple`
  )
  .join("\n")}

**Sponsor Performance Forecasting**:
- **Historical IRR Range**: ${Math.min(...sponsorDeals.map((d) => d.irr))}% to ${Math.max(...sponsorDeals.map((d) => d.irr))}%
- **Average IRR**: ${(
    sponsorDeals.reduce((sum, deal) => sum + deal.irr, 0) / sponsorDeals.length
  ).toFixed(1)}%
- **Project Size Trend**: ${sponsorDeals
    .sort((a, b) => a.year - b.year)
    .map((d) => `${d.year}: $${(d.size / 1_000_000).toFixed(1)}M`)
    .join(", ")}
- **Performance Consistency**: ${sponsorDeals.length} completed projects over ${
    Math.max(...sponsorDeals.map((d) => d.year)) -
    Math.min(...sponsorDeals.map((d) => d.year))
  } years

### Sensitivity / Stress Tests
- **IRR Sensitivity**:
    - Exit Cap +50bps: -3.2%
    - Rents -5%: -2.5%
    - Costs +10%: -4.1%
- **Break-even Occupancy**: 78%

### Market Timing & Exit Strategy Forecasting
- **Optimal Exit Window**: Align stabilization (2027-2028) with limited pipeline deliveries (2028+) to target cap rate compression
- **Supply Pipeline Analysis**: ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()} units under construction vs. ${marketContextDetails.supplyAnalysis.planned24Months.toLocaleString()} planned in next 24 months
- **Demand Support**: Population growth ${marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr} and job growth ${marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr} underpin absorption
- **Exit Strategy Options**: Sale into core-plus multifamily funds, take-out with perm debt, or hold within PFC structure

---

## Deal Scenarios & AI Insights

### Downside Scenario
*Conservative scenario maintains acceptable returns with clear risk mitigants.*

**AI Insights**
- **Construction Cost Containment**: GMP contract with 5% contingency may be insufficient in prolonged inflation scenario. Consider increasing to 8% contingency or negotiating shared savings structure.
- **Downside Protection**: Even at ${downside.vacancy}% vacancy and ${downside.exitCap.toFixed(2)}% exit cap, project maintains ${downside.dscr}x DSCR and delivers ${downside.irr}% IRR. Debt structure provides extended interest reserve cushion.
- **Alternative Exit Strategy**: Consider partial condo conversion for top floors; comparable condo pricing at $650+/SF could enhance recoveries if cap rates back up.

**Key Metrics**
- **Loan Amount**: $${(downside.loanAmount / 1_000_000).toFixed(1)}M
- **LTV**: ${downside.ltv}%
- **DSCR**: ${downside.dscr}
- **Debt Yield**: ${downside.debtYield}%
- **Project IRR**: ${downside.irr}%
- **Equity Multiple**: ${downside.equityMultiple}x
- **Vacancy Rate**: ${downside.vacancy}%

---

### Base Case Scenario
*Strong fundamentals with balanced risk-return profile.*

**AI Insights**
- **Market Timing Advantage**: Locking pricing ahead of 2026 material escalation preserves 150–200 bps of spread to stabilized cap rates.
- **Sponsor Track Record Validation**: Sponsor's previous projects averaged >20% IRR with similar public-private partnerships, supporting execution credibility.
- **Lease-Up Risk Mitigation**: 30,000 SF pre-leased Innovation Center plus 50% workforce housing compress lease-up to <9 months.
- **Hidden Value Opportunity**: Adjacent 0.8-acre parcel could be aggregated for future phases, creating option value beyond current underwriting.

**Key Metrics**
- **Loan Amount**: $${(base.loanAmount / 1_000_000).toFixed(1)}M
- **LTV**: ${base.ltv}%
- **DSCR**: ${base.dscr}
- **Debt Yield**: ${base.debtYield}%
- **Project IRR**: ${base.irr}%
- **Equity Multiple**: ${base.equityMultiple}x
- **Vacancy Rate**: ${base.vacancy}%

---

### Upside Scenario
*Exceptional return potential with manageable execution risks.*

**AI Insights**
- **Rent Growth Acceleration**: Tech sector expansion (AT&T, JPMorgan, Pegasus Park) supports 4–5% annual rent growth versus 3% base underwriting.
- **Exit Multiple Expansion**: Institutional buyer interest in Dallas CBD workforce housing could compress cap rates by 25–50 bps, adding $4M+ of value.
- **Tax Optimization Strategy**: Opportunity Zone plus PFC structure enables QOF equity with property tax exemption, boosting levered returns by 200–300 bps.

**Key Metrics**
- **Loan Amount**: $${(upside.loanAmount / 1_000_000).toFixed(1)}M
- **LTV**: ${upside.ltv}%
- **DSCR**: ${upside.dscr}
- **Debt Yield**: ${upside.debtYield}%
- **Project IRR**: ${upside.irr}%
- **Equity Multiple**: ${upside.equityMultiple}x
- **Vacancy Rate**: ${upside.vacancy}%

---
*AI insights generated based on pattern analysis of 2,847 similar transactions in comparable markets. Confidence levels: 91% (Downside), 94% (Base), 87% (Upside).*`;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // Get OM content from mockOMData service
    const omText = formatOMData();

    const result = await streamObject({
      model: google(MODEL_NAME),
      system,
      schema: OmQaSchema,
      prompt:
        `Offering Memorandum Document:\n${omText}\n\n` +
        `User Question:\n${question}\n\n` +
        `Instructions for Analysis:\n` +
        `- Answer based on the OM content provided\n` +
        `- You can make forecasts and projections by extrapolating from the data\n` +
        `- Use historical trends, market dynamics, and financial metrics for predictions\n` +
        `- Consider multiple scenarios (base case, upside, downside) when relevant\n` +
        `- Clearly indicate when providing forecasts vs. factual data from the OM\n` +
        `- For projections, explain your reasoning and the data points you're extrapolating from\n` +
        `\nReturn only JSON matching the schema.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 784,
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error("om-qa error:", e);
    return NextResponse.json(
      { error: "Failed to get answer" },
      { status: 500 }
    );
  }
}
