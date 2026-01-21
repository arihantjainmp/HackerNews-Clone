import { Router, Request, Response } from 'express';
import {
  createComment,
  createReply,
  editComment,
  deleteComment
} from '../services/commentService';
import { authenticateToken } from '../middleware/auth';
import {
  validateRequest,
  createCommentSchema,
  editCommentSchema
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

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
  asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Create top-level comment
    const comment = await createComment({
      content,
      postId: postId!,
      authorId: userId
    });

    // Populate author information for frontend
    await comment.populate('author_id', 'username email created_at');
    
    // Transform to rename author_id to author for frontend compatibility
    const commentResponse = {
      ...comment.toObject(),
      author: (comment as any).author_id,
      author_id: comment.author_id._id || comment.author_id
    };

    res.status(201).json({ comment: commentResponse });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // We need to get the parent comment to find the post_id
    const { Comment } = await import('../models/Comment');
    const parentComment = await Comment.findById(commentId);
    
    if (!parentComment) {
      res.status(404).json({ error: 'Parent comment not found' });
      return;
    }

    // Create reply
    const reply = await createReply({
      content,
      parentId: commentId!,
      postId: parentComment.post_id.toString(),
      authorId: userId
    });

    // Populate author information for frontend
    await reply.populate('author_id', 'username email created_at');
    
    // Transform to rename author_id to author for frontend compatibility
    const replyResponse = {
      ...reply.toObject(),
      author: (reply as any).author_id,
      author_id: reply.author_id._id || reply.author_id
    };

    res.status(201).json({ comment: replyResponse });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Edit comment
    const comment = await editComment(id!, content, userId);

    // Populate author information for frontend
    await comment.populate('author_id', 'username email created_at');
    
    // Transform to rename author_id to author for frontend compatibility
    const commentResponse = {
      ...comment.toObject(),
      author: (comment as any).author_id,
      author_id: comment.author_id._id || comment.author_id
    };

    res.status(200).json({ comment: commentResponse });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!; // Guaranteed by authenticateToken middleware

    // Delete comment
    await deleteComment(id!, userId);

    res.status(200).json({ message: 'Comment deleted successfully' });
  })
);

export default router;
