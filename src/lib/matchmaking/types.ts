/**
 * API contract: Capitalize matchmaking (memo). Frontend imports this file only
 * for shared shapes; server implements scoring.
 */

export interface DealInput {
  loanAmount: number;
  state: string;
  purpose: "Sale" | "Refinance" | "New Construction";
  eligiblePurposes?: ("Sale" | "Refinance" | "New Construction")[];
  assetClass: string;
  rateType?: "fixed" | "floating" | "any";
  ratePreference?: "competitive" | "target" | "none";
  targetRate?: number;
  termBucket?: string;
  lenderTypes?: string[];
}

export interface MatchResponse {
  deal: DealInput;
  results: MatchResult[];
  totalEligible: number;
  totalLenders: number;
  engineVersion: string;
  ranAt: string;
}

export interface MatchEngineResult {
  results: MatchResult[];
  totalEligible: number;
  totalScanned: number;
}

export interface MatchResult {
  lenderId: string;
  lenderName: string;
  lenderType: string;
  lenderLogoUrl: string | null;
  totalTxns: number;
  finalScore: number;
  affinityScore: number;
  confidence: ConfidenceBreakdown;
  dimensions: DimensionScore[];
  rank: number;
  headline: string;
  /** Optional overlays for UI (from lender_profiles). */
  spreadMedian: number | null;
  spreadCount: number;
  ltvMedian: number | null;
  ltvCoverage: number | null;
  /** Optional historical LTV band for UI (not a scored dimension). */
  ltvBand?: Extract<DimensionBandViz, { kind: "ltv_history" }>;
}

/**
 * Serializable hints for inline percentile / distribution charts in the score breakdown.
 * Populated by the Capitalize engine for each dimension where data supports it.
 */
export interface ShareBreakdownItem {
  label: string;
  share: number;
  isHighlighted: boolean;
}

export type DimensionBandViz =
  | {
      kind: "loan_amount";
      dealAmount: number;
      p05: number;
      p25: number | null;
      p50: number;
      p75: number | null;
      p95: number;
      /** Empirical percentile of deal amount in lender history, 0–100 */
      percentile: number;
    }
  | {
      kind: "share";
      /** 0–1 share of lender book */
      share: number;
      subtitle: string;
    }
  | {
      kind: "share_breakdown";
      /** 0–1 share of lender book for the deal's value */
      share: number;
      subtitle: string;
      /** Top items by share for this dimension */
      topItems: ShareBreakdownItem[];
      /** Which dimension this breakdown is for (used by the chart) */
      dimension: "geography" | "asset_class" | "purpose" | "term";
    }
  | {
      kind: "spread";
      median: number;
      p25: number | null;
      p75: number | null;
      benchmarkRate: number;
      marketFloor: number;
      /** Target spread (deal target rate − benchmark) when in target mode */
      targetSpread: number | null;
      mode: "competitive" | "target" | "insufficient";
      /** Implied all-in rate = benchmarkRate + median spread */
      impliedAllInRate?: number;
      /** Human-readable label for which benchmark series was used (e.g. "SOFR", "10Y Treasury") */
      benchmarkLabel?: string;
    }
  | {
      kind: "ltv_history";
      median: number | null;
      p25: number | null;
      p75: number | null;
      coverage: number | null;
      txnCount: number;
    };

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  weighted: number;
  explanation: string;
  viz?: DimensionBandViz;
}

export interface ConfidenceBreakdown {
  base: number;
  recency: number;
  completeness: number;
  rateType: number;
  combined: number;
}

export interface LenderProfile {
  lenderId: string;
  displayName: string;
  overview: string | null;
  domain: string | null;
  primaryType: string;
  totalTxns: number;
  lastTxnDate: string;
  amountP05: number;
  amountP50: number;
  amountP95: number;
  stateCount: number;
  geoConcentration: number | null;
  assetClassCount: number;
  assetConcentration: number | null;
  assetCoverage: number;
  topStates: { state: string; share: number; txnCount: number }[];
  topAssets: { assetClass: string; share: number; txnCount: number }[];
  purposes: { purpose: string; share: number; txnCount: number }[];
  customLogoUrl: string | null;
  spreadMedian: number | null;
  spreadStd: number | null;
  spreadCount: number;
  spreadP25: number | null;
  spreadP75: number | null;
  knownFixedCount: number;
  knownFloatingCount: number;
  unknownRateCount: number;
  knownRateRatio: number;
  fixedShareOfKnown: number | null;
  ltvMedian: number | null;
  ltvCount: number;
  ltvCoverage: number;
  ltvP25: number | null;
  ltvP75: number | null;
  termCoverage: number;
  termConcentration: number | null;
  dominantTermBucket: string | null;
}

export interface ParameterRecommendation {
  parameter: string;
  currentValue: string;
  suggestedValue: string;
  impact: "high" | "medium" | "low";
  explanation: string;
}
