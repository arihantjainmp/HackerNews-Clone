/**
 * User API Service
 * Handles user profile and activity fetching
 */

import apiClient from './api';
import type { UserProfile } from '../types';

/**
 * Get user profile with recent activities
 */
export const getUserProfile = async (
  username: string,
  page: number = 1,
  limit: number = 20
): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>(`/api/users/${username}`, {
    params: { page, limit }
  });
  return response.data;
};
