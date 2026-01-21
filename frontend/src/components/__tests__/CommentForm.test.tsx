/**
 * CommentForm Component Tests
 *
 * Tests for the CommentForm component functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CommentForm } from '../CommentForm';
import * as commentApi from '../../services/commentApi';
import type { Comment } from '../../types';

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
  points: 0,
  created_at: new Date().toISOString(),
  is_deleted: false,
  ...overrides,
});

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      expect(textarea).toBeInTheDocument();
    });

    it('should render custom placeholder', () => {
      renderWithRouter(<CommentForm postId="post1" placeholder="Reply to this comment..." />);

      const textarea = screen.getByPlaceholderText('Reply to this comment...');
      expect(textarea).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      expect(screen.getByText('Post Comment')).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      const onCancel = vi.fn();
      renderWithRouter(<CommentForm postId="post1" onCancel={onCancel} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should disable submit button when content is empty', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const submitButton = screen.getByText('Post Comment');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when content is not empty', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const submitButton = screen.getByText('Post Comment');
      expect(submitButton).not.toBeDisabled();
    });

    it('should show error when submitting empty content', async () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: '   ' } }); // Only whitespace

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Comment cannot be empty')).toBeInTheDocument();
      });
    });

    it('should show error when content exceeds 10000 characters', async () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      const longContent = 'a'.repeat(10001);
      fireEvent.change(textarea, { target: { value: longContent } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Comment cannot exceed 10000 characters')).toBeInTheDocument();
      });
    });

    it('should show character count when approaching limit', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      const content = 'a'.repeat(9500);
      fireEvent.change(textarea, { target: { value: content } });

      expect(screen.getByText('500 characters remaining')).toBeInTheDocument();
    });

    it('should show over limit message when exceeding character limit', () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      const content = 'a'.repeat(10050);
      fireEvent.change(textarea, { target: { value: content } });

      expect(screen.getByText('50 characters over limit')).toBeInTheDocument();
    });
  });

  describe('Top-level Comment Submission', () => {
    it('should call createComment API for top-level comments', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };

      vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(commentApi.createComment).toHaveBeenCalledWith('post1', 'Test comment');
      });
    });

    it('should call onCommentCreated callback with new comment', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };
      const onCommentCreated = vi.fn();

      vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

      renderWithRouter(<CommentForm postId="post1" onCommentCreated={onCommentCreated} />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(onCommentCreated).toHaveBeenCalledWith(mockComment);
      });
    });

    it('should clear form after successful submission', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };

      vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });
  });

  describe('Reply Submission', () => {
    it('should call createReply API for replies', async () => {
      const mockComment = createTestComment({ parent_id: 'parent1' });
      const mockResponse = { comment: mockComment };

      vi.mocked(commentApi.createReply).mockResolvedValue(mockResponse);

      renderWithRouter(<CommentForm parentId="parent1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(commentApi.createReply).toHaveBeenCalledWith('parent1', 'Test reply');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };

      // Delay the API response
      vi.mocked(commentApi.createComment).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      // Should show loading state
      expect(screen.getByText('Posting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Post Comment')).toBeInTheDocument();
      });
    });

    it('should disable textarea during submission', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };

      vi.mocked(commentApi.createComment).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      expect(textarea).toBeDisabled();

      await waitFor(() => {
        expect(textarea).not.toBeDisabled();
      });
    });

    it('should prevent double submission', async () => {
      const mockComment = createTestComment();
      const mockResponse = { comment: mockComment };

      vi.mocked(commentApi.createComment).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      
      // Submit twice quickly
      fireEvent.submit(form!);
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(commentApi.createComment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const errorResponse = {
        response: {
          data: {
            error: 'Failed to create comment',
          },
        },
      };

      vi.mocked(commentApi.createComment).mockRejectedValue(errorResponse);

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Failed to create comment')).toBeInTheDocument();
      });
    });

    it('should display generic error message when API error has no message', async () => {
      vi.mocked(commentApi.createComment).mockRejectedValue(new Error('Network error'));

      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Failed to post comment. Please try again.')).toBeInTheDocument();
      });
    });

    it('should clear error when user starts typing', async () => {
      renderWithRouter(<CommentForm postId="post1" />);

      const textarea = screen.getByPlaceholderText('Write a comment...');
      
      // Trigger validation error
      fireEvent.change(textarea, { target: { value: '   ' } });
      const form = textarea.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Comment cannot be empty')).toBeInTheDocument();
      });

      // Start typing
      fireEvent.change(textarea, { target: { value: 'New content' } });

      expect(screen.queryByText('Comment cannot be empty')).not.toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderWithRouter(<CommentForm postId="post1" onCancel={onCancel} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should clear form when cancel is clicked', () => {
      const onCancel = vi.fn();
      renderWithRouter(<CommentForm postId="post1" onCancel={onCancel} />);

      const textarea = screen.getByPlaceholderText('Write a comment...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test comment' } });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(textarea.value).toBe('');
    });
  });
});
