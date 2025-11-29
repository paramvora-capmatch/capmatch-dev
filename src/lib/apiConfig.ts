// src/lib/apiConfig.ts
/**
 * API Configuration
 * Centralized configuration for toggling between mock and real backend APIs
 */

/**
 * Check if mock data should be used instead of backend API
 * Reads from NEXT_PUBLIC_USE_MOCK_DATA environment variable
 * Defaults to false (use real backend)
 */
export const useMockData = (): boolean => {
  if (typeof window === 'undefined') {
    // Server-side: read from process.env
    return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
  }
  
  // Client-side: read from process.env (Next.js exposes NEXT_PUBLIC_* vars)
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
};

/**
 * Get the backend API base URL
 * Reads from NEXT_PUBLIC_BACKEND_URL environment variable
 * Defaults to http://127.0.0.1:8000
 */
export const getBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
};

