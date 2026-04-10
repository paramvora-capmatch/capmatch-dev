import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { fetchEngineConfig, fetchLenderProfileBundle, fetchBenchmarkHistory, fetchLenderRegimeProfile, type LenderRegimeRow } from "@/lib/matchmaking/db";
import { mapParquetToLenderProfile } from "@/lib/matchmaking/mapLenderProfile";
import { computeRecommendations } from "@/lib/matchmaking/recommendations";
import { pricingOverlayText, ltvOverlayText, generateDimensionInsights, rateTrendOverlayText } from "@/lib/matchmaking/explain";
import { selectBenchmark, benchmarkSeriesForDeal } from "@/lib/matchmaking/engine";
import { computeRateTrendSignal } from "@/lib/matchmaking/rateTrend";
import type { DealInput, MatchResult } from "@/lib/matchmaking/types";
import type { LenderProfile } from "@/lib/matchmaking/types";

export const runtime = "nodejs";

function buildDealBlock(deal: DealInput, bench: number, benchLabel: string): string {
  const lines = [
    `- Loan Amount: $${deal.loanAmount.toLocaleString()}`,
    `- State: ${deal.state}`,
    `- Asset Class: ${deal.assetClass}`,
    `- Purpose: ${deal.purpose}${deal.eligiblePurposes && deal.eligiblePurposes.length > 1 ? ` (eligible: ${deal.eligiblePurposes.join(", ")})` : ""}`,
    `- Rate Type Preference: ${deal.rateType ?? "any"}`,
    `- Rate Preference: ${deal.ratePreference ?? "none"}`,
  ];
  if (deal.targetRate != null) lines.push(`- Target Rate: ${deal.targetRate}%`);
  lines.push(`- Current ${benchLabel} Benchmark: ${bench.toFixed(2)}%`);
  return "CURRENT DEAL (from advisor's scenario):\n" + lines.join("\n");
}

function buildLenderTypicalBlock(
  profile: LenderProfile,
  bench: number,
  benchLabel: string
): string {
  const lines: string[] = [];
  if (profile.amountP50 > 0) lines.push(`- Median deal size: $${Math.round(profile.amountP50).toLocaleString()}`);
  if (profile.amountP05 > 0 && profile.amountP95 > 0) {
    lines.push(`- Deal size range (p05–p95): $${Math.round(profile.amountP05).toLocaleString()} – $${Math.round(profile.amountP95).toLocaleString()}`);
  }
  if (profile.topStates.length > 0) {
    lines.push(`- Top states: ${profile.topStates.slice(0, 5).map((s) => `${s.state} (${(s.share * 100).toFixed(0)}%)`).join(", ")}`);
  }
  if (profile.topAssets.length > 0) {
    lines.push(`- Top asset classes: ${profile.topAssets.slice(0, 5).map((a) => `${a.assetClass} (${(a.share * 100).toFixed(0)}%)`).join(", ")}`);
  }
  if (profile.spreadMedian != null) {
    const implied = bench + profile.spreadMedian;
    lines.push(`- Median spread over ${benchLabel}: ${profile.spreadMedian.toFixed(2)}% (implied all-in ~${implied.toFixed(2)}%)`);
    if (profile.spreadP25 != null && profile.spreadP75 != null) {
      lines.push(`- Spread IQR: ${profile.spreadP25.toFixed(2)}% – ${profile.spreadP75.toFixed(2)}%`);
    }
  }
  if (profile.ltvMedian != null) lines.push(`- Typical LTV: ~${profile.ltvMedian.toFixed(0)}%`);
  lines.push(`- Total transactions on file: ${profile.totalTxns.toLocaleString()}`);
  if (profile.knownFixedCount > 0 || profile.knownFloatingCount > 0) {
    const total = profile.knownFixedCount + profile.knownFloatingCount;
    const fixedPct = total > 0 ? ((profile.knownFixedCount / total) * 100).toFixed(0) : "?";
    lines.push(`- Rate type mix: ${fixedPct}% fixed, ${100 - Number(fixedPct)}% floating (of known)`);
  }
  return lines.length > 0
    ? "\n\nLENDER TYPICAL (from Capitalize / this lender's profile):\n" + lines.join("\n")
    : "";
}

function buildVarBlock(match: MatchResult): string {
  if (match.dimensions.length === 0) return "";
  const lines = match.dimensions.map(
    (d) => `- ${d.dimension}: score ${d.score.toFixed(2)} — "${d.explanation}"`
  );
  return "\n\nVARIABLE FIT (deterministic explanations — use for context but produce new insight):\n" + lines.join("\n");
}

