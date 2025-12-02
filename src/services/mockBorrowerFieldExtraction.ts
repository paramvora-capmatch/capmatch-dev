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
 * Helper to create a standard field payload.
 */
const createField = (
  value: any,
  source: SourceMetadata,
  warnings: string[] = []
): {
  value: any;
  sources: SourceMetadata[];
  warnings: string[];
  original_value: any;
} => ({
  value,
  sources: [source],
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
 * - section_5: principals (principalLegalName, principalRoleDefault, etc.)
 */
export const extractBorrowerFields = async (
  projectId: string,
  documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return borrower field extraction results in section-wise format
  // Format: { section_1: { fieldId: { value, sources, warnings, original_value } } }
  // Fields with "User Input" source are left empty (null/empty string) as they can't be filled by AI
  const sectionWiseFields: SectionWiseExtractionResponse = {
    section_1: {
      fullLegalName: createField(null, { type: "user_input" }),
      primaryEntityName: createField(null, { type: "user_input" }),
      primaryEntityStructure: createField("LLC", {
        type: "document",
        name: "Entity Docs",
      }),
      contactEmail: createField(null, { type: "user_input" }),
      contactPhone: createField(null, { type: "user_input" }),
      contactAddress: createField(null, { type: "user_input" }),
    },
    section_2: {
      yearsCREExperienceRange: createField("16+", {
        type: "document",
        name: "Bio",
      }),
      assetClassesExperience: createField(
        ["Multifamily", "Mixed-Use", "Office"],
        { type: "document", name: "Bio" }
      ),
      geographicMarketsExperience: createField(
        ["Southwest", "Southeast", "West Coast"],
        { type: "document", name: "Bio" }
      ),
      totalDealValueClosedRange: createField("$100M-$250M", {
        type: "document",
        name: "Track Record",
      }),
      existingLenderRelationships: createField(null, { type: "user_input" }),
      bioNarrative: createField(
        "Hoque Global is a leading real estate development company with over 16 years of experience in commercial real estate. We specialize in multifamily, mixed-use, and office developments across the Southwest, Southeast, and West Coast regions. Our portfolio includes over 1,250 multifamily units completed, with a total deal value of $100M-$250M. We have strong relationships with major lenders and a proven track record of successful project delivery.",
        { type: "document", name: "Bio" }
      ),
    },
    section_3: {
      creditScoreRange: createField("750-799", {
        type: "document",
        name: "Financials",
      }),
      netWorthRange: createField("$25M-$50M", {
        type: "document",
        name: "Financials",
      }),
      liquidityRange: createField("$5M-$10M", {
        type: "document",
        name: "Financials",
      }),
      bankruptcyHistory: createField(null, { type: "user_input" }),
      foreclosureHistory: createField(null, { type: "user_input" }),
      litigationHistory: createField(null, { type: "user_input" }),
    },
    section_4: {
      linkedinUrl: createField(null, { type: "user_input" }),
      websiteUrl: createField(null, { type: "user_input" }),
    },
    section_5: {
      principalLegalName: createField(null, { type: "user_input" }),
      principalRoleDefault: createField(null, { type: "user_input" }),
      principalEmail: createField(null, { type: "user_input" }),
      ownershipPercentage: createField(null, { type: "user_input" }),
      principalBio: createField(null, { type: "user_input" }),
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
          sectionWiseFields[sectionKey][fieldId] = createField(null, {
            type: "user_input",
          });
        }
      }
    }
  }

  return sectionWiseFields;
};


