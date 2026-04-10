import type { LenderRow } from "./db";
import type {
  ConfidenceBreakdown,
  DealInput,
  DimensionBandViz,
  DimensionScore,
  MatchEngineResult,
  MatchResult,
} from "./types";
import { generateHeadline } from "./explain";
import { TERM_BUCKET_LABELS, TERM_BUCKET_NO_DISCRIMINATION } from "./constants";

const WEIGHTS_STRUCTURAL = {
  amount: 0.35,
  geography: 0.3,
  assetClass: 0.2,
  purpose: 0.15,
} as const;

const WEIGHTS_WITH_RATE = {
  amount: 0.3,
  geography: 0.27,
  assetClass: 0.18,
  purpose: 0.12,
  pricingFit: 0.13,
} as const;

const WEIGHTS_WITH_TERM = {
  amount: 0.32,
  geography: 0.27,
  assetClass: 0.18,
  purpose: 0.12,
  termFit: 0.11,
} as const;

const WEIGHTS_WITH_TERM_AND_RATE = {
  amount: 0.28,
  geography: 0.24,
  assetClass: 0.16,
  purpose: 0.10,
  termFit: 0.10,
  pricingFit: 0.12,
} as const;

export interface EngineConfig {
  marketFloor: number;
  latestBenchmarkRate: number;
}

interface EngineLender {
  lender_id: string;
  display_name: string;
  custom_logo_url: string | null;
  primary_lender_type: string;
  total_txns: number;
  last_txn_date: string;
  amount_p05: number;
  amount_p50: number;
  amount_p95: number;
  ltv_p25: number | null;
  ltv_p75: number | null;
  geo_concentration: number;
  asset_coverage: number;
  purpose_coverage: number;
  state_share: number | null;
  asset_share: number | null;
  purpose_share: number | null;
  sorted_log_amounts: number[];
  spread_median: number | null;
  spread_std: number | null;
  spread_count: number;
  spread_p25: number | null;
  spread_p75: number | null;
  known_fixed_count: number;
  known_floating_count: number;
  unknown_rate_count: number;
  known_rate_ratio: number;
  fixed_share_of_known: number | null;
  ltv_median: number | null;
  ltv_count: number;
  ltv_coverage: number | null;
  term_coverage: number;
  term_share: number | null;
}

function logArrayDollarQuantiles(arr: number[]): { p25: number; p75: number } | null {
  if (arr.length < 2) return null;
  const n = arr.length;
  const q = (p: number) => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return Math.exp(arr[lo]!);
    const t = idx - lo;
    return Math.exp(arr[lo]! * (1 - t) + arr[hi]! * t);
  };
  return { p25: q(0.25), p75: q(0.75) };
}

function rowToEngineLender(row: LenderRow): EngineLender {
  return {
    lender_id: row.lender_id,
    display_name: row.display_name,
    custom_logo_url: row.custom_logo_url,
    primary_lender_type: row.primary_lender_type ?? "unknown",
    total_txns: row.total_txns,
    last_txn_date: row.last_txn_date,
    amount_p05: row.amount_p05,
    amount_p50: row.amount_p50,
    amount_p95: row.amount_p95,
    ltv_p25: row.ltv_p25,
    ltv_p75: row.ltv_p75,
    geo_concentration: row.geo_concentration ?? 1,
    asset_coverage: row.asset_coverage,
    purpose_coverage: row.purpose_coverage,
    state_share: row.state_share,
    asset_share: row.asset_share,
    purpose_share: row.purpose_share,
    sorted_log_amounts: row.sorted_log_amounts,
    spread_median: row.spread_median,
    spread_std: row.spread_std,
    spread_count: row.spread_count,
    spread_p25: row.spread_p25,
    spread_p75: row.spread_p75,
    known_fixed_count: row.known_fixed_count,
    known_floating_count: row.known_floating_count,
    unknown_rate_count: row.unknown_rate_count,
    known_rate_ratio: row.known_rate_ratio,
    fixed_share_of_known: row.fixed_share_of_known,
    ltv_median: row.ltv_median,
    ltv_count: row.ltv_count,
    ltv_coverage: row.ltv_coverage,
    term_coverage: row.term_coverage,
    term_share: row.term_share,
  };
}

