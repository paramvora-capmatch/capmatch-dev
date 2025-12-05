// src/lib/apiConfig.ts
/**
 * API Configuration
 * Centralized configuration for backend API URLs
 */

/**
 * Get the backend API base URL
 * Reads from NEXT_PUBLIC_BACKEND_URL environment variable
 * Defaults to http://127.0.0.1:8000
 */
export const getBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
};

