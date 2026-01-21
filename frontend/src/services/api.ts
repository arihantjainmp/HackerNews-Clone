/**
 * Axios API client with interceptors for authentication and token refresh
 *
 * This module provides a configured axios instance that:
 * - Automatically adds Authorization headers to requests
 * - Handles automatic token refresh on 401 errors
 * - Redirects to login on refresh token failures
 *
 * Requirements: 11.3, 11.4, 11.7
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_STORAGE_KEY = 'auth_tokens';

// ============================================================================
// Token Storage Interface
// ============================================================================

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Token Storage Utilities
// ============================================================================

/**
 * Get stored tokens from localStorage
 */
export const getStoredTokens = (): StoredTokens | null => {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredTokens;
  } catch (error) {
    console.error('Failed to parse stored tokens:', error);
    return null;
  }
};

/**
 * Store tokens in localStorage
 */
export const setStoredTokens = (tokens: StoredTokens): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
};

/**
 * Clear stored tokens from localStorage
 */
export const clearStoredTokens = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored tokens:', error);
  }
};

// ============================================================================
// Axios Instance Configuration
// ============================================================================

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Request interceptor to add Authorization header
 * Automatically attaches access token to all requests if available
 *
 * Requirement 11.7: Include Access_Token in Authorization header for authenticated requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getStoredTokens();

    // Add Authorization header if access token exists
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor for Token Refresh
// ============================================================================

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;

/**
 * Queue of failed requests waiting for token refresh
 */
let failedRequestsQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null = null): void => {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });

  failedRequestsQueue = [];
};

/**
 * Response interceptor for automatic token refresh on 401 errors
 *
 * Requirements:
 * - 11.3: Automatically refresh access token when expired
 * - 11.4: Redirect to login on refresh token failure
 */
apiClient.interceptors.response.use(
  // Success response - pass through
  (response) => response,

  // Error response - handle 401 with token refresh
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is an auth endpoint (login, signup, refresh) - don't try to refresh token
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/signup') ||
          originalRequest.url?.includes('/auth/refresh')) {
        // These are authentication endpoints - pass through the error
        if (originalRequest.url?.includes('/auth/refresh')) {
          // Only clear tokens and redirect for refresh endpoint
          clearStoredTokens();

          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(() => {
            // Retry original request with new token
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      const tokens = getStoredTokens();

      if (!tokens?.refreshToken) {
        // No refresh token available - redirect to login
        isRefreshing = false;
        clearStoredTokens();

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the access token
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken: tokens.refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { accessToken, refreshToken } = response.data;

        // Store new tokens
        setStoredTokens({ accessToken, refreshToken });

        // Update Authorization header for original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue();
        isRefreshing = false;

        // Retry original request with new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError as Error);
        isRefreshing = false;
        clearStoredTokens();

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // For all other errors, reject as normal
    return Promise.reject(error);
  }
);

// ============================================================================
// Export
// ============================================================================

export default apiClient;
