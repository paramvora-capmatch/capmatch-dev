/**
 * DEPRECATED as of Algorithm V2 (see data-exploration/Capitalize/v2/docs/).
 *
 * The Capitalize matchmaking parquet artifacts are now built by the Python
 * script at:
 *
 *   data-exploration/Capitalize/v2/scripts/09_build_v2_lender_artifacts.py
 *
 * That script is the single source of truth. It produces every parquet the
 * FastAPI backend consumes, including benchmark_rates_daily, engine_config,
 * and lender_regime_profiles which this TypeScript builder used to produce.
 *
 * This file is left in the repo as a historical reference for the V1 schema
 * but is NOT imported or invoked by production code. Do not run it; running
 * it against the V1 schema will not produce artifacts that the V2 FastAPI
 * backend can consume.
 *
 * ---
 *
 * (Original docstring, preserved for reference:)
 * One-time / occasional build: Capitalize SQLite scrape + FRED CSVs → parquet
 * under data/matchmaking/. Run from repo root:
 *
 *   npx tsx scripts/build-matchmaking-db.ts
 *
 * Override source DB: CAPITALIZE_SQLITE_PATH=/path/to/capitalise_scrape.db
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";

const DEFAULT_SQLITE = resolve(
  __dirname,
  "../../capitalise-scraper/capitalise_scrape_db-3-17-26/capitalise_scrape.db"
);
const OUTPUT_DIR = resolve(__dirname, "../data/matchmaking");
const FRED_CACHE_DIR = resolve(OUTPUT_DIR, ".fred_cache");

const FRED_SERIES = ["DGS5", "DGS7", "DGS10", "SOFR", "DPRIME"] as const;

function sqlStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, "/").replace(/'/g, "''")}'`;
}

async function downloadFredSeries(seriesId: string): Promise<string> {
  mkdirSync(FRED_CACHE_DIR, { recursive: true });
  const cachePath = resolve(FRED_CACHE_DIR, `${seriesId}.csv`);
  if (existsSync(cachePath)) {
    console.log(`  ${seriesId}: using cached ${cachePath}`);
    return cachePath;
  }
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=1998-01-01&coed=2026-12-31`;
  console.log(`  ${seriesId}: downloading from FRED...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED download failed for ${seriesId}: ${res.status}`);
  const text = await res.text();
  writeFileSync(cachePath, text, "utf-8");
  return cachePath;
}

/** Normalization backbone: ends at txn_base (no trailing comma). */
const TXN_CLEAN_AND_BASE = `
WITH txn_clean AS (
    SELECT
        internalLenderId AS lender_id,
        CAST(mortgageAmount AS DOUBLE) AS amount,
        LN(CAST(mortgageAmount AS DOUBLE)) AS log_amount,
        CASE
            WHEN TRIM(state) IN ('NA', 'PR') THEN NULL
            WHEN TRIM(state) = '' THEN NULL
            ELSE UPPER(TRIM(state))
        END AS state,
        CASE
            WHEN transactionDate IS NULL OR TRIM(CAST(transactionDate AS VARCHAR)) = '' THEN NULL
            WHEN CAST(SUBSTR(transactionDate, 1, 10) AS DATE) < DATE '1999-01-01' THEN NULL
            WHEN CAST(SUBSTR(transactionDate, 1, 10) AS DATE) > CURRENT_DATE THEN NULL
            ELSE CAST(SUBSTR(transactionDate, 1, 10) AS DATE)
        END AS txn_date,
        LOWER(TRIM(CAST(lenderType AS VARCHAR))) AS lender_type,
        CASE
            WHEN TRIM(CAST(propertyType AS VARCHAR)) = 'Construction' THEN 'New Construction'
            WHEN TRIM(CAST(propertyType AS VARCHAR)) = '1' THEN NULL
            WHEN TRIM(CAST(propertyType AS VARCHAR)) = '' THEN NULL
            ELSE TRIM(CAST(propertyType AS VARCHAR))
        END AS purpose,
        CASE
            WHEN TRIM(CAST(internalLandCategory AS VARCHAR)) = '' THEN NULL
            ELSE TRIM(CAST(internalLandCategory AS VARCHAR))
        END AS asset_class,
        CASE
            WHEN TRIM(CAST(internalLandSubcategory AS VARCHAR)) = '' THEN NULL
            ELSE TRIM(CAST(internalLandSubcategory AS VARCHAR))
        END AS asset_subclass,
        CASE
            WHEN CAST(interestRate AS DOUBLE) <= 0 THEN NULL
            WHEN CAST(interestRate AS DOUBLE) < 1 THEN CAST(interestRate AS DOUBLE) * 100
            WHEN CAST(interestRate AS DOUBLE) < 30 THEN CAST(interestRate AS DOUBLE)
            WHEN CAST(interestRate AS DOUBLE) < 100 THEN CAST(interestRate AS DOUBLE) / 10
            ELSE CAST(interestRate AS DOUBLE) / 100
        END AS norm_rate,
        CASE
            WHEN LOWER(TRIM(CAST(interestRateType AS VARCHAR)))
                 IN ('fix', 'fixed') THEN 'Fixed'
            WHEN LOWER(TRIM(CAST(interestRateType AS VARCHAR)))
                 IN ('var', 'variable', 'adj', 'adjustable', 'adjustable hybrid') THEN 'Floating'
            ELSE 'Unknown'
        END AS clean_rate_type,
        CASE
            WHEN term IS NULL OR TRIM(CAST(term AS VARCHAR)) = '' THEN NULL
            WHEN CAST(CAST(term AS DOUBLE) AS INTEGER) = 0 THEN NULL
            WHEN CAST(CAST(term AS DOUBLE) AS INTEGER) BETWEEN 1 AND 600 THEN
                CASE
                    WHEN CAST(CAST(term AS DOUBLE) AS INTEGER) IN (4,5,7,8,10,15,20,25,30,35,40)
                        THEN CAST(CAST(term AS DOUBLE) AS INTEGER) * 12
                    ELSE CAST(CAST(term AS DOUBLE) AS INTEGER)
                END
            ELSE NULL
        END AS term_months,
        CASE
            WHEN CAST(ltv AS DOUBLE) IS NULL OR CAST(ltv AS DOUBLE) <= 0 THEN NULL
            WHEN CAST(ltv AS DOUBLE) <= 2 THEN CAST(ltv AS DOUBLE) * 100
            ELSE CAST(ltv AS DOUBLE)
        END AS norm_ltv
    FROM src.transactions
    WHERE mortgageAmount IS NOT NULL
      AND CAST(mortgageAmount AS DOUBLE) > 0
      AND internalLenderId IS NOT NULL
      AND internalLenderId != ''
),
txn_base AS (
    SELECT *,
        CASE WHEN norm_rate BETWEEN 1 AND 30 THEN norm_rate ELSE NULL END AS valid_rate,
        CASE WHEN norm_ltv > 0 AND norm_ltv <= 200 THEN norm_ltv ELSE NULL END AS valid_ltv,
        CASE
            WHEN term_months IS NULL THEN NULL
            WHEN term_months <= 12 THEN 'bridge_lte1yr'
            WHEN term_months <= 36 THEN 'short_1_3yr'
            WHEN term_months <= 60 THEN 'medium_3_5yr'
            WHEN term_months <= 84 THEN 'medium_5_7yr'
            WHEN term_months <= 120 THEN 'standard_7_10yr'
            WHEN term_months <= 180 THEN 'long_10_15yr'
            WHEN term_months <= 240 THEN 'long_15_20yr'
            WHEN term_months <= 360 THEN 'standard_20_30yr'
            ELSE 'extended_gt30yr'
        END AS term_bucket
    FROM txn_clean
)`;

