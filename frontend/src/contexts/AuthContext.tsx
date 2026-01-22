/**
 * Authentication Context
 *
 * Provides authentication state and functions throughout the application.
 * Handles user login, signup, logout, and automatic token refresh.
 *
 * Requirements:
 * - 11.2: Restore authentication state on mount
 * - 11.6: Clear state on logout
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../services/authApi';
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
   * Restore authentication state on mount
   * Attempts to fetch the current user using the access token cookie
   */
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        // Fetch current user data (will succeed if valid cookie exists)
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        // User is not authenticated or token expired
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthState();
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await authApi.login(email, password);
      setUser(response.user);
      navigate('/');
    },
    [navigate]
  );

  /**
   * Sign up with username, email, and password
   */
  const signup = useCallback(
    async (username: string, email: string, password: string): Promise<void> => {
      const response = await authApi.signup(username, email, password);
      setUser(response.user);
      navigate('/');
    },
    [navigate]
  );

  /**
   * Logout and clear authentication state
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  /**
   * Manually refresh access token
   * Note: This is typically handled automatically by the API client interceptor
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await authApi.refreshAccessToken();
    } catch (error) {
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
