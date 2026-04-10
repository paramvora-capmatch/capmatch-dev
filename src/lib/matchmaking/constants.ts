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