function isEligible(lender: EngineLender, deal: DealInput): boolean {
  if (deal.lenderTypes && deal.lenderTypes.length > 0) {
    if (!deal.lenderTypes.includes(lender.primary_lender_type)) {
      return false;
    }
  }

  if (lender.total_txns >= 10) {
    if (deal.loanAmount < lender.amount_p05 || deal.loanAmount > lender.amount_p95) {
      return false;
    }
  }

  const hasStateEvidence = lender.state_share !== null && lender.state_share > 0;
  const isNational = lender.geo_concentration < 0.1;
  if (!hasStateEvidence && !isNational) {
    return false;
  }

  if (lender.asset_coverage >= 0.5) {
    if (lender.asset_share === null || lender.asset_share === 0) {
      return false;
    }
  }

  if (lender.purpose_share === null || lender.purpose_share === 0) {
    return false;
  }

  return true;
}

function isTermActive(deal: DealInput): boolean {
  return (
    !!deal.termBucket &&
    deal.termBucket !== TERM_BUCKET_NO_DISCRIMINATION
  );
}

function getWeights(deal: DealInput) {
  const useRate = deal.ratePreference === "competitive" || deal.ratePreference === "target";
  const useTerm = isTermActive(deal);
  if (useTerm && useRate) return WEIGHTS_WITH_TERM_AND_RATE;
  if (useTerm) return WEIGHTS_WITH_TERM;
  if (useRate) return WEIGHTS_WITH_RATE;
  return WEIGHTS_STRUCTURAL;
}

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function loanAmountViz(
  deal: DealInput,
  lender: EngineLender,
  empiricalPercentile: number | null
): DimensionBandViz | undefined {
  const a05 = lender.amount_p05;
  const a50 = lender.amount_p50;
  const a95 = lender.amount_p95;
  if (!(a05 > 0 && a95 > a05)) return undefined;
  const pq = logArrayDollarQuantiles(lender.sorted_log_amounts);
  let percentile: number;
  if (empiricalPercentile != null) {
    percentile = Math.round(empiricalPercentile * 100);
  } else {
    const t = (deal.loanAmount - a05) / (a95 - a05);
    percentile = Math.round(Math.min(1, Math.max(0, t)) * 100);
  }
  const viz: DimensionBandViz = {
    kind: "loan_amount",
    dealAmount: deal.loanAmount,
    p05: a05,
    p25: pq?.p25 ?? null,
    p50: a50,
    p75: pq?.p75 ?? null,
    p95: a95,
    percentile,
  };
  return viz;
}

function scoreAmount(deal: DealInput, lender: EngineLender): DimensionScore {
  const w = getWeights(deal);
  const logDeal = Math.log(deal.loanAmount);
  const arr = lender.sorted_log_amounts;
  let score: number;
  let explanation: string;
  let empiricalPct: number | null = null;
  if (arr.length === 0) {
    score = 0.5;
    explanation = "Insufficient loan-size history to rank amount fit — scored neutrally.";
  } else {
    let left = 0;
    let right = arr.length;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (arr[mid]! < logDeal) left = mid + 1;
      else right = mid;
    }
    let upper = 0;
    let hi = arr.length;
    while (upper < hi) {
      const mid = (upper + hi) >>> 1;
      if (arr[mid]! <= logDeal) upper = mid + 1;
      else hi = mid;
    }
    const percentile = ((left + upper) / 2) / arr.length;
    empiricalPct = percentile;
    score = Math.max(0, 1.0 - 2.0 * Math.abs(percentile - 0.5));
    const pctLabel = (percentile * 100).toFixed(0);
    const medianStr = formatDollars(lender.amount_p50);
    explanation =
      score >= 0.7
        ? `$${formatDollars(deal.loanAmount)} is near this lender's sweet spot (median ${medianStr}, ${pctLabel}th percentile)`
        : score >= 0.4
          ? `$${formatDollars(deal.loanAmount)} is within range but off-center (${pctLabel}th percentile, median ${medianStr})`
          : `$${formatDollars(deal.loanAmount)} is at the edge of this lender's range (${pctLabel}th percentile, median ${medianStr})`;
  }
  return {
    dimension: "Loan Amount",
    score,
    weight: w.amount,
    weighted: score * w.amount,
    explanation,
    viz: loanAmountViz(deal, lender, empiricalPct),
  };
}

