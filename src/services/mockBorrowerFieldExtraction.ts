// src/services/mockBorrowerFieldExtraction.ts
/**
 * Mock API service for borrower field extraction
 * Returns field values in the same format as the backend extraction API
 */

import { ProjectFieldExtractionResponse } from './mockProjectFieldExtraction';

/**
 * Mock extraction API for borrower resumes
 * Returns borrower field values with realistic data
 */
export const extractBorrowerFields = async (
  projectId: string,
  documentPaths?: string[]
): Promise<ProjectFieldExtractionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return borrower field extraction results
  // Format matches backend: { fieldId: { value, source, warnings } }
  // Fields with "User Input" source are left empty (null/empty string) as they can't be filled by AI
  const rawFields: ProjectFieldExtractionResponse = {
    fullLegalName: {
      value: "Hoque Global LLC",
      source: "User Input",
      warnings: [],
    },
    primaryEntityName: {
      value: "Hoque Global",
      source: "User Input",
      warnings: [],
    },
    primaryEntityStructure: {
      value: "LLC",
      source: "Entity Docs",
      warnings: [],
    },
    contactEmail: {
      value: "info@hoqueglobal.com",
      source: "User Input",
      warnings: [],
    },
    contactPhone: {
      value: "(972) 455-1943",
      source: "User Input",
      warnings: [],
    },
    contactAddress: {
      value: "123 Main St, Dallas, TX 75201",
      source: "User Input",
      warnings: [],
    },
    yearsCREExperienceRange: {
      value: "16+",
      source: "Bio",
      warnings: [],
    },
    assetClassesExperience: {
      value: ["Multifamily", "Mixed-Use", "Office"],
      source: "Bio",
      warnings: [],
    },
    geographicMarketsExperience: {
      value: ["Southwest", "Southeast", "West Coast"],
      source: "Bio",
      warnings: [],
    },
    totalDealValueClosedRange: {
      value: "$100M-$250M",
      source: "Track Record",
      warnings: [],
    },
    creditScoreRange: {
      value: "750-799",
      source: "Financials",
      warnings: [],
    },
    netWorthRange: {
      value: "$25M-$50M",
      source: "Financials",
      warnings: [],
    },
    liquidityRange: {
      value: "$5M-$10M",
      source: "Financials",
      warnings: [],
    },
    bankruptcyHistory: {
      value: false,
      source: "User Input",
      warnings: [],
    },
    foreclosureHistory: {
      value: false,
      source: "User Input",
      warnings: [],
    },
    litigationHistory: {
      value: false,
      source: "User Input",
      warnings: [],
    },
    bioNarrative: {
      value: "Hoque Global is a leading real estate development company with over 16 years of experience in commercial real estate. We specialize in multifamily, mixed-use, and office developments across the Southwest, Southeast, and West Coast regions. Our portfolio includes over 1,250 multifamily units completed, with a total deal value of $100M-$250M. We have strong relationships with major lenders and a proven track record of successful project delivery.",
      source: "Bio",
      warnings: [],
    },
    linkedinUrl: {
      value: "https://www.linkedin.com/company/hoque-global",
      source: "User Input",
      warnings: [],
    },
    websiteUrl: {
      value: "https://www.hoqueglobal.com",
      source: "User Input",
      warnings: [],
    },
    existingLenderRelationships: {
      value: "Wells Fargo, JPMorgan Chase, Bank of America, KeyBank, First Republic Bank",
      source: "User Input",
      warnings: [],
    },
  };
  
  // Filter out fields with "User Input" source - set their values to null/empty
  const filteredFields: ProjectFieldExtractionResponse = {};
  for (const [key, fieldData] of Object.entries(rawFields)) {
    if (fieldData && typeof fieldData === "object" && "source" in fieldData) {
      const normalizedSource = fieldData.source?.toLowerCase() || "";
      if (normalizedSource === "user input" || normalizedSource === "user_input") {
        // Set value to null for User Input fields
        filteredFields[key] = {
          ...fieldData,
          value: null,
        };
      } else {
        filteredFields[key] = fieldData;
      }
    } else {
      filteredFields[key] = fieldData;
    }
  }
  
  return filteredFields;
};

