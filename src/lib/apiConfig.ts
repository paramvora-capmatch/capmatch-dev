// src/lib/apiConfig.ts
/**
 * API Configuration
 * Centralized configuration for backend API URLs
 */

/**
 * Get the backend API base URL
 * Reads from NEXT_PUBLIC_BACKEND_URL environment variable
 * Defaults to http://127.0.0.1:8000
 * Normalizes the URL to remove trailing slashes to prevent double slashes in paths
 */
export const getBackendUrl = (): string => {
  // If we are in the browser, return an empty string.
  // This makes the frontend use relative URLs (e.g., /api/v1/...) 
  // Caddy will intercept /api/* and proxy it to the backend VM directly!
  if (typeof window !== 'undefined') {
    return '';
  }

  // If we are on the server (SSR/RSC), use the internal backend URL.
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
  return url.replace(/\/+$/, '');
};