function scoreGeography(deal: DealInput, lender: EngineLender): DimensionScore {
  const w = getWeights(deal);
  const share = lender.state_share ?? 0;
  let score: number;
  let explanation: string;

  if (share >= 0.1) {
    score = 1.0;
    explanation = `${(share * 100).toFixed(0)}% of deals are in ${deal.state} — core market`;
  } else if (share >= 0.05) {
    score = 0.8;
    explanation = `${(share * 100).toFixed(0)}% of deals in ${deal.state} — significant presence`;
  } else if (share >= 0.01) {
    score = 0.5;
    explanation = `${(share * 100).toFixed(1)}% of deals in ${deal.state} — active but not focused`;
  } else if (lender.geo_concentration < 0.1) {
    score = 0.3;
    explanation = `National lender (HHI=${lender.geo_concentration.toFixed(2)}) with no specific ${deal.state} track record`;
  } else {
    score = 0.0;
    explanation = `No evidence of activity in ${deal.state}`;
  }

  const shareViz: DimensionBandViz = {
    kind: "share",
    share: Math.min(1, Math.max(0, share)),
    subtitle: `Share of book in ${deal.state}`,
  };

  return {
    dimension: "Geography",
    score,
    weight: w.geography,
    weighted: score * w.geography,
    explanation,
    viz: shareViz,
  };
}

function scoreAssetClass(deal: DealInput, lender: EngineLender): DimensionScore {
  const w = getWeights(deal);
  const share = lender.asset_share ?? 0;
  const rawScore = Math.min(share / 0.15, 1.0);
  const adjusted = rawScore * lender.asset_coverage + 0.5 * (1 - lender.asset_coverage);

  const pctStr = (share * 100).toFixed(0);
  const explanation =
    adjusted >= 0.8
      ? `${pctStr}% of book is ${deal.assetClass} — strong preference`
      : adjusted >= 0.5
        ? `${pctStr}% ${deal.assetClass} with ${(lender.asset_coverage * 100).toFixed(0)}% data coverage`
        : lender.asset_coverage < 0.5
          ? `Limited asset data (${(lender.asset_coverage * 100).toFixed(0)}% coverage) — scored neutrally`
          : `Only ${pctStr}% ${deal.assetClass} — not a focus area`;

  const shareViz: DimensionBandViz = {
    kind: "share",
    share: Math.min(1, Math.max(0, share)),
    subtitle: `Share of book in ${deal.assetClass}`,
  };

  return {
    dimension: "Asset Class",
    score: adjusted,
    weight: w.assetClass,
    weighted: adjusted * w.assetClass,
    explanation,
    viz: shareViz,
  };
}

function scorePurpose(deal: DealInput, lender: EngineLender): DimensionScore {
  const w = getWeights(deal);
  const share = lender.purpose_share ?? 0;
  const score = Math.min(share / 0.2, 1.0);
  const eligiblePurposes = deal.eligiblePurposes?.length ? deal.eligiblePurposes : [deal.purpose];

  const pctStr = (share * 100).toFixed(0);
  const explanation =
    score >= 0.8
      ? `${pctStr}% of deals match ${eligiblePurposes.join(" / ")} — strong fit`
      : score >= 0.4
        ? `${pctStr}% match ${eligiblePurposes.join(" / ")} — moderate activity`
        : `Only ${pctStr}% match ${eligiblePurposes.join(" / ")} — not their primary business`;

  const shareViz: DimensionBandViz = {
    kind: "share",
    share: Math.min(1, Math.max(0, share)),
    subtitle: `Eligible purpose mix: ${eligiblePurposes.join(" / ")}`,
  };

  return {
    dimension: "Purpose",
    score,
    weight: w.purpose,
    weighted: score * w.purpose,
    explanation,
    viz: shareViz,
  };
}

function scoreTermFit(deal: DealInput, lender: EngineLender): DimensionScore | null {
  if (!isTermActive(deal)) return null;

  const w = getWeights(deal);
  const termWeight = "termFit" in w ? (w as Record<string, number>).termFit : 0;
  const share = lender.term_share ?? 0;
  const rawScore = Math.min(share / 0.15, 1.0);
  const cov = lender.term_coverage;
  const adjusted = rawScore * cov + 0.5 * (1 - cov);

  const bucketLabel =
    TERM_BUCKET_LABELS[deal.termBucket as keyof typeof TERM_BUCKET_LABELS] ?? deal.termBucket;
  const pctStr = (share * 100).toFixed(0);

  let explanation: string;
  if (adjusted >= 0.8) {
    explanation = `${pctStr}% of book is ${bucketLabel} — strong term fit`;
  } else if (adjusted >= 0.5) {
    explanation = `${pctStr}% ${bucketLabel} with ${(cov * 100).toFixed(0)}% term data coverage`;
  } else if (cov < 0.5) {
    explanation = `Limited term data (${(cov * 100).toFixed(0)}% coverage) — scored neutrally`;
  } else {
    explanation = `Only ${pctStr}% ${bucketLabel} — not their typical term`;
  }

  const shareViz: DimensionBandViz = {
    kind: "share",
    share: Math.min(1, Math.max(0, share)),
    subtitle: `Share of book in ${bucketLabel}`,
  };

  return {
    dimension: "Term Fit",
    score: adjusted,
    weight: termWeight,
    weighted: adjusted * termWeight,
    explanation,
    viz: shareViz,
  };
}

