/**
 * Characterization copy of isProjectValueProvided for tests.
 * Commit 2 will have EnhancedProjectForm import from here.
 */
export function isProjectValueProvided(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
}
