/**
 * CommentThread Focus Feature Tests
 *
 * Tests for auto-expansion and focus functionality in CommentThread
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CommentThread } from '../CommentThread';
import type { CommentNode, Comment, User } from '../../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the comment API
vi.mock('../../services/commentApi');

// Helper to create test user
const createTestUser = (overrides?: Partial<User>): User => ({
  _id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create test comment
const createTestComment = (overrides?: Partial<Comment>): Comment => ({
  _id: 'comment1',
  content: 'This is a test comment',
  post_id: 'post1',
  parent_id: null,
  author_id: 'user1',
  author: createTestUser(),
  points: 5,
  created_at: new Date().toISOString(),
  is_deleted: false,
  ...overrides,
});

// Helper to create comment node
const createCommentNode = (comment: Comment, replies: CommentNode[] = []): CommentNode => ({
  comment,
  replies,
});

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CommentThread - Focus Feature', () => {
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

  describe('Focused Comment ID Prop', () => {
    it('should accept focusedCommentId prop', () => {
      const comment = createTestComment({ _id: 'focused-comment' });
      const nodes = [createCommentNode(comment)];

      const { container } = renderWithRouter(
        <CommentThread comments={nodes} focusedCommentId="focused-comment" />
      );

      expect(container).toBeInTheDocument();
    });

    it('should pass focusedCommentId to nested CommentThread', () => {
      const reply = createTestComment({
        _id: 'reply1',
        content: 'Nested reply',
        parent_id: 'comment1',
      });
      const comment = createTestComment({
        _id: 'comment1',
        content: 'Parent comment',
      });

      const nodes = [createCommentNode(comment, [createCommentNode(reply)])];

      renderWithRouter(
        <CommentThread comments={nodes} focusedCommentId="reply1" />
      );

      // Both comments should be rendered
      expect(screen.getByText('Parent comment')).toBeInTheDocument();
      expect(screen.getByText('Nested reply')).toBeInTheDocument();
    });
  });

  describe('Highlighted Comment ID Prop', () => {
    it('should accept highlightedCommentId prop', () => {
      const comment = createTestComment({ _id: 'highlighted-comment' });
      const nodes = [createCommentNode(comment)];

      const { container } = renderWithRouter(
        <CommentThread comments={nodes} highlightedCommentId="highlighted-comment" />
      );

      expect(container).toBeInTheDocument();
    });

    it('should pass highlightedCommentId to CommentItem', () => {
      const comment = createTestComment({ _id: 'comment1' });
      const nodes = [createCommentNode(comment)];

      const { container } = renderWithRouter(
        <CommentThread comments={nodes} highlightedCommentId="comment1" />
      );

      // Comment should have highlight styling
      const commentDiv = container.querySelector('#comment-comment1');
      expect(commentDiv).toHaveClass('bg-yellow-50');
    });

    it('should only highlight the specified comment', () => {
      const comment1 = createTestComment({ _id: 'comment1', content: 'First' });
      const comment2 = createTestComment({ _id: 'comment2', content: 'Second' });
      const nodes = [createCommentNode(comment1), createCommentNode(comment2)];

      const { container } = renderWithRouter(
        <CommentThread comments={nodes} highlightedCommentId="comment1" />
      );

      // Only comment1 should be highlighted
      const comment1Div = container.querySelector('#comment-comment1');
      const comment2Div = container.querySelector('#comment-comment2');
      
      expect(comment1Div).toHaveClass('bg-yellow-50');
      expect(comment2Div).not.toHaveClass('bg-yellow-50');
    });
  });

  describe('Post ID Prop', () => {
    it('should accept postId prop', () => {
      const comment = createTestComment();
      const nodes = [createCommentNode(comment)];

      const { container } = renderWithRouter(
        <CommentThread comments={nodes} postId="post123" />
      );

      expect(container).toBeInTheDocument();
    });

    it('should pass postId to CommentItem for permalink generation', () => {
      const comment = createTestComment();
      const nodes = [createCommentNode(comment)];

      renderWithRouter(
        <CommentThread comments={nodes} postId="post123" />
      );

      // Permalink button should be visible
      expect(screen.getByText('permalink')).toBeInTheDocument();
    });

    it('should pass postId to nested CommentThread', () => {
      const reply = createTestComment({
        _id: 'reply1',
        content: 'Nested reply',
        parent_id: 'comment1',
      });
      const comment = createTestComment({
        _id: 'comment1',
        content: 'Parent comment',
      });

      const nodes = [createCommentNode(comment, [createCommentNode(reply)])];

      renderWithRouter(
        <CommentThread comments={nodes} postId="post123" />
      );

      // Both comments should have permalink buttons
      const permalinkButtons = screen.getAllByText('permalink');
      expect(permalinkButtons).toHaveLength(2);
    });
  });
});
