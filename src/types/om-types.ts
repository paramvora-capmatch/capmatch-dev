// src/types/om-types.ts
import { z } from 'zod';

export interface OMScenarioData {
    loanAmount: number;
    ltv: number;
    ltc: number;
    dscr: number;
    debtYield: number;
    irr: number;
    equityMultiple: number;
    rentGrowth: number;
    exitCap: number;
    constructionCost: number;
    vacancy: number;
    noi: number;
}

export interface TimelineItem {
    phase: string;
    date: string;
    status: 'completed' | 'current' | 'upcoming';
}

export interface UnitMix {
    type: string;
    units: number;
    avgSF: number;
    avgRent: number;
}

export interface MarketComp {
    name: string;
    yearBuilt: number;
    units: number;
    rentPSF: number;
    capRate: number;
}

export const OmQaSchema = z.object({
  answer_markdown: z.string().describe('The markdown-formatted answer to the user question.'),
  assumptions: z
    .array(
      z.optional(z.object({
        text: z.string().describe('The text of the assumption made.'),
        source: z.enum(['om', 'industry', 'mixed']).describe('The source of the assumption.'),
        citation: z.string().optional().describe('The section of the OM document used for the assumption.'),
      }))
    )
    .describe('A list of assumptions made when answering the question.'),
});

// Added for Talk to OM structured responses
export type OmQaAssumptionSource = 'om' | 'industry' | 'mixed';

export interface OmQaAssumption {
  text: string;
  source: OmQaAssumptionSource;
  citation?: string; // single section string; optional if not applicable
}

export interface OmQaResponse {
  answer_markdown: string;
  assumptions: OmQaAssumption[];
}