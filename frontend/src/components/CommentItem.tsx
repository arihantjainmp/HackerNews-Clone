/**
 * CommentItem Component
 *
 * Displays a single comment with metadata, voting controls, and action buttons
 *
 * Features:
 * - Display comment content, author, points, time ago
 * - Show "[deleted]" for deleted comments
 * - Upvote and downvote buttons with current vote state highlighting
 * - Reply button to show reply form
 * - Edit and delete buttons for own comments
 * - Handle vote, edit, delete actions with optimistic updates
 *
 * Requirements: 10.6, 10.7
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { voteOnComment, editComment, deleteComment } from '../services/commentApi';
import { formatTimeAgo } from '../utils/timeAgo';
import type { Comment } from '../types';

// ============================================================================
// Component Props
// ============================================================================

interface CommentItemProps {
  comment: Comment;
  userVote?: number; // -1, 0, or 1 (undefined means not loaded yet)
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  onVoteUpdate?: (commentId: string, newPoints: number, newUserVote: number) => void;
  isHighlighted?: boolean;
  postId?: string; // Post ID for generating permalink
}

// ============================================================================
// Component
// ============================================================================

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  userVote = 0,
  onReply,
  onEdit,
  onDelete,
  onVoteUpdate,
  isHighlighted = false,
  postId,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Local state for optimistic updates
  const [localPoints, setLocalPoints] = useState(comment.points);
  const [localUserVote, setLocalUserVote] = useState(userVote);
  const [localContent, setLocalContent] = useState(comment.content);
  const [localIsDeleted, setLocalIsDeleted] = useState(comment.is_deleted);

  // UI state
  const [isVoting, setIsVoting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is the author
  const isAuthor = user && comment.author_id === user._id;

  /**
   * Handle vote button click with optimistic UI update and error rollback
   *
   * Requirement 10.6: Implement upvote and downvote buttons
   */
  const handleVote = async (direction: 1 | -1) => {
    // Clear any previous errors
    setError(null);

    // Prevent voting if not authenticated
    if (!isAuthenticated) {
      setError('Please log in to vote');
      return;
    }

    // Prevent double-clicking
    if (isVoting) {
      return;
    }

    // Store previous state for rollback
    const previousPoints = localPoints;
    const previousUserVote = localUserVote;

    // Calculate optimistic update
    let pointsDelta = 0;
    let newUserVote = direction;

    if (previousUserVote === 0) {
      // No vote → upvote or downvote
      pointsDelta = direction;
    } else if (previousUserVote === direction) {
      // Same vote → toggle off (remove vote)
      pointsDelta = -direction;
      newUserVote = 0;
    } else {
      // Opposite vote → change by 2
      pointsDelta = direction - previousUserVote;
    }

    // Apply optimistic update
    setLocalPoints(previousPoints + pointsDelta);
    setLocalUserVote(newUserVote);
    setIsVoting(true);

    try {
      // Make API call
      const response = await voteOnComment(comment._id, direction);

      // Update with server response
      setLocalPoints(response.points);
      setLocalUserVote(response.userVote);

      // Notify parent component if callback provided
      if (onVoteUpdate) {
        onVoteUpdate(comment._id, response.points, response.userVote);
      }
    } catch (err) {
      // Rollback on error
      setLocalPoints(previousPoints);
      setLocalUserVote(previousUserVote);

      // Show error message
      setError('Failed to vote. Please try again.');
      console.error('Vote failed:', err);
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * Handle reply button click
   *
   * Requirement 10.6: Add "reply" button (show reply form when clicked)
   */
  const handleReplyClick = () => {
    if (!isAuthenticated) {
      setError('Please log in to reply');
      return;
    }

    setShowReplyForm(!showReplyForm);

    // Notify parent to show reply form
    if (onReply) {
      onReply(comment._id);
    }
  };

  /**
   * Handle permalink button click - copy link to clipboard
   */
  const handlePermalinkClick = async () => {
    if (!postId) return;
    
    const url = `${window.location.origin}/posts/${postId}?commentId=${comment._id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      // Show temporary success message
      setError(null);
      // You could add a toast notification here
    } catch (err) {
      setError('Failed to copy link');
      console.error('Failed to copy permalink:', err);
    }
  };

  /**
   * Handle edit button click
   *
   * Requirement 10.7: Add "edit" button for own comments
   */
  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(localContent);
    setError(null);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(localContent);
    setError(null);
  };

  /**
   * Handle save edit
   *
   * Requirement 10.7: Handle edit actions
   */
  const handleSaveEdit = async () => {
    // Validate content
    if (!editContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (editContent.length > 10000) {
      setError('Comment cannot exceed 10000 characters');
      return;
    }

    setIsSubmittingEdit(true);
    setError(null);

    // Store previous content for rollback
    const previousContent = localContent;

    // Optimistic update
    setLocalContent(editContent);

    try {
      // Make API call
      const response = await editComment(comment._id, editContent);

      // Update with server response
      setLocalContent(response.comment.content);
      setIsEditing(false);

      // Notify parent component if callback provided
      if (onEdit) {
        onEdit(comment._id, response.comment.content);
      }
    } catch (err) {
      // Rollback on error
      setLocalContent(previousContent);
      setError('Failed to edit comment. Please try again.');
      console.error('Edit failed:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  /**
   * Handle delete button click
   *
   * Requirement 10.7: Add "delete" button for own comments
   */
  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Make API call
      await deleteComment(comment._id);

      // Optimistic update - mark as deleted
      setLocalIsDeleted(true);
      setLocalContent('[deleted]');

      // Notify parent component if callback provided
      if (onDelete) {
        onDelete(comment._id);
      }
    } catch (err) {
      setError('Failed to delete comment. Please try again.');
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div 
      id={`comment-${comment._id}`}
      className={`flex gap-2 sm:gap-3 py-2 transition-colors ${
        isHighlighted ? 'bg-yellow-50 border-l-4 border-yellow-400 pl-2' : ''
      }`}
    >
      {/* Vote Controls */}
      <div className="flex flex-col items-center gap-1 min-w-[44px] sm:min-w-[36px]">
        {/* Upvote Button - Requirement 21.5: Touch targets at least 44x44px on mobile */}
        <button
          onClick={() => handleVote(1)}
          disabled={isVoting || localIsDeleted}
          className={`p-2 sm:p-0.5 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
            localUserVote === 1 ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
          } ${isVoting || localIsDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label="Upvote"
          title="Upvote"
        >
          <svg
            className="w-4 h-4 sm:w-4 sm:h-4"
            fill={localUserVote === 1 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Points Display */}
        <span className="text-xs font-semibold text-gray-700">{localPoints}</span>

        {/* Downvote Button - Requirement 21.5: Touch targets at least 44x44px on mobile */}
        <button
          onClick={() => handleVote(-1)}
          disabled={isVoting || localIsDeleted}
          className={`p-2 sm:p-0.5 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
            localUserVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
          } ${isVoting || localIsDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label="Downvote"
          title="Downvote"
        >
          <svg
            className="w-4 h-4 sm:w-4 sm:h-4"
            fill={localUserVote === -1 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
          {localIsDeleted ? (
            <span className="font-medium">[deleted]</span>
          ) : (
            <a
              href={`/users/${comment.author?.username}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/users/${comment.author?.username}`);
              }}
              className="font-medium hover:text-orange-600 transition-colors"
            >
              {comment.author?.username || 'unknown'}
            </a>
          )}
          <span>•</span>
          <span>{formatTimeAgo(comment.created_at)}</span>
          {comment.edited_at && !localIsDeleted && (
            <>
              <span>•</span>
              <span className="italic">edited</span>
            </>
          )}
        </div>

        {/* Content or Edit Form */}
        {isEditing ? (
          <div className="mb-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              rows={4}
              disabled={isSubmittingEdit}
              maxLength={10000}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit}
                className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSubmittingEdit}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`text-sm text-gray-800 mb-2 whitespace-pre-wrap break-words ${
              localIsDeleted ? 'italic text-gray-500' : ''
            }`}
          >
            {localContent}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600 mb-2">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        {!isEditing && !localIsDeleted && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Reply Button - Requirement 21.5: Touch targets at least 44x44px on mobile */}
            <button
              onClick={handleReplyClick}
              className="text-gray-600 hover:text-orange-600 transition-colors min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
            >
              reply
            </button>

            {/* Edit Button (only for author) - Requirement 21.5: Touch targets at least 44x44px on mobile */}
            {isAuthor && (
              <button
                onClick={handleEditClick}
                className="text-gray-600 hover:text-orange-600 transition-colors min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
              >
                edit
              </button>
            )}

            {/* Delete Button (only for author) - Requirement 21.5: Touch targets at least 44x44px on mobile */}
            {isAuthor && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
              >
                {isDeleting ? 'deleting...' : 'delete'}
              </button>
            )}

            {/* Permalink Button - Copy link to this comment */}
            {postId && (
              <button
                onClick={handlePermalinkClick}
                className="text-gray-600 hover:text-orange-600 transition-colors min-h-[44px] sm:min-h-0 flex items-center py-2 sm:py-0"
                title="Copy link to comment"
              >
                permalink
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
