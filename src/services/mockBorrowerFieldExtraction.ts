// src/services/mockBorrowerFieldExtraction.ts
/**
 * Mock API service for borrower field extraction
 * Returns field values in section-wise format matching backend API
 */

import { SourceMetadata } from '@/types/source-metadata';

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
      fullLegalName: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      primaryEntityName: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      primaryEntityStructure: {
        value: "LLC",
        sources: [{ type: "document", name: "Entity Docs" } as SourceMetadata],
        warnings: [],
        original_value: "LLC",
      },
      contactEmail: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      contactPhone: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      contactAddress: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
    },
    section_2: {
      yearsCREExperienceRange: {
        value: "16+",
        sources: [{ type: "document", name: "Bio" } as SourceMetadata],
        warnings: [],
        original_value: "16+",
      },
      assetClassesExperience: {
        value: ["Multifamily", "Mixed-Use", "Office"],
        sources: [{ type: "document", name: "Bio" } as SourceMetadata],
        warnings: [],
        original_value: ["Multifamily", "Mixed-Use", "Office"],
      },
      geographicMarketsExperience: {
        value: ["Southwest", "Southeast", "West Coast"],
        sources: [{ type: "document", name: "Bio" } as SourceMetadata],
        warnings: [],
        original_value: ["Southwest", "Southeast", "West Coast"],
      },
      totalDealValueClosedRange: {
        value: "$100M-$250M",
        sources: [{ type: "document", name: "Track Record" } as SourceMetadata],
        warnings: [],
        original_value: "$100M-$250M",
      },
      existingLenderRelationships: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      bioNarrative: {
        value: "Hoque Global is a leading real estate development company with over 16 years of experience in commercial real estate. We specialize in multifamily, mixed-use, and office developments across the Southwest, Southeast, and West Coast regions. Our portfolio includes over 1,250 multifamily units completed, with a total deal value of $100M-$250M. We have strong relationships with major lenders and a proven track record of successful project delivery.",
        sources: [{ type: "document", name: "Bio" } as SourceMetadata],
        warnings: [],
        original_value: "Hoque Global is a leading real estate development company with over 16 years of experience in commercial real estate. We specialize in multifamily, mixed-use, and office developments across the Southwest, Southeast, and West Coast regions. Our portfolio includes over 1,250 multifamily units completed, with a total deal value of $100M-$250M. We have strong relationships with major lenders and a proven track record of successful project delivery.",
      },
    },
    section_3: {
      creditScoreRange: {
        value: "750-799",
        sources: [{ type: "document", name: "Financials" } as SourceMetadata],
        warnings: [],
        original_value: "750-799",
      },
      netWorthRange: {
        value: "$25M-$50M",
        sources: [{ type: "document", name: "Financials" } as SourceMetadata],
        warnings: [],
        original_value: "$25M-$50M",
      },
      liquidityRange: {
        value: "$5M-$10M",
        sources: [{ type: "document", name: "Financials" } as SourceMetadata],
        warnings: [],
        original_value: "$5M-$10M",
      },
      bankruptcyHistory: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      foreclosureHistory: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      litigationHistory: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
    },
    section_4: {
      linkedinUrl: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      websiteUrl: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
    },
    section_5: {
      principalLegalName: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      principalRoleDefault: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      principalEmail: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      ownershipPercentage: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
      principalBio: {
        value: null,
        sources: [{ type: "user_input" } as SourceMetadata],
        warnings: [],
        original_value: null,
      },
    },
  };
  
  return sectionWiseFields;
};

