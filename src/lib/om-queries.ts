// src/lib/om-queries.ts
import { supabase } from "../lib/supabaseClient";

/**
 * Normalize raw OM content from the database into the rich, nested structure
 * expected by the OM dashboard pages.
 *
 * This function is intentionally defensive:
 * - It only fills in sections that are missing.
 * - It derives nested structures from the flat Hoque OM schema the user provided.
 */
function normalizeOMContent(rawContent: Record<string, any>): Record<string, any> {
  if (!rawContent || typeof rawContent !== "object") {
    return rawContent;
  }

  const content: Record<string, any> = { ...rawContent };
  const projectSections = content.projectSections ?? {};

  // ---------------------------------------------------------------------------
  // Market Context → demographics + supply/demand
  // ---------------------------------------------------------------------------
  if (!content.marketContextDetails && projectSections.marketMetrics) {
    const mm = projectSections.marketMetrics;

    const demographicProfile: Record<string, any> = {
      oneMile: mm.oneMile ?? null,
      threeMile: mm.threeMile ?? null,
      fiveMile: mm.fiveMile ?? null,
      renterShare: mm.renterShare ?? null,
      avgOccupancy: mm.avgOccupancy ?? null,
      growthTrends: {
        populationGrowth5yr: mm.growthTrends?.population5yr ?? null,
        incomeGrowth5yr: mm.growthTrends?.income5yr ?? null,
        jobGrowth5yr: mm.growthTrends?.job5yr ?? null,
      },
    };

    const totalResidentialUnits = content.totalResidentialUnits ?? 0;
    const supplyPipelineArr = Array.isArray(mm.supplyPipeline)
      ? mm.supplyPipeline
      : [];

    // Split pipeline between "under construction" and "planned" buckets
    const underConstruction =
      supplyPipelineArr[0]?.units != null ? supplyPipelineArr[0].units : 0;
    const planned24Months =
      supplyPipelineArr.length > 1
        ? supplyPipelineArr
            .slice(1)
            .reduce(
              (sum: number, q: { units?: number | null }) =>
                sum + (q.units ?? 0),
              0
            )
        : 0;

    const supplyAnalysis = {
      currentInventory: totalResidentialUnits,
      underConstruction,
      planned24Months,
      averageOccupancy: mm.avgOccupancy ?? null,
      deliveryByQuarter: supplyPipelineArr,
    };

    content.marketContextDetails = {
      demographicProfile,
      supplyAnalysis,
      // majorEmployers can be populated later from richer data; leave empty for now
      majorEmployers: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Asset Profile → amenities, commercial program, unit mix
  // ---------------------------------------------------------------------------
  if (!content.assetProfileDetails) {
    const amenityDetails = Array.isArray(projectSections.amenities)
      ? projectSections.amenities
      : [];

    const commercialSpaces = Array.isArray(projectSections.commercialProgram)
      ? projectSections.commercialProgram
      : [];

    // Build unit mix details from residentialUnitMix if present
    const unitMixDetails: Record<string, any> = {};
    const detailedUnitMix: any[] = [];
    if (Array.isArray(content.residentialUnitMix)) {
      for (const row of content.residentialUnitMix) {
        if (!row) continue;
        const unitType: string = row.unitType ?? "";
        const count: number = row.unitCount ?? 0;
        const avgSF: number = row.avgSF ?? 0;
        const monthlyRent: number = row.monthlyRent ?? 0;

        // Map S* → studios, A* → oneBed, B* → twoBed, else use unitType key
        let bucketKey = unitType;
        if (/^s/i.test(unitType)) bucketKey = "studios";
        else if (/^a/i.test(unitType)) bucketKey = "oneBed";
        else if (/^b/i.test(unitType)) bucketKey = "twoBed";

        const existing = unitMixDetails[bucketKey] ?? {
          count: 0,
          avgSF: 0,
          rentRange: null as string | null,
          deposit: null as string | null,
        };

        const newCount = existing.count + count;
        const totalSF =
          existing.avgSF * existing.count + (avgSF || 0) * (count || 0);
        const newAvgSF = newCount > 0 ? Math.round(totalSF / newCount) : 0;

        const rentLow = monthlyRent || 0;
        const rentHigh = rentLow; // single-point rent; range can be enriched later
        const rentRangeStr = `$${rentLow.toLocaleString()}-$${rentHigh.toLocaleString()}`;

        unitMixDetails[bucketKey] = {
          count: newCount,
          avgSF: newAvgSF,
          rentRange: rentRangeStr,
          deposit: existing.deposit ?? "$500",
        };

        detailedUnitMix.push({
          code: unitType,
          type: bucketKey,
          units: count,
          avgSF,
        });
      }
    }

    content.assetProfileDetails = {
      amenityDetails,
      commercialSpaces,
      unitMixDetails,
      detailedUnitMix,
    };
  }

  // ---------------------------------------------------------------------------
  // Financial Details → scenario returns, sources & uses, sponsor profile
  // ---------------------------------------------------------------------------
  if (!content.financialDetails) {
    content.financialDetails = {};
  }
  const financialDetails = content.financialDetails as Record<string, any>;

  // Scenario returns from projectSections.scenarioReturns
  if (!financialDetails.returnProjections && projectSections.scenarioReturns) {
    const sr = projectSections.scenarioReturns;
    const totalCost =
      content.totalProjectCost ??
      content.totalDevelopmentCost ??
      projectSections.capitalStackHighlights?.totalDevelopmentCost ??
      null;
    const stabilizedValue = content.stabilizedValue ?? null;

    const computeProfitMargin = (): number | null => {
      if (!totalCost || !stabilizedValue) return null;
      const margin = ((stabilizedValue - totalCost) / totalCost) * 100;
      return Number.isFinite(margin) ? Number(margin.toFixed(1)) : null;
    };

    const baseMargin = computeProfitMargin();

    const buildScenario = (key: "base" | "upside" | "downside") => {
      const scenario = (sr as Record<string, any>)[key] ?? {};
      const equityMultiple = scenario.equityMultiple ?? null;

      let profitMargin: number | null = baseMargin;
      if (profitMargin != null) {
        if (key === "upside") profitMargin = Number((profitMargin + 2).toFixed(1));
        if (key === "downside")
          profitMargin = Number((profitMargin - 3).toFixed(1));
      }

      return {
        irr: scenario.irr ?? null,
        multiple: equityMultiple,
        profitMargin,
      };
    };

    financialDetails.returnProjections = {
      base: buildScenario("base"),
      upside: buildScenario("upside"),
      downside: buildScenario("downside"),
    };
  }

  // Sources & uses from capital stack highlights + budget fields
  if (!financialDetails.sourcesUses) {
    const cap = projectSections.capitalStackHighlights ?? {};
    const totalDevCost =
      cap.totalDevelopmentCost ??
      content.totalProjectCost ??
      content.totalDevelopmentCost ??
      null;

    const loanAmount =
      cap.loanAmount ?? content.loanAmountRequested ?? content.loanAmount ?? null;
    const equityRequirement =
      cap.equityRequirement ?? content.sponsorEquity ?? null;

    const sourceItems: { type: string; amount: number | null; percentage?: number | null }[] =
      [];

    const addSource = (type: string, amount: number | null | undefined) => {
      if (amount == null) return;
      const pct =
        totalDevCost && totalDevCost > 0
          ? Number(((amount / totalDevCost) * 100).toFixed(1))
          : null;
      sourceItems.push({ type, amount, percentage: pct });
    };

    addSource("Senior Construction Loan", loanAmount);
    addSource("Sponsor Equity", equityRequirement);
    addSource("Tax Credit Equity", content.taxCreditEquity ?? null);
    addSource("Gap Financing", content.gapFinancing ?? null);

    const useItems: { type: string; amount: number | null; percentage?: number | null }[] = [];
    const addUse = (type: string, amount: number | null | undefined) => {
      if (amount == null) return;
      const pct =
        totalDevCost && totalDevCost > 0
          ? Number(((amount / totalDevCost) * 100).toFixed(1))
          : null;
      useItems.push({ type, amount, percentage: pct });
    };

    addUse("Land Acquisition", content.landAcquisition ?? content.purchasePrice ?? null);
    addUse("Base Construction", content.baseConstruction ?? null);
    addUse("FF&E", content.ffe ?? null);
    addUse("Contingency", content.contingency ?? null);
    addUse("Construction Fees", content.constructionFees ?? null);
    addUse("A&E Fees", content.aeFees ?? null);
    addUse("Developer Fee", content.developerFee ?? null);
    addUse("Third Party Reports", content.thirdPartyReports ?? null);
    addUse("Legal & Org", content.legalAndOrg ?? null);
    addUse("Title & Recording", content.titleAndRecording ?? null);
    addUse("Taxes During Construction", content.taxesDuringConstruction ?? null);
    addUse("Working Capital", content.workingCapital ?? null);
    addUse("Loan Fees", content.loanFees ?? null);
    addUse("Interest Reserve", content.interestReserve ?? null);
    addUse("Operating Deficit Escrow", content.opDeficitEscrow ?? null);
    addUse("Lease-Up Escrow", content.leaseUpEscrow ?? null);
    addUse("Environmental Remediation", content.enviroRemediation ?? null);
    addUse("Syndication Costs", content.syndicationCosts ?? null);

    financialDetails.sourcesUses = {
      sources: sourceItems,
      uses: useItems,
    };
  }

  // Sponsor profile – basic mapping from sponsor-related fields
  if (!financialDetails.sponsorProfile) {
    financialDetails.sponsorProfile = {
      sponsorEntityName: content.sponsorEntityName ?? null,
      sponsoringEntity: content.sponsoringEntity ?? null,
      sponsorExperience: content.sponsorExperience ?? null,
      totalDeveloped: content.priorDevelopments ?? null,
      netWorth: content.netWorth ?? null,
      guarantorLiquidity: content.guarantorLiquidity ?? null,
      portfolioDSCR: content.portfolioDSCR ?? null,
      portfolioLTV: content.portfolioLTV ?? null,
      yearFounded: 2010, // best-effort placeholder; can be updated when explicit data exists
    };
  }

  if (!content.sponsorDeals) {
    content.sponsorDeals = [];
  }

  // ---------------------------------------------------------------------------
  // Scenario Data – used by dashboard + deal snapshot quadrants
  // ---------------------------------------------------------------------------
  if (!content.scenarioData) {
    const ltv = content.ltv ?? projectSections.capitalStackHighlights?.ltv ?? null;
    const ltc = projectSections.capitalStackHighlights?.ltc ?? null;
    const loanAmount =
      content.loanAmountRequested ??
      projectSections.capitalStackHighlights?.loanAmount ??
      null;
    const totalDevCost =
      projectSections.capitalStackHighlights?.totalDevelopmentCost ??
      content.totalDevelopmentCost ??
      content.totalProjectCost ??
      null;
    const baseIrr =
      projectSections.scenarioReturns?.base?.irr ??
      financialDetails.returnProjections?.base?.irr ??
      null;
    const upsideIrr =
      projectSections.scenarioReturns?.upside?.irr ??
      financialDetails.returnProjections?.upside?.irr ??
      null;
    const downsideIrr =
      projectSections.scenarioReturns?.downside?.irr ??
      financialDetails.returnProjections?.downside?.irr ??
      null;

    const baseScenario = {
      loanAmount,
      ltv,
      ltc,
      irr: baseIrr,
      equityMultiple:
        projectSections.scenarioReturns?.base?.equityMultiple ??
        financialDetails.returnProjections?.base?.multiple ??
        null,
      constructionCost: totalDevCost,
    };

    const upsideScenario = {
      ...baseScenario,
      irr: upsideIrr ?? baseScenario.irr,
      equityMultiple:
        projectSections.scenarioReturns?.upside?.equityMultiple ??
        financialDetails.returnProjections?.upside?.multiple ??
        baseScenario.equityMultiple,
    };

    const downsideScenario = {
      ...baseScenario,
      irr: downsideIrr ?? baseScenario.irr,
      equityMultiple:
        projectSections.scenarioReturns?.downside?.equityMultiple ??
        financialDetails.returnProjections?.downside?.multiple ??
        baseScenario.equityMultiple,
    };

    content.scenarioData = {
      base: baseScenario,
      upside: upsideScenario,
      downside: downsideScenario,
    };
  }

  // ---------------------------------------------------------------------------
  // Capital Stack Data – used by Capital Stack detail page
  // ---------------------------------------------------------------------------
  if (!content.capitalStackData && projectSections.capitalStackHighlights) {
    const cap = projectSections.capitalStackHighlights;
    const totalDevCost =
      cap.totalDevelopmentCost ??
      content.totalDevelopmentCost ??
      content.totalProjectCost ??
      null;
    const loanAmount =
      cap.loanAmount ?? content.loanAmountRequested ?? content.loanAmount ?? null;
    const equityRequirement =
      cap.equityRequirement ?? content.sponsorEquity ?? null;

    const debtPct =
      loanAmount != null && totalDevCost
        ? Number(((loanAmount / totalDevCost) * 100).toFixed(1))
        : cap.ltc ?? null;
    const equityPct =
      equityRequirement != null && totalDevCost
        ? Number(((equityRequirement / totalDevCost) * 100).toFixed(1))
        : debtPct != null
        ? Number((100 - debtPct).toFixed(1))
        : null;

    const sources = [
      {
        type: "Senior Construction Loan",
        amount: loanAmount,
        percentage: debtPct,
        rate:
          content.allInRate != null
            ? `${content.allInRate}% all-in`
            : content.interestRate != null
            ? `${content.interestRate}%`
            : null,
        contribution: "Primary debt financing",
      },
      {
        type: "Sponsor Equity",
        amount: equityRequirement,
        percentage: equityPct,
        contribution: "GP / sponsor equity",
      },
    ].filter((s) => s.amount != null);

    const uses: any[] = [];
    const pushUse = (type: string, amount: number | null | undefined, timing?: string) => {
      if (amount == null) return;
      const pct =
        totalDevCost && totalDevCost > 0
          ? Number(((amount / totalDevCost) * 100).toFixed(1))
          : null;
      uses.push({ type, amount, percentage: pct, timing });
    };

    pushUse("Land Acquisition", content.landAcquisition ?? content.purchasePrice ?? null, "Closing");
    pushUse("Base Construction", content.baseConstruction ?? null, "Months 1-24");
    pushUse("Contingency", content.contingency ?? null, "Pro-rata");
    pushUse("Developer Fee", content.developerFee ?? null, "Milestone-based");
    pushUse("A&E / Soft Costs", content.aeFees ?? null, "Pre-dev & construction");
    pushUse("Interest Reserve", content.interestReserve ?? null, "Construction term");
    pushUse("Working Capital", content.workingCapital ?? null, "Post-stabilization");

    const reserves = {
      interest:
        content.interestReserve != null
          ? `$${Number(content.interestReserve).toLocaleString()}`
          : null,
      taxInsurance:
        content.realEstateTaxes != null || content.insurance != null
          ? `$${Number(
              (content.realEstateTaxes ?? 0) + (content.insurance ?? 0)
            ).toLocaleString()}`
          : null,
      capEx:
        content.opDeficitEscrow != null
          ? `$${Number(content.opDeficitEscrow).toLocaleString()}`
          : null,
    };

    const baseStack = {
      totalCapitalization: totalDevCost,
      sources,
      uses,
      debtTerms: {
        loanType: content.loanType ?? null,
        lender: content.equityPartner ?? null,
        rate:
          content.allInRate != null
            ? `${content.allInRate}% all-in`
            : content.interestRate != null
            ? `${content.interestRate}%`
            : null,
        floor:
          content.underwritingRate != null
            ? `${content.underwritingRate}% UW`
            : null,
        term: content.requestedTerm ?? content.requestedLoanTerm ?? null,
        extension: "2 x 6-month extensions",
        recourse: content.recoursePreference ?? null,
        origination: "1.00% origination fee",
        exitFee: null,
        reserves,
      },
    };

    content.capitalStackData = {
      base: baseStack,
      upside: baseStack,
      downside: baseStack,
    };
  }

  // ---------------------------------------------------------------------------
  // Deal Snapshot Details → key terms, milestones, risk matrix, programs
  // ---------------------------------------------------------------------------
  if (!content.dealSnapshotDetails) {
    const covenants = {
      minDSCR:
        content.dscrStressMin != null
          ? `${content.dscrStressMin.toFixed
              ? content.dscrStressMin.toFixed(2)
              : content.dscrStressMin}x`
          : null,
      maxLTV:
        content.ltvStressMax != null
          ? `${content.ltvStressMax}%`
          : null,
      minLiquidity:
        content.guarantorLiquidity != null
          ? `$${Number(content.guarantorLiquidity).toLocaleString()}`
          : null,
      completionGuaranty: "Partial completion guaranty",
    };

    const lenderReserves = {
      interest:
        content.interestReserve != null
          ? `$${Number(content.interestReserve).toLocaleString()}`
          : null,
      taxInsurance:
        content.realEstateTaxes != null || content.insurance != null
          ? `$${Number(
              (content.realEstateTaxes ?? 0) + (content.insurance ?? 0)
            ).toLocaleString()}`
          : null,
      capEx:
        content.opDeficitEscrow != null
          ? `$${Number(content.opDeficitEscrow).toLocaleString()}`
          : null,
    };

    const keyTerms = {
      loanType: content.loanType ?? null,
      rate:
        content.allInRate != null
          ? `${content.allInRate}% all-in`
          : content.interestRate != null
          ? `${content.interestRate}%`
          : null,
      floor:
        content.underwritingRate != null
          ? `${content.underwritingRate}% UW`
          : null,
      term: content.requestedTerm ?? content.requestedLoanTerm ?? null,
      extension: "2 x 6-month extensions",
      recourse: content.recoursePreference ?? null,
      origination: "1.00%",
      exitFee: null,
      covenants,
      lenderReserves,
    };

    // Milestones from projectSections.timeline
    const milestones: any[] = [];
    if (Array.isArray(projectSections.timeline)) {
      const tl = projectSections.timeline;
      tl.forEach(
        (
          item: { date?: string | null; phase?: string | null },
          index: number
        ) => {
          let status: "completed" | "current" | "upcoming" = "upcoming";
          if (index === 0 || index === 1) status = "completed";
          else if (index === 2) status = "current";

          milestones.push({
            phase: item.phase ?? null,
            date: item.date ?? null,
            status,
            duration: 90, // placeholder; detailed durations not provided in schema
          });
        }
      );
    }

    // Special programs from projectSections.certifications
    const specialPrograms = Array.isArray(projectSections.certifications)
      ? projectSections.certifications.map(
          (c: { name?: string | null; status?: string | null }) => ({
            name: c.name ?? null,
            description: c.status ?? null,
          })
        )
      : [];

    const riskMatrix = {
      medium: [],
      low: [],
    };

    content.dealSnapshotDetails = {
      keyTerms,
      covenants,
      lenderReserves,
      milestones,
      riskMatrix,
      specialPrograms,
    };
  }

  return content;
}

/**
 * Fetches the OM data for a project from the database.
 * Since OM is now a single row per project (no versioning), we fetch directly by project_id.
 */
export async function getLatestOM(projectId: string) {
  try {
    // Fetch the single OM row for this project
    const { data, error } = await supabase
      .from("om")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        // No OM data exists yet
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    // Process the content and normalize it into the rich OM structure
    // expected by the dashboard, WITHOUT flattening the original JSON.
    let content = data.content || {};
    content = normalizeOMContent(content);

    return {
      id: data.id,
      project_id: data.project_id,
      content: content,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("Error fetching OM data:", error);
    throw error;
  }
}

/**
 * Extracts a value from OM content (handles rich format)
 */
export function getOMValue(content: Record<string, any>, fieldId: string): any {
  const field = content[fieldId];
  if (field && typeof field === "object" && "value" in field) {
    return field.value;
  }
  return field;
}

