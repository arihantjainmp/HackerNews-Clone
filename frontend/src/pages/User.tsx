/**
 * User Profile Page Component
 *
 * Displays user profile information and recent activities (posts and comments)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/userApi';
import { formatTimeAgo } from '../utils/timeAgo';
import type { UserProfile, Post, Comment } from '../types';

// ============================================================================
// Component
// ============================================================================

export const User: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');

  /**
   * Fetch user profile on mount and when username changes
   */
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setError('Username is required');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getUserProfile(username);
        setProfile(data);
        document.title = `${username} - Hacker News`;
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load user profile');
        }
        console.error('Error fetching user profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">{error || 'Failed to load profile'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { user, posts, comments, totalPosts, totalComments } = profile;

  return (
    <div className="max-w-4xl mx-auto">
      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar Placeholder */}
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>

          {/* User Details */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
            <p className="text-gray-600 text-sm mt-1">
              Member since {formatTimeAgo(user.created_at)}
            </p>
            <div className="flex gap-4 mt-3 text-sm text-gray-700">
              <span>
                <span className="font-semibold">{totalPosts}</span> posts
              </span>
              <span>
                <span className="font-semibold">{totalComments}</span> comments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Posts ({totalPosts})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Comments ({totalComments})
          </button>
        </div>

        {/* Tab Content */}
        <div className="divide-y divide-gray-200">
          {activeTab === 'posts' ? (
            posts.length > 0 ? (
              posts.map((post) => <PostActivity key={post._id} post={post} />)
            ) : (
              <div className="p-8 text-center text-gray-500">No posts yet</div>
            )
          ) : comments.length > 0 ? (
            comments.map((comment) => <CommentActivity key={comment._id} comment={comment} />)
          ) : (
            <div className="p-8 text-center text-gray-500">No comments yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Post Activity Item Component
// ============================================================================

interface PostActivityProps {
  post: Post;
}

const PostActivity: React.FC<PostActivityProps> = ({ post }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/posts/${post._id}`);
  };

  return (
    <div onClick={handleClick} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-start gap-3">
        {/* Points */}
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-sm font-semibold text-gray-700">{post.points}</span>
          <span className="text-xs text-gray-500">points</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 hover:text-orange-600 break-words">
            {post.title}
          </h3>
          {post.type === 'link' && post.url && (
            <p className="text-xs text-gray-500 mt-1">{new URL(post.url).hostname}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span>{formatTimeAgo(post.created_at)}</span>
            <span>•</span>
            <span>{post.comment_count} comments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Comment Activity Item Component
// ============================================================================

interface CommentActivityProps {
  comment: Comment;
}

const CommentActivity: React.FC<CommentActivityProps> = ({ comment }) => {
  const navigate = useNavigate();

  // Extract post ID - handle both string and populated object
  const postId =
    typeof comment.post_id === 'string'
      ? comment.post_id
      : (comment.post_id as any)?._id || comment.post_id;

  const handleClick = () => {
    navigate(`/posts/${postId}?commentId=${comment._id}`);
  };

  return (
    <div onClick={handleClick} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-start gap-3">
        {/* Points */}
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-sm font-semibold text-gray-700">{comment.points}</span>
          <span className="text-xs text-gray-500">points</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 break-words line-clamp-3">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span>{formatTimeAgo(comment.created_at)}</span>
            <span>•</span>
            <span>
              on{' '}
              <span className="font-medium text-gray-900">
                {(comment as any).post_id?.title || 'post'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default User;
