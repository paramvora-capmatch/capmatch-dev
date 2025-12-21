/**
 * API Client for CapMatch FastAPI Server
 *
 * This client provides methods to call the new FastAPI endpoints
 * instead of Supabase Edge Functions.
 */

import { getBackendUrl } from './apiConfig';
import { supabase } from '@/lib/supabaseClient';

/**
 * Get the current user's JWT token for authentication
 */
const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Make an authenticated API request to FastAPI
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const baseUrl = getBackendUrl();
    const url = `${baseUrl}${endpoint}`;

    // Get auth token if not provided
    const token = await getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Log full error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Error [${endpoint}]:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
      }
      
      // FastAPI uses 'detail' for HTTP exceptions and 'details' for validation errors
      let errorMessage = errorData.detail || errorData.error || errorData.message;
      
      // If it's a validation error (422), format the details
      if (response.status === 422 && errorData.details && Array.isArray(errorData.details)) {
        const validationErrors = errorData.details
          .map((err: any) => {
            const field = err.loc?.join('.') || 'field';
            const msg = err.msg || 'Invalid value';
            return `${field}: ${msg}`;
          })
          .join(', ');
        errorMessage = `Validation error: ${validationErrors}`;
      }
      
      // Fallback to status text if no message found
      if (!errorMessage) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Make an unauthenticated API request to FastAPI
 * Used for endpoints that don't require authentication (e.g., accept-invite)
 */
async function unauthenticatedApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const baseUrl = getBackendUrl();
    const url = `${baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Log full error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Error [${endpoint}]:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
      }
      
      // FastAPI uses 'detail' for HTTP exceptions and 'details' for validation errors
      let errorMessage = errorData.detail || errorData.error || errorData.message;
      
      // If it's a validation error (422), format the details
      if (response.status === 422 && errorData.details && Array.isArray(errorData.details)) {
        const validationErrors = errorData.details
          .map((err: any) => {
            const field = err.loc?.join('.') || 'field';
            const msg = err.msg || 'Invalid value';
            return `${field}: ${msg}`;
          })
          .join(', ');
        errorMessage = `Validation error: ${validationErrors}`;
      }
      
      // Fallback to status text if no message found
      if (!errorMessage) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * API Client Methods
 */
export const apiClient = {
  /**
   * Validate an invite token
   *
   * @param token - Invite token to validate
   * @returns Validation result with org and inviter info
   */
  validateInvite: async (token: string) => {
    return apiRequest<{
      valid: boolean;
      orgName?: string;
      inviterName?: string;
      email?: string;
    }>('/auth/validate-invite', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  /**
   * Invite a user to an organization
   *
   * @param params - Invite parameters
   * @returns Invite record with token
   */
  inviteUser: async (params: {
    email: string;
    org_id: string;
    role: string;
    project_grants?: any[];
    org_grants?: any;
  }) => {
    return apiRequest<{
      invite: {
        id: string;
        token: string;
        expires_at: string;
        [key: string]: any;
      };
    }>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Remove a user from an organization
   *
   * @param params - Removal parameters
   * @returns Success response
   */
  removeUser: async (params: {
    user_id: string;
    org_id: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/users/remove', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Accept an invite and create a new user account
   *
   * @param params - Accept invite parameters
   * @returns Status response
   */
  acceptInvite: async (params: {
    token: string;
    password: string;
    full_name: string;
  }) => {
    return unauthenticatedApiRequest<{
      status: string;
    }>('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({
        token: params.token,
        password: params.password,
        full_name: params.full_name,
        accept: true,
      }),
    });
  },
};
