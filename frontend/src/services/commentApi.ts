/**
 * Comment API service
 *
 * Provides functions for comment-related API calls
 * Uses the configured API client with automatic token management
 */

import apiClient from './api';
import type {
  CreateCommentRequest,
  CreateCommentResponse,
  EditCommentRequest,
  EditCommentResponse,
  DeleteCommentResponse,
  VoteRequest,
  VoteResponse,
} from '../types';

/**
 * Create a top-level comment on a post
 *
 * @param postId - Post ID
 * @param content - Comment content (1-10000 characters)
 * @returns Created comment data
 * @throws ValidationError if content is invalid
 * @throws AuthenticationError if not authenticated
 * @throws NotFoundError if post doesn't exist
 */
export const createComment = async (
  postId: string,
  content: string
): Promise<CreateCommentResponse> => {
  const response = await apiClient.post<CreateCommentResponse>(`/api/posts/${postId}/comments`, {
    content,
  } as CreateCommentRequest);

  return response.data;
};

/**
 * Create a reply to an existing comment
 *
 * @param commentId - Parent comment ID
 * @param content - Reply content (1-10000 characters)
 * @returns Created reply data
 * @throws ValidationError if content is invalid
 * @throws AuthenticationError if not authenticated
 * @throws NotFoundError if parent comment doesn't exist
 */
export const createReply = async (
  commentId: string,
  content: string
): Promise<CreateCommentResponse> => {
  const response = await apiClient.post<CreateCommentResponse>(
    `/api/comments/${commentId}/replies`,
    { content } as CreateCommentRequest
  );

  return response.data;
};

/**
 * Edit a comment
 *
 * @param commentId - Comment ID
 * @param content - New content (1-10000 characters)
 * @returns Updated comment data
 * @throws ValidationError if content is invalid
 * @throws AuthenticationError if not authenticated
 * @throws ForbiddenError if user is not the author
 * @throws NotFoundError if comment doesn't exist
 */
export const editComment = async (
  commentId: string,
  content: string
): Promise<EditCommentResponse> => {
  const response = await apiClient.put<EditCommentResponse>(`/api/comments/${commentId}`, {
    content,
  } as EditCommentRequest);

  return response.data;
};

/**
 * Delete a comment
 *
 * @param commentId - Comment ID
 * @returns Success message
 * @throws AuthenticationError if not authenticated
 * @throws ForbiddenError if user is not the author
 * @throws NotFoundError if comment doesn't exist
 */
export const deleteComment = async (commentId: string): Promise<DeleteCommentResponse> => {
  const response = await apiClient.delete<DeleteCommentResponse>(`/api/comments/${commentId}`);

  return response.data;
};

/**
 * Vote on a comment
 *
 * @param commentId - Comment ID
 * @param direction - Vote direction (1 for upvote, -1 for downvote)
 * @returns Updated points and user's current vote
 * @throws AuthenticationError if not authenticated
 * @throws NotFoundError if comment doesn't exist
 */
export const voteOnComment = async (
  commentId: string,
  direction: 1 | -1
): Promise<VoteResponse> => {
  const response = await apiClient.post<VoteResponse>(`/api/comments/${commentId}/vote`, {
    direction,
  } as VoteRequest);

  return response.data;
};
