/**
 * Format errors for store/hook state. Avoids exposing stack traces or internal details.
 * Use in Zustand stores and hooks when setting error state.
 */
export function formatStoreError(err: unknown, fallback: string): string {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	if (
		typeof err === "object" &&
		err !== null &&
		"message" in err &&
		typeof (err as { message: unknown }).message === "string"
	) {
		return (err as { message: string }).message;
	}
	return fallback;
}
