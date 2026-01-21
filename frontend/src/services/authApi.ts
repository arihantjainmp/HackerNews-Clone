/**
 * Authentication API service
 *
 * Provides functions for authentication-related API calls
 * Uses the configured API client with automatic token management
 */

import apiClient, { setStoredTokens, clearStoredTokens } from './api';
import type {
  SignupRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
  AuthResponse,
  RefreshTokenResponse,
  LogoutResponse,
} from '../types';

/**
 * Register a new user account
 *
 * @param username - Unique username (3-20 characters)
 * @param email - Valid email address
 * @param password - Password meeting strength requirements
 * @returns User data and authentication tokens
 * @throws ValidationError if inputs are invalid
 * @throws ConflictError if username/email already exists
 */
export const signup = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/signup', {
    username,
    email,
    password,
  } as SignupRequest);

  // Store tokens in localStorage
  setStoredTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
};

/**
 * Login with existing credentials
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns User data and authentication tokens
 * @throws AuthenticationError if credentials are invalid
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  } as LoginRequest);

  // Store tokens in localStorage
  setStoredTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
};

/**
 * Refresh access token using refresh token
 *
 * Note: This is typically called automatically by the API client interceptor
 * when a 401 error is encountered. You rarely need to call this manually.
 *
 * @param refreshToken - Valid refresh token
 * @returns New access token and refresh token
 * @throws AuthenticationError if refresh token is invalid or expired
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>('/api/auth/refresh', {
    refreshToken,
  } as RefreshTokenRequest);

  // Store new tokens
  setStoredTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
};

/**
 * Logout and invalidate refresh token
 *
 * @param refreshToken - Current refresh token to invalidate
 * @returns Success message
 */
export const logout = async (refreshToken: string): Promise<LogoutResponse> => {
  const response = await apiClient.post<LogoutResponse>('/api/auth/logout', {
    refreshToken,
  } as LogoutRequest);

  // Clear stored tokens
  clearStoredTokens();

  return response.data;
};

/**
 * Get current authenticated user's information
 *
 * @returns Current user data
 * @throws AuthenticationError if not authenticated or token is invalid
 */
export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  const response = await apiClient.get<{ user: AuthResponse['user'] }>('/api/auth/me');
  return response.data.user;
};
