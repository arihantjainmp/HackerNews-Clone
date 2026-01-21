import { Post, IPost } from '../models/Post';
import { Types } from 'mongoose';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

/**
 * Post Service
 * Handles post creation, retrieval, sorting, and search functionality
 */

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error for not found resources
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Post creation data interface
 */
export interface ICreatePostData {
  title: string;
  url?: string;
  text?: string;
  authorId: string;
}

/**
 * Post response interface (with populated author)
 */
export interface IPostResponse {
  _id: string;
  title: string;
  url?: string;
  text?: string;
  type: 'link' | 'text';
  author_id: string;
  points: number;
  comment_count: number;
  created_at: Date;
}

/**
 * Calculate the "best" score for a post using Hacker News algorithm
 * Formula: points / ((hours_since_creation + 2) ^ 1.8)
 * 
 * The gravity constant (1.8) causes older posts to decay in ranking.
 * The +2 offset prevents division issues for very new posts.
 * 
 * @param post - Post document with points and created_at
 * @returns Calculated best score
 */
export function calculateBestScore(post: IPost): number {
  const GRAVITY = 1.8;
  const now = new Date();
  const hoursOld = (now.getTime() - post.created_at.getTime()) / (1000 * 60 * 60);
  return post.points / Math.pow(hoursOld + 2, GRAVITY);
}

/**
 * Sort posts by "new" - most recent first
 * Orders by created_at timestamp in descending order
 * 
 * @param posts - Array of posts to sort
 * @returns Sorted array (newest first)
 */
