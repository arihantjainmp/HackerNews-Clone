/**
 * Authentication Context
 *
 * Provides authentication state and functions throughout the application.
 * Handles user login, signup, logout, and automatic token refresh.
 *
 * Requirements:
 * - 11.1: Store Access_Token and Refresh_Token on successful login
 * - 11.2: Restore authentication state from stored tokens on mount
 * - 11.6: Clear tokens and redirect on logout
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../services/authApi';
import { getStoredTokens, clearStoredTokens } from '../services/api';
import type { User, AuthContextState } from '../types';

// ============================================================================
// Context Definition
// ============================================================================

const AuthContext = createContext<AuthContextState | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Restore authentication state from stored tokens on mount
   * Requirement 11.2: Restore auth state from stored tokens
   */
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        const tokens = getStoredTokens();

        if (!tokens) {
          // No tokens stored - user is not authenticated
          setIsLoading(false);
          return;
        }

        // Tokens exist - fetch current user data
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Failed to get user data - clear tokens
          clearStoredTokens();
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        clearStoredTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthState();
  }, []);

  /**
   * Login with email and password
   * Requirement 11.1: Store tokens on successful login
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await authApi.login(email, password);

      // Tokens are already stored by authApi.login
      // Set user state
      setUser(response.user);

      // Navigate to home page
      navigate('/');
    },
    [navigate]
  );

  /**
   * Sign up with username, email, and password
   * Requirement 11.1: Store tokens on successful signup
   */
  const signup = useCallback(
    async (username: string, email: string, password: string): Promise<void> => {
      const response = await authApi.signup(username, email, password);

      // Tokens are already stored by authApi.signup
      // Set user state
      setUser(response.user);

      // Navigate to home page
      navigate('/');
    },
    [navigate]
  );

  /**
   * Logout and clear authentication state
   * Requirement 11.6: Clear tokens and redirect on logout
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      const tokens = getStoredTokens();

      if (tokens?.refreshToken) {
        // Call logout API to invalidate refresh token on server
        await authApi.logout(tokens.refreshToken);
      }
    } catch (error) {
      // Log error but continue with local cleanup
      console.error('Logout API call failed:', error);
    } finally {
      // Clear tokens from localStorage (already done by authApi.logout)
      clearStoredTokens();

      // Clear user state
      setUser(null);

      // Redirect to home page
      navigate('/');
    }
  }, [navigate]);

  /**
   * Manually refresh access token
   * Note: This is typically handled automatically by the API client interceptor
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const tokens = getStoredTokens();

      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      await authApi.refreshAccessToken(tokens.refreshToken);
      // Tokens are automatically stored by authApi.refreshAccessToken
    } catch (error) {
      // If refresh fails, clear auth state and redirect to login
      clearStoredTokens();
      setUser(null);
      navigate('/login');
      throw error;
    }
  }, [navigate]);

  // Compute isAuthenticated based on user state
  const isAuthenticated = user !== null && user?._id !== '';

  const value: AuthContextState = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook for consuming context
// ============================================================================

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 */
export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// ============================================================================
// Export
// ============================================================================

export default AuthContext;
