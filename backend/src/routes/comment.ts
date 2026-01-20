import { Router, Request, Response } from 'express';
import {
  createComment,
  createReply,
  editComment,
  deleteComment,
  ValidationError,
  NotFoundError,
  ForbiddenError
} from '../services/commentService';
import { authenticateToken } from '../middleware/auth';
import {
  validateRequest,
  createCommentSchema,
  editCommentSchema
} from '../middleware/validation';

const router = Router();

/**
 * POST /api/posts/:postId/comments
 * Create a top-level comment on a post
 * Requires authentication
 * 
 * Request params:
 * - postId: string (post ID)
 * 
 * Request body:
 * - content: string (1-10000 characters, required)
 * 
 * Response:
 * - 201: { comment: IComment }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 * - 404: { error: string } - Post not found
 * 
 * Requirements: 6.8
 */
router.post(
  '/posts/:postId/comments',
  authenticateToken,
  validateRequest(createCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Create top-level comment
      const comment = await createComment({
        content,
        postId,
        authorId: userId
      });

      res.status(201).json({ comment });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * POST /api/comments/:commentId/replies
 * Create a reply to an existing comment
 * Requires authentication
 * 
 * Request params:
 * - commentId: string (parent comment ID)
 * 
 * Request body:
 * - content: string (1-10000 characters, required)
 * 
 * Response:
 * - 201: { comment: IComment }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 * - 404: { error: string } - Parent comment or post not found
 * 
 * Requirements: 6.9
 */
router.post(
  '/comments/:commentId/replies',
  authenticateToken,
  validateRequest(createCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // We need to get the parent comment to find the post_id
      const { Comment } = await import('../models/Comment');
      const parentComment = await Comment.findById(commentId);
      
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Create reply
      const reply = await createReply({
        content,
        parentId: commentId,
        postId: parentComment.post_id.toString(),
        authorId: userId
      });

      res.status(201).json({ comment: reply });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Create reply error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * PUT /api/comments/:id
 * Edit an existing comment
 * Requires authentication and user must be the comment author
 * 
 * Request params:
 * - id: string (comment ID)
 * 
 * Request body:
 * - content: string (1-10000 characters, required)
 * 
 * Response:
 * - 200: { comment: IComment }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Authentication required
 * - 403: { error: string } - User is not the comment author
 * - 404: { error: string } - Comment not found
 * 
 * Requirements: 7.7
 */
router.put(
  '/comments/:id',
  authenticateToken,
  validateRequest(editCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Edit comment
      const comment = await editComment(id, content, userId);

      res.status(200).json({ comment });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Edit comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * DELETE /api/comments/:id
 * Delete a comment (soft delete if has replies, hard delete otherwise)
 * Requires authentication and user must be the comment author
 * 
 * Request params:
 * - id: string (comment ID)
 * 
 * Response:
 * - 200: { message: string }
 * - 401: { error: string } - Authentication required
 * - 403: { error: string } - User is not the comment author
 * - 404: { error: string } - Comment not found
 * 
 * Requirements: 7.8
 */
router.delete(
  '/comments/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId!; // Guaranteed by authenticateToken middleware

      // Delete comment
      await deleteComment(id, userId);

      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

export default router;