function lenderProfilesSql(): string {
  return `
CREATE TABLE lender_profiles AS
${TXN_CLEAN_AND_BASE}
,
txn_with_benchmark AS (
    SELECT
        tb.*,
        CASE
            WHEN tb.clean_rate_type = 'Floating' THEN
                COALESCE(sofr.rate_value, prime.rate_value)
            WHEN tb.clean_rate_type = 'Fixed' AND tb.term_months IS NOT NULL THEN
                CASE
                    WHEN tb.term_months <= 72 THEN dgs5.rate_value
                    WHEN tb.term_months <= 108 THEN dgs7.rate_value
                    ELSE dgs10.rate_value
                END
            ELSE dgs10.rate_value
        END AS bench_rate
    FROM txn_base tb
    LEFT JOIN benchmark_rates_daily dgs5
        ON tb.txn_date = dgs5.rate_date AND dgs5.series_id = 'DGS5'
    LEFT JOIN benchmark_rates_daily dgs7
        ON tb.txn_date = dgs7.rate_date AND dgs7.series_id = 'DGS7'
    LEFT JOIN benchmark_rates_daily dgs10
        ON tb.txn_date = dgs10.rate_date AND dgs10.series_id = 'DGS10'
    LEFT JOIN benchmark_rates_daily sofr
        ON tb.txn_date = sofr.rate_date AND sofr.series_id = 'SOFR'
    LEFT JOIN benchmark_rates_daily prime
        ON tb.txn_date = prime.rate_date AND prime.series_id = 'DPRIME'
),
lender_stats AS (
    SELECT
        lender_id,
        COUNT(*) AS total_txns,
        MAX(txn_date) AS last_txn_date,
        DATEDIFF('day', MIN(txn_date), MAX(txn_date)) AS txn_span_days,
        PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY amount) AS amount_p05,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY amount) AS amount_p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY amount) AS amount_p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY amount) AS amount_p75,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY amount) AS amount_p95,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY log_amount) AS log_amount_median,
        STDDEV(log_amount) AS log_amount_std,
        COUNT(DISTINCT state) AS state_count,
        COUNT(CASE WHEN asset_class IS NOT NULL AND asset_class != '' THEN 1 END)::DOUBLE
            / COUNT(*) AS asset_coverage,
        COUNT(DISTINCT asset_class) AS asset_class_count,
        COUNT(CASE WHEN purpose IS NOT NULL AND purpose != '' THEN 1 END)::DOUBLE
            / COUNT(*) AS purpose_coverage,
        COUNT(term_months)::BIGINT AS term_txn_count,
        CASE WHEN COUNT(*) > 0
            THEN COUNT(term_months)::DOUBLE / COUNT(*)
            ELSE 0.0
        END AS term_coverage
    FROM txn_base
    GROUP BY lender_id
),
lender_type_agg AS (
    SELECT
        lender_id,
        MODE(lender_type) AS primary_lender_type,
        COUNT(DISTINCT lender_type) AS lender_type_mix_count
    FROM txn_base
    WHERE lender_type IS NOT NULL AND lender_type != ''
    GROUP BY lender_id
),
geo_hhi AS (
    SELECT
        lender_id,
        SUM(share * share) AS geo_concentration
    FROM (
        SELECT
            lender_id,
            state,
            COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
        FROM txn_base
        WHERE state IS NOT NULL AND state != ''
        GROUP BY lender_id, state
    )
    GROUP BY lender_id
),
asset_hhi AS (
    SELECT
        lender_id,
        SUM(share * share) AS asset_concentration
    FROM (
        SELECT
            lender_id,
            asset_class,
            COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
        FROM txn_base
        WHERE asset_class IS NOT NULL AND asset_class != ''
        GROUP BY lender_id, asset_class
    )
    GROUP BY lender_id
),
term_hhi AS (
    SELECT
        lender_id,
        SUM(share * share) AS term_concentration
    FROM (
        SELECT
            lender_id,
            term_bucket,
            COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
        FROM txn_base
        WHERE term_bucket IS NOT NULL
        GROUP BY lender_id, term_bucket
    )
    GROUP BY lender_id
),
term_dominant AS (
    SELECT DISTINCT ON (lender_id)
        lender_id,
        term_bucket AS dominant_term_bucket
    FROM (
        SELECT
            lender_id,
            term_bucket,
            COUNT(*) AS cnt
        FROM txn_base
        WHERE term_bucket IS NOT NULL
        GROUP BY lender_id, term_bucket
    )
    ORDER BY lender_id, cnt DESC
),
spread_agg AS (
    SELECT
        lender_id,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY valid_rate - bench_rate) AS spread_median,
        STDDEV(valid_rate - bench_rate) AS spread_std,
        COUNT(*) AS spread_count,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY valid_rate - bench_rate) AS spread_p25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY valid_rate - bench_rate) AS spread_p75
    FROM txn_with_benchmark
    WHERE valid_rate IS NOT NULL AND bench_rate IS NOT NULL
    GROUP BY lender_id
),
rate_type_agg AS (
    SELECT
        lender_id,
        COUNT(CASE WHEN clean_rate_type = 'Fixed' THEN 1 END) AS known_fixed_count,
        COUNT(CASE WHEN clean_rate_type = 'Floating' THEN 1 END) AS known_floating_count,
        COUNT(CASE WHEN clean_rate_type = 'Unknown' THEN 1 END) AS unknown_rate_count,
        CASE WHEN COUNT(*) > 0
            THEN COUNT(CASE WHEN clean_rate_type IN ('Fixed','Floating') THEN 1 END)::DOUBLE / COUNT(*)
            ELSE 0.0
        END AS known_rate_ratio,
        CASE WHEN COUNT(CASE WHEN clean_rate_type IN ('Fixed','Floating') THEN 1 END) > 0
            THEN COUNT(CASE WHEN clean_rate_type = 'Fixed' THEN 1 END)::DOUBLE
                 / COUNT(CASE WHEN clean_rate_type IN ('Fixed','Floating') THEN 1 END)
            ELSE NULL
        END AS fixed_share_of_known
    FROM txn_base
    WHERE valid_rate IS NOT NULL
    GROUP BY lender_id
),
ltv_agg AS (
    SELECT
        b.lender_id,
        p.ltv_median,
        COALESCE(s.ltv_count, 0) AS ltv_count,
        COALESCE(s.ltv_coverage, 0.0) AS ltv_coverage,
        p.ltv_p25,
        p.ltv_p75
    FROM (SELECT DISTINCT lender_id FROM txn_base) b
    LEFT JOIN (
        SELECT
            lender_id,
            COUNT(valid_ltv) AS ltv_count,
            COUNT(valid_ltv)::DOUBLE / COUNT(*) AS ltv_coverage
        FROM txn_base
        GROUP BY lender_id
    ) s USING (lender_id)
    LEFT JOIN (
        SELECT
            lender_id,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY valid_ltv) AS ltv_median,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY valid_ltv) AS ltv_p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY valid_ltv) AS ltv_p75
        FROM txn_base
        WHERE valid_ltv IS NOT NULL
        GROUP BY lender_id
    ) p USING (lender_id)
)
SELECT
    s.*,
    t.primary_lender_type,
    t.lender_type_mix_count,
    g.geo_concentration,
    a.asset_concentration,
    COALESCE(l.name, s.lender_id) AS display_name,
    l.overview,
    l.domain,
    l.source AS lender_source,
    l.nmlsId AS nmls_id,
    l.customLogo AS custom_logo_url,
    sp.spread_median,
    sp.spread_std,
    sp.spread_count,
    sp.spread_p25,
    sp.spread_p75,
    rt.known_fixed_count,
    rt.known_floating_count,
    rt.unknown_rate_count,
    rt.known_rate_ratio,
    rt.fixed_share_of_known,
    la.ltv_median,
    la.ltv_count,
    la.ltv_coverage,
    la.ltv_p25,
    la.ltv_p75,
    th.term_concentration,
    td.dominant_term_bucket
FROM lender_stats s
LEFT JOIN lender_type_agg t USING (lender_id)
LEFT JOIN geo_hhi g USING (lender_id)
LEFT JOIN asset_hhi a USING (lender_id)
LEFT JOIN term_hhi th USING (lender_id)
LEFT JOIN term_dominant td USING (lender_id)
LEFT JOIN spread_agg sp USING (lender_id)
LEFT JOIN rate_type_agg rt USING (lender_id)
LEFT JOIN ltv_agg la USING (lender_id)
LEFT JOIN src.lenders l ON s.lender_id = l.id
`;
}

