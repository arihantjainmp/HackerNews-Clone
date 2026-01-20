import { Router, Request, Response } from 'express';
import { voteOnPost, voteOnComment } from '../services/voteService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, voteSchema } from '../middleware/validation';

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
  async (req: Request, res: Response) => {
    try {
      const { id: postId } = req.params;
      const { direction } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Vote on the post
      const result = await voteOnPost(userId, postId, direction);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: 'Post not found' });
      } else {
        console.error('Vote on post error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
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
  async (req: Request, res: Response) => {
    try {
      const { id: commentId } = req.params;
      const { direction } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Vote on the comment
      const result = await voteOnComment(userId, commentId, direction);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: 'Comment not found' });
      } else {
        console.error('Vote on comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

export default router;
