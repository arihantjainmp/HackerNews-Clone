import { Router, Request, Response } from 'express';
import { getPosts, getPostById, createPost } from '../services/postService';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';
import {
  validateRequest,
  validateQuery,
  createPostSchema,
  getPostsQuerySchema,
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/posts
 * Get paginated, sorted, and searchable list of posts
 *
 * Query parameters:
 * - page: number (optional, default: 1, min: 1)
 * - limit: number (optional, default: 25, min: 1, max: 100)
 * - sort: string (optional, default: 'new', values: 'new' | 'top' | 'best')
 * - q: string (optional, search query for title)
 *
 * Response:
 * - 200: { posts: IPostResponse[], total: number, page: number, totalPages: number }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 *
 * Requirements: 4.1
 */
router.get(
  '/',
  optionalAuthenticateToken,
  validateQuery(getPostsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sort, q } = req.query;

    // Convert query parameters to appropriate types
    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as 'new' | 'top' | 'best' | undefined,
      search: q as string | undefined,
      userId: req.userId, // Include userId if authenticated (from optional auth middleware)
    };

    // Get posts with pagination, sorting, and search
    const result = await getPosts(options);

    res.status(200).json(result);
  })
);

/**
 * POST /api/posts
 * Create a new post (link or text)
 * Requires authentication
 *
 * Request body:
 * - title: string (1-300 characters, required)
 * - url: string (optional, valid URL format)
 * - text: string (optional, max 10000 characters)
 * Note: Exactly one of url or text must be provided
 *
 * Response:
 * - 201: { post: IPostResponse }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 *
 * Requirements: 3.9
 */
router.post(
  '/',
  authenticateToken,
  validateRequest(createPostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, url, text } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Create post
    const post = await createPost({
      title,
      url,
      text,
      authorId: userId,
    });

    res.status(201).json({ post });
  })
);

/**
 * GET /api/posts/:id
 * Get a single post by ID with details and comment tree
 *
 * Request params:
 * - id: string (post ID)
 *
 * Response:
 * - 200: { post: IPostResponse, comments: ICommentNode[] }
 * - 404: { error: string } - Post not found
 *
 * Requirements: 4.10
 */
router.get(
  '/:id',
  optionalAuthenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get post by ID with user's vote if authenticated
    const post = await getPostById(id!, req.userId);

    // Get all comments for this post and build tree
    const { Comment } = await import('../models/Comment');
    const { buildCommentTree } = await import('../services/commentService');

    const comments = await Comment.find({ post_id: id })
      .populate('author_id', 'username email created_at')
      .sort({ created_at: 1 }) // Sort by oldest first for proper tree building
      .lean()
      .exec();

    // Transform comments to rename author_id to author for frontend compatibility
    const transformedComments = comments.map((comment: any) => ({
      ...comment,
      author: comment.author_id,
      author_id: comment.author_id?._id || comment.author_id,
    }));

    // Build comment tree
    const commentTree = buildCommentTree(transformedComments);

    res.status(200).json({ post, comments: commentTree });
  })
);

export default router;
