/**
 * Capitalize is the production matchmaking engine for the lender match flow.
 *
 * Keep this hook so existing call sites stay simple, but do not allow
 * environment drift to silently fall back to the legacy HMDA matcher.
 */
export function useCapitalizeMatchmakingEngine(): boolean {
  return true;
}
