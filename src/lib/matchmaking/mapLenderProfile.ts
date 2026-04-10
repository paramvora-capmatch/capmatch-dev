import type { LenderProfile } from "./types";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nnullable(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

/** Map parquet `lender_profiles` row + pref lists to API `LenderProfile`. */
export function mapParquetToLenderProfile(
  profile: Record<string, unknown> | null,
  states: Record<string, unknown>[],
  assets: Record<string, unknown>[],
  purposes: Record<string, unknown>[]
): LenderProfile | null {
  if (!profile) return null;
  return {
    lenderId: str(profile.lender_id),
    displayName: str(profile.display_name, str(profile.lender_id)),
    overview: profile.overview != null ? str(profile.overview) : null,
    domain: profile.domain != null ? str(profile.domain) : null,
    primaryType: str(profile.primary_lender_type, "unknown"),
    totalTxns: num(profile.total_txns),
    lastTxnDate: str(profile.last_txn_date),
    amountP05: num(profile.amount_p05),
    amountP50: num(profile.amount_p50),
    amountP95: num(profile.amount_p95),
    stateCount: num(profile.state_count),
    geoConcentration: nnullable(profile.geo_concentration),
    assetClassCount: num(profile.asset_class_count),
    assetConcentration: nnullable(profile.asset_concentration),
    assetCoverage: num(profile.asset_coverage),
    topStates: states.map((s) => ({
      state: str(s.state),
      share: num(s.share),
      txnCount: num(s.txn_count),
    })),
    topAssets: assets.map((a) => ({
      assetClass: str(a.asset_class),
      share: num(a.share),
      txnCount: num(a.txn_count),
    })),
    purposes: purposes.map((p) => ({
      purpose: str(p.purpose),
      share: num(p.share),
      txnCount: num(p.txn_count),
    })),
    customLogoUrl: profile.custom_logo_url != null ? str(profile.custom_logo_url) : null,
    spreadMedian: nnullable(profile.spread_median),
    spreadStd: nnullable(profile.spread_std),
    spreadCount: num(profile.spread_count),
    spreadP25: nnullable(profile.spread_p25),
    spreadP75: nnullable(profile.spread_p75),
    knownFixedCount: num(profile.known_fixed_count),
    knownFloatingCount: num(profile.known_floating_count),
    unknownRateCount: num(profile.unknown_rate_count),
    knownRateRatio: num(profile.known_rate_ratio),
    fixedShareOfKnown: nnullable(profile.fixed_share_of_known),
    ltvMedian: nnullable(profile.ltv_median),
    ltvCount: num(profile.ltv_count),
    ltvCoverage: num(profile.ltv_coverage),
    ltvP25: nnullable(profile.ltv_p25),
    ltvP75: nnullable(profile.ltv_p75),
  };
}
