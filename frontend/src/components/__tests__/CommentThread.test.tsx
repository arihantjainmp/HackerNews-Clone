/**
 * CommentThread Component Tests
 *
 * Tests for the CommentThread recursive component functionality
 * Requirements: 10.1, 10.2, 22.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      // Create 3 levels of nesting (within the collapse threshold)
      let currentNode: CommentNode | null = null;
      
      for (let i = 3; i >= 1; i--) {
        const comment = createTestComment({
          _id: `level${i}`,
          content: `Level ${i}`,
          parent_id: i > 1 ? `level${i - 1}` : null,
        });
        
        currentNode = createCommentNode(comment, currentNode ? [currentNode] : []);
      }

      const nodes = currentNode ? [currentNode] : [];

      renderWithRouter(<CommentThread comments={nodes} />);

      // All 3 levels should be rendered (within collapse threshold)
      for (let i = 1; i <= 3; i++) {
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

  describe('Pagination - Requirement 22.2', () => {
    it('should initially show only first 5 comments when there are more than 5', () => {
      // Create 10 comments
      const nodes = Array.from({ length: 10 }, (_, i) =>
        createCommentNode(
          createTestComment({
            _id: `comment${i}`,
            content: `Comment ${i}`,
          })
        )
      );

      renderWithRouter(<CommentThread comments={nodes} />);

      // First 5 should be visible
      for (let i = 0; i < 5; i++) {
        expect(screen.getByText(`Comment ${i}`)).toBeInTheDocument();
      }

      // Comments 5-9 should not be visible initially
      for (let i = 5; i < 10; i++) {
        expect(screen.queryByText(`Comment ${i}`)).not.toBeInTheDocument();
      }

      // Load more button should be visible
      expect(screen.getByText(/Load.*more comments/)).toBeInTheDocument();
    });

    it('should load more comments when "Load more" button is clicked', async () => {
      // Create 15 comments
      const nodes = Array.from({ length: 15 }, (_, i) =>
        createCommentNode(
          createTestComment({
            _id: `comment${i}`,
            content: `Comment ${i}`,
          })
        )
      );

      renderWithRouter(<CommentThread comments={nodes} />);

      // Initially only 5 visible
      expect(screen.getByText('Comment 0')).toBeInTheDocument();
      expect(screen.queryByText('Comment 5')).not.toBeInTheDocument();

      // Click load more
      const loadMoreButton = screen.getByText(/Load.*more comments/);
      fireEvent.click(loadMoreButton);

      // Now 15 comments should be visible (5 + 10)
      await waitFor(() => {
        expect(screen.getByText('Comment 5')).toBeInTheDocument();
        expect(screen.getByText('Comment 14')).toBeInTheDocument();
      });

      // Load more button should not be visible anymore
      expect(screen.queryByText(/Load.*more comments/)).not.toBeInTheDocument();
    });

    it('should not show "Load more" button when there are 5 or fewer comments', () => {
      // Create 3 comments
      const nodes = Array.from({ length: 3 }, (_, i) =>
        createCommentNode(
          createTestComment({
            _id: `comment${i}`,
            content: `Comment ${i}`,
          })
        )
      );

      renderWithRouter(<CommentThread comments={nodes} />);

      // All comments should be visible
      expect(screen.getByText('Comment 0')).toBeInTheDocument();
      expect(screen.getByText('Comment 1')).toBeInTheDocument();
      expect(screen.getByText('Comment 2')).toBeInTheDocument();

      // Load more button should not be visible
      expect(screen.queryByText(/Load.*more comments/)).not.toBeInTheDocument();
    });

    it('should show correct count in "Load more" button', () => {
      // Create 8 comments (5 visible, 3 remaining)
      const nodes = Array.from({ length: 8 }, (_, i) =>
        createCommentNode(
          createTestComment({
            _id: `comment${i}`,
            content: `Comment ${i}`,
          })
        )
      );

      renderWithRouter(<CommentThread comments={nodes} />);

      // Should show "Load 3 more comments"
      expect(screen.getByText('Load 3 more comments...')).toBeInTheDocument();
    });
  });

  describe('Deep Nesting Optimization - Requirement 22.2', () => {
    it('should show "Continue thread" link for deeply nested comments (depth >= 3)', () => {
      // Create 5 levels of nesting (depths 0-4)
      // At depth 3, we should show "Continue thread"
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

      // First 3 levels should be visible (depths 0-2)
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByText(`Level ${i}`)).toBeInTheDocument();
      }

      // Levels 4 and 5 should not be visible initially (depths 3-4)
      expect(screen.queryByText('Level 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Level 5')).not.toBeInTheDocument();

      // "Continue thread" link should be visible
      expect(screen.getByText(/Continue thread/)).toBeInTheDocument();
    });

    it('should expand deeply nested thread when "Continue thread" is clicked', async () => {
      // Create 6 levels of nesting (depths 0-5)
      let currentNode: CommentNode | null = null;

      for (let i = 6; i >= 1; i--) {
        const comment = createTestComment({
          _id: `level${i}`,
          content: `Level ${i}`,
          parent_id: i > 1 ? `level${i - 1}` : null,
        });

        currentNode = createCommentNode(comment, currentNode ? [currentNode] : []);
      }

      const nodes = currentNode ? [currentNode] : [];

      renderWithRouter(<CommentThread comments={nodes} />);

      // Levels 4, 5, 6 should not be visible initially (depths 3-5)
      expect(screen.queryByText('Level 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Level 5')).not.toBeInTheDocument();
      expect(screen.queryByText('Level 6')).not.toBeInTheDocument();

      // Click "Continue thread"
      const continueButton = screen.getByText(/Continue thread/);
      fireEvent.click(continueButton);

      // Now levels 4, 5, 6 should be visible
      await waitFor(() => {
        expect(screen.getByText('Level 4')).toBeInTheDocument();
        expect(screen.getByText('Level 5')).toBeInTheDocument();
        expect(screen.getByText('Level 6')).toBeInTheDocument();
      });
    });

    it('should show correct reply count in "Continue thread" link', () => {
      // Create a comment at depth 8 with 3 replies
      const reply3 = createTestComment({ _id: 'r3', content: 'Reply 3', parent_id: 'level8' });
      const reply2 = createTestComment({ _id: 'r2', content: 'Reply 2', parent_id: 'level8' });
      const reply1 = createTestComment({ _id: 'r1', content: 'Reply 1', parent_id: 'level8' });

      // Create 8 levels of nesting
      let currentNode: CommentNode = createCommentNode(
        createTestComment({ _id: 'level3', content: 'Level 3' }),
        [createCommentNode(reply1), createCommentNode(reply2), createCommentNode(reply3)]
      );

      for (let i = 2; i >= 1; i--) {
        const comment = createTestComment({
          _id: `level${i}`,
          content: `Level ${i}`,
          parent_id: i > 1 ? `level${i - 1}` : null,
        });

        currentNode = createCommentNode(comment, [currentNode]);
      }

      const nodes = [currentNode];

      renderWithRouter(<CommentThread comments={nodes} />);

      // Should show "Continue thread (3 replies)"
      expect(screen.getByText('Continue thread (3 replies)')).toBeInTheDocument();
    });

    it('should handle singular "reply" text correctly', () => {
      // Create a comment at depth 3 with 1 reply
      const reply = createTestComment({ _id: 'r1', content: 'Reply 1', parent_id: 'level3' });

      // Create 3 levels of nesting
      let currentNode: CommentNode = createCommentNode(
        createTestComment({ _id: 'level3', content: 'Level 3' }),
        [createCommentNode(reply)]
      );

      for (let i = 2; i >= 1; i--) {
        const comment = createTestComment({
          _id: `level${i}`,
          content: `Level ${i}`,
          parent_id: i > 1 ? `level${i - 1}` : null,
        });

        currentNode = createCommentNode(comment, [currentNode]);
      }

      const nodes = [currentNode];

      renderWithRouter(<CommentThread comments={nodes} />);

      // Should show "Continue thread (1 reply)" not "replies"
      expect(screen.getByText('Continue thread (1 reply)')).toBeInTheDocument();
    });
  });
});
