import type { DealInput, LenderProfile, MatchResult, ParameterRecommendation } from "./types";

export function computeRecommendations(
  deal: DealInput,
  lender: MatchResult,
  profile: LenderProfile,
  latestBenchmarkRate: number
): ParameterRecommendation[] {
  const recs: ParameterRecommendation[] = [];

  const amountDim = lender.dimensions.find((d) => d.dimension === "Loan Amount");
  if (amountDim && amountDim.score < 0.7 && profile.amountP50 > 0) {
    recs.push({
      parameter: "Loan Amount",
      currentValue: `$${deal.loanAmount.toLocaleString()}`,
      suggestedValue: `$${Math.round(profile.amountP50).toLocaleString()}`,
      impact: amountDim.score < 0.4 ? "high" : "medium",
      explanation:
        `This lender's median deal size is ~$${Math.round(profile.amountP50).toLocaleString()}. ` +
        `Your request is ${deal.loanAmount > profile.amountP50 ? "above" : "below"} that center.`,
    });
  }

  const geoDim = lender.dimensions.find((d) => d.dimension === "Geography");
  if (geoDim && geoDim.score < 0.5 && profile.topStates[0]) {
    const top = profile.topStates[0];
    recs.push({
      parameter: "State",
      currentValue: deal.state,
      suggestedValue: top.state,
      impact: "medium",
      explanation:
        `This lender concentrates in ${top.state} (${(top.share * 100).toFixed(0)}% of deals). ` +
        `${deal.state} is not a core market on this scrape.`,
    });
  }

  const assetDim = lender.dimensions.find((d) => d.dimension === "Asset Class");
  if (assetDim && assetDim.score < 0.5 && profile.topAssets[0]) {
    const top = profile.topAssets[0];
    recs.push({
      parameter: "Asset Class",
      currentValue: deal.assetClass,
      suggestedValue: top.assetClass,
      impact: "medium",
      explanation: `${(top.share * 100).toFixed(0)}% of this lender's book is ${top.assetClass}.`,
    });
  }

  if (deal.ratePreference === "target" && deal.targetRate != null && profile.spreadMedian != null) {
    const impliedRate = latestBenchmarkRate + profile.spreadMedian;
    if (Math.abs(deal.targetRate - impliedRate) > 0.5) {
      recs.push({
        parameter: "Target Rate",
        currentValue: `${deal.targetRate}%`,
        suggestedValue: `${impliedRate.toFixed(1)}%`,
        impact: "high",
        explanation:
          `Typical all-in rate implied by median spread (~${profile.spreadMedian.toFixed(2)}% over benchmark) ` +
          `is ~${impliedRate.toFixed(1)}% at the current 10Y handle.`,
      });
    }
  }

  return recs;
}
