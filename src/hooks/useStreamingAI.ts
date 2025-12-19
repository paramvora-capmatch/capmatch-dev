// src/hooks/useStreamingAI.ts
// Custom streaming hook for AI responses - replaces Vercel AI SDK's useObject

import { useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

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
  const updateQueueRef = useRef<Array<{ text: string; timestamp: number }>>([]);
  const isProcessingQueueRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const minUpdateInterval = 50; // Minimum 50ms between updates for visible staggering

  // Process queued updates with staggering
  const processUpdateQueue = useCallback(() => {
    if (isProcessingQueueRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    const processNext = () => {
      if (updateQueueRef.current.length === 0) {
        isProcessingQueueRef.current = false;
        return;
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      if (timeSinceLastUpdate >= minUpdateInterval) {
        // Enough time has passed, process immediately
        const update = updateQueueRef.current.shift();
        if (update) {
          lastUpdateTimeRef.current = now;
          flushSync(() => {
            setResponse(update.text);
          });
        }
        requestAnimationFrame(processNext);
      } else {
        // Wait until minimum interval has passed
        const waitTime = minUpdateInterval - timeSinceLastUpdate;
        setTimeout(() => {
          requestAnimationFrame(processNext);
        }, waitTime);
      }
    };

    requestAnimationFrame(processNext);
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateQueueRef.current = [];
    isProcessingQueueRef.current = false;
  }, []);

  const reset = useCallback(() => {
    stop();
    setResponse('');
    setError(null);
    setIsLoading(false);
    lastUpdateTimeRef.current = 0;
  }, [stop]);

  const submit = useCallback(async (body: Record<string, unknown>) => {
    // Abort any previous request
    stop();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setResponse('');
    updateQueueRef.current = [];
    lastUpdateTimeRef.current = 0;

    const requestStartTime = Date.now();
    console.log('[FRONTEND] Starting fetch request to', api);

    try {
      const fetchStart = Date.now();
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });
      const fetchTime = Date.now() - fetchStart;
      console.log(`[FRONTEND] Fetch response received (took ${fetchTime}ms, status=${res.status})`);

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
      let chunkCount = 0;
      let firstChunkTime: number | null = null;
      let messageCount = 0;
      let firstMessageTime: number | null = null;

      console.log('[FRONTEND] Starting to read stream chunks');

      while (true) {
        const readStart = Date.now();
        const { done, value } = await reader.read();
        const readTime = Date.now() - readStart;
        
        if (done) {
          const elapsed = Date.now() - requestStartTime;
          console.log(`[FRONTEND] Stream reading complete: ${chunkCount} raw chunks, ${messageCount} SSE messages, ${elapsed}ms elapsed`);
          // Process any remaining queued updates
          processUpdateQueue();
          break;
        }

        chunkCount++;
        const currentTime = Date.now();
        
        if (firstChunkTime === null) {
          firstChunkTime = currentTime;
          const timeToFirstChunk = currentTime - requestStartTime;
          console.log(`[FRONTEND] First raw chunk received (took ${timeToFirstChunk}ms, size=${value.length} bytes)`);
        } else {
          const timeSinceFirst = currentTime - firstChunkTime;
          if (readTime > 10 || timeSinceFirst % 1000 < 100) { // Log every ~1s or slow reads
            console.log(`[FRONTEND] Raw chunk #${chunkCount} (time=${timeSinceFirst}ms, size=${value.length} bytes, read_time=${readTime}ms)`);
          }
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages (end with \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;
          
          messageCount++;
          const messageTime = Date.now();
          if (firstMessageTime === null) {
            firstMessageTime = messageTime;
            const timeToFirstMessage = messageTime - requestStartTime;
            console.log(`[FRONTEND] First SSE message parsed (took ${timeToFirstMessage}ms)`);
          }
          
          // Parse SSE format: "data: {json}" or "data: [DONE]"
          const lines = message.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              // Check for completion signal
              if (data === '[DONE]') {
                console.log('[FRONTEND] Received [DONE] signal');
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
                  const textLength = parsed.text.length;
                  const timeSinceFirstMsg = firstMessageTime ? messageTime - firstMessageTime : 0;
                  if (messageCount <= 5 || messageCount % 10 === 0) {
                    console.log(`[FRONTEND] SSE message #${messageCount} parsed (time=${timeSinceFirstMsg}ms, text_length=${textLength})`);
                  }
                  
                  // Queue the update for staggered processing
                  updateQueueRef.current.push({
                    text: parsed.text,
                    timestamp: messageTime,
                  });
                  
                  // Trigger queue processing if not already processing
                  processUpdateQueue();
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
        console.log('[FRONTEND] Request aborted');
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
      console.log('[FRONTEND] Stream processing finished');
    }
  }, [api, stop]);

  return { response, isLoading, error, submit, stop, reset };
};

