/**
 * When true, the Lender Match tab uses the Capitalize parquet engine (FastAPI `/capitalize/*`).
 * When false, matchmaking uses the HMDA pipeline (`POST /api/v1/matchmaking/run/{project_id}`).
 */
export function useCapitalizeMatchmakingEngine(): boolean {
  return process.env.NEXT_PUBLIC_USE_CAPITALIZE_MATCHMAKING === "true";
}
