// src/hooks/useAskAI.ts
import { useState, useCallback, useEffect } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { Message, FieldContext, AIContextRequest, PresetQuestion } from '../types/ask-ai-types';
import { AIContextBuilder } from '../services/aiContextBuilder';
import { z } from 'zod';

// Helper to create a standardized error message
const createErrorMessage = (fieldContext: FieldContext | null): Message => ({
  id: Date.now().toString(),
  type: 'ai',
  content: 'Sorry, I encountered an error while processing your question. Please try again.',
  timestamp: new Date(),
  fieldContext: fieldContext,
  isStreaming: false,
});

// Schema for AI response with markdown support
const ProjectQASchema = z.object({
  answer_markdown: z.string().describe('A comprehensive, helpful answer to the user\'s question about the form field, formatted in markdown')
});

interface UseAskAIOptions {
  projectId?: string;
  formData: Record<string, unknown>;
  apiPath?: string; // allow overriding API route (e.g., borrower-qa)
  contextType?: 'project' | 'borrower';
}

export const useAskAI = ({ formData, apiPath = '/api/project-qa', contextType = 'project' }: UseAskAIOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fieldContext, setFieldContext] = useState<FieldContext | null>(null);
  const [isBuildingContext, setIsBuildingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  // Track which field was explicitly activated via Ask AI button
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [presetQuestions, setPresetQuestions] = useState<PresetQuestion[]>([]);
  const [contextCache, setContextCache] = useState<Map<string, FieldContext>>(new Map());
  const [autoSendRequested, setAutoSendRequested] = useState<boolean>(false);
  
  // Clear context cache when form data changes to ensure fresh context
  // Do not reset chat when form data changes; keep conversation stable.
  // If needed, context will be rebuilt on the next explicit Ask AI click.
  useEffect(() => {
    // Intentionally no-op to avoid resets on keystrokes
  }, [formData]);
  
  // Streaming AI response
  const { object, submit, isLoading: isStreaming, error: streamError, stop } = useObject({
    api: apiPath,
    schema: ProjectQASchema,
  });

  // Handle field drop
  const activateField = useCallback(async (fieldId: string, options?: { autoSend?: boolean }) => {
    // Abort any ongoing streaming requests
    stop();
    
    try {
      // Validate field exists
      if (!fieldId) {
        throw new Error('Field ID is required');
      }

      // Clear previous context and start fresh - do this synchronously to prevent race conditions
      setMessages([]);
      setFieldContext(null);
      setContextError(null);
      setIsBuildingContext(true);
      setAutoSendRequested(!!options?.autoSend);
      setActiveFieldId(fieldId);

      // 1. Immediate intent capture (optimistic)
      // 2. Context building will continue in background
      
      try {
        // Build context from scratch with latest form data
        const context = await AIContextBuilder.buildFieldContext(fieldId, formData);
        setFieldContext(context);
        // Cache context for this field
        setContextCache(prev => new Map(prev).set(fieldId, context));
        // Generate preset questions for this field
        setPresetQuestions(AIContextBuilder.generatePresetQuestions(context));

        // If explicitly requested (Ask AI button), auto-send once now that context is ready
        if (options?.autoSend) {
          const hasValue = !!context.currentValue && context.currentValue !== '';
          const primaryQuestion = (() => {
            if (contextType === 'borrower') {
              return hasValue
                ? `I've selected "${String(context.currentValue)}" for the "${context.label}" field. Please validate:
1. Is this the right choice for my borrower profile?
2. Should I consider a different selection and why?
3. How does this choice affect lender perception and eligibility?`
                : `I haven't filled out the "${context.label}" field yet. I need to know:
1. What information is expected here for a borrower?
2. What are my options and which is generally most appropriate?
3. How do different choices impact lender perception and eligibility?`;
            }
            // project context default
            return hasValue
              ? `I've filled in "${String(context.currentValue)}" for the "${context.label}" field. I need to know:
1. Is this the right choice for my project?
2. Should I consider changing it to something else?
3. How does this choice impact my loan terms?`
              : `I haven't filled out the "${context.label}" field yet. I need to understand:
1. What is this field asking for?
2. What are my options and which one should I choose?
3. How does my choice affect my loan application?`;
          })();

          const suggestions = (AIContextBuilder.generatePresetQuestions(context))
            .map(q => q.text)
            .join('\n- ');

          const comprehensiveQuestion = `${primaryQuestion}

Please also address these additional considerations:
- ${suggestions}

Provide actionable advice that helps me make the best decision for my project.`;

          const displayMessage = contextType === 'borrower'
            ? `Please validate and guide the "${context.label}" field for my borrower resume, including best practices and lender expectations.`
            : `Please provide comprehensive guidance and answers for the "${context.label}" field, including best practices, validation rules, and common considerations.`;

          await sendMessage(comprehensiveQuestion, displayMessage, context);
          setAutoSendRequested(false);
        }
      } catch (error) {
        console.error('Error building field context:', error);
        setContextError(error instanceof Error ? error.message : 'Failed to build field context');
      } finally {
        setIsBuildingContext(false);
      }
      
    } catch (error) {
      console.error('Error handling field drop:', error);
      setContextError(error instanceof Error ? error.message : 'Failed to process field drop');
    }
  }, [formData, stop]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string, displayMessage?: string, contextOverride?: FieldContext) => {
    const effectiveContext = contextOverride || fieldContext;
    if (!effectiveContext || !content.trim() || isBuildingContext) return;
    
    // Abort any previous requests
    stop();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: displayMessage?.trim() || content.trim(), // Use displayMessage if provided, otherwise use content
      timestamp: new Date(),
      fieldContext: effectiveContext
    };
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Add thinking message for streaming feedback
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      fieldContext,
      isStreaming: true
    };
    setMessages(prev => [...prev, thinkingMessage]);
    
    try {
      let requestBody: Record<string, unknown>;
      if (contextType === 'borrower') {
        const borrowerContext = AIContextBuilder.buildBorrowerContext(formData);
        requestBody = {
          fieldContext: effectiveContext,
          borrowerContext,
          fullFormData: formData,
          question: content.trim(),
        };
      } else {
        const projectContext = AIContextBuilder.buildProjectContext(formData);
        requestBody = {
          fieldContext: effectiveContext,
          projectContext,
          question: content.trim(),
        } as unknown as Record<string, unknown>;
      }
      
      // Submit to streaming API
      submit(requestBody);
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, no need to show an error
        return;
      }
      console.error('Error sending message:', error);
      
      // Remove thinking message and add error message
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
      setMessages(prev => [...prev, createErrorMessage(fieldContext)]);
    }
  }, [fieldContext, formData, submit, isBuildingContext, stop, contextType]);

  // Handle streaming response
  useEffect(() => {
    if (!object) return;

    setMessages(prev => {
      // Find the "thinking" message and replace it with the first chunk of the AI response,
      // or update the last AI message with subsequent chunks.
      const lastMessage = prev[prev.length - 1];

      if (lastMessage?.type === 'ai') {
        // Create a new array with the updated message to avoid mutation
        return prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, content: object.answer_markdown || '', isStreaming: false }
            : msg
        );
      }
      return prev;
    });
  }, [object, fieldContext]);

  // Handle streaming errors
  useEffect(() => {
    if (streamError) {
      setMessages(prev => {
        const newMessages = prev.filter(m => !m.isStreaming);
        return [...newMessages, createErrorMessage(fieldContext)];
      });
    }
  }, [streamError, fieldContext]);

  // When streaming finishes, ensure the last message's streaming flag is false
  useEffect(() => {
    if (!isStreaming) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.isStreaming) {
          return prev.map((msg, index) =>
            index === prev.length - 1 ? { ...msg, isStreaming: false } : msg
          );
        }
        return prev;
      });
    }
  }, [isStreaming]);

  // Remove implicit auto-send; sending occurs only on explicit Ask AI click path.

  return {
    // State
    messages,
    fieldContext,
    isLoading: isBuildingContext || isStreaming,
    isBuildingContext,
    contextError,
    activeFieldId,
    presetQuestions,
    
    // Actions
    activateField,
    sendMessage,
    
    // Utilities
    hasActiveContext: !!fieldContext,
    hasMessages: messages.length > 0
  };
}; 