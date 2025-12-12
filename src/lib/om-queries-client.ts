"use client";

/**
 * List of all insight field keys
 */
const INSIGHT_FIELD_KEYS = [
	"supplyStrength1",
	"supplyStrength2",
	"supplyStrength3",
	"marketOpportunity1",
	"marketOpportunity2",
	"marketOpportunity3",
	"riskFactor1",
	"riskFactor2",
	"riskFactor3",
	"demographicStrength1",
	"demographicStrength2",
	"demographicStrength3",
	"demographicOpportunity1",
	"demographicOpportunity2",
	"demographicOpportunity3",
	"targetDemographic1",
	"targetDemographic2",
	"targetDemographic3",
	"employmentStrength1",
	"employmentStrength2",
	"employmentStrength3",
	"employmentOpportunity1",
	"employmentOpportunity2",
	"employmentOpportunity3",
	"targetMarket1",
	"targetMarket2",
	"targetMarket3",
	"returnDriver1",
	"returnDriver2",
	"returnDriver3",
	"returnRisk1",
	"returnRisk2",
	"returnRisk3",
	"returnMitigation1",
	"returnMitigation2",
	"returnMitigation3",
	"sponsorStrength1",
	"sponsorStrength2",
	"sponsorStrength3",
	"sponsorStrength4",
	"sponsorStrength5",
	"sponsorStrength6",
	"specialProgramsDescription",
	"riskMitigation1",
	"riskMitigation2",
	"riskMitigation3",
	"riskMonitoring1",
	"riskMonitoring2",
	"riskMonitoring3",
	"capitalRisk1",
	"capitalRisk2",
	"capitalRisk3",
	"capitalMitigant1",
	"capitalMitigant2",
	"capitalMitigant3",
];

/**
 * Extracts the actual value from field data (handles rich format).
 * Same logic as in om-queries.ts
 */
function extractValue(fieldData: any): any {
	if (fieldData && typeof fieldData === "object" && "value" in fieldData) {
		return fieldData.value;
	}
	return fieldData;
}

/**
 * Creates a tracked version of content/insights objects using Proxy
 * This logs ALL property accesses, not just through getOMValue
 * Intercepts direct property access like content?.loanAmountRequested
 */
export function createTrackedContent(
	content: Record<string, any> | null | undefined,
	logField: (data: {
		fieldId: string;
		status: "available" | "missing" | "fallback";
		page: string;
		subpage?: string;
		isInsight: boolean;
		fallbackValue?: string;
	}) => void,
	page: string,
	subpage?: string,
	isInsight: boolean = false
): Record<string, any> {
	// If content is null/undefined, return a Proxy that logs all accesses as missing
	if (!content || typeof content !== "object") {
		return new Proxy({} as Record<string, any>, {
			get(target, prop: string | symbol) {
				// Skip non-string properties (Symbols, internal properties)
				if (typeof prop !== "string") {
					return undefined;
				}

				// Skip internal/private properties
				if (
					prop.startsWith("_") ||
					prop === "constructor" ||
					prop === "toString" ||
					prop === "valueOf"
				) {
					return undefined;
				}

				// Log missing field access
				logField({
					fieldId: prop,
					status: "missing",
					page,
					subpage,
					isInsight,
				});

				return undefined;
			},
		});
	}

	// Wrap existing content with Proxy
	return new Proxy(content, {
		get(target, prop: string | symbol) {
			// Skip non-string properties (Symbols, internal properties)
			if (typeof prop !== "string") {
				return target[prop as keyof typeof target];
			}

			// Skip internal/private properties
			if (
				prop.startsWith("_") ||
				prop === "constructor" ||
				prop === "toString" ||
				prop === "valueOf"
			) {
				return target[prop as keyof typeof target];
			}

			// Get the raw value from target
			const rawValue = target[prop];

			// Extract actual value (handle rich format)
			const actualValue = extractValue(rawValue);

			// Check if value is missing (null, undefined, or empty string)
			if (
				actualValue === null ||
				actualValue === undefined ||
				actualValue === ""
			) {
				// Log missing field
				logField({
					fieldId: prop,
					status: "missing",
					page,
					subpage,
					isInsight,
				});
			}
			// Note: We don't log 'available' fields here because the logger filters them out anyway
			// This keeps the logging focused on missing/fallback fields only

			// Return the original value (preserve rich format if present)
			return rawValue;
		},
	});
}
