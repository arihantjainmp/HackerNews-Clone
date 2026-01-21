/**
 * PostList Component Tests
 *
 * Tests for the PostList component including:
 * - Pagination and loading states
 * - Error handling
 * - Empty state
 * - Load more functionality
 * - Sort and search parameter handling
 *
 * Requirements: 9.4, 9.5, 9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PostList } from '../PostList';
import * as postApi from '../../services/postApi';
import type { Post, GetPostsResponse } from '../../types';

// Mock the post API
vi.mock('../../services/postApi');

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: {
      _id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
      created_at: '2024-01-01',
    },
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  })),
}));

describe('PostList', () => {
  const mockPosts: Post[] = [
    {
      _id: 'post1',
      title: 'First Post',
      type: 'link',
      url: 'https://example.com',
      author_id: 'user1',
      author: {
        _id: 'user1',
        username: 'author1',
        email: 'author1@example.com',
        created_at: '2024-01-01',
      },
      points: 10,
      comment_count: 5,
      created_at: new Date().toISOString(),
    },
    {
      _id: 'post2',
      title: 'Second Post',
      type: 'text',
      text: 'Post content',
      author_id: 'user2',
      author: {
        _id: 'user2',
        username: 'author2',
        email: 'author2@example.com',
        created_at: '2024-01-01',
      },
      points: 20,
      comment_count: 10,
      created_at: new Date().toISOString(),
    },
  ];

  const mockResponse: GetPostsResponse = {
    posts: mockPosts,
    total: 2,
    page: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching initial posts', async () => {
      // Mock delayed response
      vi.mocked(postApi.getPosts).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      // Should show loading spinner (check for the spinner element)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });
    });

    it('should not show loading spinner when posts are already loaded', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });

      // Loading spinner should not be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Post Rendering', () => {
    it('should render list of posts', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
      });
    });

    it('should pass correct sort parameter to API', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList sort="top" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
          sort: 'top',
          q: undefined,
        });
      });
    });

    it('should pass search query to API', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList searchQuery="test" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: 'test',
        });
      });
    });

    it('should refetch posts when sort changes', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      const { rerender } = render(
        <BrowserRouter>
          <PostList sort="new" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(1);
      });

      // Change sort
      rerender(
        <BrowserRouter>
          <PostList sort="top" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'top',
          q: undefined,
        });
      });
    });

    it('should refetch posts when search query changes', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      const { rerender } = render(
        <BrowserRouter>
          <PostList searchQuery="" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(1);
      });

      // Change search query
      rerender(
        <BrowserRouter>
          <PostList searchQuery="test" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: 'test',
        });
      });
    });
  });

  describe('Pagination', () => {
    it('should show "Load More" button when there are more pages', async () => {
      const multiPageResponse: GetPostsResponse = {
        ...mockResponse,
        page: 1,
        totalPages: 3,
      };

      vi.mocked(postApi.getPosts).mockResolvedValue(multiPageResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('should not show "Load More" button when on last page', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });

      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    it('should load next page when "Load More" is clicked', async () => {
      const page1Response: GetPostsResponse = {
        posts: [mockPosts[0]!],
        total: 2,
        page: 1,
        totalPages: 2,
      };

      const page2Response: GetPostsResponse = {
        posts: [mockPosts[1]!],
        total: 2,
        page: 2,
        totalPages: 2,
      };

      vi.mocked(postApi.getPosts)
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      // Wait for first page
      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });

      // Click load more
      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      // Wait for second page
      await waitFor(() => {
        expect(screen.getByText('Second Post')).toBeInTheDocument();
      });

      // Both posts should be visible
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByText('Second Post')).toBeInTheDocument();
    });

    it('should show loading state on "Load More" button while fetching', async () => {
      const page1Response: GetPostsResponse = {
        posts: [mockPosts[0]!],
        total: 2,
        page: 1,
        totalPages: 2,
      };

      vi.mocked(postApi.getPosts)
        .mockResolvedValueOnce(page1Response)
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
        );

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should show end of list message when all pages loaded', async () => {
      vi.mocked(postApi.getPosts).mockResolvedValue(mockResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("You've reached the end of the list")).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      vi.mocked(postApi.getPosts).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display user-friendly error message for unknown errors', async () => {
      vi.mocked(postApi.getPosts).mockRejectedValue({});

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load posts. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show "Try Again" button on error', async () => {
      vi.mocked(postApi.getPosts).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry fetching posts when "Try Again" is clicked', async () => {
      vi.mocked(postApi.getPosts)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no posts found', async () => {
      const emptyResponse: GetPostsResponse = {
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      vi.mocked(postApi.getPosts).mockResolvedValue(emptyResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No posts found')).toBeInTheDocument();
      });
    });

    it('should show search-specific message when no results for search query', async () => {
      const emptyResponse: GetPostsResponse = {
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      vi.mocked(postApi.getPosts).mockResolvedValue(emptyResponse);

      render(
        <BrowserRouter>
          <PostList searchQuery="nonexistent" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No posts match your search "nonexistent"')).toBeInTheDocument();
      });
    });

    it('should show create post message when no posts and no search', async () => {
      const emptyResponse: GetPostsResponse = {
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      vi.mocked(postApi.getPosts).mockResolvedValue(emptyResponse);

      render(
        <BrowserRouter>
          <PostList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Be the first to create a post!')).toBeInTheDocument();
      });
    });
  });
});
