import type { DealInput, MatchResult } from "./types";
import type { RateTrendSignal } from "./rateTrend";

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

/**
 * Deterministic text for the AI report prompt's RATE ENVIRONMENT block
 * and as fallback UI content when LLM output is missing.
 */
export function rateTrendOverlayText(
  signal: RateTrendSignal,
  deal: DealInput,
): string {
  const lines: string[] = [];

  lines.push(
    `${signal.label} is currently at ${signal.current.toFixed(2)}%, ${signal.direction} over the past 30 days (${signal.roc30d > 0 ? "+" : ""}${signal.roc30d.toFixed(0)}bps).`,
  );

  if (signal.vasicek) {
    const v = signal.vasicek;
    const eqRel =
      v.currentVsEquilibrium > 10 ? "above" : v.currentVsEquilibrium < -10 ? "below" : "near";
    lines.push(
      `Long-run equilibrium estimate: ${v.longRunMean.toFixed(2)}% (current is ${eqRel}). 90-day mean-reversion projection: ${v.projected90d.toFixed(2)}%.`,
    );
  }

  if (signal.volatility30d > 5) {
    lines.push(`30-day rate volatility is elevated at ${signal.volatility30d.toFixed(1)}bps/day.`);
  }

  const rateType = deal.rateType ?? "any";
  if (rateType === "fixed" && signal.direction === "rising") {
    lines.push("With fixed-rate preference and rising rates, earlier rate locks may be advantageous.");
  } else if (rateType === "floating" && signal.direction === "falling") {
    lines.push("Floating-rate economics are improving as short-term benchmarks decline.");
  }

  return lines.join(" ");
}

/**
 * Deterministic Category-C advisory text for the UI Market Advisory card.
 * Rule-based, no LLM needed.
 */
export function rateTrendAdvisoryText(
  signal: RateTrendSignal,
  deal: DealInput,
): string[] {
  const tips: string[] = [];
  const rateType = deal.rateType ?? "any";

  if (signal.direction === "rising" && (rateType === "fixed" || rateType === "any")) {
    tips.push("Consider locking sooner; fixed rates trending up.");
  }
  if (signal.direction === "falling" && (rateType === "floating" || rateType === "any")) {
    tips.push("Floating-rate economics improving as benchmarks decline.");
  }
  if (signal.volatility30d > 5) {
    tips.push("Elevated rate volatility; consider a longer rate-lock period.");
  }
  if (
    signal.vasicek &&
    signal.vasicek.currentVsEquilibrium > 20 &&
    signal.vasicek.projectedDirection === "toward_equilibrium"
  ) {
    tips.push(
      `Rates are ${signal.vasicek.currentVsEquilibrium.toFixed(0)}bps above long-run equilibrium — mean-reversion model suggests gradual easing.`,
    );
  }
  if (
    signal.vasicek &&
    signal.vasicek.currentVsEquilibrium < -20 &&
    signal.vasicek.projectedDirection === "toward_equilibrium"
  ) {
    tips.push(
      `Rates are ${Math.abs(signal.vasicek.currentVsEquilibrium).toFixed(0)}bps below equilibrium — upward pressure likely.`,
    );
  }
  if (signal.momentum === "accelerating" && signal.direction === "rising") {
    tips.push("Rate increases are accelerating — urgency for locking may increase.");
  }
  if (signal.momentum === "decelerating" && signal.direction === "rising") {
    tips.push("Rate increases are decelerating — pace of tightening may be slowing.");
  }

  if (tips.length === 0) {
    tips.push("Rate environment is stable. No urgent timing considerations.");
  }

  return tips;
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
