/**
 * Axios API client with interceptors for authentication and token refresh
 *
 * This module provides a configured axios instance that:
 * - Sends cookies with every request (withCredentials: true)
 * - Handles automatic token refresh on 401 errors via HttpOnly cookies
 * - Redirects to login on refresh token failures
 *
 * Requirements: 11.3, 11.4
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================================
// Axios Instance Configuration
// ============================================================================

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/signup') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        // If refresh fails, we are definitely logged out
        if (originalRequest.url?.includes('/auth/refresh')) {
          // Only redirect if not already on auth page
          const isAuthPage =
            typeof window !== 'undefined' &&
            (window.location.pathname.startsWith('/login') ||
              window.location.pathname.startsWith('/signup'));

          if (!isAuthPage && typeof window !== 'undefined') {
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
            // Retry original request
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the access token via cookie
        await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            withCredentials: true, // Send refresh token cookie
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        // Process queued requests
        processQueue();
        isRefreshing = false;

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed
        processQueue(refreshError as Error);
        isRefreshing = false;

        // Redirect to login ONLY if:
        // 1. It's not the /me endpoint (which just checks session)
        // 2. We are not already on an auth page
        const isAuthCheck = originalRequest.url?.includes('/auth/me');
        const isAuthPage =
          typeof window !== 'undefined' &&
          (window.location.pathname.startsWith('/login') ||
            window.location.pathname.startsWith('/signup'));

        if (!isAuthCheck && !isAuthPage && typeof window !== 'undefined') {
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
