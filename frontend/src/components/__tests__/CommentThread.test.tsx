/**
 * CommentThread Component Tests
 *
 * Tests for the CommentThread recursive component functionality
 * Requirements: 10.1, 10.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('CommentThread', () => {
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

  describe('Rendering', () => {
    it('should render empty when comments array is empty', () => {
      const { container } = renderWithRouter(<CommentThread comments={[]} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render single comment', () => {
      const comment = createTestComment({ content: 'Single comment' });
      const nodes = [createCommentNode(comment)];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('Single comment')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should render multiple top-level comments', () => {
      const comment1 = createTestComment({ _id: 'c1', content: 'First comment' });
      const comment2 = createTestComment({ _id: 'c2', content: 'Second comment' });
      const nodes = [createCommentNode(comment1), createCommentNode(comment2)];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });
  });

  describe('Recursive Rendering - Requirement 10.1', () => {
    it('should render nested replies recursively', () => {
      // Create a nested structure: comment1 -> reply1 -> reply2
      const reply2 = createTestComment({
        _id: 'reply2',
        content: 'Deeply nested reply',
        parent_id: 'reply1',
      });
      const reply1 = createTestComment({
        _id: 'reply1',
        content: 'First level reply',
        parent_id: 'comment1',
      });
      const comment1 = createTestComment({
        _id: 'comment1',
        content: 'Top level comment',
      });

      const nodes = [
        createCommentNode(comment1, [
          createCommentNode(reply1, [createCommentNode(reply2)]),
        ]),
      ];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('Top level comment')).toBeInTheDocument();
      expect(screen.getByText('First level reply')).toBeInTheDocument();
      expect(screen.getByText('Deeply nested reply')).toBeInTheDocument();
    });

    it('should render multiple replies at same level', () => {
      const reply1 = createTestComment({
        _id: 'reply1',
        content: 'First reply',
        parent_id: 'comment1',
      });
      const reply2 = createTestComment({
        _id: 'reply2',
        content: 'Second reply',
        parent_id: 'comment1',
      });
      const comment1 = createTestComment({
        _id: 'comment1',
        content: 'Parent comment',
      });

      const nodes = [
        createCommentNode(comment1, [createCommentNode(reply1), createCommentNode(reply2)]),
      ];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('Parent comment')).toBeInTheDocument();
      expect(screen.getByText('First reply')).toBeInTheDocument();
      expect(screen.getByText('Second reply')).toBeInTheDocument();
    });

    it('should render complex nested tree structure', () => {
      // Create a complex tree:
      // comment1
      //   -> reply1
      //      -> reply1a
      //      -> reply1b
      //   -> reply2
      // comment2
      //   -> reply3

      const reply1a = createTestComment({ _id: 'r1a', content: 'Reply 1a', parent_id: 'r1' });
      const reply1b = createTestComment({ _id: 'r1b', content: 'Reply 1b', parent_id: 'r1' });
      const reply1 = createTestComment({ _id: 'r1', content: 'Reply 1', parent_id: 'c1' });
      const reply2 = createTestComment({ _id: 'r2', content: 'Reply 2', parent_id: 'c1' });
      const reply3 = createTestComment({ _id: 'r3', content: 'Reply 3', parent_id: 'c2' });
      const comment1 = createTestComment({ _id: 'c1', content: 'Comment 1' });
      const comment2 = createTestComment({ _id: 'c2', content: 'Comment 2' });

      const nodes = [
        createCommentNode(comment1, [
          createCommentNode(reply1, [createCommentNode(reply1a), createCommentNode(reply1b)]),
          createCommentNode(reply2),
        ]),
        createCommentNode(comment2, [createCommentNode(reply3)]),
      ];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('Comment 1')).toBeInTheDocument();
      expect(screen.getByText('Comment 2')).toBeInTheDocument();
      expect(screen.getByText('Reply 1')).toBeInTheDocument();
      expect(screen.getByText('Reply 1a')).toBeInTheDocument();
      expect(screen.getByText('Reply 1b')).toBeInTheDocument();
      expect(screen.getByText('Reply 2')).toBeInTheDocument();
      expect(screen.getByText('Reply 3')).toBeInTheDocument();
    });
  });

  describe('Indentation - Requirement 10.2', () => {
    it('should apply indentation class to nested comments', () => {
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

      const { container } = renderWithRouter(<CommentThread comments={nodes} />);

      // Find the nested comment container
      const nestedContainers = container.querySelectorAll('.ml-4');
      expect(nestedContainers.length).toBeGreaterThan(0);
    });

    it('should increase indentation with depth', () => {
      // Create 3 levels of nesting
      const level3 = createTestComment({ _id: 'l3', content: 'Level 3', parent_id: 'l2' });
      const level2 = createTestComment({ _id: 'l2', content: 'Level 2', parent_id: 'l1' });
      const level1 = createTestComment({ _id: 'l1', content: 'Level 1' });

      const nodes = [
        createCommentNode(level1, [createCommentNode(level2, [createCommentNode(level3)])]),
      ];

      const { container } = renderWithRouter(<CommentThread comments={nodes} />);

      // Should have multiple indentation levels
      const indentedContainers = container.querySelectorAll('.ml-4');
      expect(indentedContainers.length).toBeGreaterThanOrEqual(2);
    });

    it('should not apply indentation to top-level comments', () => {
      const comment = createTestComment({ content: 'Top level' });
      const nodes = [createCommentNode(comment)];

      const { container } = renderWithRouter(<CommentThread comments={nodes} depth={0} />);

      // Top level should not have ml-4 on the root container
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv?.className).not.toContain('ml-4');
    });
  });

  describe('Deleted Comments - Requirement 10.5', () => {
    it('should display deleted comment with preserved structure', () => {
      const reply = createTestComment({
        _id: 'reply1',
        content: 'Reply to deleted',
        parent_id: 'deleted1',
      });
      const deletedComment = createTestComment({
        _id: 'deleted1',
        content: '[deleted]',
        is_deleted: true,
      });

      const nodes = [createCommentNode(deletedComment, [createCommentNode(reply)])];

      renderWithRouter(<CommentThread comments={nodes} />);

      // Deleted comment should show [deleted]
      const deletedTexts = screen.getAllByText('[deleted]');
      expect(deletedTexts.length).toBeGreaterThan(0);

      // Reply should still be visible
      expect(screen.getByText('Reply to deleted')).toBeInTheDocument();
    });

    it('should preserve nested structure when parent is deleted', () => {
      const reply2 = createTestComment({
        _id: 'reply2',
        content: 'Nested reply',
        parent_id: 'reply1',
      });
      const reply1 = createTestComment({
        _id: 'reply1',
        content: '[deleted]',
        is_deleted: true,
        parent_id: 'comment1',
      });
      const comment = createTestComment({
        _id: 'comment1',
        content: 'Top comment',
      });

      const nodes = [
        createCommentNode(comment, [createCommentNode(reply1, [createCommentNode(reply2)])]),
      ];

      renderWithRouter(<CommentThread comments={nodes} />);

      expect(screen.getByText('Top comment')).toBeInTheDocument();
      expect(screen.getByText('Nested reply')).toBeInTheDocument();
    });
  });

  describe('Deep Nesting Handling', () => {
    it('should handle deeply nested comments gracefully', () => {
      // Create 5 levels of nesting
      let currentNode: CommentNode | null = null;
      
      for (let i = 5; i >= 1; i--) {
        const comment = createTestComment({
          _id: `level${i}`,
          content: `Level ${i}`,
          parent_id: i > 1 ? `level${i - 1}` : null,
        });
        
        currentNode = createCommentNode(comment, currentNode ? [currentNode] : []);
      }

      const nodes = currentNode ? [currentNode] : [];

      renderWithRouter(<CommentThread comments={nodes} />);

      // All levels should be rendered
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Level ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Callbacks', () => {
    it('should pass callbacks to CommentItem components', () => {
      const onReply = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onVoteUpdate = vi.fn();

      const comment = createTestComment({ author_id: 'user1' });
      const nodes = [createCommentNode(comment)];

      renderWithRouter(
        <CommentThread
          comments={nodes}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onVoteUpdate={onVoteUpdate}
        />
      );

      // Verify buttons are rendered (callbacks are passed)
      expect(screen.getByText('reply')).toBeInTheDocument();
      expect(screen.getByText('edit')).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('should pass userVotes to CommentItem components', () => {
      const comment = createTestComment({ _id: 'c1', points: 10 });
      const nodes = [createCommentNode(comment)];
      const userVotes = { c1: 1 }; // User has upvoted

      renderWithRouter(<CommentThread comments={nodes} userVotes={userVotes} />);

      // Upvote button should be highlighted
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveClass('text-orange-500');
    });
  });
});
