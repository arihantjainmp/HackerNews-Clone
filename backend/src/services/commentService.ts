import { Comment, IComment } from '../models/Comment';
import { Post } from '../models/Post';
import { Types } from 'mongoose';
import { sanitizeText } from '../utils/sanitize';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { cache } from '../utils/cache';

/**
 * Comment Service
 * Handles comment creation, editing, deletion, and tree building
 */

/**
 * Comment node interface for tree structure
 * Represents a comment with its nested replies
 */
export interface ICommentNode {
  comment: IComment;
  replies: ICommentNode[];
}

/**
 * Build comment tree using two-pass algorithm
 * 
 * Algorithm:
 * 1. First pass: Create a map of comment ID to node for O(1) lookup
 * 2. Second pass: Build parent-child relationships by linking nodes
 * 
 * Time complexity: O(n) where n is the number of comments
 * Space complexity: O(n) for the map and tree structure
 * 
 * Handles deleted comments by preserving structure with "[deleted]" content
 * 
 * @param comments - Array of comments to organize into tree
 * @returns Array of root-level comment nodes with nested replies
 */
export function buildCommentTree(comments: IComment[]): ICommentNode[] {
  // First pass: Create a map for O(1) lookup
  const commentMap = new Map<string, ICommentNode>();
  const rootComments: ICommentNode[] = [];

  // Initialize all comment nodes
  for (const comment of comments) {
    commentMap.set(comment._id.toString(), {
      comment,
      replies: []
    });
  }

  // Second pass: Build tree structure by linking parents and children
  for (const comment of comments) {
    const node = commentMap.get(comment._id.toString())!;

    if (comment.parent_id === null) {
      // Top-level comment (no parent)
      rootComments.push(node);
    } else {
      // Reply to another comment
      const parentNode = commentMap.get(comment.parent_id.toString());
      if (parentNode) {
        parentNode.replies.push(node);
      }
      // If parent doesn't exist, comment is orphaned (shouldn't happen with referential integrity)
      // In this case, we silently skip it rather than adding to root
    }
  }

  return rootComments;
}

/**
 * Validate comment content
 * Ensures content is not empty/whitespace and within length constraints
 * Also sanitizes content to prevent XSS attacks
 * 
 * @param content - The comment content to validate
 * @returns Sanitized content
 * @throws ValidationError if content is invalid
 */
function validateAndSanitizeCommentContent(content: string): string {
  // Sanitize content first to prevent XSS attacks
  const sanitizedContent = sanitizeText(content);

  // Check if content is empty or only whitespace after sanitization
  if (!sanitizedContent || sanitizedContent.trim().length === 0) {
    throw new ValidationError('Comment content cannot be empty or only whitespace');
  }

  // Check length constraints (1-10000 characters)
  if (sanitizedContent.length < 1) {
    throw new ValidationError('Comment content must be at least 1 character');
  }

  if (sanitizedContent.length > 10000) {
    throw new ValidationError('Comment content must not exceed 10000 characters');
  }

  return sanitizedContent;
}

/**
 * Create a top-level comment on a post
 * Uses atomic operations to ensure consistency when incrementing post's comment_count
 * 
 * @param data - Comment creation data
 * @param data.content - The comment text content
 * @param data.postId - The ID of the post being commented on
 * @param data.authorId - The ID of the user creating the comment
 * @returns The created comment document
 * @throws ValidationError if content is invalid
 * @throws NotFoundError if post doesn't exist
 */
export async function createComment(data: {
  content: string;
  postId: string;
  authorId: string;
}): Promise<IComment> {
  const { content, postId, authorId } = data;

  // Validate and sanitize content
  const sanitizedContent = validateAndSanitizeCommentContent(content);

  // Validate ObjectIds
  if (!Types.ObjectId.isValid(postId)) {
    throw new ValidationError('Invalid post ID');
  }
  if (!Types.ObjectId.isValid(authorId)) {
    throw new ValidationError('Invalid author ID');
  }

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new NotFoundError('Post not found');
  }

  // Create the comment with parent_id = null (top-level comment)
  const comment = new Comment({
    content: sanitizedContent,
    post_id: new Types.ObjectId(postId),
    parent_id: null,
    author_id: new Types.ObjectId(authorId),
    points: 0,
    created_at: new Date(),
    is_deleted: false
  });

  await comment.save();

  // Atomically increment post's comment_count using $inc
  // This ensures consistency even with concurrent comment creation
  await Post.findByIdAndUpdate(
    postId,
    { $inc: { comment_count: 1 } }
  );

  // Invalidate post list caches since comment_count changed
  cache.invalidateByPrefix('posts');

  return comment;
}

