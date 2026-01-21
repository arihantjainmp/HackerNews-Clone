/**
 * PostList Component
 *
 * Displays a paginated list of posts with loading, error, and empty states
 *
 * Features:
 * - Fetch posts from API with pagination parameters
 * - Display loading spinner while fetching
 * - Render list of PostItem components
 * - Implement "Load More" button for pagination
 * - Handle empty state (no posts)
 * - Handle error state with user-friendly message
 *
 * Requirements: 9.4, 9.5, 9.6
 */

import React, { useState, useEffect } from 'react';
import { getPosts } from '../services/postApi';
import PostItem from './PostItem';
import type { Post, SortOption } from '../types';

// ============================================================================
// Component Props
// ============================================================================

interface PostListProps {
  sort?: SortOption;
  searchQuery?: string;
}

// ============================================================================
// Component
// ============================================================================

export const PostList: React.FC<PostListProps> = ({ sort = 'new', searchQuery = '' }) => {
  // State management
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limit = 25; // Posts per page

  /**
   * Fetch posts from API
   *
   * Requirement 9.4: When a user scrolls to the bottom of the post list,
   * THE Frontend SHALL load the next page of posts
   */
  const fetchPosts = async (pageNum: number, append: boolean = false) => {
    try {
      // Set appropriate loading state
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const response = await getPosts({
        page: pageNum,
        limit,
        sort,
        q: searchQuery || undefined,
      });

      // Update posts (append or replace)
      if (append) {
        setPosts((prevPosts) => [...prevPosts, ...response.posts]);
      } else {
        setPosts(response.posts);
      }

      setTotalPages(response.totalPages);
      setPage(pageNum);
    } catch (err) {
      // Requirement 9.6: When the Backend returns an error,
      // THE Frontend SHALL display a user-friendly error message
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load posts. Please try again.';
      setError(errorMessage);
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  /**
   * Load more posts (next page)
   */
  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      fetchPosts(page + 1, true);
    }
  };

  /**
   * Reset and fetch posts when sort or search changes
   */
  useEffect(() => {
    setPosts([]);
    setPage(1);
    fetchPosts(1, false);
  }, [sort, searchQuery]);

  // ============================================================================
  // Render States
  // ============================================================================

  /**
   * Loading state - show spinner while fetching initial posts
   *
   * Requirement 9.5: When the Frontend is loading posts,
   * THE Frontend SHALL display a loading indicator
   */
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  /**
   * Error state - show user-friendly error message
   *
   * Requirement 9.6: When the Backend returns an error,
   * THE Frontend SHALL display a user-friendly error message
   */
  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={() => fetchPosts(1, false)}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  /**
   * Empty state - show message when no posts found
   *
   * Requirement 9.4: Handle empty state (no posts)
   */
  if (!isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-600 text-center">
          {searchQuery
            ? `No posts match your search "${searchQuery}"`
            : 'Be the first to create a post!'}
        </p>
      </div>
    );
  }

  // ============================================================================
  // Main Render - Post List
  // ============================================================================

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Post List */}
      <div className="divide-y divide-gray-200">
        {posts.map((post) => (
          <PostItem key={post._id} post={post} />
        ))}
      </div>

      {/* Load More Button */}
      {page < totalPages && (
        <div className="flex justify-center py-6 border-t border-gray-200">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isLoadingMore
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* End of List Message */}
      {page >= totalPages && posts.length > 0 && (
        <div className="text-center py-6 text-gray-500 text-sm border-t border-gray-200">
          You've reached the end of the list
        </div>
      )}
    </div>
  );
};

export default PostList;
