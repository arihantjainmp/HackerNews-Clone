/**
 * PostItem Component
 *
 * Displays a single post with metadata, voting controls, and navigation
 *
 * Features:
 * - Display post title, author, points, comment count, time ago
 * - Upvote and downvote buttons with current vote state highlighting
 * - Optimistic UI updates for voting with error rollback
 * - Open URLs in new tab for link posts
 * - Navigate to post detail when clicking comment count
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { voteOnPost } from '../services/postApi';
import { formatTimeAgo } from '../utils/timeAgo';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types';

// ============================================================================
// Component Props
// ============================================================================

interface PostItemProps {
  post: Post;
  userVote?: number; // -1, 0, or 1 (undefined means not loaded yet)
  onVoteUpdate?: (postId: string, newPoints: number, newUserVote: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export const PostItem: React.FC<PostItemProps> = ({ post, userVote = 0, onVoteUpdate }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Local state for optimistic updates
  const [localPoints, setLocalPoints] = useState(post.points);
  const [localUserVote, setLocalUserVote] = useState(userVote);
  const [isVoting, setIsVoting] = useState(false);

  /**
   * Handle vote button click with optimistic UI update and error rollback
   *
   * Requirement 9.3: Handle vote button clicks with optimistic updates and error rollback
   */
  const handleVote = async (direction: 1 | -1) => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
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
      const response = await voteOnPost(post._id, direction);

      // Update with server response
      setLocalPoints(response.points);
      setLocalUserVote(response.userVote);

      // Notify parent component if callback provided
      if (onVoteUpdate) {
        onVoteUpdate(post._id, response.points, response.userVote);
      }
    } catch (error) {
      // Rollback on error
      setLocalPoints(previousPoints);
      setLocalUserVote(previousUserVote);

      // Log error for debugging
      console.error('Vote failed:', error);

      // TODO: Show user-friendly error message (toast notification)
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * Handle clicking on post title
   * Opens URL in new tab for link posts, navigates to detail for text posts
   *
   * Requirement 9.2: Open URL in new tab when clicking link post titles
   */
  const handleTitleClick = (e: React.MouseEvent) => {
    if (post.type === 'link' && post.url) {
      // For link posts, open URL in new tab
      e.preventDefault();
      window.open(post.url, '_blank', 'noopener,noreferrer');
    } else {
      // For text posts, navigate to post detail
      e.preventDefault();
      navigate(`/posts/${post._id}`);
    }
  };

  /**
   * Handle clicking on comment count
   * Navigates to post detail page
   *
   * Requirement 9.3: Navigate to post detail when clicking comment count
   */
  const handleCommentsClick = () => {
    navigate(`/posts/${post._id}`);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex gap-2 sm:gap-3 py-3 px-3 sm:px-4 border-b border-gray-200 hover:bg-gray-50">
      {/* Vote Controls */}
      <div className="flex flex-col items-center gap-1 min-w-[44px] sm:min-w-[48px]">
        {/* Upvote Button - Requirement 21.5: Touch targets at least 44x44px */}
        <button
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className={`p-2 sm:p-1 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
            localUserVote === 1 ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label="Upvote"
          title="Upvote"
        >
          <svg
            className="w-5 h-5 sm:w-5 sm:h-5"
            fill={localUserVote === 1 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Points Display */}
        <span className="text-sm sm:text-sm font-semibold text-gray-700">{localPoints}</span>

        {/* Downvote Button - Requirement 21.5: Touch targets at least 44x44px */}
        <button
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className={`p-2 sm:p-1 rounded transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
            localUserVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label="Downvote"
          title="Downvote"
        >
          <svg
            className="w-5 h-5 sm:w-5 sm:h-5"
            fill={localUserVote === -1 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Post Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
          <a
            href={post.type === 'link' && post.url ? post.url : `/posts/${post._id}`}
            onClick={handleTitleClick}
            className="text-sm sm:text-base font-medium text-gray-900 hover:text-orange-600 transition-colors break-words"
          >
            {post.title}
          </a>
          {post.type === 'link' && post.url && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({new URL(post.url).hostname})
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-600">
          <span>
            by <span className="font-medium">{post.author?.username || 'unknown'}</span>
          </span>
          <span className="hidden sm:inline">•</span>
          <span>{formatTimeAgo(post.created_at)}</span>
          <span className="hidden sm:inline">•</span>
          <button 
            onClick={handleCommentsClick} 
            className="hover:text-orange-600 transition-colors min-h-[44px] sm:min-h-0 flex items-center"
          >
            {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostItem;
