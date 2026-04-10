import { NextRequest, NextResponse } from "next/server";
import { fetchEngineConfig, fetchLendersForDeal, fetchLenderBreakdowns } from "@/lib/matchmaking/db";
import { runMatchmaking, type EngineConfig } from "@/lib/matchmaking/engine";
import type { DealInput, DimensionBandViz, MatchResponse, MatchResult, ShareBreakdownItem } from "@/lib/matchmaking/types";
import {
  ASSET_CLASS_VALUES,
  LENDER_TYPE_VALUES,
  PURPOSE_VALUES,
  STATE_CODES,
  TERM_BUCKET_VALUES,
  TERM_BUCKET_SHORT_LABELS,
  mapProjectPhaseToPurposes,
} from "@/lib/matchmaking/constants";
import type { LenderType, TermBucket } from "@/lib/matchmaking/constants";

export const runtime = "nodejs";

function parseRatePreference(v: unknown): "competitive" | "target" | "none" {
  const s = String(v ?? "none").toLowerCase();
  if (s === "competitive") return "competitive";
  if (s === "target") return "target";
  return "none";
}

function parseRateType(v: unknown): "fixed" | "floating" | "any" {
  const s = String(v ?? "any").toLowerCase();
  if (s === "fixed") return "fixed";
  if (s === "floating") return "floating";
  return "any";
}

function makeBreakdownItems(
  items: { label: string; share: number }[],
  highlightLabel: string
): ShareBreakdownItem[] {
  return items.map((it) => ({
    label: it.label,
    share: it.share,
    isHighlighted: it.label.toLowerCase() === highlightLabel.toLowerCase(),
  }));
}

function upgradeShareViz(
  dim: { dimension: string; viz?: DimensionBandViz },
  deal: DealInput,
  breakdown: import("@/lib/matchmaking/db").LenderBreakdownData
): void {
  if (!dim.viz || dim.viz.kind !== "share") return;

  const baseShare = dim.viz.share;
  const subtitle = dim.viz.subtitle;

  if (dim.dimension === "Geography") {
    const items = makeBreakdownItems(breakdown.topStates, deal.state);
    if (!items.some((i) => i.isHighlighted) && baseShare > 0) {
      items.push({ label: deal.state, share: baseShare, isHighlighted: true });
    }
    (dim as { viz: DimensionBandViz }).viz = {
      kind: "share_breakdown",
      share: baseShare,
      subtitle,
      topItems: items,
      dimension: "geography",
    };
  } else if (dim.dimension === "Asset Class") {
    const items = makeBreakdownItems(breakdown.topAssets, deal.assetClass);
    if (!items.some((i) => i.isHighlighted) && baseShare > 0) {
      items.push({ label: deal.assetClass, share: baseShare, isHighlighted: true });
    }
    (dim as { viz: DimensionBandViz }).viz = {
      kind: "share_breakdown",
      share: baseShare,
      subtitle,
      topItems: items,
      dimension: "asset_class",
    };
  } else if (dim.dimension === "Purpose") {
    const items = makeBreakdownItems(
      breakdown.purposes,
      deal.eligiblePurposes?.[0] ?? deal.purpose
    );
    for (const ep of deal.eligiblePurposes ?? [deal.purpose]) {
      for (const it of items) {
        if (it.label.toLowerCase() === ep.toLowerCase()) it.isHighlighted = true;
      }
    }
    (dim as { viz: DimensionBandViz }).viz = {
      kind: "share_breakdown",
      share: baseShare,
      subtitle,
      topItems: items,
      dimension: "purpose",
    };
  } else if (dim.dimension === "Term Fit") {
    const items = breakdown.topTerms.map((t) => ({
      label: TERM_BUCKET_SHORT_LABELS[t.label as TermBucket] ?? t.label,
      share: t.share,
      isHighlighted: t.label === deal.termBucket,
    }));
    (dim as { viz: DimensionBandViz }).viz = {
      kind: "share_breakdown",
      share: baseShare,
      subtitle,
      topItems: items,
      dimension: "term",
    };
  }
}

