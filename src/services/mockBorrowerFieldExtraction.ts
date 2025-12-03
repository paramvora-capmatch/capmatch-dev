// src/services/mockBorrowerFieldExtraction.ts
/**
 * Mock API service for borrower field extraction
 * Returns field values in section-wise format matching backend API
 */

import { SourceMetadata } from "@/types/source-metadata";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";

/**
 * Section-wise field extraction response structure
 * Each section contains fields with their extraction data
 */
export interface SectionWiseExtractionResponse {
	[sectionId: string]: {
		[fieldId: string]: {
			value: any;
			sources: SourceMetadata[];
			warnings: string[];
			original_value?: any;
		};
	};
}

/**
 * Helper function to convert source string to SourceMetadata
 */
function createSourceMetadata(source: string): SourceMetadata {
	const normalized = source.toLowerCase();

	if (normalized === "user input" || normalized === "user_input") {
		return { type: "user_input" };
	}

	return {
		type: "document",
		name: source,
	};
}

/**
 * Helper to create a standard field payload.
 */
const createField = (
	value: any,
	source: string,
	warnings: string[] = []
): {
	value: any;
	sources: SourceMetadata[];
	warnings: string[];
	original_value: any;
} => ({
	value,
	sources: [createSourceMetadata(source)],
	warnings,
	original_value: value,
});

/**
 * Mock extraction API for borrower resumes
 * Returns borrower field values with realistic data in section-wise format
 * Uses structured SourceMetadata format
 *
 * Section mapping:
 * - section_1: basic-info (fullLegalName, primaryEntityName, etc.)
 * - section_2: experience (yearsCREExperienceRange, assetClassesExperience, etc.)
 * - section_3: borrower-financials (creditScoreRange, netWorthRange, etc.)
 * - section_4: online-presence (linkedinUrl, websiteUrl)
 * - section_5: principals (principals array)
 */
export const extractBorrowerFields = async (
	projectId: string,
	documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Return borrower field extraction results in section-wise format
	const sectionWiseFields: SectionWiseExtractionResponse = {
		section_1: {
			fullLegalName: createField(
				"Hoque Global, LLC",
				"Entity Formation Docs"
			),
			primaryEntityName: createField("Hoque Global", "Marketing Deck"),
			primaryEntityStructure: createField("LLC", "Operating Agreement"),
			contactEmail: createField("info@hoqueglobal.com", "Contact Card"),
			contactPhone: createField("(214) 555-0123", "Contact Card"),
			contactAddress: createField(
				"123 Main St, Dallas, TX 75201",
				"Tax Return"
			),
		},
		section_2: {
			yearsCREExperienceRange: createField("16+", "Sponsor Bio"),
			assetClassesExperience: createField(
				["Multifamily", "Mixed-Use", "Office", "Retail"],
				"Track Record"
			),
			geographicMarketsExperience: createField(
				["Southwest", "Southeast"],
				"Track Record"
			),
			totalDealValueClosedRange: createField(
				"$250M-$500M",
				"Track Record"
			),
			existingLenderRelationships: createField(
				"Frost Bank, Happy State Bank, Veritex",
				"REO Schedule"
			),
			bioNarrative: createField(
				"Hoque Global is a leading real estate development company with over 16 years of experience in commercial real estate. We specialize in multifamily, mixed-use, and office developments across the Southwest region. Our portfolio includes over 1,250 multifamily units completed.",
				"Marketing Deck"
			),
		},
		section_3: {
			creditScoreRange: createField("750-799", "Credit Report"),
			netWorthRange: createField("$50M-$100M", "PFS"),
			liquidityRange: createField("$5M-$10M", "Bank Statements"),
			bankruptcyHistory: createField(false, "Background Check"),
			foreclosureHistory: createField(false, "Background Check"),
			litigationHistory: createField(false, "Background Check"),
		},
		section_4: {
			linkedinUrl: createField(
				"https://linkedin.com/company/hoque-global",
				"User Input"
			),
			websiteUrl: createField("https://hoqueglobal.com", "User Input"),
		},
		section_5: {
			// Principals are handled as a table array in the new structure
			principals: createField(
				[
					{
						principalLegalName: "Mike Hoque",
						principalRoleDefault: "Managing Member",
						principalEmail: "mike@hoqueglobal.com",
						ownershipPercentage: 100,
						principalBio:
							"Founder and CEO with 20+ years of experience in hospitality and real estate.",
						creditScoreRange: "750-799",
						netWorthRange: "$25M-$50M",
						liquidityRange: "$1M-$5M",
					},
					{
						principalLegalName: "Joel Heikenfeld",
						principalRoleDefault: "Key Principal",
						principalEmail: "joel@hoqueglobal.com",
						ownershipPercentage: 0,
						principalBio:
							"Managing Director with extensive experience in capital markets and development.",
						creditScoreRange: "750-799",
						netWorthRange: "$5M-$10M",
						liquidityRange: "$500k-$1M",
					},
				],
				"Org Chart"
			),
		},
	};

	// Schema alignment: ensure every field defined in the borrower resume schema
	// has a corresponding entry in the mock extraction response.
	const STEP_ID_TO_SECTION_KEY: Record<string, string> = {
		"basic-info": "section_1",
		experience: "section_2",
		"borrower-financials": "section_3",
		"online-presence": "section_4",
		principals: "section_5",
	};

	const schemaAny = borrowerFormSchema as any;
	if (Array.isArray(schemaAny.steps)) {
		for (const step of schemaAny.steps) {
			const stepId = step?.id as string | undefined;
			const sectionKey =
				(stepId && STEP_ID_TO_SECTION_KEY[stepId]) || undefined;
			if (!sectionKey) continue;

			if (!sectionWiseFields[sectionKey]) {
				sectionWiseFields[sectionKey] = {};
			}

			const stepFields: string[] = Array.isArray(step.fields)
				? step.fields
				: [];

			for (const fieldId of stepFields) {
				if (!fieldId || typeof fieldId !== "string") continue;
				const existingField = sectionWiseFields[sectionKey]?.[fieldId];

				if (
					!existingField ||
					(typeof existingField === "object" &&
						"value" in existingField &&
						(existingField.value === null ||
							existingField.value === undefined))
				) {
					// Default to User Input if not found in mock data
					sectionWiseFields[sectionKey][fieldId] = createField(
						null,
						"User Input"
					);
				}
			}
		}
	}

	return sectionWiseFields;
};
