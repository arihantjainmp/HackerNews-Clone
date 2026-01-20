import { Router, Request, Response } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  ValidationError,
  NotFoundError
} from '../services/postService';
import { authenticateToken } from '../middleware/auth';
import {
  validateRequest,
  validateQuery,
  createPostSchema,
  getPostsQuerySchema
} from '../middleware/validation';

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
router.get('/', validateQuery(getPostsQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, sort, q } = req.query;

    // Convert query parameters to appropriate types
    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as 'new' | 'top' | 'best' | undefined,
      search: q as string | undefined
    };

    // Get posts with pagination, sorting, and search
    const result = await getPosts(options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
  async (req: Request, res: Response) => {
    try {
      const { title, url, text } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Create post
      const post = await createPost({
        title,
        url,
        text,
        authorId: userId
      });

      res.status(201).json({ post });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * GET /api/posts/:id
 * Get a single post by ID with details
 * 
 * Request params:
 * - id: string (post ID)
 * 
 * Response:
 * - 200: { post: IPostResponse }
 * - 404: { error: string } - Post not found
 * 
 * Requirements: 4.10
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get post by ID
    const post = await getPostById(id);

    res.status(200).json({ post });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Get post by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
