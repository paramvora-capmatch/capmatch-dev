import { NextRequest, NextResponse } from "next/server";
import { streamObject } from "ai";
import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProviderOptions,
} from "@ai-sdk/google";
import { OmQaSchema } from "@/types/om-types";
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

  return `# Downtown Highrise - Offering Memorandum

## Deal Snapshot Details

### Capital Stack
- **Total Capitalization**: $${(base.constructionCost / 1000000).toFixed(1)}M
- **Senior Debt**: ${((base.loanAmount / base.constructionCost) * 100).toFixed(
    0
  )}%
- **Equity**: ${((1 - base.loanAmount / base.constructionCost) * 100).toFixed(
    0
  )}%

**Capital Stack by Scenario**:
- **Base Case**: $${(
    capitalStackData.base.totalCapitalization / 1000000
  ).toFixed(1)}M total, ${
    capitalStackData.base.sources[0].percentage
  }% debt at ${capitalStackData.base.sources[0].rate}
- **Upside**: $${(
    capitalStackData.upside.totalCapitalization / 1000000
  ).toFixed(1)}M total, ${
    capitalStackData.upside.sources[0].percentage
  }% debt at ${capitalStackData.upside.sources[0].rate}
- **Downside**: $${(
    capitalStackData.downside.totalCapitalization / 1000000
  ).toFixed(1)}M total, ${
    capitalStackData.downside.sources[0].percentage
  }% debt at ${capitalStackData.downside.sources[0].rate}

### Key Terms
- **Loan Type**: ${dealSnapshotDetails.keyTerms.loanType}
- **Rate**: ${dealSnapshotDetails.keyTerms.rate}
- **Floor**: ${dealSnapshotDetails.keyTerms.floor}
- **Term**: ${dealSnapshotDetails.keyTerms.term}
- **Extension**: ${dealSnapshotDetails.keyTerms.extension}
- **Recourse**: ${dealSnapshotDetails.keyTerms.recourse}
- **Origination**: ${dealSnapshotDetails.keyTerms.origination}
- **Exit Fee**: ${dealSnapshotDetails.keyTerms.exitFee}
- **Lender Reserves**:
    - Interest: ${dealSnapshotDetails.keyTerms.lenderReserves.interest}
    - Tax & Insurance: ${
      dealSnapshotDetails.keyTerms.lenderReserves.taxInsurance
    }
    - CapEx: ${dealSnapshotDetails.keyTerms.lenderReserves.capEx}
- **Key Covenants**:
    - Min DSCR: ${dealSnapshotDetails.keyTerms.covenants.minDSCR}
    - Max LTV: ${dealSnapshotDetails.keyTerms.covenants.maxLTV}
    - Min Liquidity: ${dealSnapshotDetails.keyTerms.covenants.minLiquidity}
    - Completion Guaranty: ${
      dealSnapshotDetails.keyTerms.covenants.completionGuaranty
    }

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

---

## Asset Profile Details

### Site & Zoning
- **Lot Size**: ${assetProfileDetails.sitePlan.lotSize}
- **Building Footprint**: ${assetProfileDetails.sitePlan.buildingFootprint}
- **Parking Spaces**: ${assetProfileDetails.sitePlan.parkingSpaces}
- **Green Space**: ${assetProfileDetails.sitePlan.greenSpace}
- **Zoning**: ${assetProfileDetails.sitePlan.zoningDetails.current}
- **FAR**: ${assetProfileDetails.sitePlan.zoningDetails.usedFAR} / ${
    assetProfileDetails.sitePlan.zoningDetails.allowedFAR
  }
- **Height**: ${assetProfileDetails.sitePlan.zoningDetails.actualHeight} / ${
    assetProfileDetails.sitePlan.zoningDetails.heightLimit
  }
- **Setbacks**: Front ${
    assetProfileDetails.sitePlan.zoningDetails.setbacks.front
  }, Side ${assetProfileDetails.sitePlan.zoningDetails.setbacks.side}, Rear ${
    assetProfileDetails.sitePlan.zoningDetails.setbacks.rear
  }

### Design & Amenities
- **Amenities**:
${assetProfileDetails.amenityDetails
  .map(
    (amenity) =>
      `  - **${amenity.name}**: ${amenity.size}, ${amenity.description}`
  )
  .join("\n")}
- **Building Stats**:
    - **Stories**: 8
    - **Parking Ratio**: 1.2 / unit
    - **Efficiency**: 85%

### Unit Economics
- **Studio**: ${assetProfileDetails.unitMixDetails.studios.count} units, ${
    assetProfileDetails.unitMixDetails.studios.avgSF
  } SF avg, ${assetProfileDetails.unitMixDetails.studios.rentRange} rent, $${
    assetProfileDetails.unitMixDetails.studios.deposit
  } deposit
- **1BR**: ${assetProfileDetails.unitMixDetails.oneBed.count} units, ${
    assetProfileDetails.unitMixDetails.oneBed.avgSF
  } SF avg, ${assetProfileDetails.unitMixDetails.oneBed.rentRange} rent, $${
    assetProfileDetails.unitMixDetails.oneBed.deposit
  } deposit
- **2BR**: ${assetProfileDetails.unitMixDetails.twoBed.count} units, ${
    assetProfileDetails.unitMixDetails.twoBed.avgSF
  } SF avg, ${assetProfileDetails.unitMixDetails.twoBed.rentRange} rent, $${
    assetProfileDetails.unitMixDetails.twoBed.deposit
  } deposit
- **Avg Rent PSF**: $4.20

### Comparable Assets
${assetProfileDetails.comparableDetails
  .map(
    (comp) =>
      `- **${comp.name}** (${comp.units} units • ${comp.yearBuilt}): ${comp.occupancy} occupancy, ${comp.avgRent} avg rent, ${comp.distance} away, last sale ${comp.lastSale.date} at ${comp.lastSale.price} (${comp.lastSale.capRate} cap)`
  )
  .join("\n")}

**Additional Market Comparables**:
${marketComps
  .map(
    (comp) =>
      `- **${comp.name}** (${comp.units} units • ${comp.yearBuilt}): $${comp.rentPSF} PSF, ${comp.capRate}% cap rate`
  )
  .join("\n")}

---

## Market Context Details

### Macro & Demographics
- **Population**: ${marketContextDetails.demographicProfile.fiveMile.population.toLocaleString()}
- **5YR Growth**: ${
    marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr
  }
- **Median Age**: ${marketContextDetails.demographicProfile.fiveMile.medianAge}
- **College Grad %**: 45%
- **Income Distribution**:
    - $100k+: 35%
    - $50-100k: 40%

### Employment Drivers
- **Unemployment**: 3.2%
- **Job Growth**: ${
    marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr
  }
- **Top Employers**:
${employerData
  .map(
    (emp) =>
      `    - ${emp.name}: ${emp.employees.toLocaleString()} (${
        emp.growth > 0 ? "+" : ""
      }${emp.growth}%)`
  )
  .join("\n")}

### Supply Pipeline
- **Units U/C**: ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()}
- **24MO Pipeline**: ${marketContextDetails.supplyAnalysis.planned24Months.toLocaleString()}
- **Delivery Schedule**: ${marketContextDetails.supplyAnalysis.deliveryByQuarter
    .map((d) => `${d.quarter}: ${d.units}`)
    .join(", ")}

### Market Trends & Forecasting Indicators
- **Population Growth Trend**: ${
    marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr
  } over 5 years
- **Income Growth Trend**: ${
    marketContextDetails.demographicProfile.growthTrends.incomeGrowth5yr
  } over 5 years  
- **Job Growth Trend**: ${
    marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr
  } over 5 years
- **Supply vs. Demand**: ${marketContextDetails.supplyAnalysis.currentInventory.toLocaleString()} current inventory vs. ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()} under construction
- **Market Absorption Rate**: Based on current delivery schedule and population growth trends

### Regulatory / Incentives
- **Opportunity Zone**: Qualified
- **Tax Abatement**: 10 Years
- **Impact Fees**: $12/SF
- **Total Incentive Value**: $2.4M

### Project Certifications
${certifications.badges
  .map((badge) => `- **${badge.name}**: ${badge.status}`)
  .join("\n")}

---

## Financial & Sponsor Details

### Sources & Uses
- **Sources**:
${capitalStackData.base.sources
  .map(
    (source) =>
      `    - ${source.type}: $${(source.amount / 1000000).toFixed(1)}M (${
        source.percentage
      }%)`
  )
  .join("\n")}
- **Uses**:
${capitalStackData.base.uses
  .map(
    (use) =>
      `    - ${use.type}: $${(use.amount / 1000000).toFixed(1)}M (${
        use.percentage
      }%)`
  )
  .join("\n")}

**Upside Scenario Sources**: ${capitalStackData.upside.sources[0].type} at ${
    capitalStackData.upside.sources[0].rate
  }
**Downside Scenario Sources**: ${
    capitalStackData.downside.sources[0].type
  } at ${capitalStackData.downside.sources[0].rate}

### Underwriting Metrics
- **Yield on Cost**: 7.8%
- **Stabilized Cap**: 5.5%
- **Dev Spread**: 2.3%
- **Profit Margin**: ${financialDetails.returnProjections.base.profitMargin}%
- **5-Year Cash Flow**: (graphical data)

### Financial Forecasting Indicators
- **Rent Growth Projections**: Base case ${
    scenarioData.base.rentGrowth
  }%, Upside ${scenarioData.upside.rentGrowth}%, Downside ${
    scenarioData.downside.rentGrowth
  }%
- **Exit Cap Rate Trends**: Base case ${scenarioData.base.exitCap}%, Upside ${
    scenarioData.upside.exitCap
  }%, Downside ${scenarioData.downside.exitCap}%
- **Interest Rate Sensitivity**: SOFR fluctuations impact debt service and project economics
- **Construction Cost Variations**: Base case $${(
    scenarioData.base.constructionCost / 1000000
  ).toFixed(1)}M, Upside $${(
    scenarioData.upside.constructionCost / 1000000
  ).toFixed(1)}M, Downside $${(
    scenarioData.downside.constructionCost / 1000000
  ).toFixed(1)}M

### Sponsor & Team
- **Experience**: 15+ Years
- **Total Developed**: $${financialDetails.sponsorProfile.totalDeveloped}
- **Recent Performance**:
${financialDetails.sponsorProfile.trackRecord
  .map((deal) => `    - ${deal.project}: ${deal.irr}`)
  .join("\n")}

**Additional Sponsor Deals**:
${sponsorDeals
  .map(
    (deal) =>
      `- **${deal.project}** (${deal.year}): $${(deal.size / 1000000).toFixed(
        1
      )}M, ${deal.irr}% IRR, ${deal.multiple}x multiple`
  )
  .join("\n")}

**Sponsor Performance Forecasting**:
- **Historical IRR Range**: ${Math.min(
    ...sponsorDeals.map((d) => d.irr)
  )}% to ${Math.max(...sponsorDeals.map((d) => d.irr))}%
- **Average IRR**: ${(
    sponsorDeals.reduce((sum, deal) => sum + deal.irr, 0) / sponsorDeals.length
  ).toFixed(1)}%
- **Project Size Trend**: ${sponsorDeals
    .sort((a, b) => a.year - b.year)
    .map((d) => `${d.year}: $${(d.size / 1000000).toFixed(1)}M`)
    .join(", ")}
- **Performance Consistency**: Based on ${
    sponsorDeals.length
  } completed projects over ${
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
- **Optimal Exit Window**: Based on supply pipeline delivery schedule and market absorption rates
- **Supply Pipeline Analysis**: ${marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()} units under construction vs. ${marketContextDetails.supplyAnalysis.planned24Months.toLocaleString()} planned in next 24 months
- **Market Absorption**: Based on population growth of ${
    marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr
  } and job growth of ${
    marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr
  }
- **Exit Strategy Options**: Based on current market conditions and comparable sales data

---

## Deal Scenarios & AI Insights

### Downside Scenario
*Conservative scenario maintains acceptable returns with clear risk mitigants.*

**AI Insights**
- **Construction Cost Containment**: GMP contract with 5% contingency may be insufficient in prolonged inflation scenario. Consider increasing to 8% contingency or negotiating shared savings structure.
- **Downside Protection**: Even at ${
    downside.vacancy
  }% vacancy and 6.5% exit cap, project maintains ${
    downside.dscr
  }x DSCR and delivers ${
    downside.irr
  }% IRR. Debt structure provides 18-month interest reserve cushion.
- **Alternative Exit Strategy**: Consider partial condo conversion for top 2 floors. Market analysis shows $850/SF condo pricing vs. $650/SF rental valuation, potentially recovering 15% of equity in downside scenario.

**Key Metrics**
- **Loan Amount**: $${(downside.loanAmount / 1000000).toFixed(1)}M
- **LTV**: ${downside.ltv}%
- **DSCR**: ${downside.dscr}
- **Debt Yield**: ${downside.debtYield}%
- **Project IRR**: ${downside.irr}%
- **Equity Multiple**: ${downside.equityMultiple}x
- **Vacancy Rate**: ${downside.vacancy}%
- **Sponsor Net Worth**: $25,000,000
- **Past Deals**: 12

---

### Base Case Scenario
*Strong fundamentals with balanced risk-return profile.*

**AI Insights**
- **Market Timing Advantage**: Current market conditions suggest a 6-12 month window of favorable construction pricing before anticipated material cost increases. Lock in GMP contract now to capture 8-12% savings vs. 2026 projections.
- **Sponsor Track Record Validation**: Sponsor's previous 5 projects in similar markets achieved average IRRs of 22.5%, exceeding pro forma by 3.2%. Strong execution capability demonstrated in value-add multifamily segment.
- **Lease-Up Risk Mitigation**: Recommend securing anchor commercial tenant (15% of NOI) pre-construction. Current LOIs from 3 national credit tenants could reduce lease-up period by 4-6 months.
- **Hidden Value Opportunity**: Adjacent parcel (0.8 acres) available for $2.1M. Combined development could increase project IRR by 4.5% through economies of scale and enhanced amenity package.

**Key Metrics**
- **Loan Amount**: $${(base.loanAmount / 1000000).toFixed(1)}M
- **LTV**: ${base.ltv}%
- **DSCR**: ${base.dscr}
- **Debt Yield**: ${base.debtYield}%
- **Project IRR**: ${base.irr}%
- **Equity Multiple**: ${base.equityMultiple}x
- **Vacancy Rate**: ${base.vacancy}%
- **Sponsor Net Worth**: $25,000,000
- **Past Deals**: 12

---

### Upside Scenario
*Exceptional return potential with manageable execution risks.*

**AI Insights**
- **Rent Growth Acceleration**: Tech sector expansion (3 new HQs announced within 2 miles) positions property for 5-6% annual rent growth vs. 3% market average. Comparable properties seeing 15% premium.
- **Exit Multiple Expansion**: Institutional buyer activity increasing 40% YoY in submarket. Cap rate compression of 50-75 bps likely by stabilization, adding $4.2M to exit value.
- **Tax Optimization Strategy**: Property qualifies for Opportunity Zone benefits. Structure as QOF to enhance LP returns by 8-12% through capital gains deferral and step-up basis.

**Key Metrics**
- **Loan Amount**: $${(upside.loanAmount / 1000000).toFixed(1)}M
- **LTV**: ${upside.ltv}%
- **DSCR**: ${upside.dscr}
- **Debt Yield**: ${upside.debtYield}%
- **Project IRR**: ${upside.irr}%
- **Equity Multiple**: ${upside.equityMultiple}x
- **Vacancy Rate**: ${upside.vacancy}%
- **Sponsor Net Worth**: $25,000,000
- **Past Deals**: 12

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
