// src/services/aiContextBuilder.ts
import { FieldContext, ProjectContext, PresetQuestion, BorrowerContext } from '../types/ask-ai-types';

export class AIContextBuilder {
    static async buildFieldContext(fieldId: string, formData: Record<string, unknown>): Promise<FieldContext> {
    // Try to find the field element with retry mechanism
    let fieldElement = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!fieldElement && attempts < maxAttempts) {
      // Try different selectors to find the field
      fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`) ||
                    document.querySelector(`#${fieldId}`) ||
                    document.querySelector(`[id="${fieldId}"]`);

      if (!fieldElement) {
        attempts++;
        // Wait a bit before retrying
        if (attempts < maxAttempts) {
          // Use a small delay to allow DOM to update
          const delay = new Promise(resolve => setTimeout(resolve, 100));
          await delay;
        }
      }
    }

    if (!fieldElement) {
      // Debug: List all available fields
      const allFields = document.querySelectorAll('[data-field-id]');
      const fieldIds = Array.from(allFields).map(el => el.getAttribute('data-field-id'));
      
      // Also check for fields by ID
      throw new Error(`Field with ID "${fieldId}" not found after ${maxAttempts} attempts. Make sure the field has data-field-id="${fieldId}" attribute. Available fields: ${fieldIds.join(', ')}`);
    }