/**
 * Create a reply to an existing comment
 * Uses atomic operations to ensure consistency when incrementing post's comment_count
 * 
 * @param data - Reply creation data
 * @param data.content - The reply text content
 * @param data.parentId - The ID of the parent comment being replied to
 * @param data.postId - The ID of the post (for reference)
 * @param data.authorId - The ID of the user creating the reply
 * @returns The created reply comment document
 * @throws ValidationError if content is invalid
 * @throws NotFoundError if parent comment or post doesn't exist
 */
export async function createReply(data: {
  content: string;
  parentId: string;
  postId: string;
  authorId: string;
}): Promise<IComment> {
  const { content, parentId, postId, authorId } = data;

  // Validate and sanitize content
  const sanitizedContent = validateAndSanitizeCommentContent(content);

  // Validate ObjectIds
  if (!Types.ObjectId.isValid(parentId)) {
    throw new ValidationError('Invalid parent comment ID');
  }
  if (!Types.ObjectId.isValid(postId)) {
    throw new ValidationError('Invalid post ID');
  }
  if (!Types.ObjectId.isValid(authorId)) {
    throw new ValidationError('Invalid author ID');
  }

  // Verify parent comment exists
  const parentComment = await Comment.findById(parentId);
  if (!parentComment) {
    throw new NotFoundError('Parent comment not found');
  }

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new NotFoundError('Post not found');
  }

  // Create the reply with parent_id set to parent comment ID
  const reply = new Comment({
    content: sanitizedContent,
    post_id: new Types.ObjectId(postId),
    parent_id: new Types.ObjectId(parentId),
    author_id: new Types.ObjectId(authorId),
    points: 0,
    created_at: new Date(),
    is_deleted: false
  });

  await reply.save();

  // Atomically increment post's comment_count using $inc
  // This ensures consistency even with concurrent comment creation
  await Post.findByIdAndUpdate(
    postId,
    { $inc: { comment_count: 1 } }
  );

  // Invalidate post list caches since comment_count changed
  cache.invalidateByPrefix('posts');

  return reply;
}

/**
 * Edit an existing comment
 * Verifies that the user is the comment author before allowing edit
 * Validates new content using same rules as comment creation
 * Updates content and sets edited_at timestamp
 * 
 * @param commentId - The ID of the comment to edit
 * @param content - The new content for the comment
 * @param userId - The ID of the user attempting to edit
 * @returns The updated comment document
 * @throws ValidationError if content is invalid or IDs are invalid
 * @throws NotFoundError if comment doesn't exist
 * @throws ForbiddenError if user is not the comment author
 */
export async function editComment(
  commentId: string,
  content: string,
  userId: string
): Promise<IComment> {
  // Validate and sanitize content
  const sanitizedContent = validateAndSanitizeCommentContent(content);

  // Validate ObjectIds
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ValidationError('Invalid comment ID');
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Verify user is the comment author
  if (comment.author_id.toString() !== userId) {
    throw new ForbiddenError('You can only edit your own comments');
  }

  // Update content and set edited_at timestamp
  comment.content = sanitizedContent;
  comment.edited_at = new Date();

  await comment.save();

  return comment;
}

/**
 * Delete a comment with soft delete logic
 * Uses atomic operations to ensure consistency
 * 
 * Deletion logic:
 * - If comment has replies: Soft delete (set is_deleted=true, content="[deleted]")
 * - If comment has no replies: Hard delete and decrement post's comment_count
 * 
 * @param commentId - The ID of the comment to delete
 * @param userId - The ID of the user attempting to delete
 * @throws ValidationError if IDs are invalid
 * @throws NotFoundError if comment doesn't exist
 * @throws ForbiddenError if user is not the comment author
 */
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<void> {
  // Validate ObjectIds
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ValidationError('Invalid comment ID');
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Verify user is the comment author
  if (comment.author_id.toString() !== userId) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  // Check if comment has replies
  const replyCount = await Comment.countDocuments({
    parent_id: new Types.ObjectId(commentId)
  });

  if (replyCount > 0) {
    // Soft delete: Comment has replies, preserve structure
    comment.is_deleted = true;
    comment.content = '[deleted]';
    await comment.save();
  } else {
    // Hard delete: No replies, remove comment and decrement count
    // Use atomic operations to ensure consistency
    await Comment.findByIdAndDelete(commentId);
    
    // Atomically decrement post's comment_count
    await Post.findByIdAndUpdate(
      comment.post_id,
      { $inc: { comment_count: -1 } }
    );
  }
}
