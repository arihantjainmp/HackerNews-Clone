/**
 * CommentThread Component (Recursive)
 *
 * Renders a nested tree of comments with recursive rendering for replies
 *
 * Features:
 * - Accept array of comment nodes with nested replies
 * - Render CommentItem for each comment
 * - Recursively render CommentThread for replies with increased indentation
 * - Use depth parameter to control indentation (ml-4 per level)
 * - Handle deeply nested comments gracefully
 * - Implement "Load more replies" for deeply nested comments (Requirement 22.2)
 * - Add pagination for large comment trees (Requirement 22.2)
 * - Auto-expand and scroll to focused comment
 *
 * Requirements: 10.1, 10.2, 22.2
 */

import React, { useState, useEffect } from 'react';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import type { CommentNode, Comment } from '../types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum depth before showing "continue thread" link
 * Requirement 22.2: Virtualize or paginate deeply nested comments
 */
const MAX_DEPTH_BEFORE_COLLAPSE = 3;

/**
 * Number of comments to show initially at each level
 * Requirement 22.2: Paginate large comment trees
 */
const INITIAL_COMMENTS_TO_SHOW = 5;

/**
 * Number of additional comments to load when "Load more" is clicked
 */
const LOAD_MORE_INCREMENT = 10;

// ============================================================================
// Component Props
// ============================================================================

interface CommentThreadProps {
  /**
   * Array of comment nodes with nested replies
   */
  comments: CommentNode[];

  /**
   * Current nesting depth (0 for root level)
   * Used to control indentation
   */
  depth?: number;

  /**
   * Maximum depth to render before collapsing
   * Helps handle deeply nested comments gracefully
   */
  maxDepth?: number;

  /**
   * Callback when reply button is clicked
   */
  onReply?: (commentId: string) => void;

  /**
   * Callback when comment is edited
   */
  onEdit?: (commentId: string, newContent: string) => void;

  /**
   * Callback when comment is deleted
   */
  onDelete?: (commentId: string) => void;

  /**
   * Callback when vote is updated
   */
  onVoteUpdate?: (commentId: string, newPoints: number, newUserVote: number) => void;

  /**
   * Map of comment IDs to user vote states
   * Used to display current vote state for each comment
   */
  userVotes?: Record<string, number>;

  /**
   * ID of comment currently being replied to
   */
  replyingTo?: string | null;

  /**
   * Callback when reply is created
   */
  onReplyCreated?: (comment: Comment) => void;

  /**
   * Callback when reply is cancelled
   */
  onReplyCancel?: () => void;

  /**
   * ID of comment to focus on (auto-expand and scroll to)
   */
  focusedCommentId?: string | null;

  /**
   * ID of comment to highlight
   */
  highlightedCommentId?: string | null;

