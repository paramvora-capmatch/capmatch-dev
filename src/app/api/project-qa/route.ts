// src/app/api/project-qa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AIContextRequest } from '@/types/ask-ai-types';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL_NAME = 'gemini-2.5-flash';

// Schema for AI response with markdown support
const ProjectQASchema = z.object({
  answer_markdown: z.string().describe('A comprehensive, helpful answer to the user\'s question about the form field, formatted in markdown')
});

export async function POST(req: NextRequest) {
  try {
    const { fieldContext, projectContext, question, chatHistory }: AIContextRequest = await req.json();
    
    if (!fieldContext || !projectContext) {
      return NextResponse.json({ error: 'Missing required context' }, { status: 400 });
    }

    // Build system prompt
    const systemPrompt = `You are a commercial real estate form completion expert assistant with 20+ years of experience.

CURRENT CONTEXT:
- Field: ${fieldContext.label} (${fieldContext.type})
- Section: ${fieldContext.section}
- Project: ${projectContext.projectName}
- Asset Type: ${projectContext.assetType}
- Project Phase: ${projectContext.projectPhase}
- Current Value: ${fieldContext.currentValue || 'Not filled'}
- Available Options: ${fieldContext.options && fieldContext.options.length > 0 ? fieldContext.options.join(', ') : 'No predefined options'}
- Loan Amount: $${projectContext.loanAmountRequested?.toLocaleString() || 'Not specified'}
- Target LTV: ${projectContext.targetLtvPercent || 'Not specified'}%
- Location: ${projectContext.propertyAddressCity}, ${projectContext.propertyAddressState}

RESPONSE PRIORITY:
1. **ANSWER THE USER'S IMMEDIATE QUESTION FIRST** - Provide a direct, concise answer
2. **Then briefly explain** why your recommendation makes sense
3. **Keep it short** - avoid unnecessary verbosity

INSTRUCTIONS:
1. Start with a direct, concise answer (1-2 sentences max)
2. If field has predefined options, recommend from those options when appropriate
3. Provide brief reasoning (1-2 sentences)
4. Reference project details only when essential
5. Be specific and actionable
6. Keep total response under 150 words

RESPONSE FORMAT:
- **Start with a direct answer** to their immediate question
- **CRITICAL: The first answer MUST remain in bold formatting throughout the response**
- Use markdown formatting for structure (headers, lists, emphasis)
- **CRITICAL: You MUST add proper spacing and line breaks - NO WALLS OF TEXT**
- **BE CONCISE: Keep answers focused and to-the-point**
- **MANDATORY SPACING: Use double line breaks (\\n\\n) between major sections**
- **MANDATORY SPACING: Use single line breaks (\\n) between related points**
- **MANDATORY SPACING: Add spacing before and after lists (\\n before, \\n after)**
- Use bullet points for actionable items with proper spacing
- When referencing other fields from the project resume (e.g., Asset Type, Target LTV, Loan Amount), **bold the field names** to highlight context awareness
- Specific examples relevant to their project
- References to related form sections
- Industry benchmarks when applicable
- Use **bold** for important points and *italic* for emphasis
- Structure your response with clear visual hierarchy

SPACING GUIDELINES (MANDATORY):
- **ALWAYS start with your direct answer (1-2 sentences) in bold formatting**
- **ALWAYS keep the first answer in bold throughout the entire response**
- **ALWAYS use the format \`**Heading:** Text...\` for each new topic.**
- **ALWAYS use ## for section headers with spacing above and below**
- **ALWAYS separate different topics with double line breaks (\\n\\n)**
- **ALWAYS add spacing around lists and examples**
- **ALWAYS end with a summary or next steps section**
- **NEVER create walls of text - break up content with proper spacing**

EXAMPLE FORMAT:
**Your direct answer here.**

**Key Points:**
- Covers land acquisition and construction costs
- Interest-only payments during construction
- Converts to permanent financing upon completion

Remember: Get straight to the point. Users want quick, actionable answers, not lengthy explanations. **Keep the first answer in bold throughout.**`;

    // Build user prompt
    const userPrompt = question 
      ? `User Question: ${question}`
      : `Please provide guidance on completing the "${fieldContext.label}" field for this project.`;

    // Add chat history context if available
    const historyContext = chatHistory && chatHistory.length > 0 
      ? `\n\nPrevious conversation:\n${chatHistory.slice(-3).map(msg => `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')}`
      : '';

    const result = await streamObject({
      model: google(MODEL_NAME),
      system: systemPrompt,
      schema: ProjectQASchema,
      prompt: `${userPrompt}${historyContext}`,
      abortSignal: req.signal,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error('project-qa error:', e);
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 });
  }
} 