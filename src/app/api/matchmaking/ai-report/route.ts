import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { fetchEngineConfig, fetchLenderProfileBundle } from "@/lib/matchmaking/db";
import { mapParquetToLenderProfile } from "@/lib/matchmaking/mapLenderProfile";
import { computeRecommendations } from "@/lib/matchmaking/recommendations";
import type { DealInput, MatchResult } from "@/lib/matchmaking/types";

export const runtime = "nodejs";

function buildPrompt(
  deal: DealInput,
  match: MatchResult,
  recLines: string
): string {
  const dims = match.dimensions
    .map(
      (d) =>
        `- ${d.dimension}: ${(d.score * 100).toFixed(0)}/100 (weight ${(d.weight * 100).toFixed(0)}%) — ${d.explanation}`
    )
    .join("\n");
  return `You are a commercial real estate lending advisor assistant.

Given the following deal parameters and lender match data, write a concise 2–3 paragraph summary
for an advisor explaining this lender's fit. Be specific with numbers. Mention strengths first,
then gaps, then actionable suggestions.

DEAL:
- Loan Amount: $${deal.loanAmount.toLocaleString()}
- State: ${deal.state}
- Asset Class: ${deal.assetClass}
- Purpose: ${deal.purpose}${deal.eligiblePurposes && deal.eligiblePurposes.length > 1 ? ` (eligible: ${deal.eligiblePurposes.join(", ")})` : ""}
- Rate Type Preference: ${deal.rateType ?? "any"}
- Rate Preference: ${deal.ratePreference ?? "none"}${deal.targetRate != null ? `\n- Target Rate: ${deal.targetRate}%` : ""}

LENDER MATCH:
- Name: ${match.lenderName}
- Type: ${match.lenderType}
- Final Score: ${match.finalScore}/100
- Confidence: ${(match.confidence.combined * 100).toFixed(1)}% (rate type factor: ${match.confidence.rateType.toFixed(2)})
- Dimensions:
${dims}

PARAMETER RECOMMENDATIONS:
${recLines || "(none)"}

Write the summary. No headers, no bullet points. Plain paragraphs only.`;
}

function fallbackExecutiveSummary(match: MatchResult): string {
  const top = match.dimensions.slice().sort((a, b) => b.score - a.score)[0];
  const weak = match.dimensions.slice().sort((a, b) => a.score - b.score)[0];
  return (
    `${match.lenderName} scores ${match.finalScore}/100 on this deal. ` +
    `${top ? `Strongest fit is ${top.dimension.toLowerCase()} (${(top.score * 100).toFixed(0)}/100). ` : ""}` +
    `${weak && weak.score < 0.55 ? `Watch ${weak.dimension.toLowerCase()} (${(weak.score * 100).toFixed(0)}/100): ${weak.explanation}` : ""}`.trim()
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deal = body.deal as DealInput;
    const matchResult = body.match_result as MatchResult;
    const lenderId = String(body.lender_id ?? body.lenderId ?? "");

    if (!deal || !matchResult || !lenderId) {
      return NextResponse.json({ error: "deal, match_result, and lender_id required" }, { status: 400 });
    }

    const bundle = await fetchLenderProfileBundle(lenderId);
    const profile = mapParquetToLenderProfile(
      bundle.profile,
      bundle.states,
      bundle.assets,
      bundle.purposes
    );
    if (!profile) {
      return NextResponse.json({ error: "Lender not found" }, { status: 404 });
    }

    const cfg = await fetchEngineConfig();
    const bench = cfg.latest_benchmark_rate ?? 4.5;
    const recs = computeRecommendations(deal, matchResult, profile, bench);
    const recLines = recs
      .map((r) => `- ${r.parameter}: ${r.currentValue} → ${r.suggestedValue} (${r.impact}): ${r.explanation}`)
      .join("\n");

    const prompt = buildPrompt(deal, matchResult, recLines);

    let executive_summary: string;
    let model_used: string | null = null;

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt,
      });
      executive_summary = text || fallbackExecutiveSummary(matchResult);
      model_used = "gemini-2.0-flash";
    } else {
      executive_summary = fallbackExecutiveSummary(matchResult);
      model_used = null;
    }

    const strengths = matchResult.dimensions
      .filter((d) => d.score >= 0.65)
      .map((d) => `${d.dimension}: ${d.explanation}`);
    const gaps = matchResult.dimensions
      .filter((d) => d.score < 0.55)
      .map((d) => `${d.dimension}: ${d.explanation}`);

    return NextResponse.json({
      report_content: {
        numerical_recommendations: recs.map(
          (r) => `${r.parameter}: ${r.currentValue} → ${r.suggestedValue} (${r.impact})`
        ),
        parameter_recommendations: recs,
        executive_summary,
        strengths,
        gaps,
        recommendations: recs.map((r) => r.explanation),
      },
      model_used,
      found: true,
    });
  } catch (e) {
    console.error("ai-report:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI report failed" },
      { status: 500 }
    );
  }
}
