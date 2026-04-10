/**
 * Rate trend signal computation: EMA, linear regression, momentum,
 * volatility, and Vasicek mean-reversion calibration.
 *
 * All functions operate on arrays of {date, rate} points and return
 * pure values — no I/O, no side effects.
 */

export interface RatePoint {
  date: string;
  rate: number;
}

export interface VasicekParams {
  longRunMean: number;
  meanReversionSpeed: number;
  sigma: number;
  currentVsEquilibrium: number;
  projected30d: number;
  projected90d: number;
  projectedDirection: "toward_equilibrium" | "at_equilibrium";
}

export interface RateTrendSignal {
  series: string;
  label: string;
  current: number;

  direction: "rising" | "falling" | "stable";
  ema20: number;
  ema60: number;
  crossoverSignal: "bullish" | "bearish" | "neutral";
  roc30d: number;
  roc90d: number;
  slope30d: number;
  slope90d: number;
  slopeConfidence30d: number;
  volatility30d: number;

  vasicek: VasicekParams | null;

  momentum: "accelerating" | "decelerating" | "neutral";
  environmentLabel: string;
}

/* ── EMA ────────────────────────────────────────────────────────────── */

function computeEma(values: number[], span: number): number[] {
  const k = 2 / (span + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

/* ── Linear regression ──────────────────────────────────────────────── */

function linearSlope(values: number[]): { slope: number; r2: number } {
  const n = values.length;
  if (n < 5) return { slope: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
    sumYY += values[i] * values[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const yMean = sumY / n;
  const ssTot = sumYY - n * yMean * yMean;
  const yHat = (i: number) => yMean + slope * (i - (n - 1) / 2);
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - yHat(i);
    ssRes += d * d;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, r2 };
}

/* ── Volatility ─────────────────────────────────────────────────────── */

function rollingStdDev(values: number[], window: number): number {
  const tail = values.slice(-window);
  if (tail.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < tail.length; i++) {
    diffs.push(tail[i] - tail[i - 1]);
  }
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length;
  return Math.sqrt(variance);
}

/* ── Vasicek calibration ────────────────────────────────────────────── */

function calibrateVasicek(
  rates: number[],
  current: number,
): VasicekParams | null {
  if (rates.length < 60) return null;

  const rT = rates.slice(0, -1);
  const rTp1 = rates.slice(1);
  const n = rT.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += rT[i];
    sumY += rTp1[i];
    sumXY += rT[i] * rTp1[i];
    sumXX += rT[i] * rT[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const beta = (n * sumXY - sumX * sumY) / denom;
  const alpha = (sumY - beta * sumX) / n;

  if (beta <= 0 || beta >= 1) return null;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const eps = rTp1[i] - (alpha + beta * rT[i]);
    ssRes += eps * eps;
  }
  const sigmaEps = Math.sqrt(ssRes / n);

  const a = -Math.log(beta) * 252;
  const b = alpha / (1 - beta);
  const sigma = sigmaEps * Math.sqrt(252);

  const project = (days: number) =>
    b + (current - b) * Math.exp(-a * (days / 252));

  const eqDiff = current - b;
  return {
    longRunMean: b,
    meanReversionSpeed: a,
    sigma,
    currentVsEquilibrium: eqDiff * 100,
    projected30d: project(30),
    projected90d: project(90),
    projectedDirection: Math.abs(eqDiff) < 0.05 ? "at_equilibrium" : "toward_equilibrium",
  };
}

/* ── Composite signal ───────────────────────────────────────────────── */

const SERIES_LABELS: Record<string, string> = {
  DGS5: "5Y Treasury",
  DGS7: "7Y Treasury",
  DGS10: "10Y Treasury",
  SOFR: "SOFR",
  DPRIME: "Prime Rate",
};

export function computeRateTrendSignal(
  series: string,
  points: RatePoint[],
): RateTrendSignal {
  const label = SERIES_LABELS[series] ?? series;
  const rates = points.map((p) => p.rate);
  const n = rates.length;

  if (n < 30) {
    return emptySignal(series, label, rates[n - 1] ?? 0);
  }

  const current = rates[n - 1];

  const ema20All = computeEma(rates, 20);
  const ema60All = computeEma(rates, 60);
  const ema20 = ema20All[n - 1];
  const ema60 = ema60All[n - 1];

  const crossoverGap = ema20 - ema60;
  const crossoverSignal: RateTrendSignal["crossoverSignal"] =
    crossoverGap > 0.02 ? "bullish" : crossoverGap < -0.02 ? "bearish" : "neutral";

  const roc30d = n >= 30 ? (current - rates[n - 30]) * 100 : 0;
  const roc90d = n >= 90 ? (current - rates[n - 90]) * 100 : 0;

  const s30 = linearSlope(rates.slice(-30));
  const s90 = linearSlope(rates.slice(-Math.min(90, n)));

  const volatility30d = rollingStdDev(rates, 30) * 100;

  const direction: RateTrendSignal["direction"] =
    Math.abs(roc30d) < 5 ? "stable" : roc30d > 0 ? "rising" : "falling";

  const vasicek = calibrateVasicek(rates, current);

  const roc10d = n >= 10 ? (current - rates[n - 10]) * 100 : 0;
  const momentum: RateTrendSignal["momentum"] =
    Math.abs(roc10d) < 2
      ? "neutral"
      : Math.sign(roc10d) === Math.sign(roc30d) && Math.abs(roc10d) > Math.abs(roc30d / 3)
        ? "accelerating"
        : "decelerating";

  const parts: string[] = [];
  parts.push(direction === "rising" ? "Rates rising" : direction === "falling" ? "Rates falling" : "Rates stable");
  if (Math.abs(roc90d) >= 5) {
    parts.push(`${roc90d > 0 ? "+" : ""}${roc90d.toFixed(0)}bps/90d`);
  }
  if (vasicek) {
    const rel = vasicek.currentVsEquilibrium > 10 ? "above" : vasicek.currentVsEquilibrium < -10 ? "below" : "near";
    parts.push(`${rel} long-run equilibrium`);
  }

  return {
    series,
    label,
    current,
    direction,
    ema20,
    ema60,
    crossoverSignal,
    roc30d,
    roc90d,
    slope30d: s30.slope * 100,
    slope90d: s90.slope * 100,
    slopeConfidence30d: s30.r2,
    volatility30d,
    vasicek,
    momentum,
    environmentLabel: parts.join(", "),
  };
}

function emptySignal(series: string, label: string, current: number): RateTrendSignal {
  return {
    series,
    label,
    current,
    direction: "stable",
    ema20: current,
    ema60: current,
    crossoverSignal: "neutral",
    roc30d: 0,
    roc90d: 0,
    slope30d: 0,
    slope90d: 0,
    slopeConfidence30d: 0,
    volatility30d: 0,
    vasicek: null,
    momentum: "neutral",
    environmentLabel: "Insufficient data",
  };
}
