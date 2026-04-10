import { NextRequest, NextResponse } from "next/server";
import { fetchEngineConfig, fetchLendersForDeal } from "@/lib/matchmaking/db";
import { runMatchmaking, type EngineConfig } from "@/lib/matchmaking/engine";
import type { DealInput, MatchResponse } from "@/lib/matchmaking/types";
import {
  ASSET_CLASS_VALUES,
  LENDER_TYPE_VALUES,
  PURPOSE_VALUES,
  STATE_CODES,
  TERM_BUCKET_VALUES,
  mapProjectPhaseToPurposes,
} from "@/lib/matchmaking/constants";
import type { LenderType } from "@/lib/matchmaking/constants";

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

    const response: MatchResponse = {
      deal,
      results,
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
