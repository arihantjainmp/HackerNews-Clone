/**
 * PostDetail Page Component
 *
 * Displays a single post with its complete comment tree
 *
 * Features:
 * - Fetch post and comment tree from API
 * - Display post details using PostItem
 * - Display comment tree using CommentThread
 * - Show CommentForm for adding top-level comments
 * - Handle loading and error states
 *
 * Requirements: 4.10, 10.1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostById } from '../services/postApi';
import { PostItem, CommentThread, CommentForm } from '../components';
import { useAuth } from '../contexts/AuthContext';
import type { Post, CommentNode, Comment } from '../types';

// ============================================================================
// Component
// ============================================================================

/**
 * PostDetail page displays a single post with its comment tree
 *
 * Requirement 4.10: Return single post with complete Comment_Tree
 * Requirement 10.1: Render all comments in a nested tree structure
 */
export const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  /**
   * Fetch post and comment tree from API
   *
   * Requirement 4.10: Fetch post and comment tree from API
   */
  const fetchPostData = useCallback(async () => {
    if (!id) {
      setError('Post ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getPostById(id);
      setPost(response.post);
      setComments(response.comments);

      // Initialize user votes with post's userVote if available
      const initialVotes: Record<string, number> = {};
      if (response.post.userVote !== undefined) {
        initialVotes[response.post._id] = response.post.userVote;
      }
      setUserVotes(initialVotes);
    } catch (err: any) {
      console.error('Failed to fetch post:', err);

      // Handle different error types
      if (err.response?.status === 404) {
        setError('Post not found');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.error || 'Failed to load post. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  /**
   * Load post data on mount and when ID changes
   */
  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);

  /**
   * Handle new comment creation
   * Add comment to tree optimistically
   *
   * Requirement 10.1: Add comment to UI without requiring page refresh
   */
  const handleCommentCreated = useCallback((newComment: Comment) => {
    // Create a new comment node
    const newNode: CommentNode = {
      comment: newComment,
      replies: [],
    };

    // Add to top of comment tree
    setComments((prevComments) => [newNode, ...prevComments]);

    // Update post comment count
    if (post) {
      setPost({
        ...post,
        comment_count: post.comment_count + 1,
      });
    }
  }, [post]);

  /**
   * Handle vote update on post
   */
  const handlePostVoteUpdate = useCallback((postId: string, newPoints: number, newUserVote: number) => {
    if (post && post._id === postId) {
      setPost({
        ...post,
        points: newPoints,
      });
      setUserVotes((prev) => ({
        ...prev,
        [postId]: newUserVote,
      }));
    }
  }, [post]);

  /**
   * Handle vote update on comment
   */
  const handleCommentVoteUpdate = useCallback((commentId: string, _newPoints: number, newUserVote: number) => {
    // Update user vote state
    setUserVotes((prev) => ({
      ...prev,
      [commentId]: newUserVote,
    }));

    // Update comment points in tree
    // This is a simplified approach - in production, you might want to
    // recursively update the comment tree to reflect the new points
    // For now, the CommentItem component will handle its own optimistic updates
  }, []);

  /**
   * Handle reply button click
   */
  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
  }, []);

  /**
   * Handle reply created
   */
  const handleReplyCreated = useCallback((newComment: Comment) => {
    // Recursively update comment tree to add the new reply
    const addReplyToTree = (nodes: CommentNode[]): CommentNode[] => {
      return nodes.map((node) => {
        if (node.comment._id === newComment.parent_id) {
          // Found the parent - add reply
          return {
            ...node,
            replies: [
              {
                comment: newComment,
                replies: [],
              },
              ...node.replies,
            ],
          };
        } else if (node.replies.length > 0) {
          // Recursively search in replies
          return {
            ...node,
            replies: addReplyToTree(node.replies),
          };
        }
        return node;
      });
    };

    setComments((prevComments) => addReplyToTree(prevComments));

    // Update post comment count
    if (post) {
      setPost({
        ...post,
        comment_count: post.comment_count + 1,
      });
    }

    // Close reply form
    setReplyingTo(null);
  }, [post]);

  /**
   * Handle reply cancel
   */
  const handleReplyCancel = useCallback(() => {
    setReplyingTo(null);
  }, []);

  /**
   * Navigate back to home
   */
  const handleBackToHome = () => {
    navigate('/');
  };

  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render Error State
  // ============================================================================

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Post not found'}</p>
          <button
            onClick={handleBackToHome}
            className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render Post Detail
  // ============================================================================

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 max-w-4xl">
        {/* Post Details */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6">
          <PostItem
            post={post}
            userVote={userVotes[post._id]}
            onVoteUpdate={handlePostVoteUpdate}
          />

          {/* Text Content for Text Posts */}
          {post.type === 'text' && post.text && (
            <div className="px-3 sm:px-4 pb-4">
              <div className="prose max-w-none text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">
                {post.text}
              </div>
            </div>
          )}
        </div>

        {/* Comment Form for Top-Level Comments */}
        {isAuthenticated ? (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Add a comment</h3>
            <CommentForm
              postId={post._id}
              onCommentCreated={handleCommentCreated}
              placeholder="What are your thoughts?"
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 sm:mb-6 text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-3">
              Please log in to comment
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium min-h-[44px]"
            >
              Log In
            </button>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Comments ({post.comment_count})
          </h3>

          {comments.length > 0 ? (
            <CommentThread
              comments={comments}
              depth={0}
              userVotes={userVotes}
              onReply={handleReply}
              onVoteUpdate={handleCommentVoteUpdate}
              replyingTo={replyingTo}
              onReplyCreated={handleReplyCreated}
              onReplyCancel={handleReplyCancel}
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-500 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
    </div>
  );
};

export default PostDetail;
