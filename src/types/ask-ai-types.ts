// src/types/ask-ai-types.ts

export interface FieldContext {
  id: string;
  type: 'input' | 'button-select' | 'select' | 'textarea' | 'date' | 'number';
  section: 'basic-info' | 'loan-info' | 'financials' | 'documents';
  required: boolean;
  label: string;
  placeholder?: string;
  currentValue: unknown;
  options?: string[];
  validationState: FieldValidationState;
}

export interface FieldValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isComplete: boolean;
  suggestions: string[];
}

export interface ProjectContext {
  projectName: string;
  assetType: string;
  projectPhase: string;
  loanAmountRequested: number;
  targetLtvPercent: number;
  targetLtcPercent: number;
  purchasePrice: number | null;
  totalProjectCost: number | null;
  propertyAddressCity: string;
  propertyAddressState: string;
}

// Borrower-specific context used for borrower resume AskAI
export interface BorrowerContext {
  fullLegalName?: string;
  primaryEntityName?: string;
  primaryEntityStructure?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  bioNarrative?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  yearsCREExperienceRange?: string;
  assetClassesExperience?: string[];
  geographicMarketsExperience?: string[];
  totalDealValueClosedRange?: string;
  existingLenderRelationships?: string;
  creditScoreRange?: string;
  netWorthRange?: string;
  liquidityRange?: string;
  bankruptcyHistory?: boolean;
  foreclosureHistory?: boolean;
  litigationHistory?: boolean;
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  fieldContext?: FieldContext | null;
  isStreaming?: boolean;
  reply_to?: string | null; // ID of the message this is replying to
  repliedMessage?: Message | null; // The message being replied to (populated on load)
}

export interface PresetQuestion {
  id: string;
  text: string;
  category: 'field-specific' | 'general' | 'validation' | 'best-practices';
  priority: 'high' | 'medium' | 'low';
}

export interface AIContextRequest {
  fieldContext: FieldContext;
  projectContext: ProjectContext;
  question?: string;
  chatHistory?: Message[];
}

// Separate request type for borrower QA endpoint to avoid breaking project QA
export interface BorrowerAIContextRequest {
  fieldContext: FieldContext;
  borrowerContext: BorrowerContext;
  // Optional: include the full form data for richer context
  fullFormData?: Record<string, unknown>;
  question?: string;
  chatHistory?: Message[];
}

export interface AIContextResponse {
  answer: string;
}

export interface FormContextType {
  formData: Record<string, unknown>;
  fieldChanged: (fieldId: string, value: unknown) => void;
  subscribeToChanges: (callback: (fieldId: string, value: unknown) => void) => () => void;
  getFieldContext: (fieldId: string) => FieldContext | null;
} 