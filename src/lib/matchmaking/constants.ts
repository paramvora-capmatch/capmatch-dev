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

/** Term bucket that provides no discriminatory power — scoring stays OFF. */
export const TERM_BUCKET_NO_DISCRIMINATION = "standard_20_30yr" as const;

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
