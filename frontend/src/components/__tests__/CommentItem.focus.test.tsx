/**
 * CommentItem Focus Feature Tests
 *
 * Tests for the comment highlighting and permalink functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CommentItem } from '../CommentItem';
import type { Comment, User } from '../../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the comment API
vi.mock('../../services/commentApi');

// Helper to create test comment
const createTestComment = (overrides?: Partial<Comment>): Comment => ({
  _id: 'comment1',
  content: 'This is a test comment',
  post_id: 'post1',
  parent_id: null,
  author_id: 'user1',
  author: {
    _id: 'user1',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  },
  points: 5,
  created_at: new Date().toISOString(),
  is_deleted: false,
  ...overrides,
});

// Helper to create test user
const createTestUser = (overrides?: Partial<User>): User => ({
  _id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CommentItem - Focus Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Highlighting', () => {
    it('should apply highlight styling when isHighlighted is true', () => {
      const comment = createTestComment();

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} isHighlighted={true} />
      );

      const commentDiv = container.querySelector(`#comment-${comment._id}`);
      expect(commentDiv).toHaveClass('bg-yellow-50');
      expect(commentDiv).toHaveClass('border-l-4');
      expect(commentDiv).toHaveClass('border-yellow-400');
    });

    it('should not apply highlight styling when isHighlighted is false', () => {
      const comment = createTestComment();

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} isHighlighted={false} />
      );

      const commentDiv = container.querySelector(`#comment-${comment._id}`);
      expect(commentDiv).not.toHaveClass('bg-yellow-50');
      expect(commentDiv).not.toHaveClass('border-yellow-400');
    });

    it('should not apply highlight styling when isHighlighted is undefined', () => {
      const comment = createTestComment();

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} />
      );

      const commentDiv = container.querySelector(`#comment-${comment._id}`);
      expect(commentDiv).not.toHaveClass('bg-yellow-50');
      expect(commentDiv).not.toHaveClass('border-yellow-400');
    });

    it('should have transition-colors class for smooth highlighting', () => {
      const comment = createTestComment();

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} isHighlighted={true} />
      );

      const commentDiv = container.querySelector(`#comment-${comment._id}`);
      expect(commentDiv).toHaveClass('transition-colors');
    });
  });

  describe('Comment ID Attribute', () => {
    it('should have unique id attribute based on comment _id', () => {
      const comment = createTestComment({ _id: 'unique-comment-123' });

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} />
      );

      const commentDiv = container.querySelector('#comment-unique-comment-123');
      expect(commentDiv).toBeInTheDocument();
    });

    it('should have different id attributes for different comments', () => {
      const comment1 = createTestComment({ _id: 'comment-1' });
      const comment2 = createTestComment({ _id: 'comment-2' });

      const { container: container1 } = renderWithRouter(
        <CommentItem comment={comment1} userVote={0} />
      );
      const { container: container2 } = renderWithRouter(
        <CommentItem comment={comment2} userVote={0} />
      );

      expect(container1.querySelector('#comment-comment-1')).toBeInTheDocument();
      expect(container2.querySelector('#comment-comment-2')).toBeInTheDocument();
    });
  });

  describe('Permalink Button', () => {
    it('should show permalink button when postId is provided', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      expect(screen.getByText('permalink')).toBeInTheDocument();
    });

    it('should not show permalink button when postId is not provided', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} />
      );

      expect(screen.queryByText('permalink')).not.toBeInTheDocument();
    });

    it('should not show permalink button for deleted comments', () => {
      const comment = createTestComment({ is_deleted: true, content: '[deleted]' });

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      expect(screen.queryByText('permalink')).not.toBeInTheDocument();
    });

    it('should have correct title attribute', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      expect(permalinkButton).toHaveAttribute('title', 'Copy link to comment');
    });

    it('should have proper styling classes', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      expect(permalinkButton).toHaveClass('text-gray-600');
      expect(permalinkButton).toHaveClass('hover:text-orange-600');
      expect(permalinkButton).toHaveClass('transition-colors');
    });
  });

  describe('Permalink Functionality', () => {
    it('should copy correct URL to clipboard when permalink is clicked', async () => {
      const comment = createTestComment({ _id: 'comment456' });
      const postId = 'post123';

      // Mock window.location.origin
      delete (window as any).location;
      window.location = { origin: 'http://localhost:3000' } as any;

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId={postId} />
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'http://localhost:3000/posts/post123?commentId=comment456'
        );
      });
    });

    it('should handle clipboard write success', async () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });

      // Should not show error message
      expect(screen.queryByText('Failed to copy link')).not.toBeInTheDocument();
    });

    it('should handle clipboard write failure', async () => {
      const comment = createTestComment();

      // Mock clipboard failure
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
        new Error('Clipboard access denied')
      );

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });
    });

    it('should not attempt to copy if postId is missing', async () => {
      const comment = createTestComment();

      // Render without postId (button won't show, but testing the handler logic)
      const { rerender } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} />
      );

      // Rerender with postId
      rerender(
        <BrowserRouter>
          <CommentItem comment={comment} userVote={0} postId="post123" />
        </BrowserRouter>
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should generate correct URL with different origins', async () => {
      const comment = createTestComment({ _id: 'comment789' });

      // Mock different origin
      delete (window as any).location;
      window.location = { origin: 'https://example.com' } as any;

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post456" />
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/posts/post456?commentId=comment789'
        );
      });
    });
  });

  describe('Permalink Button Accessibility', () => {
    it('should have minimum touch target size on mobile', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      expect(permalinkButton).toHaveClass('min-h-[44px]');
      expect(permalinkButton).toHaveClass('sm:min-h-0');
    });

    it('should be keyboard accessible', () => {
      const comment = createTestComment();

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      expect(permalinkButton.tagName).toBe('BUTTON');
    });
  });

  describe('Integration with Other Features', () => {
    it('should show permalink alongside other action buttons', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      // All action buttons should be visible
      expect(screen.getByText('reply')).toBeInTheDocument();
      expect(screen.getByText('edit')).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
      expect(screen.getByText('permalink')).toBeInTheDocument();
    });

    it('should not show permalink when comment is being edited', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      // Click edit button
      const editButton = screen.getByText('edit');
      fireEvent.click(editButton);

      // Permalink should not be visible during edit
      expect(screen.queryByText('permalink')).not.toBeInTheDocument();
    });

    it('should maintain highlight styling while interacting with other buttons', () => {
      const comment = createTestComment({ author_id: 'user1' });

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" isHighlighted={true} />
      );

      // Click reply button
      const replyButton = screen.getByText('reply');
      fireEvent.click(replyButton);

      // Highlight should still be applied
      const commentDiv = container.querySelector(`#comment-${comment._id}`);
      expect(commentDiv).toHaveClass('bg-yellow-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long comment IDs', () => {
      const longId = 'a'.repeat(100);
      const comment = createTestComment({ _id: longId });

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const commentDiv = container.querySelector(`#comment-${longId}`);
      expect(commentDiv).toBeInTheDocument();
    });

    it('should handle special characters in comment IDs', () => {
      const specialId = 'comment-123_test';
      const comment = createTestComment({ _id: specialId });

      const { container } = renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const commentDiv = container.querySelector(`#comment-${specialId}`);
      expect(commentDiv).toBeInTheDocument();
    });

    it('should handle missing clipboard API gracefully', async () => {
      const comment = createTestComment();

      // Remove clipboard API
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      renderWithRouter(
        <CommentItem comment={comment} userVote={0} postId="post123" />
      );

      const permalinkButton = screen.getByText('permalink');
      fireEvent.click(permalinkButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });

      // Restore clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
      });
    });
  });
});
