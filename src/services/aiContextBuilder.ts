// src/services/aiContextBuilder.ts
import { FieldContext, ProjectContext, PresetQuestion } from '../types/ask-ai-types';

export class AIContextBuilder {
    static async buildFieldContext(fieldId: string, formData: any): Promise<FieldContext> {
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
      const allFieldsById = document.querySelectorAll('[id]');
      const fieldIdsById = Array.from(allFieldsById).map(el => el.getAttribute('id'));
      
      throw new Error(`Field with ID "${fieldId}" not found after ${maxAttempts} attempts. Make sure the field has data-field-id="${fieldId}" attribute. Available fields: ${fieldIds.join(', ')}`);
    }

    return {
      id: fieldId,
      type: (fieldElement.getAttribute('data-field-type') as any) || 'input',
      section: (fieldElement.getAttribute('data-field-section') as any) || 'basic-info',
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

  static buildProjectContext(formData: any): ProjectContext {
    return {
      projectName: formData.projectName || 'Unnamed Project',
      assetType: formData.assetType || 'Not specified',
      projectPhase: formData.projectPhase || 'Not specified',
      loanAmountRequested: formData.loanAmountRequested || 0,
      targetLtvPercent: formData.targetLtvPercent || 0,
      targetLtcPercent: formData.targetLtcPercent || 0,
      purchasePrice: formData.purchasePrice || null,
      totalProjectCost: formData.totalProjectCost || null,
      propertyAddressCity: formData.propertyAddressCity || 'Not specified',
      propertyAddressState: formData.propertyAddressState || 'Not specified'
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