  /**
   * Post ID for generating permalinks
   */
  postId?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CommentThread renders a nested tree of comments recursively
 *
 * Each level of nesting increases the left margin by 16px (ml-4 in Tailwind)
 * to visually indicate the comment hierarchy.
 *
 * For deeply nested comments (beyond maxDepth), we implement "continue thread"
 * functionality to prevent excessive nesting and improve performance.
 *
 * For large comment lists at any level, we implement pagination with
 * "Load more" buttons to improve initial render performance.
 *
 * Requirement 10.1: Render all comments in a nested tree structure
 * Requirement 10.2: Indent child comments to indicate nesting level
 * Requirement 22.2: Virtualize or paginate deeply nested comments
 */
export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  depth = 0,
  maxDepth = MAX_DEPTH_BEFORE_COLLAPSE,
  onReply,
  onEdit,
  onDelete,
  onVoteUpdate,
  userVotes = {},
  replyingTo = null,
  onReplyCreated,
  onReplyCancel,
  focusedCommentId,
  highlightedCommentId,
  postId,
}) => {
  // State for pagination at this level
  const [visibleCount, setVisibleCount] = useState(
    comments.length <= INITIAL_COMMENTS_TO_SHOW ? comments.length : INITIAL_COMMENTS_TO_SHOW
  );

  // State for collapsed deep threads
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  /**
   * Check if a comment or any of its descendants contains the focused comment
   */
  const containsFocusedComment = (node: CommentNode, targetId: string): boolean => {
    if (node.comment._id === targetId) {
      return true;
    }
    if (node.replies && node.replies.length > 0) {
      return node.replies.some(reply => containsFocusedComment(reply, targetId));
    }
    return false;
  };

  /**
   * Auto-expand threads and pagination to show focused comment
   */
  useEffect(() => {
    if (focusedCommentId) {
      // Check if focused comment is in this level's comments
      const focusedIndex = comments.findIndex(node => 
        containsFocusedComment(node, focusedCommentId)
      );

      if (focusedIndex !== -1) {
        // Expand pagination to show the focused comment
        if (focusedIndex >= visibleCount) {
          setVisibleCount(focusedIndex + 1);
        }

        // Auto-expand the thread containing the focused comment
        const focusedNode = comments[focusedIndex];
        if (focusedNode && containsFocusedComment(focusedNode, focusedCommentId) && 
            focusedNode.comment._id !== focusedCommentId) {
          setExpandedThreads(prev => {
            const newSet = new Set(prev);
            newSet.add(focusedNode.comment._id);
            return newSet;
          });
        }
      }
    }
  }, [focusedCommentId, comments, visibleCount]);

  // Handle empty comment array
  if (!comments || comments.length === 0) {
    return null;
  }

  /**
   * Load more comments at this level
   * Requirement 22.2: Add pagination for large comment trees
   */
  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_INCREMENT, comments.length));
  };

  /**
   * Expand a collapsed deep thread
   * Requirement 22.2: Handle deeply nested comments gracefully
   */
  const handleExpandThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      newSet.add(commentId);
      return newSet;
    });
  };

  // Get visible comments for this level
  const visibleComments = comments.slice(0, visibleCount);
  const hasMoreComments = visibleCount < comments.length;
  const remainingCount = comments.length - visibleCount;

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-gray-200 pl-2' : ''}>
      {visibleComments.map((node) => {
        const hasReplies = node.replies && node.replies.length > 0;
        const isThreadExpanded = expandedThreads.has(node.comment._id);
        // Check if rendering replies would exceed max depth
        const wouldExceedMaxDepth = depth + 1 >= maxDepth;

        return (
          <div key={node.comment._id} className="mb-2">
            {/* Render the comment item */}
            <CommentItem
              comment={node.comment}
              userVote={userVotes[node.comment._id]}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onVoteUpdate={onVoteUpdate}
              isHighlighted={highlightedCommentId === node.comment._id}
              postId={postId}
            />

            {/* Reply form if this comment is being replied to */}
            {replyingTo === node.comment._id && (
              <div className="ml-4 mt-2 mb-3">
                <CommentForm
                  parentId={node.comment._id}
                  onCommentCreated={onReplyCreated}
                  onCancel={onReplyCancel}
                  placeholder="Write a reply..."
                  autoFocus
                />
              </div>
            )}

            {/* Handle deeply nested comments */}
            {hasReplies && wouldExceedMaxDepth && !isThreadExpanded ? (
              // Show "continue thread" link for deeply nested comments
              // Requirement 22.2: Implement "Load more replies" for deeply nested comments
              <div className="ml-4 mt-2">
                <button
                  onClick={() => handleExpandThread(node.comment._id)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
                >
                  Continue thread ({node.replies.length} {node.replies.length === 1 ? 'reply' : 'replies'})
                </button>
              </div>
            ) : hasReplies && (!wouldExceedMaxDepth || isThreadExpanded) ? (
              // Recursively render replies if not at max depth or if expanded
              // When expanded, increase maxDepth to allow viewing deeper threads
              <CommentThread
                comments={node.replies}
                depth={depth + 1}
                maxDepth={isThreadExpanded ? maxDepth + 100 : maxDepth}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onVoteUpdate={onVoteUpdate}
                userVotes={userVotes}
                replyingTo={replyingTo}
                onReplyCreated={onReplyCreated}
                onReplyCancel={onReplyCancel}
                focusedCommentId={focusedCommentId}
                highlightedCommentId={highlightedCommentId}
                postId={postId}
              />
            ) : null}
          </div>
        );
      })}

      {/* Load more button for pagination at this level */}
      {/* Requirement 22.2: Add pagination for large comment trees */}
      {hasMoreComments && (
        <div className="mt-3 mb-2">
          <button
            onClick={handleLoadMore}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
          >
            Load {Math.min(LOAD_MORE_INCREMENT, remainingCount)} more {remainingCount === 1 ? 'comment' : 'comments'}...
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentThread;