function buildVizContext(match: MatchResult): string {
  const parts: string[] = [];
  for (const dim of match.dimensions) {
    if (!dim.viz) continue;
    if (dim.viz.kind === "loan_amount") {
      parts.push(
        `- Loan Amount Distribution: p05=$${dim.viz.p05.toLocaleString()}, median=$${dim.viz.p50.toLocaleString()}, p95=$${dim.viz.p95.toLocaleString()}, deal at ${dim.viz.percentile}th percentile`
      );
    } else if (dim.viz.kind === "share_breakdown") {
      const topStr = dim.viz.topItems
        .slice(0, 5)
        .map((it) => `${it.label} (${(it.share * 100).toFixed(1)}%${it.isHighlighted ? " ← YOUR DEAL" : ""})`)
        .join(", ");
      parts.push(`- ${dim.dimension} Distribution: ${topStr}`);
    } else if (dim.viz.kind === "share") {
      parts.push(`- ${dim.dimension}: ${(dim.viz.share * 100).toFixed(1)}% of lender book`);
    } else if (dim.viz.kind === "spread" && dim.viz.mode !== "insufficient") {
      const v = dim.viz;
      const impliedRate = v.impliedAllInRate ?? v.benchmarkRate + v.median;
      parts.push(
        `- Spread: median ${v.median.toFixed(2)}% over ${v.benchmarkLabel ?? "benchmark"}` +
        (v.p25 != null && v.p75 != null ? `, IQR ${v.p25.toFixed(2)}–${v.p75.toFixed(2)}%` : "") +
        `, implied all-in ~${impliedRate.toFixed(2)}%, ${v.benchmarkLabel ?? "benchmark"} ${v.benchmarkRate.toFixed(2)}%`
      );
    }
  }
  return parts.length > 0 ? "\n\nDISTRIBUTION DATA:\n" + parts.join("\n") : "";
}

const ERA_LABELS: Record<string, string> = {
  pre_gfc: "Pre-GFC (before 2008)",
  gfc_recovery: "GFC/Recovery (2008-2013)",
  zirp: "ZIRP era (2014-2020)",
  covid_hiking: "COVID/Hiking (2020-2022)",
  current: "Current (2023+)",
};

const ERA_ORDER = ["pre_gfc", "gfc_recovery", "zirp", "covid_hiking", "current"];
const REGIME_ORDER = ["Low", "Medium", "High"];

interface RegimeBlockResult {
  promptBlock: string;
  fallbackRecommendation: string;
}

function buildRegimeBlock(
  rows: LenderRegimeRow[],
  currentBenchRate: number,
  benchLabel: string,
  overallSpreadMedian: number | null,
): RegimeBlockResult | null {
  if (rows.length === 0) return null;

  const eras = rows.filter((r) => r.dimension_type === "era");
  const regimes = rows.filter((r) => r.dimension_type === "regime");

  if (eras.length === 0 && regimes.length === 0) return null;

  const lowThresh = rows[0]?.low_threshold ?? 0;
  const highThresh = rows[0]?.high_threshold ?? 0;

  const currentRegime =
    currentBenchRate <= lowThresh ? "Low" : currentBenchRate <= highThresh ? "Medium" : "High";

  const lines: string[] = [
    `LENDER RATE-REGIME HISTORY`,
    `Current rate environment: ${currentRegime} regime (${benchLabel} at ${currentBenchRate.toFixed(2)}%)`,
    ``,
    `This lender's spread over benchmark by rate era:`,
  ];

  for (const eraKey of ERA_ORDER) {
    const row = eras.find((r) => r.dimension_value === eraKey);
    if (row) {
      lines.push(
        `- ${ERA_LABELS[eraKey] ?? eraKey}: median ${row.spread_median.toFixed(2)}%, ${row.txn_count} transactions`,
      );
    }
  }

  lines.push(``, `By rate regime (benchmark level):`);
  for (const regime of REGIME_ORDER) {
    const row = regimes.find((r) => r.dimension_value === regime);
    if (row) {
      const label =
        regime === "Low"
          ? `Low (<${lowThresh.toFixed(2)}%)`
          : regime === "Medium"
            ? `Medium (${lowThresh.toFixed(2)}-${highThresh.toFixed(2)}%)`
            : `High (>${highThresh.toFixed(2)}%)`;
      lines.push(`- ${label}: median spread ${row.spread_median.toFixed(2)}%, ${row.txn_count} transactions`);
    }
  }

  lines.push(
    ``,
    `IMPORTANT: You MUST include exactly ONE numerical_recommendation about this lender's rate-regime pricing behavior.`,
    `Compare their spread across the eras and regimes above. Cite the specific numbers from each era/regime that matter.`,
    `If the lender has genuinely different spreads across vintages, say so explicitly with the data (e.g. "This lender's spread was X% during era A (N txns) vs Y% during era B (M txns)").`,
    `If the data is concentrated in one era, note that the vintage is limited and what that implies for confidence.`,
    `Ground the recommendation in the CURRENT regime: what spread should the advisor expect NOW based on this lender's historical behavior in similar rate environments?`,
  );

  const fallbackRecommendation = buildFallbackRegimeRecommendation(
    eras, regimes, currentRegime, currentBenchRate, benchLabel, lowThresh, highThresh, overallSpreadMedian,
  );

  return { promptBlock: lines.join("\n"), fallbackRecommendation };
}

