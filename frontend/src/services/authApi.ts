/**
 * Authentication API service
 *
 * Provides functions for authentication-related API calls
 * Uses the configured API client with automatic cookie-based management
 */

import apiClient from './api';
import type {
  SignupRequest,
  LoginRequest,
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
 * @returns User data (tokens are handled via HttpOnly cookies)
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

  return response.data;
};

/**
 * Login with existing credentials
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns User data (tokens are handled via HttpOnly cookies)
 * @throws AuthenticationError if credentials are invalid
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  } as LoginRequest);

  return response.data;
};

/**
 * Refresh access token using refresh token cookie
 *
 * Note: This is typically called automatically by the API client interceptor
 * when a 401 error is encountered.
 *
 * @returns Success message
 * @throws AuthenticationError if refresh token is invalid or expired
 */
export const refreshAccessToken = async (): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>('/api/auth/refresh', {});
  return response.data;
};

/**
 * Logout and invalidate refresh token cookie
 *
 * @returns Success message
 */
export const logout = async (): Promise<LogoutResponse> => {
  const response = await apiClient.post<LogoutResponse>('/api/auth/logout', {});
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
