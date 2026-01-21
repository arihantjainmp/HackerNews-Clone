/**
 * Post API service
 *
 * Provides functions for post-related API calls
 * Uses the configured API client with automatic token management
 */

import apiClient from './api';
import type {
  CreatePostRequest,
  CreatePostResponse,
  GetPostsParams,
  GetPostsResponse,
  GetPostResponse,
  VoteRequest,
  VoteResponse,
} from '../types';

/**
 * Create a new post (link or text)
 *
 * @param title - Post title (1-300 characters)
 * @param url - Optional URL for link posts
 * @param text - Optional text content for text posts
 * @returns Created post data
 * @throws ValidationError if inputs are invalid
 * @throws AuthenticationError if not authenticated
 */
export const createPost = async (
  title: string,
  url?: string,
  text?: string
): Promise<CreatePostResponse> => {
  const response = await apiClient.post<CreatePostResponse>('/api/posts', {
    title,
    url,
    text,
  } as CreatePostRequest);

  return response.data;
};

/**
 * Get paginated list of posts with optional sorting and search
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated posts with metadata
 */
export const getPosts = async (params?: GetPostsParams): Promise<GetPostsResponse> => {
  const response = await apiClient.get<GetPostsResponse>('/api/posts', {
    params,
  });

  return response.data;
};

/**
 * Get a single post by ID with its comment tree
 *
 * @param postId - Post ID
 * @returns Post data with nested comments
 * @throws NotFoundError if post doesn't exist
 */
export const getPostById = async (postId: string): Promise<GetPostResponse> => {
  const response = await apiClient.get<GetPostResponse>(`/api/posts/${postId}`);

  return response.data;
};

/**
 * Vote on a post
 *
 * @param postId - Post ID
 * @param direction - Vote direction (1 for upvote, -1 for downvote)
 * @returns Updated points and user's current vote
 * @throws AuthenticationError if not authenticated
 * @throws NotFoundError if post doesn't exist
 */
export const voteOnPost = async (postId: string, direction: 1 | -1): Promise<VoteResponse> => {
  const response = await apiClient.post<VoteResponse>(`/api/posts/${postId}/vote`, {
    direction,
  } as VoteRequest);

  return response.data;
};
