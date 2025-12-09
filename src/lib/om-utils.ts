/**
 * OM Utilities
 * 
 * Shared utilities for extracting and processing OM (Offering Memorandum) data.
 * These utilities handle the complex nested structure of OM content and provide
 * type-safe accessors for common operations.
 */

import { getOMValue } from "./om-queries";

/**
 * Safely extracts and converts numeric values from OM content.
 * 
 * Searches in multiple locations:
 * 1. Top-level content object
 * 2. projectSections by section ID
 * 3. Nested subsections within sections
 * 
 * Handles string-to-number conversion and provides default values.
 * 
 * @param content - The OM content object
 * @param fieldId - The field ID to extract
 * @param defaultValue - Default value if field is not found or invalid (default: 0)
 * @returns The numeric value or defaultValue
 */
export function getNumericValue(
	content: Record<string, any>,
	fieldId: string,
	defaultValue: number = 0
): number {
	const projectSections = content.projectSections || {};
	
	// Try top-level first
	let value = getOMValue(content, fieldId);
	
	// If not found, search in projectSections
	if ((value === undefined || value === null) && projectSections) {
		// Check each section
		for (const sectionKey in projectSections) {
			const section = projectSections[sectionKey];
			if (section && typeof section === "object") {
				// Check direct field in section
				const sectionValue = getOMValue(section, fieldId);
				if (sectionValue !== undefined && sectionValue !== null) {
					value = sectionValue;
					break;
				}
				
				// Check nested subsections (e.g., "amenities-unit-details")
				for (const subsectionKey in section) {
					const subsection = section[subsectionKey];
					if (
						subsection &&
						typeof subsection === "object" &&
						!Array.isArray(subsection)
					) {
						const subsectionValue = getOMValue(subsection, fieldId);
						if (subsectionValue !== undefined && subsectionValue !== null) {
							value = subsectionValue;
							break;
						}
					}
				}
				if (value !== undefined && value !== null) break;
			}
		}
	}
	
	// Convert to number if it's a string
	if (typeof value === "string") {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? defaultValue : parsed;
	}
	
	// Return as number or default
	return typeof value === "number" ? value : defaultValue;
}

/**
 * Parses a numeric value from a string, removing non-numeric characters.
 * 
 * @param value - The value to parse (string, number, or null/undefined)
 * @returns The parsed number or null if invalid
 */
export function parseNumeric(
	value?: string | number | null
): number | null {
	if (value === null || value === undefined) return null;
	
	if (typeof value === "number") {
		return isNaN(value) ? null : value;
	}
	
	if (typeof value === "string") {
		const parsed = parseFloat(value.replace(/[^\d.]/g, ""));
		return isNaN(parsed) ? null : parsed;
	}
	
	return null;
}

/**
 * Calculates the average of numeric values extracted from an array.
 * 
 * @param items - Array of items to process
 * @param accessor - Function to extract numeric value from each item
 * @returns The average value or null if no valid values found
 */
export function calculateAverage<T>(
	items: T[],
	accessor: (item: T) => number | null
): number | null {
	if (!items.length) return null;
	
	const values = items
		.map(accessor)
		.filter((value): value is number => value !== null && !isNaN(value));
	
	if (!values.length) return null;
	
	const sum = values.reduce((acc, val) => acc + val, 0);
	return sum / values.length;
}

/**
 * Normalizes scenario data with fallback values.
 * 
 * @param scenarioData - The scenario data object
 * @param fallback - Fallback values for missing scenarios
 * @returns Normalized scenario data with all scenarios populated
 */
export function normalizeScenarioData(
	scenarioData: Record<string, any> | null | undefined,
	fallback: {
		irr?: number;
		equityMultiple?: number;
		loanAmount?: number;
		ltv?: number;
	}
) {
	const base = scenarioData?.base || {};
	const downside = scenarioData?.downside || {};
	const upside = scenarioData?.upside || {};
	
	return {
		downside: {
			irr: downside.irr ?? base.irr ?? fallback.irr ?? 0,
			equityMultiple:
				downside.equityMultiple ??
				base.equityMultiple ??
				fallback.equityMultiple ??
				0,
			loanAmount:
				downside.loanAmount ?? base.loanAmount ?? fallback.loanAmount ?? 0,
			ltv: downside.ltv ?? base.ltv ?? fallback.ltv ?? 0,
		},
		base: {
			irr: base.irr ?? fallback.irr ?? 0,
			equityMultiple: base.equityMultiple ?? fallback.equityMultiple ?? 0,
			loanAmount: base.loanAmount ?? fallback.loanAmount ?? 0,
			ltv: base.ltv ?? fallback.ltv ?? 0,
		},
		upside: {
			irr: upside.irr ?? base.irr ?? fallback.irr ?? 0,
			equityMultiple:
				upside.equityMultiple ??
				base.equityMultiple ??
				fallback.equityMultiple ??
				0,
			loanAmount:
				upside.loanAmount ?? base.loanAmount ?? fallback.loanAmount ?? 0,
			ltv: upside.ltv ?? base.ltv ?? fallback.ltv ?? 0,
		},
	} as const;
}

/**
 * Safely formats a number with a fixed number of decimal places.
 * 
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string or null if value is invalid
 */
export function formatFixed(
	value: number | null | undefined,
	decimals: number = 2
): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value !== "number" || isNaN(value)) return null;
	return value.toFixed(decimals);
}

/**
 * Safely formats a number with locale-specific formatting.
 * 
 * @param value - The value to format
 * @returns Formatted string or null if value is invalid
 */
export function formatLocale(value: number | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value !== "number" || isNaN(value)) return null;
	return value.toLocaleString();
}

/**
 * Formats a number as currency.
 * 
 * @param amount - The amount to format
 * @param options - Currency formatting options
 * @returns Formatted currency string or null if value is invalid
 */
export function formatCurrency(
	amount?: number | null,
	options?: {
		style?: "currency";
		currency?: string;
		minimumFractionDigits?: number;
		maximumFractionDigits?: number;
	}
): string | null {
	if (amount == null) return null;
	if (typeof amount !== "number" || isNaN(amount)) return null;
	
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
		...options,
	}).format(amount);
}

/**
 * Formats a percentage from amount and total.
 * 
 * @param amount - The amount to calculate percentage from
 * @param total - The total to calculate percentage of
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string or null if values are invalid
 */
export function formatPercentage(
	amount?: number | null,
	total?: number | null,
	decimals: number = 1
): string | null {
	if (amount == null || total == null || total === 0) return null;
	if (typeof amount !== "number" || typeof total !== "number" || isNaN(amount) || isNaN(total)) return null;
	return ((amount / total) * 100).toFixed(decimals);
}