async function scalarNumber(
  conn: DuckDBConnection,
  sql: string
): Promise<number | null> {
  const reader = await conn.runAndReadAll(sql);
  await reader.readAll();
  const rows = reader.getRowsJson();
  if (!rows.length || !rows[0].length) return null;
  const v = rows[0][0];
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function validate(conn: DuckDBConnection): Promise<void> {
  const checks: { name: string; sql: string; minExpected: number }[] = [
    {
      name: "Total transactions with valid amount",
      sql: `SELECT COUNT(*)::BIGINT AS n FROM src.transactions
            WHERE mortgageAmount IS NOT NULL
            AND CAST(mortgageAmount AS DOUBLE) > 0`,
      minExpected: 1_500_000,
    },
    {
      name: "Lenders with >= 10 transactions",
      sql: "SELECT COUNT(*)::BIGINT AS n FROM lender_profiles WHERE total_txns >= 10",
      minExpected: 5_000,
    },
    {
      name: "Lenders with state prefs",
      sql: "SELECT COUNT(DISTINCT lender_id)::BIGINT AS n FROM lender_state_prefs",
      minExpected: 15_000,
    },
    {
      name: "Lenders with asset_coverage >= 0.5",
      sql: "SELECT COUNT(*)::BIGINT AS n FROM lender_profiles WHERE asset_coverage >= 0.5",
      minExpected: 3_000,
    },
    {
      name: "Lenders with last_txn_date",
      sql: "SELECT COUNT(*)::BIGINT AS n FROM lender_profiles WHERE last_txn_date IS NOT NULL",
      minExpected: 15_000,
    },
    {
      name: "Lenders with spread_count >= 10",
      sql: "SELECT COUNT(*)::BIGINT AS n FROM lender_profiles WHERE spread_count >= 10",
      minExpected: 5_000,
    },
    {
      name: "Lenders with term prefs",
      sql: "SELECT COUNT(DISTINCT lender_id)::BIGINT AS n FROM lender_term_prefs",
      minExpected: 14_000,
    },
    {
      name: "Benchmark daily rows",
      sql: "SELECT COUNT(*)::BIGINT AS n FROM benchmark_rates_daily",
      minExpected: 30_000,
    },
    {
      name: "Lenders with display name (not raw id only)",
      sql: `SELECT COUNT(*)::BIGINT AS n FROM lender_profiles WHERE display_name IS NOT NULL AND display_name != lender_id`,
      minExpected: 10_000,
    },
  ];

  console.log("Validation:");
  for (const check of checks) {
    const n = await scalarNumber(conn, check.sql);
    const actual = n ?? 0;
    const status = actual >= check.minExpected ? "PASS" : "WARN";
    console.log(
      `  [${status}] ${check.name}: ${actual.toLocaleString()} (min: ${check.minExpected.toLocaleString()})`
    );
  }

  const purposeBad = await scalarNumber(
    conn,
    `SELECT COUNT(*)::BIGINT AS n FROM lender_purpose_prefs
     WHERE purpose NOT IN ('Sale','Refinance','New Construction')`
  );
  console.log(
    purposeBad === 0
      ? "  [PASS] purpose_prefs: only canonical purposes"
      : `  [WARN] purpose_prefs: unexpected purpose rows = ${purposeBad}`
  );

  const stateBad = await scalarNumber(
    conn,
    `SELECT COUNT(*)::BIGINT AS n FROM lender_state_prefs WHERE state IN ('NA','PR')`
  );
  console.log(
    stateBad === 0
      ? "  [PASS] state_prefs: no NA/PR"
      : `  [WARN] state_prefs: NA/PR rows = ${stateBad}`
  );
}

async function build(): Promise<void> {
  const sqlitePath = process.env.CAPITALIZE_SQLITE_PATH || DEFAULT_SQLITE;
  if (!existsSync(sqlitePath)) {
    throw new Error(
      `Source DB not found: ${sqlitePath}\nSet CAPITALIZE_SQLITE_PATH or place the scrape at the default path.`
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const instance = await DuckDBInstance.create(":memory:");
  const conn = await instance.connect();

  try {
    console.log("Loading sqlite extension...");
    await conn.run("INSTALL sqlite;");
    await conn.run("LOAD sqlite;");
    await conn.run(`ATTACH ${sqlStringLiteral(sqlitePath)} AS src (TYPE sqlite, READ_ONLY);`);

    console.log("Step 1: FRED benchmark rates...");
    await conn.run(`
      CREATE TABLE benchmark_rates (
        rate_date DATE NOT NULL,
        series_id VARCHAR NOT NULL,
        rate_value DOUBLE NOT NULL
      );
    `);

    const valueTuples: string[] = [];
    for (const sid of FRED_SERIES) {
      const csvPath = await downloadFredSeries(sid);
      const lines = readFileSync(csvPath, "utf-8").split("\n");
      for (const line of lines.slice(1)) {
        const [dateStr, valueStr] = line.split(",");
        if (!dateStr?.trim() || !valueStr?.trim() || valueStr.trim() === ".") continue;
        const rate = parseFloat(valueStr.trim());
        if (!Number.isFinite(rate)) continue;
        valueTuples.push(`(CAST(${sqlStringLiteral(dateStr.trim())} AS DATE), ${sqlStringLiteral(sid)}, ${rate})`);
      }
    }
    for (let i = 0; i < valueTuples.length; i += 1000) {
      const chunk = valueTuples.slice(i, i + 1000);
      await conn.run(`INSERT INTO benchmark_rates VALUES ${chunk.join(",")}`);
    }
    const brCount = await scalarNumber(conn, "SELECT COUNT(*)::BIGINT AS n FROM benchmark_rates");
    console.log(`  benchmark_rates: ${(brCount ?? 0).toLocaleString()} rows`);

    console.log("Step 2: benchmark_rates_daily (forward-filled calendar)...");
    await conn.run(`
      CREATE TABLE benchmark_rates_daily AS
      WITH date_range AS (
          SELECT CAST(generate_series AS DATE) AS cal_date
          FROM generate_series(
              (SELECT MIN(rate_date) FROM benchmark_rates),
              (SELECT MAX(rate_date) FROM benchmark_rates),
              INTERVAL 1 DAY
          )
      ),
      series_list AS (
          SELECT DISTINCT series_id FROM benchmark_rates
      ),
      daily_grid AS (
          SELECT d.cal_date, s.series_id
          FROM date_range d CROSS JOIN series_list s
      ),
      with_raw AS (
          SELECT
              g.cal_date,
              g.series_id,
              b.rate_value AS raw_value
          FROM daily_grid g
          LEFT JOIN benchmark_rates b
              ON g.cal_date = b.rate_date AND g.series_id = b.series_id
      ),
      with_filled AS (
          SELECT
              cal_date,
              series_id,
              LAST_VALUE(raw_value IGNORE NULLS) OVER (
                  PARTITION BY series_id ORDER BY cal_date
                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
              ) AS filled_rate_value
          FROM with_raw
      )
      SELECT
          cal_date AS rate_date,
          series_id,
          filled_rate_value AS rate_value
      FROM with_filled
      WHERE filled_rate_value IS NOT NULL;
    `);

    console.log("Step 3: lender_profiles (this may take several minutes)...");
    await conn.run(lenderProfilesSql());

    console.log("Step 4: engine_config...");
    await conn.run(`
      CREATE TABLE engine_config AS
      SELECT
        (SELECT PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY spread_median)
         FROM lender_profiles
         WHERE spread_count >= 10 AND spread_median IS NOT NULL) AS market_floor,
        (SELECT rate_value FROM benchmark_rates_daily
         WHERE series_id = 'DGS10'
           AND rate_date = (SELECT MAX(rate_date) FROM benchmark_rates_daily WHERE series_id = 'DGS10')
         LIMIT 1) AS latest_benchmark_rate,
        (SELECT rate_value FROM benchmark_rates_daily
         WHERE series_id = 'SOFR'
           AND rate_date = (SELECT MAX(rate_date) FROM benchmark_rates_daily WHERE series_id = 'SOFR')
         LIMIT 1) AS latest_sofr,
        (SELECT rate_value FROM benchmark_rates_daily
         WHERE series_id = 'DGS5'
           AND rate_date = (SELECT MAX(rate_date) FROM benchmark_rates_daily WHERE series_id = 'DGS5')
         LIMIT 1) AS latest_dgs5,
        (SELECT rate_value FROM benchmark_rates_daily
         WHERE series_id = 'DGS7'
           AND rate_date = (SELECT MAX(rate_date) FROM benchmark_rates_daily WHERE series_id = 'DGS7')
         LIMIT 1) AS latest_dgs7;
    `);

    console.log("Step 5: preference tables + amount arrays...");
    await conn.run(`
      CREATE TABLE lender_state_prefs AS
      ${TXN_CLEAN_AND_BASE}
      SELECT
          lender_id,
          state,
          COUNT(*) AS txn_count,
          COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share,
          MAX(txn_date) AS last_txn_in_state
      FROM txn_base
      WHERE state IS NOT NULL
      GROUP BY lender_id, state;
    `);

    await conn.run(`
      CREATE TABLE lender_asset_prefs AS
      ${TXN_CLEAN_AND_BASE}
      SELECT
          lender_id,
          asset_class,
          COUNT(*) AS txn_count,
          COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
      FROM txn_base
      WHERE asset_class IS NOT NULL
      GROUP BY lender_id, asset_class;
    `);

    await conn.run(`
      CREATE TABLE lender_purpose_prefs AS
      ${TXN_CLEAN_AND_BASE}
      SELECT
          lender_id,
          purpose,
          COUNT(*) AS txn_count,
          COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
      FROM txn_base
      WHERE purpose IS NOT NULL
      GROUP BY lender_id, purpose;
    `);

    await conn.run(`
      CREATE TABLE lender_amount_arrays AS
      ${TXN_CLEAN_AND_BASE}
      SELECT
          lender_id,
          LIST(log_amount ORDER BY log_amount) AS sorted_log_amounts
      FROM txn_base
      GROUP BY lender_id;
    `);

    await conn.run(`
      CREATE TABLE lender_term_prefs AS
      ${TXN_CLEAN_AND_BASE}
      SELECT
          lender_id,
          term_bucket,
          COUNT(*) AS txn_count,
          COUNT(*)::DOUBLE / SUM(COUNT(*)) OVER (PARTITION BY lender_id) AS share
      FROM txn_base
      WHERE term_bucket IS NOT NULL
      GROUP BY lender_id, term_bucket;
    `);

    console.log("Step 6: lender_regime_profiles (per-era + per-regime spread stats)...");
    await conn.run(`
      CREATE TABLE lender_regime_profiles AS
      ${TXN_CLEAN_AND_BASE},
      txn_with_benchmark_regime AS (
          SELECT
              tb.*,
              CASE
                  WHEN tb.clean_rate_type = 'Floating' THEN
                      COALESCE(sofr.rate_value, prime.rate_value)
                  WHEN tb.clean_rate_type = 'Fixed' AND tb.term_months IS NOT NULL THEN
                      CASE
                          WHEN tb.term_months <= 72 THEN dgs5.rate_value
                          WHEN tb.term_months <= 108 THEN dgs7.rate_value
                          ELSE dgs10.rate_value
                      END
                  ELSE dgs10.rate_value
              END AS bench_rate,
              dgs10.rate_value AS dgs10_rate
          FROM txn_base tb
          LEFT JOIN benchmark_rates_daily dgs5
              ON tb.txn_date = dgs5.rate_date AND dgs5.series_id = 'DGS5'
          LEFT JOIN benchmark_rates_daily dgs7
              ON tb.txn_date = dgs7.rate_date AND dgs7.series_id = 'DGS7'
          LEFT JOIN benchmark_rates_daily dgs10
              ON tb.txn_date = dgs10.rate_date AND dgs10.series_id = 'DGS10'
          LEFT JOIN benchmark_rates_daily sofr
              ON tb.txn_date = sofr.rate_date AND sofr.series_id = 'SOFR'
          LEFT JOIN benchmark_rates_daily prime
              ON tb.txn_date = prime.rate_date AND prime.series_id = 'DPRIME'
      ),
      regime_thresholds AS (
          SELECT
              PERCENTILE_CONT(0.333) WITHIN GROUP (ORDER BY rate_value) AS low_threshold,
              PERCENTILE_CONT(0.667) WITHIN GROUP (ORDER BY rate_value) AS high_threshold
          FROM benchmark_rates_daily
          WHERE series_id = 'DGS10'
      ),
      txn_enriched AS (
          SELECT
              t.lender_id,
              t.valid_rate - t.bench_rate AS spread,
              CASE
                  WHEN t.txn_date < DATE '2008-01-01' THEN 'pre_gfc'
                  WHEN t.txn_date < DATE '2014-01-01' THEN 'gfc_recovery'
                  WHEN t.txn_date < DATE '2020-03-01' THEN 'zirp'
                  WHEN t.txn_date < DATE '2023-01-01' THEN 'covid_hiking'
                  ELSE 'current'
              END AS era,
              CASE
                  WHEN t.dgs10_rate <= rt.low_threshold THEN 'Low'
                  WHEN t.dgs10_rate <= rt.high_threshold THEN 'Medium'
                  ELSE 'High'
              END AS rate_regime,
              rt.low_threshold,
              rt.high_threshold
          FROM txn_with_benchmark_regime t
          CROSS JOIN regime_thresholds rt
          WHERE t.valid_rate IS NOT NULL
            AND t.bench_rate IS NOT NULL
            AND t.dgs10_rate IS NOT NULL
      ),
      era_stats AS (
          SELECT
              lender_id,
              'era' AS dimension_type,
              era AS dimension_value,
              PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY spread) AS spread_median,
              CAST(COUNT(*) AS INTEGER) AS txn_count,
              MAX(low_threshold) AS low_threshold,
              MAX(high_threshold) AS high_threshold
          FROM txn_enriched
          GROUP BY lender_id, era
      ),
      regime_stats AS (
          SELECT
              lender_id,
              'regime' AS dimension_type,
              rate_regime AS dimension_value,
              PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY spread) AS spread_median,
              CAST(COUNT(*) AS INTEGER) AS txn_count,
              MAX(low_threshold) AS low_threshold,
              MAX(high_threshold) AS high_threshold
          FROM txn_enriched
          GROUP BY lender_id, rate_regime
      )
      SELECT * FROM era_stats
      UNION ALL
      SELECT * FROM regime_stats
    `);

    await validate(conn);

    console.log("Step 7: export parquet →", OUTPUT_DIR);
    const tables = [
      "lender_profiles",
      "lender_state_prefs",
      "lender_asset_prefs",
      "lender_purpose_prefs",
      "lender_term_prefs",
      "lender_amount_arrays",
      "benchmark_rates_daily",
      "engine_config",
      "lender_regime_profiles",
    ] as const;
    for (const table of tables) {
      const outPath = resolve(OUTPUT_DIR, `${table}.parquet`).replace(/\\/g, "/");
      await conn.run(`COPY ${table} TO ${sqlStringLiteral(outPath)} (FORMAT PARQUET);`);
      const n = await scalarNumber(conn, `SELECT COUNT(*)::BIGINT AS n FROM ${table}`);
      console.log(`  ${table}: ${(n ?? 0).toLocaleString()} rows → ${outPath}`);
    }

    await conn.run("DETACH src;");
    console.log("Done.");
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
