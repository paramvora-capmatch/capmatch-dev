import { existsSync } from "fs";
import { resolve } from "path";
import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";

/** Parquet outputs from scripts/build-matchmaking-db.ts */
const REQUIRED_FILES = [
  "lender_profiles.parquet",
  "lender_state_prefs.parquet",
  "lender_asset_prefs.parquet",
  "lender_purpose_prefs.parquet",
  "lender_term_prefs.parquet",
  "lender_amount_arrays.parquet",
  "benchmark_rates_daily.parquet",
  "engine_config.parquet",
] as const;

const OPTIONAL_FILES = [
  "lender_regime_profiles.parquet",
] as const;

function sqlStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, "/").replace(/'/g, "''")}'`;
}

export function matchmakingDataDir(): string {
  return resolve(process.cwd(), "data/matchmaking");
}

export function matchmakingParquetReady(): boolean {
  const dir = matchmakingDataDir();
  return REQUIRED_FILES.every((f) => existsSync(resolve(dir, f)));
}

export interface EngineConfigRow {
  market_floor: number | null;
  latest_benchmark_rate: number | null;
  latest_sofr: number | null;
  latest_dgs5: number | null;
  latest_dgs7: number | null;
}

let instancePromise: Promise<DuckDBInstance> | null = null;

async function getInstance(): Promise<DuckDBInstance> {
  if (!instancePromise) {
    instancePromise = DuckDBInstance.create(":memory:");
  }
  return instancePromise;
}

async function withConnection<T>(fn: (c: DuckDBConnection) => Promise<T>): Promise<T> {
  const inst = await getInstance();
  const conn = await inst.connect();
  try {
    return await fn(conn);
  } finally {
    conn.closeSync();
  }
}

function pq(name: (typeof REQUIRED_FILES)[number]): string {
  const full = resolve(matchmakingDataDir(), name).replace(/\\/g, "/");
  return sqlStringLiteral(full);
}

export async function fetchEngineConfig(): Promise<EngineConfigRow> {
  if (!matchmakingParquetReady()) {
    throw new Error("Matchmaking parquet files missing; run: npx tsx scripts/build-matchmaking-db.ts");
  }
  return withConnection(async (conn) => {
    const reader = await conn.runAndReadAll(
      `SELECT market_floor, latest_benchmark_rate, latest_sofr, latest_dgs5, latest_dgs7
       FROM read_parquet(${pq("engine_config.parquet")})`
    );
    await reader.readAll();
    const rows = reader.getRowObjectsJson();
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return { market_floor: null, latest_benchmark_rate: null, latest_sofr: null, latest_dgs5: null, latest_dgs7: null };
    }
    const num = (k: string) => (row[k] != null ? Number(row[k]) : null);
    return {
      market_floor: num("market_floor"),
      latest_benchmark_rate: num("latest_benchmark_rate"),
      latest_sofr: num("latest_sofr"),
      latest_dgs5: num("latest_dgs5"),
      latest_dgs7: num("latest_dgs7"),
    };
  });
}

function optionalPq(name: (typeof OPTIONAL_FILES)[number]): string | null {
  const full = resolve(matchmakingDataDir(), name);
  if (!existsSync(full)) return null;
  return sqlStringLiteral(full.replace(/\\/g, "/"));
}

export interface LenderRegimeRow {
  dimension_type: string;
  dimension_value: string;
  spread_median: number;
  txn_count: number;
  low_threshold: number;
  high_threshold: number;
}

export async function fetchLenderRegimeProfile(
  lenderId: string,
): Promise<LenderRegimeRow[]> {
  const path = optionalPq("lender_regime_profiles.parquet");
  if (!path) return [];

  const idLit = sqlStringLiteral(lenderId);
  return withConnection(async (conn) => {
    const reader = await conn.runAndReadAll(
      `SELECT dimension_type, dimension_value, spread_median, txn_count, low_threshold, high_threshold
       FROM read_parquet(${path})
       WHERE lender_id = ${idLit}
       ORDER BY dimension_type, dimension_value`
    );
    await reader.readAll();
    return (reader.getRowObjectsJson() as Record<string, unknown>[]).map((row) => ({
      dimension_type: String(row.dimension_type ?? ""),
      dimension_value: String(row.dimension_value ?? ""),
      spread_median: Number(row.spread_median ?? 0),
      txn_count: Number(row.txn_count ?? 0),
      low_threshold: Number(row.low_threshold ?? 0),
      high_threshold: Number(row.high_threshold ?? 0),
    }));
  });
}

export interface BenchmarkHistoryRow {
  rate_date: string;
  rate_value: number;
}

const VALID_SERIES = new Set(["DGS5", "DGS7", "DGS10", "SOFR", "DPRIME"]);

export async function fetchBenchmarkHistory(
  series: string,
  days: number,
): Promise<BenchmarkHistoryRow[]> {
  if (!matchmakingParquetReady()) {
    throw new Error("Matchmaking parquet files missing; run: npx tsx scripts/build-matchmaking-db.ts");
  }
  if (!VALID_SERIES.has(series)) {
    throw new Error(`Invalid series: ${series}. Must be one of: ${[...VALID_SERIES].join(", ")}`);
  }
  const safeDays = Math.max(30, Math.min(days, 3650));
  return withConnection(async (conn) => {
    const reader = await conn.runAndReadAll(
      `SELECT rate_date::VARCHAR AS rate_date, rate_value
       FROM read_parquet(${pq("benchmark_rates_daily.parquet")})
       WHERE series_id = ${sqlStringLiteral(series)}
         AND rate_date >= CURRENT_DATE - INTERVAL '${safeDays} days'
       ORDER BY rate_date`
    );
    await reader.readAll();
    return (reader.getRowObjectsJson() as Record<string, unknown>[]).map((row) => ({
      rate_date: String(row.rate_date ?? ""),
      rate_value: Number(row.rate_value ?? 0),
    }));
  });
}

/** Deal slice needed to join preference parquet files (engine scores in TS). */
export interface DealParquetJoinInput {
  state: string;
  assetClass: string;
  /** Primary purpose key (canonical). */
  purpose: string;
  /** Optional multi-purpose (e.g. Bridge); shares are summed in SQL. */
  eligiblePurposes?: string[];
  /** Optional term bucket for term-fit scoring. */
  termBucket?: string;
}

export interface LenderRow {
  lender_id: string;
  display_name: string;
  custom_logo_url: string | null;
  primary_lender_type: string | null;
  total_txns: number;
  last_txn_date: string;
  amount_p05: number;
  amount_p50: number;
  amount_p95: number;
  geo_concentration: number | null;
  asset_coverage: number;
  purpose_coverage: number;
  spread_median: number | null;
  spread_std: number | null;
  spread_count: number;
  spread_p25: number | null;
  spread_p75: number | null;
  known_fixed_count: number;
  known_floating_count: number;
  unknown_rate_count: number;
  known_rate_ratio: number;
  fixed_share_of_known: number | null;
  state_share: number | null;
  asset_share: number | null;
  purpose_share: number | null;
  sorted_log_amounts: number[];
  ltv_median: number | null;
  ltv_coverage: number | null;
  ltv_count: number;
  ltv_p25: number | null;
  ltv_p75: number | null;
  term_coverage: number;
  term_share: number | null;
}

const CANONICAL_PURPOSES = new Set(["Sale", "Refinance", "New Construction"]);

function purposeInList(deal: DealParquetJoinInput): string[] {
  const raw = deal.eligiblePurposes?.length
    ? deal.eligiblePurposes
    : [deal.purpose];
  const out: string[] = [];
  for (const p of raw) {
    if (CANONICAL_PURPOSES.has(p)) out.push(p);
  }
  if (!out.length) out.push(deal.purpose);
  return [...new Set(out)];
}

/**
 * Single DuckDB query: profiles + prefs + amount arrays.
 * Eligibility and scoring run in TypeScript (`engine.ts`).
 */
export async function fetchLendersForDeal(deal: DealParquetJoinInput): Promise<LenderRow[]> {
  if (!matchmakingParquetReady()) {
    throw new Error("Matchmaking parquet files missing; run: npx tsx scripts/build-matchmaking-db.ts");
  }
  const state = deal.state.toUpperCase();
  const purposes = purposeInList(deal);
  const inList = purposes.map((p) => sqlStringLiteral(p)).join(", ");

  const termJoin = deal.termBucket
    ? `LEFT JOIN read_parquet(${pq("lender_term_prefs.parquet")}) tp
        ON p.lender_id = tp.lender_id AND tp.term_bucket = ${sqlStringLiteral(deal.termBucket)}`
    : "";

  const sql = `
    SELECT
      p.lender_id,
      p.display_name,
      p.custom_logo_url,
      p.primary_lender_type,
      p.total_txns,
      p.last_txn_date::VARCHAR AS last_txn_date,
      p.amount_p05,
      p.amount_p50,
      p.amount_p95,
      p.geo_concentration,
      p.asset_coverage,
      p.purpose_coverage,
      p.spread_median,
      p.spread_std,
      COALESCE(p.spread_count, 0) AS spread_count,
      p.spread_p25,
      p.spread_p75,
      COALESCE(p.known_fixed_count, 0) AS known_fixed_count,
      COALESCE(p.known_floating_count, 0) AS known_floating_count,
      COALESCE(p.unknown_rate_count, 0) AS unknown_rate_count,
      COALESCE(p.known_rate_ratio, 0) AS known_rate_ratio,
      p.fixed_share_of_known,
      sp.share AS state_share,
      ap.share AS asset_share,
      pp.purpose_share,
      aa.sorted_log_amounts,
      p.ltv_median,
      p.ltv_coverage,
      COALESCE(p.ltv_count, 0) AS ltv_count,
      p.ltv_p25,
      p.ltv_p75,
      COALESCE(p.term_coverage, 0) AS term_coverage,
      ${deal.termBucket ? "tp.share AS term_share" : "NULL AS term_share"}
    FROM read_parquet(${pq("lender_profiles.parquet")}) p
    LEFT JOIN read_parquet(${pq("lender_state_prefs.parquet")}) sp
      ON p.lender_id = sp.lender_id AND sp.state = ${sqlStringLiteral(state)}
    LEFT JOIN read_parquet(${pq("lender_asset_prefs.parquet")}) ap
      ON p.lender_id = ap.lender_id AND ap.asset_class = ${sqlStringLiteral(deal.assetClass)}
    LEFT JOIN (
      SELECT lender_id, SUM(share) AS purpose_share
      FROM read_parquet(${pq("lender_purpose_prefs.parquet")})
      WHERE purpose IN (${inList})
      GROUP BY lender_id
    ) pp ON p.lender_id = pp.lender_id
    LEFT JOIN read_parquet(${pq("lender_amount_arrays.parquet")}) aa
      ON p.lender_id = aa.lender_id
    ${termJoin}
  `;

  return withConnection(async (conn) => {
    const reader = await conn.runAndReadAll(sql);
    await reader.readAll();
    const objects = reader.getRowObjectsJson() as Record<string, unknown>[];
    return objects.map((row) => ({
      lender_id: String(row.lender_id ?? ""),
      display_name: String(row.display_name ?? row.lender_id ?? ""),
      custom_logo_url: row.custom_logo_url != null ? String(row.custom_logo_url) : null,
      primary_lender_type:
        row.primary_lender_type != null ? String(row.primary_lender_type) : null,
      total_txns: Number(row.total_txns ?? 0),
      last_txn_date: String(row.last_txn_date ?? ""),
      amount_p05: Number(row.amount_p05 ?? 0),
      amount_p50: Number(row.amount_p50 ?? 0),
      amount_p95: Number(row.amount_p95 ?? 0),
      geo_concentration: row.geo_concentration != null ? Number(row.geo_concentration) : null,
      asset_coverage: Number(row.asset_coverage ?? 0),
      purpose_coverage: Number(row.purpose_coverage ?? 0),
      spread_median: row.spread_median != null ? Number(row.spread_median) : null,
      spread_std: row.spread_std != null ? Number(row.spread_std) : null,
      spread_count: Number(row.spread_count ?? 0),
      spread_p25: row.spread_p25 != null ? Number(row.spread_p25) : null,
      spread_p75: row.spread_p75 != null ? Number(row.spread_p75) : null,
      known_fixed_count: Number(row.known_fixed_count ?? 0),
      known_floating_count: Number(row.known_floating_count ?? 0),
      unknown_rate_count: Number(row.unknown_rate_count ?? 0),
      known_rate_ratio: Number(row.known_rate_ratio ?? 0),
      fixed_share_of_known:
        row.fixed_share_of_known != null ? Number(row.fixed_share_of_known) : null,
      state_share: row.state_share != null ? Number(row.state_share) : null,
      asset_share: row.asset_share != null ? Number(row.asset_share) : null,
      purpose_share: row.purpose_share != null ? Number(row.purpose_share) : null,
      sorted_log_amounts: Array.isArray(row.sorted_log_amounts)
        ? (row.sorted_log_amounts as unknown[]).map((x) => Number(x))
        : [],
      ltv_median: row.ltv_median != null ? Number(row.ltv_median) : null,
      ltv_coverage: row.ltv_coverage != null ? Number(row.ltv_coverage) : null,
      ltv_count: Number(row.ltv_count ?? 0),
      ltv_p25: row.ltv_p25 != null ? Number(row.ltv_p25) : null,
      ltv_p75: row.ltv_p75 != null ? Number(row.ltv_p75) : null,
      term_coverage: Number(row.term_coverage ?? 0),
      term_share: row.term_share != null ? Number(row.term_share) : null,
    }));
  });
}

export interface LenderBreakdownData {
  topStates: { label: string; share: number }[];
  topAssets: { label: string; share: number }[];
  purposes: { label: string; share: number }[];
  topTerms: { label: string; share: number }[];
}

export async function fetchLenderBreakdowns(lenderIds: string[]): Promise<Map<string, LenderBreakdownData>> {
  if (!matchmakingParquetReady() || lenderIds.length === 0) {
    return new Map();
  }
  const inList = lenderIds.map(sqlStringLiteral).join(", ");
  return withConnection(async (conn) => {
    const [stRes, asRes, puRes, tmRes] = await Promise.all([
      conn.runAndReadAll(
        `SELECT lender_id, state AS label, share
         FROM read_parquet(${pq("lender_state_prefs.parquet")})
         WHERE lender_id IN (${inList})
         QUALIFY ROW_NUMBER() OVER (PARTITION BY lender_id ORDER BY share DESC) <= 5`
      ),
      conn.runAndReadAll(
        `SELECT lender_id, asset_class AS label, share
         FROM read_parquet(${pq("lender_asset_prefs.parquet")})
         WHERE lender_id IN (${inList})
         QUALIFY ROW_NUMBER() OVER (PARTITION BY lender_id ORDER BY share DESC) <= 5`
      ),
      conn.runAndReadAll(
        `SELECT lender_id, purpose AS label, share
         FROM read_parquet(${pq("lender_purpose_prefs.parquet")})
         WHERE lender_id IN (${inList})`
      ),
      conn.runAndReadAll(
        `SELECT lender_id, term_bucket AS label, share
         FROM read_parquet(${pq("lender_term_prefs.parquet")})
         WHERE lender_id IN (${inList})
         QUALIFY ROW_NUMBER() OVER (PARTITION BY lender_id ORDER BY share DESC) <= 5`
      ),
    ]);

    await Promise.all([stRes.readAll(), asRes.readAll(), puRes.readAll(), tmRes.readAll()]);

    const result = new Map<string, LenderBreakdownData>();
    for (const id of lenderIds) {
      result.set(id, { topStates: [], topAssets: [], purposes: [], topTerms: [] });
    }

    function collect(rows: Record<string, unknown>[], key: keyof LenderBreakdownData) {
      for (const row of rows) {
        const lid = String(row.lender_id ?? "");
        const entry = result.get(lid);
        if (entry) {
          entry[key].push({
            label: String(row.label ?? ""),
            share: Number(row.share ?? 0),
          });
        }
      }
    }

    collect(stRes.getRowObjectsJson() as Record<string, unknown>[], "topStates");
    collect(asRes.getRowObjectsJson() as Record<string, unknown>[], "topAssets");
    collect(puRes.getRowObjectsJson() as Record<string, unknown>[], "purposes");
    collect(tmRes.getRowObjectsJson() as Record<string, unknown>[], "topTerms");

    return result;
  });
}

export async function fetchLenderProfileBundle(lenderId: string): Promise<{
  profile: Record<string, unknown> | null;
  states: Record<string, unknown>[];
  assets: Record<string, unknown>[];
  purposes: Record<string, unknown>[];
}> {
  if (!matchmakingParquetReady()) {
    throw new Error("Matchmaking parquet files missing; run: npx tsx scripts/build-matchmaking-db.ts");
  }
  const idLit = sqlStringLiteral(lenderId);
  return withConnection(async (conn) => {
    const profReader = await conn.runAndReadAll(
      `SELECT * FROM read_parquet(${pq("lender_profiles.parquet")}) WHERE lender_id = ${idLit}`
    );
    await profReader.readAll();
    const profRows = profReader.getRowObjectsJson();
    const profile = (profRows[0] as Record<string, unknown>) ?? null;

    const stReader = await conn.runAndReadAll(
      `SELECT state, txn_count, share FROM read_parquet(${pq("lender_state_prefs.parquet")})
       WHERE lender_id = ${idLit} ORDER BY share DESC LIMIT 10`
    );
    await stReader.readAll();
    const states = stReader.getRowObjectsJson() as Record<string, unknown>[];

    const asReader = await conn.runAndReadAll(
      `SELECT asset_class, txn_count, share FROM read_parquet(${pq("lender_asset_prefs.parquet")})
       WHERE lender_id = ${idLit} ORDER BY share DESC`
    );
    await asReader.readAll();
    const assets = asReader.getRowObjectsJson() as Record<string, unknown>[];

    const puReader = await conn.runAndReadAll(
      `SELECT purpose, txn_count, share FROM read_parquet(${pq("lender_purpose_prefs.parquet")})
       WHERE lender_id = ${idLit} ORDER BY share DESC`
    );
    await puReader.readAll();
    const purposes = puReader.getRowObjectsJson() as Record<string, unknown>[];

    return { profile, states, assets, purposes };
  });
}
