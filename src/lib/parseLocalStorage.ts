/**
 * Safely parse JSON from localStorage. Returns fallback on invalid JSON or missing key.
 */
export function parseLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