function buildFallbackRegimeRecommendation(
  eras: LenderRegimeRow[],
  regimes: LenderRegimeRow[],
  currentRegime: string,
  currentBenchRate: number,
  benchLabel: string,
  lowThresh: number,
  highThresh: number,
  overallSpreadMedian: number | null,
): string {
  const currentRegimeRow = regimes.find((r) => r.dimension_value === currentRegime);
  const currentEra = eras.find((r) => r.dimension_value === "current");
  const prevEra = eras.find((r) => r.dimension_value === "covid_hiking") ?? eras.find((r) => r.dimension_value === "zirp");

  const parts: string[] = [];

  if (currentRegimeRow) {
    const implied = currentBenchRate + currentRegimeRow.spread_median;
    parts.push(
      `In ${currentRegime}-rate environments (${benchLabel} ${currentRegime === "Low" ? `<${lowThresh.toFixed(1)}%` : currentRegime === "Medium" ? `${lowThresh.toFixed(1)}–${highThresh.toFixed(1)}%` : `>${highThresh.toFixed(1)}%`}), this lender's median spread is ${currentRegimeRow.spread_median.toFixed(2)}% (${currentRegimeRow.txn_count} txns), implying an all-in rate of ~${implied.toFixed(2)}%`,
    );
  }

  if (currentEra && prevEra && currentEra.dimension_value !== prevEra.dimension_value) {
    const diff = ((currentEra.spread_median - prevEra.spread_median) * 100).toFixed(0);
    const direction = currentEra.spread_median > prevEra.spread_median ? "wider" : "tighter";
    parts.push(
      `— ${Math.abs(Number(diff))}bps ${direction} than their ${ERA_LABELS[prevEra.dimension_value] ?? prevEra.dimension_value} spread of ${prevEra.spread_median.toFixed(2)}% (${prevEra.txn_count} txns)`,
    );
  } else if (currentRegimeRow && overallSpreadMedian != null) {
    const diff = ((currentRegimeRow.spread_median - overallSpreadMedian) * 100).toFixed(0);
    const direction = currentRegimeRow.spread_median > overallSpreadMedian ? "wider" : "tighter";
    parts.push(
      `— ${Math.abs(Number(diff))}bps ${direction} than their overall median of ${overallSpreadMedian.toFixed(2)}%`,
    );
  }

  if (parts.length === 0) {
    return `Rate-regime data available but insufficient to draw a vintage comparison for this lender.`;
  }

  return parts.join("") + ".";
}

