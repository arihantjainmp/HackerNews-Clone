/**
 * Property-Based Tests for Authentication Context
 *
 * These tests validate universal properties of the authentication system
 * using property-based testing with fast-check.
 *
 * Properties tested:
 * - Property 46: Token Storage on Login
 * - Property 47: Authentication State Persistence
 * - Property 48: Automatic Token Refresh
 * - Property 49: Invalid Token Redirect
 * - Property 50: Logout Token Cleanup
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authApi from '../../services/authApi';
import { getStoredTokens, clearStoredTokens, setStoredTokens } from '../../services/api';

// ============================================================================
// Mocks
// ============================================================================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth API
vi.mock('../../services/authApi');
vi.mock('../../services/api', async () => {
  const actual = await vi.importActual('../../services/api');
  return {
    ...actual,
    getStoredTokens: vi.fn(),
    setStoredTokens: vi.fn(),
    clearStoredTokens: vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

// Arbitraries for generating test data
const tokenArbitrary = fc.string({ minLength: 20, maxLength: 100 });
const emailArbitrary = fc.emailAddress();
const usernameArbitrary = fc.string({ minLength: 3, maxLength: 20 });
const passwordArbitrary = fc.string({ minLength: 8, maxLength: 50 });

const userArbitrary = fc.record({
  _id: fc.uuid(),
  username: usernameArbitrary,
  email: emailArbitrary,
  created_at: fc.date().map((d) => d.toISOString()),
});

const authResponseArbitrary = fc.record({
  user: userArbitrary,
  accessToken: tokenArbitrary,
  refreshToken: tokenArbitrary,
});

// ============================================================================
// Property Tests
// ============================================================================

describe('AuthContext Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    
    // Default mock implementations
    vi.mocked(getStoredTokens).mockReturnValue(null);
    vi.mocked(setStoredTokens).mockImplementation(() => {});
    vi.mocked(clearStoredTokens).mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Feature: hacker-news-clone, Property 46: Token Storage on Login
   *
   * For any successful login, the frontend should store both the Access_Token
   * and Refresh_Token in browser storage.
   *
   * Validates: Requirements 11.1
   */
  describe('Property 46: Token Storage on Login', () => {
    it('should store both access and refresh tokens for any successful login', async () => {
      await fc.assert(
        fc.asyncProperty(authResponseArbitrary, emailArbitrary, passwordArbitrary, async (authResponse, email, password) => {
          // Setup: Mock successful login
          vi.mocked(authApi.login).mockResolvedValue(authResponse);
          vi.mocked(getStoredTokens).mockReturnValue(null);

          // Render hook
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for initial loading
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Execute: Login
          await act(async () => {
            await result.current.login(email, password);
          });

          // Verify: setStoredTokens was called with both tokens
          expect(setStoredTokens).toHaveBeenCalledWith({
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
          });
        }),
        { numRuns: 50 }
      );
    });

    it('should store both access and refresh tokens for any successful signup', async () => {
      await fc.assert(
        fc.asyncProperty(
          authResponseArbitrary,
          usernameArbitrary,
          emailArbitrary,
          passwordArbitrary,
          async (authResponse, username, email, password) => {
            // Setup: Mock successful signup
            vi.mocked(authApi.signup).mockResolvedValue(authResponse);
            vi.mocked(getStoredTokens).mockReturnValue(null);

            // Render hook
            const { result } = renderHook(() => useAuth(), { wrapper });

            // Wait for initial loading
            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Execute: Signup
            await act(async () => {
              await result.current.signup(username, email, password);
            });

            // Verify: setStoredTokens was called with both tokens
            expect(setStoredTokens).toHaveBeenCalledWith({
              accessToken: authResponse.accessToken,
              refreshToken: authResponse.refreshToken,
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: hacker-news-clone, Property 47: Authentication State Persistence
   *
   * For any authenticated user session, refreshing the page should restore
   * the authentication state from stored tokens without requiring re-login.
   *
   * Validates: Requirements 11.2
   */
  describe('Property 47: Authentication State Persistence', () => {
    it('should restore authentication state from stored tokens on mount', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArbitrary, tokenArbitrary, async (accessToken, refreshToken) => {
          // Setup: Mock stored tokens
          vi.mocked(getStoredTokens).mockReturnValue({
            accessToken,
            refreshToken,
          });

          // Mock successful token refresh
          vi.mocked(authApi.refreshAccessToken).mockResolvedValue({
            accessToken: accessToken + '_new',
            refreshToken: refreshToken + '_new',
          });

          // Render hook (simulates page mount/refresh)
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for auth state restoration
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Verify: Authentication state was restored
          // The context should have attempted to verify tokens
          expect(authApi.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
        }),
        { numRuns: 50 }
      );
    });

    it('should clear tokens and remain unauthenticated when stored tokens are invalid', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArbitrary, tokenArbitrary, async (accessToken, refreshToken) => {
          // Setup: Mock stored tokens that are invalid
          vi.mocked(getStoredTokens).mockReturnValue({
            accessToken,
            refreshToken,
          });

          // Mock failed token refresh (invalid tokens)
          vi.mocked(authApi.refreshAccessToken).mockRejectedValue(
            new Error('Invalid refresh token')
          );

          // Render hook
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for auth state restoration attempt
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Verify: Tokens were cleared and user is not authenticated
          expect(clearStoredTokens).toHaveBeenCalled();
          expect(result.current.isAuthenticated).toBe(false);
          expect(result.current.user).toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: hacker-news-clone, Property 48: Automatic Token Refresh
   *
   * For any API request that fails with a 401 error due to an expired Access_Token,
   * if a valid Refresh_Token exists, the frontend should automatically request
   * a new Access_Token and retry the original request.
   *
   * Note: This property is primarily tested through the API client interceptor,
   * but we test the manual refresh function here.
   *
   * Validates: Requirements 11.3
   */
  describe('Property 48: Automatic Token Refresh', () => {
    it('should successfully refresh tokens when refresh token is valid', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArbitrary, tokenArbitrary, async (accessToken, refreshToken) => {
          // Setup: Mock stored tokens
          vi.mocked(getStoredTokens).mockReturnValue({
            accessToken,
            refreshToken,
          });

          const newAccessToken = accessToken + '_refreshed';
          const newRefreshToken = refreshToken + '_refreshed';

          // Mock successful token refresh
          vi.mocked(authApi.refreshAccessToken).mockResolvedValue({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // Render hook
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for initial loading
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Execute: Manual token refresh
          await act(async () => {
            await result.current.refreshToken();
          });

          // Verify: Refresh was called with the refresh token
          expect(authApi.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: hacker-news-clone, Property 49: Invalid Token Redirect
   *
   * For any attempt to use an invalid or expired Refresh_Token, the frontend
   * should clear stored tokens and redirect the user to the login page.
   *
   * Validates: Requirements 11.4
   */
  describe('Property 49: Invalid Token Redirect', () => {
    it('should clear tokens and redirect to login when refresh token is invalid', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArbitrary, tokenArbitrary, async (accessToken, refreshToken) => {
          // Setup: Mock stored tokens
          vi.mocked(getStoredTokens).mockReturnValue({
            accessToken,
            refreshToken,
          });

          // Mock failed token refresh
          vi.mocked(authApi.refreshAccessToken).mockRejectedValue(
            new Error('Invalid or expired refresh token')
          );

          // Render hook
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for initial loading
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Execute: Attempt manual token refresh
          try {
            await act(async () => {
              await result.current.refreshToken();
            });
          } catch (error) {
            // Expected to throw
          }

          // Verify: Tokens were cleared and redirect to login was called
          expect(clearStoredTokens).toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        }),
        { numRuns: 50 }
      );
    });

    it('should redirect to login when no refresh token is available', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Setup: No stored tokens
          vi.mocked(getStoredTokens).mockReturnValue(null);

          // Render hook
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for initial loading
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Execute: Attempt manual token refresh without tokens
          try {
            await act(async () => {
              await result.current.refreshToken();
            });
          } catch (error) {
            // Expected to throw
          }

          // Verify: Redirect to login was called
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: hacker-news-clone, Property 50: Logout Token Cleanup
   *
   * For any logout action, the frontend should clear all stored tokens
   * from browser storage and redirect to the home page.
   *
   * Validates: Requirements 11.6
   */
  describe('Property 50: Logout Token Cleanup', () => {
    it('should clear all tokens and redirect to home on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          authResponseArbitrary,
          emailArbitrary,
          passwordArbitrary,
          async (authResponse, email, password) => {
            // Setup: Mock successful login first
            vi.mocked(authApi.login).mockResolvedValue(authResponse);
            vi.mocked(getStoredTokens).mockReturnValue({
              accessToken: authResponse.accessToken,
              refreshToken: authResponse.refreshToken,
            });

            // Mock successful logout
            vi.mocked(authApi.logout).mockResolvedValue({ message: 'Logged out successfully' });

            // Render hook
            const { result } = renderHook(() => useAuth(), { wrapper });

            // Wait for initial loading
            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Login first
            await act(async () => {
              await result.current.login(email, password);
            });

            // Reset mocks to track logout behavior
            vi.mocked(clearStoredTokens).mockClear();
            mockNavigate.mockClear();

            // Execute: Logout
            await act(async () => {
              await result.current.logout();
            });

            // Verify: Tokens were cleared
            expect(clearStoredTokens).toHaveBeenCalled();

            // Verify: User state was cleared
            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);

            // Verify: Redirect to home page
            expect(mockNavigate).toHaveBeenCalledWith('/');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clear tokens even when logout API call fails', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArbitrary, tokenArbitrary, async (accessToken, refreshToken) => {
          // Setup: Mock stored tokens
          vi.mocked(getStoredTokens).mockReturnValue({
            accessToken,
            refreshToken,
          });

          // Mock failed logout API call
          vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

          // Render hook with authenticated state
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Wait for initial loading
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Execute: Logout (should handle error gracefully)
          await act(async () => {
            await result.current.logout();
          });

          // Verify: Tokens were still cleared despite API failure
          expect(clearStoredTokens).toHaveBeenCalled();

          // Verify: User state was cleared
          expect(result.current.user).toBeNull();
          expect(result.current.isAuthenticated).toBe(false);

          // Verify: Redirect to home page still happened
          expect(mockNavigate).toHaveBeenCalledWith('/');
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional property: Token consistency
   *
   * Verifies that authentication state is consistent with token storage
   */
  describe('Token Consistency Property', () => {
    it('should maintain consistency between authentication state and stored tokens', async () => {
      await fc.assert(
        fc.asyncProperty(authResponseArbitrary, emailArbitrary, passwordArbitrary, async (authResponse, email, password) => {
          // Setup
          vi.mocked(authApi.login).mockResolvedValue(authResponse);
          vi.mocked(getStoredTokens).mockReturnValue(null);

          const { result } = renderHook(() => useAuth(), { wrapper });

          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });

          // Login
          await act(async () => {
            await result.current.login(email, password);
          });

          // Verify: User is authenticated after login
          expect(result.current.isAuthenticated).toBe(true);
          expect(result.current.user).toEqual(authResponse.user);

          // Logout
          vi.mocked(authApi.logout).mockResolvedValue({ message: 'Success' });
          await act(async () => {
            await result.current.logout();
          });

          // Verify: User is not authenticated after logout
          expect(result.current.isAuthenticated).toBe(false);
          expect(result.current.user).toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });
});
