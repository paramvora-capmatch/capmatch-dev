/** When true, advisor UI uses Next.js `/api/matchmaking/*` instead of FastAPI. */
export function useLocalCapitalizeMatchmaking(): boolean {
  return process.env.NEXT_PUBLIC_USE_LOCAL_CAPITALIZE_MATCHMAKING === "true";
}
