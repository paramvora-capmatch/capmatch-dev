// src/app/api/borrower-qa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { BorrowerAIContextRequest } from '@/types/ask-ai-types';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL_NAME = 'gemini-2.5-flash';

// Schema for AI response with markdown support
const BorrowerQASchema = z.object({
  answer_markdown: z.string().describe('A comprehensive, helpful answer about the borrower resume field, formatted in markdown')
});

export async function POST(req: NextRequest) {
  try {
    const { fieldContext, borrowerContext, fullFormData, question, chatHistory }: BorrowerAIContextRequest = await req.json();

    if (!fieldContext || !borrowerContext) {
      return NextResponse.json({ error: 'Missing required context' }, { status: 400 });
    }

    // Build system prompt tailored for borrower resume guidance
    const systemPrompt = `You are a commercial real estate borrower resume assistant with 20+ years of experience helping sponsors present strong profiles to lenders.

CURRENT CONTEXT:
- Field: ${fieldContext.label} (${fieldContext.type})
- Section: ${fieldContext.section}
- Entity Structure: ${borrowerContext.primaryEntityStructure || 'Not specified'}
- Experience: ${borrowerContext.yearsCREExperienceRange || 'Not specified'}
- Credit Score: ${borrowerContext.creditScoreRange || 'Not specified'}
- Net Worth: ${borrowerContext.netWorthRange || 'Not specified'}
- Liquidity: ${borrowerContext.liquidityRange || 'Not specified'}
- Markets: ${(borrowerContext.geographicMarketsExperience && borrowerContext.geographicMarketsExperience.join(', ')) || 'Not specified'}

If additional details are relevant, you may infer them from the full borrower data provided below when helpful.

RESPONSE PRIORITY:
1. **ANSWER THE USER'S IMMEDIATE QUESTION FIRST** - Provide a direct, concise answer
2. **Then briefly explain** why your recommendation makes sense to a lender
3. **Keep it short** - avoid unnecessary verbosity

INSTRUCTIONS:
1. Start with a direct, concise answer (1-2 sentences max)
2. Reference borrower details only when essential and relevant
3. Provide concrete examples or ranges when helpful
4. Keep total response under 150 words

RESPONSE FORMAT (MANDATORY):
- **Start with a direct answer** to their immediate question
- **CRITICAL: The first answer MUST remain in bold formatting throughout the response**
- Use markdown formatting for structure (headers, lists, emphasis)
- **CRITICAL: Add proper spacing and line breaks - NO WALLS OF TEXT**
- **Use double line breaks (\\n\\n) between major sections**
- **Use single line breaks (\\n) between related points**
- **Add spacing before and after lists (\\n before, \\n after)**
- Use bullet points for actionable items with proper spacing
- When referencing other fields from the borrower resume (e.g., Years of Experience, Liquidity), **bold the field names** to highlight context awareness
- End with a brief next steps section

EXAMPLE FORMAT:
**Your direct answer here.**

**Key Points:**
- Tie suggestion to lender expectations
- Reference relevant borrower fields (bold the field names)
- Keep concise and actionable`;

    const userPromptParts = [
      question ? `User Question: ${question}` : `Please provide guidance on completing the "${fieldContext.label}" field for this borrower resume.`,
    ];

    if (fullFormData) {
      userPromptParts.push(`\n\nFull Borrower Data (JSON): ${JSON.stringify(fullFormData)}`);
    }

    const historyContext = chatHistory && chatHistory.length > 0
      ? `\n\nPrevious conversation:\n${chatHistory.slice(-3).map(msg => `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')}`
      : '';

    const result = await streamObject({
      model: google(MODEL_NAME),
      system: systemPrompt,
      schema: BorrowerQASchema,
      prompt: `${userPromptParts.join('')}${historyContext}`,
      abortSignal: req.signal,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    console.error('borrower-qa error:', e);
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 });
  }
}


