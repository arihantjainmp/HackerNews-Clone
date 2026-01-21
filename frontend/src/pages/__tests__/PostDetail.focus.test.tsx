/**
 * PostDetail Focus Feature Tests
 *
 * Tests for comment focusing functionality in PostDetail page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { PostDetail } from '../PostDetail';
import * as postApi from '../../services/postApi';
import type { Post, CommentNode, User } from '../../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the post API
vi.mock('../../services/postApi');

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Helper to create test user
const createTestUser = (overrides?: Partial<User>): User => ({
  _id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create test post
const createTestPost = (overrides?: Partial<Post>): Post => ({
  _id: 'post1',
  title: 'Test Post',
  type: 'link',
  url: 'https://example.com',
  author_id: 'user1',
  author: createTestUser(),
  points: 10,
  comment_count: 3,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create comment node
const createCommentNode = (id: string, content: string, replies: CommentNode[] = []): CommentNode => ({
  comment: {
    _id: id,
    content,
    post_id: 'post1',
    parent_id: null,
    author_id: 'user1',
    author: createTestUser(),
    points: 5,
    created_at: new Date().toISOString(),
    is_deleted: false,
  },
  replies,
});

// Helper to render with router and search params
const renderWithRouter = (postId: string, commentId?: string) => {
  const path = commentId ? `/posts/${postId}?commentId=${commentId}` : `/posts/${postId}`;
  
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/posts/:id" element={<PostDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PostDetail - Focus Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset scrollIntoView mock
    Element.prototype.scrollIntoView = vi.fn();
    
    // Default mock for useAuth
    mockUseAuth.mockReturnValue({
      user: createTestUser(),
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    });

    // Mock successful post fetch
    vi.mocked(postApi.getPostById).mockResolvedValue({
      post: createTestPost(),
      comments: [
        createCommentNode('comment1', 'First comment'),
        createCommentNode('comment2', 'Second comment'),
        createCommentNode('comment3', 'Third comment'),
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Parameter Handling', () => {
    it('should read commentId from URL search params', async () => {
      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Comment should be rendered
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });

    it('should work without commentId parameter', async () => {
      renderWithRouter('post1');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // All comments should be rendered normally
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
      expect(screen.getByText('Third comment')).toBeInTheDocument();
    });

    it('should handle invalid commentId gracefully', async () => {
      renderWithRouter('post1', 'nonexistent-comment');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Page should render normally
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });
  });

  describe('Comment Highlighting', () => {
    it('should highlight the focused comment', async () => {
      const { container } = renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Comment2 should have highlight styling
      const comment2Div = container.querySelector('#comment-comment2');
      expect(comment2Div).toHaveClass('bg-yellow-50');
      expect(comment2Div).toHaveClass('border-yellow-400');
    });

    it('should not highlight other comments', async () => {
      const { container } = renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Other comments should not be highlighted
      const comment1Div = container.querySelector('#comment-comment1');
      const comment3Div = container.querySelector('#comment-comment3');
      
      expect(comment1Div).not.toHaveClass('bg-yellow-50');
      expect(comment3Div).not.toHaveClass('bg-yellow-50');
    });

    it('should not highlight any comment when commentId is not provided', async () => {
      const { container } = renderWithRouter('post1');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // No comments should be highlighted
      const highlightedComments = container.querySelectorAll('.bg-yellow-50');
      expect(highlightedComments).toHaveLength(0);
    });
  });

  describe('Scroll Behavior', () => {
    it('should scroll to focused comment after data loads', async () => {
      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Wait for scroll to be attempted
      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('should use smooth scroll behavior', async () => {
      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
        });
      }, { timeout: 500 });
    });
  });

  describe('Integration with CommentThread', () => {
    it('should pass focusedCommentId to CommentThread', async () => {
      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Comment should be visible and highlighted
      const comment = screen.getByText('Second comment');
      expect(comment).toBeInTheDocument();
    });

    it('should pass highlightedCommentId to CommentThread', async () => {
      const { container } = renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Comment should have highlight styling
      const commentDiv = container.querySelector('#comment-comment2');
      expect(commentDiv).toHaveClass('bg-yellow-50');
    });

    it('should pass postId to CommentThread for permalinks', async () => {
      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Permalink buttons should be visible
      const permalinkButtons = screen.getAllByText('permalink');
      expect(permalinkButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Nested Comments', () => {
    it('should handle focused comment in nested structure', async () => {
      // Mock post with nested comments
      vi.mocked(postApi.getPostById).mockResolvedValue({
        post: createTestPost(),
        comments: [
          createCommentNode('comment1', 'Parent comment', [
            createCommentNode('reply1', 'Nested reply'),
          ]),
        ],
      });

      renderWithRouter('post1', 'reply1');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Both parent and nested comment should be visible
      expect(screen.getByText('Parent comment')).toBeInTheDocument();
      expect(screen.getByText('Nested reply')).toBeInTheDocument();
    });

    it('should highlight deeply nested focused comment', async () => {
      // Mock post with deeply nested comments
      vi.mocked(postApi.getPostById).mockResolvedValue({
        post: createTestPost(),
        comments: [
          createCommentNode('comment1', 'Level 1', [
            createCommentNode('comment2', 'Level 2', [
              createCommentNode('comment3', 'Level 3'),
            ]),
          ]),
        ],
      });

      const { container } = renderWithRouter('post1', 'comment3');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Level 3 comment should be highlighted
      const comment3Div = container.querySelector('#comment-comment3');
      expect(comment3Div).toHaveClass('bg-yellow-50');
    });
  });

  describe('Loading States', () => {
    it('should not attempt scroll during loading', async () => {
      renderWithRouter('post1', 'comment2');

      // During loading, scroll should not be called
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });
    });

    it('should show loading state before data is fetched', async () => {
      renderWithRouter('post1', 'comment2');

      // Should show loading indicator
      expect(screen.getByText('Loading post...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(postApi.getPostById).mockRejectedValue(new Error('API Error'));

      renderWithRouter('post1', 'comment2');

      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument();
      });

      // Should not attempt to scroll
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it('should handle missing comment element gracefully', async () => {
      // Mock post with comments that don't include the focused one
      vi.mocked(postApi.getPostById).mockResolvedValue({
        post: createTestPost(),
        comments: [
          createCommentNode('comment1', 'First comment'),
        ],
      });

      renderWithRouter('post1', 'nonexistent-comment');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Should not throw error, just not scroll
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty comments array', async () => {
      vi.mocked(postApi.getPostById).mockResolvedValue({
        post: createTestPost({ comment_count: 0 }),
        comments: [],
      });

      renderWithRouter('post1', 'comment1');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    });

    it('should handle very long commentId', async () => {
      const longId = 'a'.repeat(100);
      
      renderWithRouter('post1', longId);

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Should render without errors
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });

    it('should handle special characters in commentId', async () => {
      renderWithRouter('post1', 'comment-123_test');

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Should render without errors
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });
  });
});