    return {
      id: fieldId,
      type: (fieldElement.getAttribute('data-field-type') as FieldContext['type']) || 'input',
      section: (fieldElement.getAttribute('data-field-section') as FieldContext['section']) || 'basic-info',
      required: fieldElement.getAttribute('data-field-required') === 'true',
      label: fieldElement.getAttribute('data-field-label') || '',
      placeholder: fieldElement.getAttribute('data-field-placeholder') || undefined,
      currentValue: formData[fieldId as keyof typeof formData],
      options: fieldElement.getAttribute('data-field-options') 
        ? JSON.parse(fieldElement.getAttribute('data-field-options') || '[]')
        : undefined,
      validationState: {
        isValid: true,
        errors: [],
        warnings: [],
        isComplete: false,
        suggestions: []
      }
    };
  }

  static buildProjectContext(formData: Record<string, unknown>): ProjectContext {
    return {
      projectName: (formData.projectName as string) || 'Unnamed Project',
      assetType: (formData.assetType as string) || 'Not specified',
      projectPhase: (formData.projectPhase as string) || 'Not specified',
      loanAmountRequested: (formData.loanAmountRequested as number) || 0,
      targetLtvPercent: (formData.targetLtvPercent as number) || 0,
      targetLtcPercent: (formData.targetLtcPercent as number) || 0,
      purchasePrice: (formData.purchasePrice as number) || null,
      totalProjectCost: (formData.totalProjectCost as number) || null,
      propertyAddressCity: (formData.propertyAddressCity as string) || 'Not specified',
      propertyAddressState: (formData.propertyAddressState as string) || 'Not specified'
    };
  }

  static generatePresetQuestions(fieldContext: FieldContext): PresetQuestion[] {
    const questions: PresetQuestion[] = [];

    // Field-specific questions
    switch (fieldContext.id) {
      case 'projectName':
        questions.push(
          { id: 'pn1', text: 'How should I name my project for maximum clarity?', category: 'field-specific', priority: 'high' },
          { id: 'pn2', text: 'What naming conventions do lenders prefer?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'assetType':
        questions.push(
          { id: 'at1', text: `What is ${fieldContext.currentValue || 'this asset type'} and what are the key considerations?`, category: 'field-specific', priority: 'high' },
          { id: 'at2', text: 'How does asset type affect my loan terms?', category: 'field-specific', priority: 'high' }
        );
        break;
      
      case 'projectPhase':
        questions.push(
          { id: 'pp1', text: `What does ${fieldContext.currentValue || 'this project phase'} mean and how does it affect my loan?`, category: 'field-specific', priority: 'high' },
          { id: 'pp2', text: 'What documents are typically required for this phase?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'loanAmountRequested':
        questions.push(
          { id: 'lar1', text: 'How do I determine the right loan amount for my project?', category: 'field-specific', priority: 'high' },
          { id: 'lar2', text: 'What factors affect my maximum loan amount?', category: 'field-specific', priority: 'high' }
        );
        break;
      
      case 'targetLtvPercent':
        questions.push(
          { id: 'ltv1', text: 'How do I calculate the right LTV percentage for my project?', category: 'field-specific', priority: 'high' },
          { id: 'ltv2', text: 'What LTV ranges are typical for my asset type?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'interestRateType':
        questions.push(
          { id: 'irt1', text: "What's the difference between Fixed and Floating rates?", category: 'field-specific', priority: 'high' },
          { id: 'irt2', text: 'Which rate type is better for my project timeline?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'recoursePreference':
        questions.push(
          { id: 'rp1', text: `What is ${fieldContext.currentValue || 'this recourse type'} and how does it affect my loan?`, category: 'field-specific', priority: 'high' },
          { id: 'rp2', text: 'How does recourse affect my personal liability?', category: 'field-specific', priority: 'high' }
        );
        break;
      
      case 'exitStrategy':
        questions.push(
          { id: 'es1', text: 'How do I choose the right exit strategy for my project?', category: 'field-specific', priority: 'high' },
          { id: 'es2', text: 'What timeline should I plan for my exit?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'capexBudget':
        questions.push(
          { id: 'cb1', text: 'What should I include in my CapEx budget?', category: 'field-specific', priority: 'high' },
          { id: 'cb2', text: 'How do I estimate CapEx costs accurately?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      case 'stabilizedNoiProjected':
        questions.push(
          { id: 'snp1', text: 'How do I estimate my future NOI?', category: 'field-specific', priority: 'high' },
          { id: 'snp2', text: 'What assumptions should I use for NOI projections?', category: 'field-specific', priority: 'medium' }
        );
        break;
      
      // Borrower resume fields
      case 'primaryEntityStructure':
        questions.push(
          { id: 'bes1', text: 'Which entity structure do lenders generally prefer for my situation?', category: 'field-specific', priority: 'high' },
          { id: 'bes2', text: 'How does entity structure impact recourse, tax, and underwriting?', category: 'field-specific', priority: 'high' }
        );
        break;
      case 'creditScoreRange':
        questions.push(
          { id: 'bcs1', text: 'How does my credit score range affect lender eligibility and pricing?', category: 'field-specific', priority: 'high' },
          { id: 'bcs2', text: 'What minimum credit scores do common lender types require?', category: 'field-specific', priority: 'medium' }
        );
        break;
      case 'yearsCREExperienceRange':
        questions.push(
          { id: 'bexp1', text: 'How does my CRE experience level impact lender appetite and terms?', category: 'field-specific', priority: 'high' },
          { id: 'bexp2', text: 'What mitigants can offset limited experience?', category: 'field-specific', priority: 'medium' }
        );
        break;
      case 'netWorthRange':
        questions.push(
          { id: 'bnw1', text: 'Is my net worth range sufficient for typical guarantor requirements?', category: 'field-specific', priority: 'high' },
          { id: 'bnw2', text: 'How does net worth influence recourse and proceeds?', category: 'field-specific', priority: 'medium' }
        );
        break;
      case 'liquidityRange':
        questions.push(
          { id: 'bliq1', text: 'Is my liquidity adequate for closing and post-close reserves?', category: 'field-specific', priority: 'high' },
          { id: 'bliq2', text: 'How much liquidity do lenders typically expect by deal type?', category: 'field-specific', priority: 'medium' }
        );
        break;
      case 'existingLenderRelationships':
        questions.push(
          { id: 'bel1', text: 'How do existing lender relationships influence approval speed and pricing?', category: 'field-specific', priority: 'medium' },
          { id: 'bel2', text: 'Should I list all lenders or only recent/relevant ones?', category: 'field-specific', priority: 'low' }
        );
        break;
      case 'bioNarrative':
        questions.push(
          { id: 'bbio1', text: 'What should I emphasize in my bio to strengthen credibility?', category: 'field-specific', priority: 'medium' },
          { id: 'bbio2', text: 'Any red flags I should avoid mentioning or reframe?', category: 'field-specific', priority: 'low' }
        );
        break;
      case 'contactPhone':
      case 'contactAddress':
      case 'primaryEntityName':
      case 'linkedinUrl':
      case 'websiteUrl':
        questions.push(
          { id: 'bmeta1', text: 'Any formatting or completeness guidelines lenders expect for this field?', category: 'general', priority: 'low' }
        );
        break;
      case 'bankruptcyHistory':
      case 'foreclosureHistory':
      case 'litigationHistory':
        questions.push(
          { id: 'bhist1', text: 'How should I disclose and contextualize this history to minimize impact?', category: 'field-specific', priority: 'high' },
          { id: 'bhist2', text: 'What documentation will lenders expect for this item?', category: 'field-specific', priority: 'medium' }
        );
        break;
      default:
        // General questions for any field
        questions.push(
          { id: 'g1', text: 'What information should I provide for this field?', category: 'general', priority: 'medium' },
          { id: 'g2', text: 'How does this field affect my loan application?', category: 'general', priority: 'medium' }
        );
    }

    // Add validation questions if field has issues
    if (fieldContext.validationState.errors.length > 0) {
      questions.push(
        { id: 'v1', text: 'How do I fix the validation errors for this field?', category: 'validation', priority: 'high' }
      );
    }

    // Add best practices questions
    questions.push(
      { id: 'bp1', text: 'What are the best practices for completing this field?', category: 'best-practices', priority: 'medium' },
      { id: 'bp2', text: 'What common mistakes should I avoid?', category: 'best-practices', priority: 'medium' }
    );

    return questions.slice(0, 6); // Limit to 6 questions
  }

  // Build a borrower-level context from borrower resume form data
  static buildBorrowerContext(formData: Record<string, unknown>): BorrowerContext {
    return {
      fullLegalName: (formData.fullLegalName as string) || undefined,
      primaryEntityName: (formData.primaryEntityName as string) || undefined,
      primaryEntityStructure: (formData.primaryEntityStructure as string) || undefined,
      contactEmail: (formData.contactEmail as string) || undefined,
      contactPhone: (formData.contactPhone as string) || undefined,
      contactAddress: (formData.contactAddress as string) || undefined,
      bioNarrative: (formData.bioNarrative as string) || undefined,
      linkedinUrl: (formData.linkedinUrl as string) || undefined,
      websiteUrl: (formData.websiteUrl as string) || undefined,
      yearsCREExperienceRange: (formData.yearsCREExperienceRange as string) || undefined,
      assetClassesExperience: (formData.assetClassesExperience as string[]) || undefined,
      geographicMarketsExperience: (formData.geographicMarketsExperience as string[]) || undefined,
      totalDealValueClosedRange: (formData.totalDealValueClosedRange as string) || undefined,
      existingLenderRelationships: (formData.existingLenderRelationships as string) || undefined,
      creditScoreRange: (formData.creditScoreRange as string) || undefined,
      netWorthRange: (formData.netWorthRange as string) || undefined,
      liquidityRange: (formData.liquidityRange as string) || undefined,
      bankruptcyHistory: (formData.bankruptcyHistory as boolean) ?? undefined,
      foreclosureHistory: (formData.foreclosureHistory as boolean) ?? undefined,
      litigationHistory: (formData.litigationHistory as boolean) ?? undefined,
    };
  }

  static getSystemPrompt(fieldContext: FieldContext, projectContext: ProjectContext): string {
    return `You are a commercial real estate form completion expert assistant.

CURRENT CONTEXT:
- Field: ${fieldContext.label} (${fieldContext.type})
- Section: ${fieldContext.section}
- Project: ${projectContext.projectName}
- Asset Type: ${projectContext.assetType}
- Project Phase: ${projectContext.projectPhase}
- Current Value: ${fieldContext.currentValue || 'Not filled'}

INSTRUCTIONS:
1. Answer questions specifically about this field and its context
2. Reference the current project details when relevant
3. Provide actionable advice for completing this field
4. Suggest related fields that might need attention
5. Explain industry standards and best practices
6. Always consider the user's specific project type and phase

RESPONSE FORMAT:
- Clear, concise explanations
- Bullet points for actionable items
- Specific examples relevant to their project
- References to related form sections
- Industry benchmarks when applicable

Remember: You're helping someone complete a real commercial real estate project form. Be specific and practical.`;
  }
} 