async function enrichResultsWithBreakdowns(
  results: MatchResult[],
  deal: DealInput
): Promise<MatchResult[]> {
  if (results.length === 0) return results;
  try {
    const ids = results.map((r) => r.lenderId);
    const breakdowns = await fetchLenderBreakdowns(ids);
    for (const result of results) {
      const bd = breakdowns.get(result.lenderId);
      if (!bd) continue;
      for (const dim of result.dimensions) {
        upgradeShareViz(dim, deal, bd);
      }
    }
  } catch (e) {
    console.warn("Failed to enrich results with breakdowns, returning base results:", e);
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const eligibleRaw = body.eligible_purposes ?? body.eligiblePurposes;
    const projectPhase = body.project_phase ?? body.projectPhase;

    let eligiblePurposes: string[];
    let primaryPurpose: string;

    if (Array.isArray(eligibleRaw) && eligibleRaw.length > 0) {
      eligiblePurposes = eligibleRaw.map((p: unknown) => String(p));
      primaryPurpose = String(body.purpose ?? eligiblePurposes[0]);
    } else if (projectPhase != null && projectPhase !== "") {
      const mapped = mapProjectPhaseToPurposes(String(projectPhase));
      eligiblePurposes = [...mapped.eligiblePurposes];
      primaryPurpose = mapped.purpose;
    } else {
      primaryPurpose = String(body.purpose ?? "Sale");
      eligiblePurposes = [primaryPurpose];
    }

    const loanFromBody = body.loanAmount ?? body.loan_amount;
    const overrides = body.content_overrides ?? body.contentOverrides;
    const loanFromOverrides =
      overrides && typeof overrides === "object" && overrides !== null
        ? (overrides as Record<string, unknown>).loanAmountRequested
        : undefined;
    const loanAmount = Number(
      loanFromBody ?? loanFromOverrides ?? body.loan_amount_requested ?? 0
    );

    const stateRaw = body.state ?? overrides?.propertyAddressState ?? "";
    const state = String(stateRaw).toUpperCase();

    const assetClass = String(body.asset_class ?? body.assetClass ?? "");

    const rawTermBucket = body.term_bucket ?? body.termBucket ?? undefined;
    const termBucket =
      typeof rawTermBucket === "string" &&
      TERM_BUCKET_VALUES.includes(rawTermBucket as (typeof TERM_BUCKET_VALUES)[number])
        ? rawTermBucket
        : undefined;

    const rawLenderTypes = body.lender_types ?? body.lenderTypes;
    const lenderTypes: string[] | undefined =
      Array.isArray(rawLenderTypes) && rawLenderTypes.length > 0
        ? rawLenderTypes
            .map((t: unknown) => String(t).toLowerCase().trim())
            .filter((t: string) =>
              LENDER_TYPE_VALUES.includes(t as LenderType)
            )
        : undefined;

    const deal: DealInput = {
      loanAmount,
      state,
      purpose: primaryPurpose as DealInput["purpose"],
      eligiblePurposes: eligiblePurposes as DealInput["eligiblePurposes"],
      assetClass,
      rateType: parseRateType(body.rate_type ?? body.rateType),
      ratePreference: parseRatePreference(body.rate_preference ?? body.ratePreference),
      targetRate:
        body.target_rate != null || body.targetRate != null
          ? Number(body.target_rate ?? body.targetRate)
          : undefined,
      termBucket,
      lenderTypes: lenderTypes && lenderTypes.length > 0 ? lenderTypes : undefined,
    };

    if (!deal.loanAmount || deal.loanAmount <= 0) {
      return NextResponse.json({ error: "loanAmount must be > 0" }, { status: 400 });
    }
    if (!STATE_CODES.includes(deal.state as (typeof STATE_CODES)[number])) {
      return NextResponse.json({ error: `Invalid state: ${deal.state}` }, { status: 400 });
    }
    if (!ASSET_CLASS_VALUES.includes(deal.assetClass as (typeof ASSET_CLASS_VALUES)[number])) {
      return NextResponse.json({ error: `Invalid assetClass: ${deal.assetClass}` }, { status: 400 });
    }
    if (!deal.eligiblePurposes?.every((p) => PURPOSE_VALUES.includes(p as (typeof PURPOSE_VALUES)[number]))) {
      return NextResponse.json({ error: `Invalid purpose mapping: ${deal.eligiblePurposes}` }, { status: 400 });
    }
    if (deal.ratePreference === "target" && (deal.targetRate == null || !Number.isFinite(deal.targetRate))) {
      return NextResponse.json({ error: "targetRate required when ratePreference is target" }, { status: 400 });
    }

    const [lenders, cfgRow] = await Promise.all([
      fetchLendersForDeal({
        state: deal.state,
        assetClass: deal.assetClass,
        purpose: deal.purpose,
        eligiblePurposes: deal.eligiblePurposes,
        termBucket: deal.termBucket,
      }),
      fetchEngineConfig(),
    ]);

    const engineConfig: EngineConfig = {
      marketFloor: cfgRow.market_floor ?? 1.0,
      latestBenchmarkRate: cfgRow.latest_benchmark_rate ?? 4.5,
    };

    const { results, totalEligible, totalScanned } = runMatchmaking(deal, lenders, engineConfig);

    const enrichedResults = await enrichResultsWithBreakdowns(results, deal);

    const response: MatchResponse = {
      deal,
      results: enrichedResults,
      totalEligible,
      totalLenders: totalScanned,
      engineVersion: "capitalize-v1.1",
      ranAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Matchmaking error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal engine error" },
      { status: 500 }
    );
  }
}