function scorePricingFit(
  deal: DealInput,
  lender: EngineLender,
  engineConfig: EngineConfig
): DimensionScore | null {
  const mode = deal.ratePreference;
  if (!mode || mode === "none") return null;

  const w = WEIGHTS_WITH_RATE.pricingFit;
  const floor = Number.isFinite(engineConfig.marketFloor) ? engineConfig.marketFloor : 1.0;
  const bench = Number.isFinite(engineConfig.latestBenchmarkRate)
    ? engineConfig.latestBenchmarkRate
    : 4.5;

  if (lender.spread_count < 10 || lender.spread_median === null) {
    const spreadViz: DimensionBandViz = {
      kind: "spread",
      median: 0,
      p25: lender.spread_p25,
      p75: lender.spread_p75,
      benchmarkRate: bench,
      marketFloor: floor,
      targetSpread: null,
      mode: "insufficient",
    };
    return {
      dimension: "Pricing Fit",
      score: 0.5,
      weight: w,
      weighted: 0.5 * w,
      explanation: `Insufficient pricing data (${lender.spread_count} transactions)`,
      viz: spreadViz,
    };
  }

  let score: number;
  let explanation: string;

  const impliedAllInRate = bench + lender.spread_median;
  const spreadVizBase = {
    kind: "spread" as const,
    median: lender.spread_median,
    p25: lender.spread_p25,
    p75: lender.spread_p75,
    benchmarkRate: bench,
    marketFloor: floor,
    impliedAllInRate,
  };

  if (mode === "competitive") {
    score = Math.max(0, 1.0 - (lender.spread_median - floor) / 3.0);
    explanation =
      score >= 0.7
        ? `Competitive pricer — typical spread ${lender.spread_median.toFixed(2)}% over benchmark`
        : score >= 0.4
          ? `Mid-market pricing — typical spread ${lender.spread_median.toFixed(2)}%`
          : `Premium pricer — typical spread ${lender.spread_median.toFixed(2)}%`;
    const spreadViz: DimensionBandViz = {
      ...spreadVizBase,
      targetSpread: null,
      mode: "competitive",
    };
    return {
      dimension: "Pricing Fit",
      score,
      weight: w,
      weighted: score * w,
      explanation,
      viz: spreadViz,
    };
  }

  const targetSpread = (deal.targetRate ?? 0) - bench;
  const distance = Math.abs(lender.spread_median - targetSpread);
  score = Math.max(0, 1.0 - distance / 3.0);
  explanation =
    `Target spread ${targetSpread.toFixed(2)}%, lender typical ${lender.spread_median.toFixed(2)}% — ` +
    (distance < 0.5 ? "close match" : distance < 1.5 ? "moderate gap" : "significant gap");
  const spreadViz: DimensionBandViz = {
    ...spreadVizBase,
    targetSpread,
    mode: "target",
  };
  return {
    dimension: "Pricing Fit",
    score,
    weight: w,
    weighted: score * w,
    explanation,
    viz: spreadViz,
  };
}

function computeRateTypeFactor(
  lender: EngineLender,
  rateType?: "fixed" | "floating" | "any"
): number {
  if (!rateType || rateType === "any") return 1.0;

  const isFixed = rateType === "fixed";
  const matchingCount = isFixed ? lender.known_fixed_count : lender.known_floating_count;
  const conflictingCount = isFixed ? lender.known_floating_count : lender.known_fixed_count;

  let matchingShare: number | null = null;
  if (lender.fixed_share_of_known != null) {
    matchingShare = isFixed ? lender.fixed_share_of_known : 1 - lender.fixed_share_of_known;
  }

  if (matchingCount >= 10 && matchingShare != null && matchingShare >= 0.5) return 1.0;
  if (matchingCount >= 5 && matchingShare != null && matchingShare >= 0.2) return 0.85;
  if (lender.known_rate_ratio < 0.05) return 0.65;
  if (conflictingCount >= 10 && matchingShare != null && matchingShare < 0.1) return 0.4;

  return 0.65;
}

