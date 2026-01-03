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
    }>('/api/v1/auth/validate-invite', {
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
    }>('/api/v1/users/invite', {
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
    }>('/api/v1/users/remove', {
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
    }>('/api/v1/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({
        token: params.token,
        password: params.password,
        full_name: params.full_name,
        accept: true,
      }),
    });
  },

  /**
   * Create a new project
   *
   * @param params - Project creation parameters
   * @returns Created project with borrower resume
   */
  createProject: async (params: {
    name: string;
    owner_org_id: string;
    assigned_advisor_id?: string;
    address?: string;
  }) => {
    return apiRequest<{
      project: any;
      borrowerResumeContent: any;
      borrowerResumeSourceProjectId: string | null;
    }>('/api/v1/projects/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Update an existing project
   *
   * @param params - Project update parameters
   * @returns Success response
   */
  updateProject: async (params: {
    project_id: string;
    core_updates?: {
      name?: string;
      assigned_advisor_id?: string;
    };
    resume_updates?: any;
  }) => {
    return apiRequest<{
      ok: boolean;
    }>('/api/v1/projects/update', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Copy borrower profile from source project to target project
   *
   * @param params - Copy parameters
   * @returns Success response with copied content
   */
  copyBorrowerProfile: async (params: {
    source_project_id: string;
    target_project_id: string;
  }) => {
    return apiRequest<{
      success: boolean;
      borrowerResumeContent: any;
      sourceProjectId: string;
    }>('/api/v1/projects/copy-borrower-profile', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Manage chat threads - create, add participants, remove participants, or get threads
   *
   * @param params - Thread management parameters
   * @returns Response with thread data or success message
   */
  manageChatThread: async (params: {
    action: 'create' | 'add_participant' | 'remove_participant' | 'get_thread';
    thread_id?: string;
    project_id?: string;
    topic?: string;
    participant_ids?: string[];
  }) => {
    return apiRequest<{
      thread_id?: string;
      thread?: any;
      message: string;
    }>('/api/v1/chat/threads', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Update meeting participant response status and sync to Google Calendar
   *
   * @param params - Update parameters
   * @returns Success message
   */
  updateCalendarResponse: async (params: {
    meeting_id: string;
    user_id: string;
    status: 'accepted' | 'declined' | 'tentative' | 'pending';
  }) => {
    return apiRequest<{
      message: string;
    }>('/api/v1/calendar/update-response', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Onboard a new borrower user or reuse existing user
   *
   * @param params - Onboard parameters
   * @returns User data
   */
  onboardBorrower: async (params: {
    email: string;
    password?: string;
    full_name: string;
    existing_user?: boolean;
    user_id?: string;
  }) => {
    return apiRequest<{
      user: {
        id: string;
        email: string;
      };
    }>('/api/v1/users/onboard-borrower', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Update member permissions for a user in an organization
   *
   * @param params - Permission update parameters
   * @returns Success response
   */
  updateMemberPermissions: async (params: {
    org_id: string;
    user_id: string;
    project_grants?: Array<{
      projectId: string;
      permissions: Array<{
        resource_type: string;
        permission: string;
      }>;
      fileOverrides?: Array<{
        resource_id: string;
        permission: string;
      }>;
      exclusions?: string[];
    }>;
    org_grants?: {
      permissions?: Array<{
        resource_type: string;
        permission: string;
      }>;
      fileOverrides?: Array<{
        resource_id: string;
        permission: string;
      }>;
    } | null;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/api/v1/users/update-member-permissions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Cancel an invitation
   *
   * @param inviteId - Invite ID to cancel
   * @param orgId - Organization ID
   * @returns Success response
   */
  cancelInvite: async (inviteId: string, orgId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/users/cancel-invite/${inviteId}?org_id=${orgId}`, {
      method: 'POST',
    });
  },
};
