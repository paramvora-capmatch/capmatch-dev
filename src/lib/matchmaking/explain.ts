import type { DealInput, MatchResult } from "./types";

export function generateHeadline(result: MatchResult, deal: DealInput): string {
  const dims = result.dimensions;
  if (dims.length === 0) {
    return `Match score ${result.finalScore}/100 — ${result.totalTxns.toLocaleString()} transactions on file`;
  }
  const strongest = dims.reduce((a, b) => (a.score > b.score ? a : b));
  const weakest = dims.reduce((a, b) => (a.score < b.score ? a : b));

  if (result.finalScore >= 80) {
    return (
      `Strong match — ${strongest.dimension.toLowerCase()} is excellent ` +
      `(${(strongest.score * 100).toFixed(0)}/100), backed by ${result.totalTxns.toLocaleString()} transactions`
    );
  }
  if (result.finalScore >= 60) {
    return (
      `Good match overall, but ${weakest.dimension.toLowerCase()} ` +
      `is weaker (${(weakest.score * 100).toFixed(0)}/100)`
    );
  }
  return (
    `Moderate match — ${weakest.dimension.toLowerCase()} pulls the score down ` +
    `(${(weakest.score * 100).toFixed(0)}/100)`
  );
}

export function pricingOverlayText(
  spreadMedian: number | null,
  spreadCount: number,
  spreadP25: number | null,
  spreadP75: number | null,
  spreadStd: number | null,
  latestBenchmarkRate: number | null
): string | null {
  if (spreadMedian == null || spreadCount < 10) return null;
  const bench = latestBenchmarkRate != null ? latestBenchmarkRate.toFixed(2) : "—";
  const implied =
    latestBenchmarkRate != null ? (latestBenchmarkRate + spreadMedian).toFixed(1) : null;
  const range =
    spreadP25 != null && spreadP75 != null
      ? `${spreadP25.toFixed(2)}% to ${spreadP75.toFixed(2)}%`
      : "n/a";
  const consistency =
    spreadStd != null && spreadStd < 0.7 ? "High" : spreadStd != null ? "Moderate" : "Unknown";
  const rateLine =
    implied != null
      ? `At a 10Y Treasury of ~${bench}%, typical all-in rate ~${implied}%.`
      : `Typical spread over benchmark: ${spreadMedian.toFixed(2)}%.`;
  return (
    `Pricing: median spread ${spreadMedian.toFixed(2)}% (${spreadCount} txns). ` +
    `IQR ${range}. ${rateLine} Consistency: ${consistency} (std ${spreadStd?.toFixed(2) ?? "—"}).`
  );
}

export function ltvOverlayText(ltvMedian: number | null, ltvCount: number, ltvCoverage: number | null): string | null {
  if (ltvMedian == null || ltvCount < 1) return null;
  const cov = ltvCoverage != null ? `${(ltvCoverage * 100).toFixed(0)}%` : "—";
  return `Typical LTV ~${ltvMedian.toFixed(0)}% (${ltvCount} transactions with LTV, ~${cov} of book).`;
}

export interface DimensionInsight {
  dimension: string;
  score: number;
  insight: string;
}

export function generateDimensionInsights(result: MatchResult, deal: DealInput): DimensionInsight[] {
  return result.dimensions.map((dim) => {
    const pct = (dim.score * 100).toFixed(0);
    let insight: string;

    if (dim.dimension === "Loan Amount") {
      insight = dim.score >= 0.7
        ? `Strong size fit (${pct}/100) — this deal is within the lender's preferred range.`
        : dim.score >= 0.4
          ? `Moderate size fit (${pct}/100) — deal size is workable but not ideal for this lender.`
          : `Weak size fit (${pct}/100) — this deal is near the edge of what this lender typically handles.`;
    } else if (dim.dimension === "Geography") {
      insight = dim.score >= 0.7
        ? `Strong geographic fit (${pct}/100) — ${deal.state} is a core market for this lender.`
        : dim.score >= 0.3
          ? `Moderate geographic fit (${pct}/100) — this lender has some presence in ${deal.state}.`
          : `Weak geographic fit (${pct}/100) — ${deal.state} is not a focus market for this lender.`;
    } else if (dim.dimension === "Asset Class") {
      insight = dim.score >= 0.7
        ? `Strong asset fit (${pct}/100) — ${deal.assetClass} is a key focus for this lender.`
        : dim.score >= 0.4
          ? `Moderate asset fit (${pct}/100) — this lender has some ${deal.assetClass} exposure.`
          : `Weak asset fit (${pct}/100) — ${deal.assetClass} is not a primary focus.`;
    } else if (dim.dimension === "Pricing Fit") {
      insight = dim.score >= 0.7
        ? `Strong pricing alignment (${pct}/100) — this lender's typical spread aligns well.`
        : dim.score >= 0.4
          ? `Moderate pricing fit (${pct}/100) — some gap between lender's typical pricing and your target.`
          : `Weak pricing fit (${pct}/100) — significant pricing gap exists.`;
    } else {
      insight = `${dim.dimension}: ${pct}/100 — ${dim.explanation}`;
    }

    return { dimension: dim.dimension, score: dim.score, insight };
  });
}
