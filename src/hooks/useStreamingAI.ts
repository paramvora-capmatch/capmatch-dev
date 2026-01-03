// src/hooks/useStreamingAI.ts
// Custom streaming hook for AI responses - replaces Vercel AI SDK's useObject

import { useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';

interface StreamingResponse {
  text?: string;
  error?: string;
}

interface UseStreamingAIOptions {
  /** API endpoint path (e.g., '/api/project-qa') */
  api: string;
}

interface UseStreamingAIReturn {
  /** The accumulated response text */
  response: string;
  /** Whether a request is currently in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Submit a request to the AI endpoint */
  submit: (body: Record<string, unknown>) => Promise<void>;
  /** Abort the current request */
  stop: () => void;
  /** Reset the response state */
  reset: () => void;
}

/**
 * Custom hook for streaming AI responses using standard SSE.
 * Replaces Vercel AI SDK's useObject with a simpler, dependency-free implementation.
 * 
 * @example
 * const { response, isLoading, submit, stop } = useStreamingAI({ apiPath: '/api/project-qa' });
 * 
 * // Submit a request
 * await submit({ question: 'What should I fill here?' });
 * 
 * // response will update as chunks arrive
 * // isLoading will be true while streaming
 */
export const useStreamingAI = ({ api }: UseStreamingAIOptions): UseStreamingAIReturn => {
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setResponse('');
    setError(null);
    setIsLoading(false);
  }, [stop]);

  const submit = useCallback(async (body: Record<string, unknown>) => {
    // Abort any previous request
    stop();

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(api, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (end with \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;

          // Parse SSE format: "data: {json}" or "data: [DONE]"
          const lines = message.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              // Check for completion signal
              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed: StreamingResponse = JSON.parse(data);

                if (parsed.error) {
                  console.error('[FRONTEND] Error in SSE message:', parsed.error);
                  flushSync(() => {
                    setError(new Error(parsed.error));
                  });
                } else if (parsed.text !== undefined) {
                  // Force immediate React update to prevent batching
                  flushSync(() => {
                    setResponse(parsed.text ?? '');
                  });
                }
              } catch (parseErr) {
                // Skip malformed JSON - might be partial message
                console.warn('[FRONTEND] Failed to parse SSE data:', data, parseErr);
              }
            }
          }
        }
      }
    } catch (err) {
      // Don't report abort errors
      if ((err as Error).name === 'AbortError') {
        return;
      }
      console.error('[FRONTEND] Streaming error:', err);
      flushSync(() => {
        setError(err as Error);
      });
    } finally {
      flushSync(() => {
        setIsLoading(false);
      });
      abortControllerRef.current = null;
    }
  }, [api, stop]);

  return { response, isLoading, error, submit, stop, reset };
};