function computeConfidence(lender: EngineLender, deal: DealInput, now: Date): ConfidenceBreakdown {
  let base: number;
  if (lender.total_txns >= 200) base = 1.0;
  else if (lender.total_txns >= 50) base = 0.85;
  else if (lender.total_txns >= 25) base = 0.7;
  else if (lender.total_txns >= 10) base = 0.5;
  else base = 0.3;

  const lastTxn = new Date(lender.last_txn_date);
  const monthsAgo = (now.getTime() - lastTxn.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  let recency: number;
  if (!Number.isFinite(monthsAgo) || monthsAgo < 0) recency = 1.0;
  else if (monthsAgo <= 12) recency = 1.0;
  else if (monthsAgo <= 24) recency = 0.9;
  else if (monthsAgo <= 36) recency = 0.7;
  else if (monthsAgo <= 60) recency = 0.5;
  else recency = 0.3;

  const completeness = 0.5 + 0.5 * Math.max(0, Math.min(1, lender.asset_coverage));
  const rateTypeFactor = computeRateTypeFactor(lender, deal.rateType);

  return {
    base,
    recency,
    completeness,
    rateType: rateTypeFactor,
    combined: base * recency * completeness * rateTypeFactor,
  };
}

export function runMatchmaking(
  deal: DealInput,
  rows: LenderRow[],
  engineConfig: EngineConfig,
  topN = 25
): MatchEngineResult {
  const now = new Date();
  const lenders = rows.map(rowToEngineLender);
  const eligible = lenders.filter((l) => isEligible(l, deal));

  type Scored = MatchResult & { _rawFinal: number; _last: string };

  const scored: Scored[] = eligible.map((lender) => {
    const dims: DimensionScore[] = [
      scoreAmount(deal, lender),
      scoreGeography(deal, lender),
      scoreAssetClass(deal, lender),
      scorePurpose(deal, lender),
    ];
    const termDim = scoreTermFit(deal, lender);
    if (termDim) dims.push(termDim);
    const pricingDim = scorePricingFit(deal, lender, engineConfig);
    if (pricingDim) dims.push(pricingDim);

    const affinityScore = dims.reduce((sum, d) => sum + d.weighted, 0);
    const confidence = computeConfidence(lender, deal, now);
    const rawFinalScore = affinityScore * confidence.combined * 100;
    const finalScore = Math.round(rawFinalScore);

    const ltvBand: MatchResult["ltvBand"] =
      lender.ltv_median != null && lender.ltv_count >= 3
        ? {
            kind: "ltv_history",
            median: lender.ltv_median,
            p25: lender.ltv_p25,
            p75: lender.ltv_p75,
            coverage: lender.ltv_coverage,
            txnCount: lender.ltv_count,
          }
        : undefined;

    const result: Scored = {
      lenderId: lender.lender_id,
      lenderName: lender.display_name,
      lenderType: lender.primary_lender_type,
      lenderLogoUrl: lender.custom_logo_url,
      totalTxns: lender.total_txns,
      finalScore,
      affinityScore,
      confidence,
      dimensions: dims,
      rank: 0,
      headline: "",
      _rawFinal: rawFinalScore,
      _last: lender.last_txn_date,
      spreadMedian: lender.spread_median,
      spreadCount: lender.spread_count,
      ltvMedian: lender.ltv_median,
      ltvCoverage: lender.ltv_coverage,
      ltvBand,
    };
    return result;
  });

  scored.sort(
    (a, b) =>
      b._rawFinal - a._rawFinal ||
      b.affinityScore - a.affinityScore ||
      b.totalTxns - a.totalTxns ||
      String(b._last).localeCompare(String(a._last)) ||
      a.lenderId.localeCompare(b.lenderId)
  );

  scored.forEach((r, i) => {
    r.rank = i + 1;
  });

  const top = scored.slice(0, topN).map(({ _rawFinal, _last, ...rest }) => rest);
  top.forEach((r) => {
    r.headline = generateHeadline(r, deal);
  });

  return {
    results: top,
    totalEligible: eligible.length,
    totalScanned: lenders.length,
  };
}
