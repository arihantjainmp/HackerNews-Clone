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
 *
 * Requirements: 10.1, 10.2
 */

import React from 'react';
import { CommentItem } from './CommentItem';
import type { CommentNode } from '../types';

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
 * For deeply nested comments (beyond maxDepth), we could implement
 * "continue thread" links or collapse functionality in the future.
 *
 * Requirement 10.1: Render all comments in a nested tree structure
 * Requirement 10.2: Indent child comments to indicate nesting level
 */
export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  depth = 0,
  maxDepth = 10,
  onReply,
  onEdit,
  onDelete,
  onVoteUpdate,
  userVotes = {},
}) => {
  // Handle empty comment array
  if (!comments || comments.length === 0) {
    return null;
  }

  // Handle deeply nested comments gracefully
  // For now, we continue rendering but could add collapse/expand functionality
  const shouldCollapse = depth >= maxDepth;

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-gray-200 pl-2' : ''}>
      {comments.map((node) => (
        <div key={node.comment._id} className="mb-2">
          {/* Render the comment item */}
          <CommentItem
            comment={node.comment}
            userVote={userVotes[node.comment._id]}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onVoteUpdate={onVoteUpdate}
          />

          {/* Recursively render replies if they exist */}
          {node.replies && node.replies.length > 0 && !shouldCollapse && (
            <CommentThread
              comments={node.replies}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onVoteUpdate={onVoteUpdate}
              userVotes={userVotes}
            />
          )}

          {/* Show collapse indicator for deeply nested comments */}
          {shouldCollapse && node.replies && node.replies.length > 0 && (
            <div className="ml-4 text-xs text-gray-500 italic">
              [{node.replies.length} more {node.replies.length === 1 ? 'reply' : 'replies'}...]
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentThread;