function buildPrompt(
  deal: DealInput,
  match: MatchResult,
  profile: LenderProfile,
  bench: number,
  benchLabel: string,
  pricingNarrative: string | null,
  ltvNarrative: string | null,
  rateEnvText: string | null,
  regimeBlock: string | null,
): string {
  const dealBlock = buildDealBlock(deal, bench, benchLabel);
  const lenderTypicalBlock = buildLenderTypicalBlock(profile, bench, benchLabel);
  const varBlock = buildVarBlock(match);
  const vizBlock = buildVizContext(match);

  const pricingBlock = pricingNarrative ? `\n\nPRICING ANALYSIS:\n${pricingNarrative}` : "";
  const ltvBlock = ltvNarrative ? `\n\nLTV CONTEXT:\n${ltvNarrative}` : "";
  const rateBlock = rateEnvText ? `\n\nRATE ENVIRONMENT:\n${rateEnvText}` : "";
  const regimeSection = regimeBlock ? `\n\n${regimeBlock}` : "";

  return `You are helping a commercial real estate advisor improve their match with a specific lender. They want actionable, number-based recommendations first, then your analysis.

${dealBlock}${lenderTypicalBlock}${varBlock}${vizBlock}${pricingBlock}${ltvBlock}${rateBlock}${regimeSection}

LENDER: ${match.lenderName} (ID: ${match.lenderId})
Type: ${match.lenderType}
Total match score: ${match.finalScore}/100, rank #${match.rank}.
Confidence: ${(match.confidence.combined * 100).toFixed(1)}% (rate type factor: ${match.confidence.rateType.toFixed(2)})
Transaction history: ${match.totalTxns.toLocaleString()} total.

TASK:
1. First output "numerical_recommendations": an array of 3–7 specific, actionable recommendations WITH NUMBERS (e.g. "Target loan amount in the $4.5M–$5.5M range to match this lender's sweet spot", "Consider adjusting target rate to ~6.2% to align with this lender's typical spread of 1.8% over benchmark", "Focus on multifamily assets which represent 45% of this lender's book"). Put the highest-impact, most quantifiable changes at the top. These should help the advisor adjust their deal to better fit THIS lender. Do not simply repeat the variable explanations — add new insight where possible. Use the distribution data and lender typical data to ground your numbers.
   MANDATORY: If LENDER RATE-REGIME HISTORY data is provided above, you MUST include exactly one numerical_recommendation that is a rate-regime vintage comparison. This recommendation must:
   - Compare this lender's spread across different rate eras or regimes, citing the specific median spreads and transaction counts from the data
   - State what spread the advisor should expect in the CURRENT regime based on this lender's historical behavior
   - If the lender has data from multiple eras, explicitly note how their pricing changed between eras (e.g. "This lender priced at X% spread during [era A] (N txns) but has widened to Y% in [era B] (M txns)")
   - If most data comes from one era, note the vintage concentration and its implications for confidence
   This rate-regime recommendation should appear near the top of the array because it is a unique data insight that only we have.
2. Then output: executive_summary (string, 2–3 sentences), rate_environment (string, 1–3 sentences interpreting the current rate environment and its implications for timing/structure of THIS deal with THIS lender — if rate environment data is provided), strengths (array of 3–5 strings), gaps (array of 3–5 strings), recommendations (array of 3–5 strings, can be more strategic/narrative).

Return ONLY a valid JSON object with keys: numerical_recommendations, executive_summary, rate_environment, strengths, gaps, recommendations.`;
}

function fallbackReportContent(
  match: MatchResult,
  recs: { parameter: string; currentValue: string; suggestedValue: string; impact: string; explanation: string }[],
  rateEnvText?: string | null,
  regimeFallbackRec?: string | null,
): {
  numerical_recommendations: string[];
  executive_summary: string;
  rate_environment: string | null;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
} {
  const top = match.dimensions.slice().sort((a, b) => b.score - a.score)[0];
  const weak = match.dimensions.slice().sort((a, b) => a.score - b.score)[0];
  const numRecs = recs.map(
    (r) => `${r.parameter}: ${r.currentValue} → ${r.suggestedValue} (${r.impact})`
  );
  if (regimeFallbackRec) {
    numRecs.unshift(regimeFallbackRec);
  }
  return {
    numerical_recommendations: numRecs,
    executive_summary:
      `${match.lenderName} scores ${match.finalScore}/100 on this deal. ` +
      `${top ? `Strongest fit is ${top.dimension.toLowerCase()} (${(top.score * 100).toFixed(0)}/100). ` : ""}` +
      `${weak && weak.score < 0.55 ? `Watch ${weak.dimension.toLowerCase()} (${(weak.score * 100).toFixed(0)}/100): ${weak.explanation}` : ""}`.trim(),
    rate_environment: rateEnvText ?? null,
    strengths: match.dimensions
      .filter((d) => d.score >= 0.65)
      .map((d) => `${d.dimension}: ${d.explanation}`),
    gaps: match.dimensions
      .filter((d) => d.score < 0.55)
      .map((d) => `${d.dimension}: ${d.explanation}`),
    recommendations: recs.length > 0
      ? recs.map((r) => r.explanation)
      : match.dimensions.some((d) => d.score < 0.55)
        ? ["Consider adjusting deal parameters to improve weaker dimensions."]
        : [],
  };
}

