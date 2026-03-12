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
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
  const base = url.replace(/\/+$/, '');

  // In the browser: production uses relative URLs (Caddy proxies /api/* to backend).
  // In development, point directly at the backend so requests don't hit Next.js and 404.
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    return base;
  }

  // Server (SSR/RSC): use backend URL.
  return base;
};

