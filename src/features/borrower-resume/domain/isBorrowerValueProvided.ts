/**
 * Characterization copy of isValueProvided for borrower resume.
 * Used by BorrowerResumeForm and domain helpers (subsection badge, etc.).
 */
export function isBorrowerValueProvided(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
}
