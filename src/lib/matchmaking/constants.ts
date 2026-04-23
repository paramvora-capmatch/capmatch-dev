/** Canonical Capitalize asset classes (internalLandCategory). */
export const ASSET_CLASS_VALUES = [
  "Multifamily",
  "Retail",
  "Agricultural / Rural",
  "Industrial",
  "Office",
  "Special Purpose",
  "Land",
  "Mixed-Use",
  "Mobile Home Park",
  "Hospitality",
  "Residential Investment",
  "Self Storage",
  "SFR",
  "Healthcare",
  "Co-op Housing",
] as const;

export const PURPOSE_VALUES = ["Sale", "Refinance", "New Construction"] as const;

export const TERM_BUCKET_VALUES = [
  "bridge_lte1yr",
  "short_1_3yr",
  "medium_3_5yr",
  "medium_5_7yr",
  "standard_7_10yr",
  "long_10_15yr",
  "long_15_20yr",
  "standard_20_30yr",
  "extended_gt30yr",
] as const;

export type TermBucket = (typeof TERM_BUCKET_VALUES)[number];

export const TERM_BUCKET_LABELS: Record<TermBucket, string> = {
  bridge_lte1yr: "Bridge (up to 1 year)",
  short_1_3yr: "Short-term (1–3 years)",
  medium_3_5yr: "3–5 years",
  medium_5_7yr: "5–7 years",
  standard_7_10yr: "7–10 years",
  long_10_15yr: "10–15 years",
  long_15_20yr: "15–20 years",
  standard_20_30yr: "20–30 years",
  extended_gt30yr: "Over 30 years",
};

export const TERM_BUCKET_SHORT_LABELS: Record<TermBucket, string> = {
  bridge_lte1yr: "Bridge",
  short_1_3yr: "1–3 yr",
  medium_3_5yr: "3–5 yr",
  medium_5_7yr: "5–7 yr",
  standard_7_10yr: "7–10 yr",
  long_10_15yr: "10–15 yr",
  long_15_20yr: "15–20 yr",
  standard_20_30yr: "20–30 yr",
  extended_gt30yr: "30+ yr",
};

/** Term bucket that provides no discriminatory power — scoring stays OFF. */
export const TERM_BUCKET_NO_DISCRIMINATION = "standard_20_30yr" as const;

export const LENDER_TYPE_VALUES = [
  "bank",
  "credit union",
  "private money",
  "debt fund",
  "insurance company",
  "agency",
] as const;

export type LenderType = (typeof LENDER_TYPE_VALUES)[number];

export const LENDER_TYPE_LABELS: Record<LenderType, string> = {
  bank: "Bank",
  "credit union": "Credit Union",
  "private money": "Private Money",
  "debt fund": "Debt Fund",
  "insurance company": "Insurance Co.",
  agency: "Agency",
};

export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
] as const;

export type CapitalizePurpose = (typeof PURPOSE_VALUES)[number];

/** Maps resume `projectPhase` to Capitalize purpose + eligible set (memo). */
export function mapProjectPhaseToPurposes(projectPhase: string | null | undefined): {
  purpose: CapitalizePurpose;
  eligiblePurposes: CapitalizePurpose[];
} {
  switch (projectPhase) {
    case "Refinance":
      return { purpose: "Refinance", eligiblePurposes: ["Refinance"] };
    case "Construction":
    case "Development":
      return { purpose: "New Construction", eligiblePurposes: ["New Construction"] };
    case "Bridge":
    case "Value-Add":
      return { purpose: "Sale", eligiblePurposes: ["Sale", "Refinance"] };
    case "Acquisition":
    case "Other":
    default:
      return { purpose: "Sale", eligiblePurposes: ["Sale"] };
  }
}

/**
 * FRED / parquet series id for benchmark history (DGS5, DGS7, DGS10, SOFR).
 * Shared with {@link benchmarkSeriesForDeal} in engine.ts — keep in sync.
 */
export function benchmarkSelectionFromRateAndTerm(
  rateType: "fixed" | "floating" | "any" | undefined,
  termBucket: string | undefined,
): { seriesId: "SOFR" | "DGS5" | "DGS7" | "DGS10"; label: string } {
  if (rateType === "floating") return { seriesId: "SOFR", label: "SOFR" };
  if (rateType === "fixed") {
    const tb = termBucket ?? "";
    if (["bridge_lte1yr", "short_1_3yr", "medium_3_5yr"].includes(tb)) {
      return { seriesId: "DGS5", label: "5Y Treasury" };
    }
    if (["medium_5_7yr"].includes(tb)) {
      return { seriesId: "DGS7", label: "7Y Treasury" };
    }
  }
  return { seriesId: "DGS10", label: "10Y Treasury" };
}
