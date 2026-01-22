import { Router, Request, Response } from 'express';
import { voteOnPost, voteOnComment } from '../services/voteService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, voteSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/posts/:id/vote
 * Vote on a post (upvote or downvote)
 * Requires authentication
 *
 * Request params:
 * - id: string (post ID)
 *
 * Request body:
 * - direction: number (1 for upvote, -1 for downvote)
 *
 * Response:
 * - 200: { points: number, userVote: number }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 * - 404: { error: string } - Post not found
 *
 * Requirements: 5.9
 */
router.post(
  '/posts/:id/vote',
  authenticateToken,
  validateRequest(voteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: postId } = req.params;
    const { direction } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Vote on the post
    const result = await voteOnPost(userId, postId!, direction);

    res.status(200).json(result);
  })
);

/**
 * POST /api/comments/:id/vote
 * Vote on a comment (upvote or downvote)
 * Requires authentication
 *
 * Request params:
 * - id: string (comment ID)
 *
 * Request body:
 * - direction: number (1 for upvote, -1 for downvote)
 *
 * Response:
 * - 200: { points: number, userVote: number }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 * - 404: { error: string } - Comment not found
 *
 * Requirements: 8.8
 */
router.post(
  '/comments/:id/vote',
  authenticateToken,
  validateRequest(voteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: commentId } = req.params;
    const { direction } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Vote on the comment
    const result = await voteOnComment(userId, commentId!, direction);

    res.status(200).json(result);
  })
);

export default router;
