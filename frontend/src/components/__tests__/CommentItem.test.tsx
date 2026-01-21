/**
 * CommentItem Component Tests
 *
 * Tests for the CommentItem component functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CommentItem } from '../CommentItem';
import * as commentApi from '../../services/commentApi';
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

describe('CommentItem', () => {
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
  });

  describe('Display', () => {
    it('should display comment content, author, points, and time ago', () => {
      const comment = createTestComment();

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should show "[deleted]" for deleted comments', () => {
      const comment = createTestComment({
        is_deleted: true,
        content: '[deleted]',
      });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      // Check that [deleted] appears in both author and content
      const deletedTexts = screen.getAllByText('[deleted]');
      expect(deletedTexts).toHaveLength(2); // Author and content
      
      // Verify action buttons are not shown
      expect(screen.queryByText('reply')).not.toBeInTheDocument();
      expect(screen.queryByText('edit')).not.toBeInTheDocument();
      expect(screen.queryByText('delete')).not.toBeInTheDocument();
    });

    it('should show "edited" indicator for edited comments', () => {
      const comment = createTestComment({
        edited_at: new Date().toISOString(),
      });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.getByText('edited')).toBeInTheDocument();
    });
  });

  describe('Voting', () => {
    it('should highlight upvote button when user has upvoted', () => {
      const comment = createTestComment();

      renderWithRouter(<CommentItem comment={comment} userVote={1} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveClass('text-orange-500');
    });

    it('should highlight downvote button when user has downvoted', () => {
      const comment = createTestComment();

      renderWithRouter(<CommentItem comment={comment} userVote={-1} />);

      const downvoteButton = screen.getByLabelText('Downvote');
      expect(downvoteButton).toHaveClass('text-blue-500');
    });

    it('should call voteOnComment when upvote button is clicked', async () => {
      const comment = createTestComment();
      const mockVoteResponse = { points: 6, userVote: 1 };

      vi.mocked(commentApi.voteOnComment).mockResolvedValue(mockVoteResponse);

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(commentApi.voteOnComment).toHaveBeenCalledWith('comment1', 1);
      });
    });

    it('should update points optimistically when voting', async () => {
      const comment = createTestComment({ points: 5 });
      const mockVoteResponse = { points: 6, userVote: 1 };

      vi.mocked(commentApi.voteOnComment).mockResolvedValue(mockVoteResponse);

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      // Should immediately show optimistic update
      expect(screen.getByText('6')).toBeInTheDocument();

      await waitFor(() => {
        expect(commentApi.voteOnComment).toHaveBeenCalled();
      });
    });

    it('should show error message when not authenticated', () => {
      const comment = createTestComment();
      
      // Mock unauthenticated state
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      expect(screen.getByText('Please log in to vote')).toBeInTheDocument();
    });
  });

  describe('Reply', () => {
    it('should show reply button', () => {
      const comment = createTestComment();

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.getByText('reply')).toBeInTheDocument();
    });

    it('should call onReply when reply button is clicked', () => {
      const comment = createTestComment();
      const onReply = vi.fn();

      renderWithRouter(<CommentItem comment={comment} userVote={0} onReply={onReply} />);

      const replyButton = screen.getByText('reply');
      fireEvent.click(replyButton);

      expect(onReply).toHaveBeenCalledWith('comment1');
    });

    it('should show error when not authenticated and clicking reply', () => {
      const comment = createTestComment();
      
      // Mock unauthenticated state
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const replyButton = screen.getByText('reply');
      fireEvent.click(replyButton);

      expect(screen.getByText('Please log in to reply')).toBeInTheDocument();
    });
  });

  describe('Edit', () => {
    it('should show edit button for own comments', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.getByText('edit')).toBeInTheDocument();
    });

    it('should not show edit button for other users comments', () => {
      const comment = createTestComment({ author_id: 'user2' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.queryByText('edit')).not.toBeInTheDocument();
    });

    it('should show edit form when edit button is clicked', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const editButton = screen.getByText('edit');
      fireEvent.click(editButton);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call editComment when save is clicked', async () => {
      const comment = createTestComment({ author_id: 'user1' });
      const mockEditResponse = {
        comment: { ...comment, content: 'Updated content', edited_at: new Date().toISOString() },
      };

      vi.mocked(commentApi.editComment).mockResolvedValue(mockEditResponse);

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const editButton = screen.getByText('edit');
      fireEvent.click(editButton);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(commentApi.editComment).toHaveBeenCalledWith('comment1', 'Updated content');
      });
    });

    it('should cancel edit when cancel button is clicked', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const editButton = screen.getByText('edit');
      fireEvent.click(editButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });
  });

  describe('Delete', () => {
    it('should show delete button for own comments', () => {
      const comment = createTestComment({ author_id: 'user1' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('should not show delete button for other users comments', () => {
      const comment = createTestComment({ author_id: 'user2' });

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      expect(screen.queryByText('delete')).not.toBeInTheDocument();
    });

    it('should call deleteComment when delete is confirmed', async () => {
      const comment = createTestComment({ author_id: 'user1' });
      const mockDeleteResponse = { message: 'Comment deleted' };

      vi.mocked(commentApi.deleteComment).mockResolvedValue(mockDeleteResponse);

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const deleteButton = screen.getByText('delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(commentApi.deleteComment).toHaveBeenCalledWith('comment1');
      });

      confirmSpy.mockRestore();
    });

    it('should not delete when confirmation is cancelled', () => {
      const comment = createTestComment({ author_id: 'user1' });

      // Mock window.confirm to return false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithRouter(<CommentItem comment={comment} userVote={0} />);

      const deleteButton = screen.getByText('delete');
      fireEvent.click(deleteButton);

      expect(commentApi.deleteComment).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});
