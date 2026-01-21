/**
 * Shared TypeScript type definitions for the Hacker News Clone frontend
 * These types match the backend data models and API contracts
 */

// ============================================================================
// Domain Models
// ============================================================================

/**
 * User entity representing a registered account
 */
export interface User {
  _id: string;
  username: string;
  email: string;
  created_at: string; // ISO 8601 date string
}

/**
 * Post entity - can be either a link or text post
 */
export interface Post {
  _id: string;
  title: string;
  url?: string; // Present for link posts
  text?: string; // Present for text posts
  type: 'link' | 'text';
  author_id: string;
  author?: User; // Populated author data
  points: number;
  comment_count: number;
  created_at: string; // ISO 8601 date string
  userVote?: number; // -1, 0, or 1 (only present when user is authenticated)
}

/**
 * Comment entity with support for nested replies
 */
export interface Comment {
  _id: string;
  content: string;
  post_id: string;
  parent_id: string | null; // null for top-level comments
  author_id: string;
  author?: User; // Populated author data
  points: number;
  created_at: string; // ISO 8601 date string
  edited_at?: string; // ISO 8601 date string, present if edited
  is_deleted: boolean;
}

/**
 * Vote entity representing a user's vote on a post or comment
 */
export interface Vote {
  _id: string;
  user_id: string;
  target_id: string; // ID of post or comment
  target_type: 'post' | 'comment';
  direction: 1 | -1; // 1 for upvote, -1 for downvote
  created_at: string; // ISO 8601 date string
}

/**
 * Comment node for building nested comment trees
 */
export interface CommentNode {
  comment: Comment;
  replies: CommentNode[];
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for user registration
 */
export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * Request body for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request body for token refresh
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Request body for logout
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Request body for creating a post
 */
export interface CreatePostRequest {
  title: string;
  url?: string;
  text?: string;
}

/**
 * Request body for creating a comment
 */
export interface CreateCommentRequest {
  content: string;
}

/**
 * Request body for editing a comment
 */
export interface EditCommentRequest {
  content: string;
}

/**
 * Request body for voting
 */
export interface VoteRequest {
  direction: 1 | -1;
}

/**
 * Query parameters for fetching posts
 */
export interface GetPostsParams {
  page?: number;
  limit?: number;
  sort?: 'new' | 'top' | 'best';
  q?: string; // Search query
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from authentication endpoints (signup, login)
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response from token refresh endpoint
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Response from logout endpoint
 */
export interface LogoutResponse {
  message: string;
}

/**
 * Response from post creation endpoint
 */
export interface CreatePostResponse {
  post: Post;
}

/**
 * Response from get posts endpoint (paginated)
 */
export interface GetPostsResponse {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Response from get single post endpoint
 */
export interface GetPostResponse {
  post: Post;
  comments: CommentNode[];
}

/**
 * Response from comment creation endpoint
 */
export interface CreateCommentResponse {
  comment: Comment;
}

/**
 * Response from comment edit endpoint
 */
export interface EditCommentResponse {
  comment: Comment;
}

/**
 * Response from comment deletion endpoint
 */
export interface DeleteCommentResponse {
  message: string;
}

/**
 * Response from vote endpoints
 */
export interface VoteResponse {
  points: number;
  userVote: number; // -1, 0, or 1
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Validation error detail for a specific field
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Error response from API endpoints
 */
export interface ErrorResponse {
  error: string;
  errors?: ValidationErrorDetail[]; // Present for validation errors (400)
}

/**
 * Rate limit error response
 */
export interface RateLimitErrorResponse extends ErrorResponse {
  retryAfter?: number; // Seconds until retry is allowed
}

// ============================================================================
// Frontend-Specific Types
// ============================================================================

/**
 * Authentication context state
 */
export interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
}

/**
 * Stored tokens in localStorage
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Sort options for posts
 */
export type SortOption = 'new' | 'top' | 'best';

/**
 * Form validation error
 */
export interface FormError {
  field: string;
  message: string;
}

/**
 * Form state for authentication forms
 */
export interface AuthFormState {
  isSubmitting: boolean;
  errors: FormError[];
  serverError: string | null;
}

/**
 * Post form state
 */
export interface PostFormState {
  title: string;
  url: string;
  text: string;
  postType: 'link' | 'text';
  isSubmitting: boolean;
  errors: FormError[];
  serverError: string | null;
}

/**
 * Comment form state
 */
export interface CommentFormState {
  content: string;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Vote state for a post or comment
 */
export interface VoteState {
  userVote: number; // -1, 0, or 1
  points: number;
  isVoting: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Omit password_hash from User type for client-side use
 */
export type SafeUser = Omit<User, 'password_hash'>;

/**
 * Post with populated author
 */
export type PostWithAuthor = Post & {
  author: User;
};

/**
 * Comment with populated author
 */
export type CommentWithAuthor = Comment & {
  author: User;
};

/**
 * API error with optional validation details
 */
export type ApiError = ErrorResponse | RateLimitErrorResponse;

/**
 * Generic API response wrapper
 */
export type ApiResponse<T> = {
  data: T;
  status: number;
};

/**
 * Async operation result
 */
export type AsyncResult<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};
