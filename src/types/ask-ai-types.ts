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

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  fieldContext?: FieldContext | null;
  isStreaming?: boolean;
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

export interface AIContextResponse {
  answer: string;
}

export interface FormContextType {
  formData: Record<string, unknown>;
  fieldChanged: (fieldId: string, value: unknown) => void;
  subscribeToChanges: (callback: (fieldId: string, value: unknown) => void) => () => void;
  getFieldContext: (fieldId: string) => FieldContext | null;
} 