export function sortByNew(posts: IPost[]): IPost[] {
  return [...posts].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

/**
 * Sort posts by "top" - highest points first
 * Orders by points in descending order
 * 
 * @param posts - Array of posts to sort
 * @returns Sorted array (highest points first)
 */
export function sortByTop(posts: IPost[]): IPost[] {
  return [...posts].sort((a, b) => b.points - a.points);
}

/**
 * Sort posts by "best" - Hacker News ranking algorithm
 * Orders by calculated score: points / ((hours + 2) ^ 1.8)
 * This balances recency and popularity
 * 
 * @param posts - Array of posts to sort
 * @returns Sorted array (best score first)
 */
export function sortByBest(posts: IPost[]): IPost[] {
  return [...posts].sort((a, b) => calculateBestScore(b) - calculateBestScore(a));
}

/**
 * Options for retrieving posts with pagination, sorting, and search
 */
export interface IGetPostsOptions {
  page?: number;
  limit?: number;
  sort?: 'new' | 'top' | 'best';
  search?: string;
}

/**
 * Response for paginated posts
 */
export interface IGetPostsResponse {
  posts: IPostResponse[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Escape special regex characters in a string
 * This prevents regex injection and ensures literal string matching
 * 
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get paginated posts with sorting and search functionality
 * 
 * Features:
 * - Pagination with configurable page and limit (defaults: page=1, limit=25)
 * - Three sorting methods: new (by date), top (by points), best (HN algorithm)
 * - Case-insensitive search on title field
 * - Populates author data for each post
 * 
 * @param options - Query options for pagination, sorting, and search
 * @returns Promise resolving to paginated posts with metadata
 */
export async function getPosts(options: IGetPostsOptions = {}): Promise<IGetPostsResponse> {
  // Set defaults
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 25;
  const sort = options.sort || 'new';
  const search = options.search?.trim();

  // Build query filter
  const filter: any = {};
  
  // Add case-insensitive search on title if provided
  // Escape special regex characters to prevent regex injection
  if (search && search.length > 0) {
    const escapedSearch = escapeRegex(search);
    filter.title = { $regex: escapedSearch, $options: 'i' };
  }

  // Get total count for pagination metadata
  const total = await Post.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Fetch posts with author population
  // For "new" and "top" sorts, use database sorting for efficiency
  // For "best" sort, fetch all matching posts and sort in memory (requires calculation)
  let posts: any[];
  
  if (sort === 'best') {
    // For "best" sort, we need to calculate scores in memory
    // Fetch all matching posts (not just the page) to ensure correct ranking
    const allPosts = await Post.find(filter)
      .populate('author_id', 'username email created_at')
      .lean()
      .exec();
    
    // Sort by best score
    const sortedPosts = sortByBest(allPosts as IPost[]);
    
    // Apply pagination after sorting
    posts = sortedPosts.slice(skip, skip + limit);
  } else {
    // For "new" and "top", use database sorting
    const sortField = sort === 'top' ? { points: -1 } : { created_at: -1 };
    
    posts = await Post.find(filter)
      .populate('author_id', 'username email created_at')
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  // Transform posts to response format
  const postsResponse: IPostResponse[] = posts.map((post: any) => ({
    _id: post._id.toString(),
    title: post.title,
    url: post.url,
    text: post.text,
    type: post.type,
    author_id: post.author_id._id ? post.author_id._id.toString() : post.author_id.toString(),
    points: post.points,
    comment_count: post.comment_count,
    created_at: post.created_at
  }));

  return {
    posts: postsResponse,
    total,
    page,
    totalPages
  };
}

/**
 * Get a single post by ID with populated author data
 * 
 * @param postId - The ID of the post to retrieve
 * @returns Promise resolving to post with author data
 * @throws NotFoundError if post doesn't exist
 */
export async function getPostById(postId: string): Promise<IPostResponse> {
  // Validate ObjectId format
  if (!Types.ObjectId.isValid(postId)) {
    throw new NotFoundError('Post not found');
  }

  // Find post and populate author data
  const post = await Post.findById(postId)
    .populate('author_id', 'username email created_at')
    .lean()
    .exec();

  // Return 404 if post doesn't exist
  if (!post) {
    throw new NotFoundError('Post not found');
  }

  // Transform to response format
  return {
    _id: post._id.toString(),
    title: post.title,
    url: post.url,
    text: post.text,
    type: post.type,
    author_id: post.author_id._id ? post.author_id._id.toString() : post.author_id.toString(),
    points: post.points,
    comment_count: post.comment_count,
    created_at: post.created_at
  };
}

/**
 * Create a new post with either URL or text content
 * 
 * Validates:
 * - Exactly one of url or text is provided (not both, not neither)
 * - Title length is between 1-300 characters
 * - Title is not empty or only whitespace
 * 
 * Initializes:
 * - points to 0
 * - comment_count to 0
 * - Sets type based on url/text presence
 * - Records author_id and created_at timestamp
 * 
 * @param data - Post creation data containing title, url/text, and authorId
 * @returns Promise resolving to created post
 * @throws ValidationError if validation fails
 */
export async function createPost(data: ICreatePostData): Promise<IPostResponse> {
  const { title, url, text, authorId } = data;

  // Sanitize title to prevent XSS attacks
  const sanitizedTitle = sanitizeText(title);

  // Validate title is not empty or only whitespace after sanitization
  if (!sanitizedTitle || sanitizedTitle.trim().length === 0) {
    throw new ValidationError('Title cannot be empty or contain only whitespace');
  }

  // Validate title length (1-300 characters)
  const trimmedTitle = sanitizedTitle.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 300) {
    throw new ValidationError('Title must be between 1 and 300 characters');
  }

  // Sanitize and validate url and text
  let sanitizedUrl: string | undefined;
  let sanitizedText: string | undefined;

  if (url && url.trim()) {
    sanitizedUrl = sanitizeUrl(url.trim());
    // If URL was sanitized to empty string, it was dangerous
    if (!sanitizedUrl) {
      throw new ValidationError('Invalid or unsafe URL provided');
    }
  }

  if (text && text.trim()) {
    sanitizedText = sanitizeText(text.trim());
  }

  // Validate exactly one of url or text is provided
  const hasUrl = Boolean(sanitizedUrl);
  const hasText = Boolean(sanitizedText);

  if (hasUrl && hasText) {
    throw new ValidationError('Post must have either url or text, but not both');
  }

  if (!hasUrl && !hasText) {
    throw new ValidationError('Post must have either url or text');
  }

  try {
    // Create post in database with sanitized content
    // The Post model's pre-validation hook will:
    // - Set type based on url/text presence
    // - Validate URL format if provided
    // - Initialize points to 0 and comment_count to 0 (via schema defaults)
    const post = await Post.create({
      title: trimmedTitle,
      url: sanitizedUrl,
      text: sanitizedText,
      author_id: new Types.ObjectId(authorId),
      // points and comment_count are initialized to 0 by schema defaults
      // created_at is set to current timestamp by schema default
    });

    // Return post data
    return {
      _id: post._id.toString(),
      title: post.title,
      url: post.url,
      text: post.text,
      type: post.type,
      author_id: post.author_id.toString(),
      points: post.points,
      comment_count: post.comment_count,
      created_at: post.created_at
    };
  } catch (error: any) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      throw new ValidationError(messages.join(', '));
    }
    // Re-throw other errors
    throw error;
  }
}
