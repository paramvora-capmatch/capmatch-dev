/**
 * Mock improvement suggestions per variable key for "improve match score" guidance.
 * Backend does not return deal_value / lender_preference today; frontend uses this for UI.
 */
export interface ImprovementSuggestion {
  deal_value: string;
  lender_preference: string;
  suggestion: string;
}

export const MOCK_IMPROVEMENT_BY_VARIABLE: Record<string, ImprovementSuggestion> = {
  leverage: {
    deal_value: "30%",
    lender_preference: "40%",
    suggestion: "Consider increasing LTV toward 40% to better align with this lender's typical deals. Your current: 30%.",
  },
  loan_amount: {
    deal_value: "$8.5M",
    lender_preference: "$10–15M",
    suggestion: "This lender typically funds in the $10–15M range. Adjusting your requested loan amount toward that range may improve fit.",
  },
  coverage: {
    deal_value: "1.25x",
    lender_preference: "1.35x+",
    suggestion: "Stronger DSCR (e.g. 1.35x or higher) aligns better with this lender's credit box. Consider stress-test assumptions.",
  },
  geography: {
    deal_value: "Current MSA",
    lender_preference: "High-volume MSAs",
    suggestion: "This lender concentrates in certain geographies. If you have flexibility on asset location, targeting their high-volume MSAs can help.",
  },
  value_scale: {
    deal_value: "Current scale",
    lender_preference: "Larger scale",
    suggestion: "Deal size (stabilized value / units) is slightly below their sweet spot. Highlight scale or consider similar larger assets.",
  },
  affordability: {
    deal_value: "Current % affordable",
    lender_preference: "20%+ affordable",
    suggestion: "Increasing the share of affordable units (or clearly stating mission alignment) may improve product fit with this lender.",
  },
  loan_purpose: {
    deal_value: "Current phase",
    lender_preference: "Acquisition / refinance",
    suggestion: "Ensure use of proceeds and project phase are clearly aligned with this lender's stated product focus.",
  },
  term_structure: {
    deal_value: "Current term / IO",
    lender_preference: "5–10 yr, IO available",
    suggestion: "Matching term and interest-only period to their typical product may improve the score.",
  },
  pricing: {
    deal_value: "Current rate target",
    lender_preference: "Market rate",
    suggestion: "Aligning your rate expectation with this lender's typical pricing (or showing flexibility) can improve fit.",
  },
};

export function getImprovementSuggestion(
  variableKey: string,
  scoreNormalized: number
): ImprovementSuggestion | null {
  if (scoreNormalized >= 0.7) return null;
  return MOCK_IMPROVEMENT_BY_VARIABLE[variableKey] ?? null;
}