function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  const end = text.lastIndexOf("}");
  if (end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deal = body.deal as DealInput;
    const matchResult = body.match_result as MatchResult;
    const lenderId = String(body.lender_id ?? body.lenderId ?? "");

    if (!deal || !matchResult || !lenderId) {
      return NextResponse.json({ error: "deal, match_result, and lender_id required" }, { status: 400 });
    }

    const bundle = await fetchLenderProfileBundle(lenderId);
    const profile = mapParquetToLenderProfile(
      bundle.profile,
      bundle.states,
      bundle.assets,
      bundle.purposes
    );
    if (!profile) {
      return NextResponse.json({ error: "Lender not found" }, { status: 404 });
    }

    const cfg = await fetchEngineConfig();
    const engineCfg = {
      marketFloor: cfg.market_floor ?? 1.0,
      latestBenchmarkRate: cfg.latest_benchmark_rate ?? 4.5,
      latestSofr: cfg.latest_sofr ?? 4.3,
      latestDgs5: cfg.latest_dgs5 ?? 4.1,
      latestDgs7: cfg.latest_dgs7 ?? 4.2,
    };
    const { rate: bench, label: benchLabel } = selectBenchmark(deal, engineCfg);
    const recs = computeRecommendations(deal, matchResult, profile, bench);

    const pricingNarrative = pricingOverlayText(
      profile.spreadMedian,
      profile.spreadCount,
      profile.spreadP25,
      profile.spreadP75,
      profile.spreadStd,
      bench
    );
    const ltvNarrative = ltvOverlayText(profile.ltvMedian, profile.ltvCount, profile.ltvCoverage);

    let rateEnvText: string | null = null;
    try {
      const seriesId = benchmarkSeriesForDeal(deal);
      const historyRows = await fetchBenchmarkHistory(seriesId, 365);
      if (historyRows.length >= 30) {
        const points = historyRows.map((r) => ({ date: r.rate_date, rate: r.rate_value }));
        const signal = computeRateTrendSignal(seriesId, points);
        rateEnvText = rateTrendOverlayText(signal, deal);
      }
    } catch (e) {
      console.warn("Rate environment computation failed, continuing without:", e);
    }

    let regimeResult: RegimeBlockResult | null = null;
    try {
      const regimeRows = await fetchLenderRegimeProfile(lenderId);
      if (regimeRows.length > 0) {
        regimeResult = buildRegimeBlock(regimeRows, bench, benchLabel, profile.spreadMedian);
      }
    } catch (e) {
      console.warn("Regime profile fetch failed, continuing without:", e);
    }

    const fallback = fallbackReportContent(matchResult, recs, rateEnvText, regimeResult?.fallbackRecommendation ?? null);
    let reportContent = { ...fallback };
    let model_used: string | null = null;

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const prompt = buildPrompt(deal, matchResult, profile, bench, benchLabel, pricingNarrative, ltvNarrative, rateEnvText, regimeResult?.promptBlock ?? null);
        const { text } = await generateText({
          model: google("gemini-3-flash-preview"),
          prompt,
        });
        if (text) {
          const parsed = parseJsonFromResponse(text);
          if (parsed) {
            reportContent = {
              numerical_recommendations: Array.isArray(parsed.numerical_recommendations)
                ? (parsed.numerical_recommendations as string[])
                : fallback.numerical_recommendations,
              executive_summary: typeof parsed.executive_summary === "string"
                ? parsed.executive_summary
                : fallback.executive_summary,
              rate_environment: typeof parsed.rate_environment === "string"
                ? parsed.rate_environment
                : fallback.rate_environment,
              strengths: Array.isArray(parsed.strengths)
                ? (parsed.strengths as string[])
                : fallback.strengths,
              gaps: Array.isArray(parsed.gaps)
                ? (parsed.gaps as string[])
                : fallback.gaps,
              recommendations: Array.isArray(parsed.recommendations)
                ? (parsed.recommendations as string[])
                : fallback.recommendations,
            };
          } else {
            reportContent.executive_summary = text.slice(0, 1500);
          }
        }
        model_used = "gemini-2.0-flash";
      } catch (e) {
        console.warn("AI report LLM fallback:", e);
      }
    }

    const dimensionInsights = generateDimensionInsights(matchResult, deal);

    return NextResponse.json({
      report_content: {
        ...reportContent,
        parameter_recommendations: recs,
        dimension_insights: dimensionInsights,
        pricing_analysis: pricingNarrative,
        ltv_context: ltvNarrative,
        rate_environment: reportContent.rate_environment ?? rateEnvText,
      },
      model_used,
      found: true,
    });
  } catch (e) {
    console.error("ai-report:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI report failed" },
      { status: 500 }
    );
  }
}
