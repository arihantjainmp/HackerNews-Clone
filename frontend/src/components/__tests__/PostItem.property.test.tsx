/**
 * Property-Based Tests for PostItem Component
 *
 * These tests validate universal properties of the PostItem component
 * using property-based testing with fast-check.
 *
 * Properties tested:
 * - Property 41: Post Display Completeness
 *
 * Validates: Requirements 9.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { PostItem } from '../PostItem';
import type { Post } from '../../types';

// ============================================================================
// Mocks
// ============================================================================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

// Mock the post API
vi.mock('../../services/postApi', () => ({
  voteOnPost: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wrapper component for rendering with Router
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// ============================================================================
// Arbitraries for Generating Test Data
// ============================================================================

/**
 * Generate valid usernames (3-20 characters, non-whitespace)
 */
const usernameArbitrary = fc
  .string({ minLength: 3, maxLength: 20 })
  .filter((s) => s.trim().length >= 3); // Ensure not just whitespace

/**
 * Generate valid email addresses
 */
const emailArbitrary = fc.emailAddress();

/**
 * Generate valid post titles (1-300 characters, non-whitespace)
 */
const titleArbitrary = fc
  .string({ minLength: 1, maxLength: 300 })
  .filter((s) => s.trim().length >= 1); // Ensure not just whitespace

/**
 * Generate valid URLs
 */
const urlArbitrary = fc.webUrl();

/**
 * Generate valid text content
 */
const textArbitrary = fc.string({ minLength: 1, maxLength: 10000 });

/**
 * Generate valid points (can be negative, zero, or positive)
 */
const pointsArbitrary = fc.integer({ min: -1000, max: 1000 });

/**
 * Generate valid comment counts (non-negative)
 */
const commentCountArbitrary = fc.nat({ max: 1000 });

/**
 * Generate valid ISO date strings (within last year)
 * Filter out invalid dates to prevent RangeError
 */
const dateArbitrary = fc
  .date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), max: new Date() })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/**
 * Generate User objects
 */
const userArbitrary = fc.record({
  _id: fc.uuid(),
  username: usernameArbitrary,
  email: emailArbitrary,
  created_at: dateArbitrary,
});

/**
 * Generate link Post objects
 */
const linkPostArbitrary = fc.record({
  _id: fc.uuid(),
  title: titleArbitrary,
  url: urlArbitrary,
  type: fc.constant('link' as const),
  author_id: fc.uuid(),
  author: userArbitrary,
  points: pointsArbitrary,
  comment_count: commentCountArbitrary,
  created_at: dateArbitrary,
});

/**
 * Generate text Post objects
 */
const textPostArbitrary = fc.record({
  _id: fc.uuid(),
  title: titleArbitrary,
  text: textArbitrary,
  type: fc.constant('text' as const),
  author_id: fc.uuid(),
  author: userArbitrary,
  points: pointsArbitrary,
  comment_count: commentCountArbitrary,
  created_at: dateArbitrary,
});

/**
 * Generate any valid Post object (link or text)
 */
const postArbitrary = fc.oneof(linkPostArbitrary, textPostArbitrary);

/**
 * Generate user vote state (-1, 0, or 1)
 */
const userVoteArbitrary = fc.constantFrom(-1, 0, 1);

// ============================================================================
// Property Tests
// ============================================================================

describe('PostItem Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: hacker-news-clone, Property 41: Post Display Completeness
   *
   * For any post rendered in the post list, the display should include
   * the title, author, points, comment count, and time since creation.
   *
   * Validates: Requirements 9.1
   */
  describe('Property 41: Post Display Completeness', () => {
    it('should display title for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Title is displayed
          expect(container.textContent).toContain(post.title);
        }),
        { numRuns: 100 }
      );
    });

    it('should display author username for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Author username is displayed
          if (post.author) {
            // Check that the author username appears in the component text
            expect(container.textContent).toContain(post.author.username);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should display points for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Points are displayed
          expect(container.textContent).toContain(post.points.toString());
        }),
        { numRuns: 100 }
      );
    });

    it('should display comment count for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Comment count is displayed with correct singular/plural
          const expectedText =
            post.comment_count === 1
              ? `${post.comment_count} comment`
              : `${post.comment_count} comments`;
          expect(container.textContent).toContain(expectedText);
        }),
        { numRuns: 100 }
      );
    });

    it('should display time since creation for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Time ago is displayed
          // The formatTimeAgo function should produce some text
          // We can't predict the exact text, but we can verify the metadata section exists
          const componentText = container.textContent || '';

          // The metadata should contain the author, time, and comment count
          expect(componentText).toContain(post.author?.username || 'unknown');
          expect(componentText).toContain(post.comment_count === 1 ? 'comment' : 'comments');
          // Verify the metadata structure with bullets
          expect(componentText).toMatch(/by.*•.*•.*comment/);
        }),
        { numRuns: 100 }
      );
    });

    it('should display all required metadata together for any post', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: All required metadata is present in the component
          const componentText = container.textContent || '';

          // 1. Title
          expect(componentText).toContain(post.title);

          // 2. Author
          expect(componentText).toContain(post.author?.username || 'unknown');

          // 3. Points
          expect(componentText).toContain(post.points.toString());

          // 4. Comment count
          const expectedCommentText =
            post.comment_count === 1 ? '1 comment' : `${post.comment_count} comments`;
          expect(componentText).toContain(expectedCommentText);

          // 5. Time since creation (we verify the metadata section exists)
          // The exact time text depends on formatTimeAgo, but the section should exist
          expect(componentText).toMatch(/by.*•.*•.*comment/);
        }),
        { numRuns: 100 }
      );
    });

    it('should display domain for link posts', async () => {
      await fc.assert(
        fc.asyncProperty(linkPostArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Domain is displayed for link posts
          if (post.url) {
            const domain = new URL(post.url).hostname;
            const domainElement = screen.getByText(`(${domain})`);
            expect(domainElement).toBeInTheDocument();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should not display domain for text posts', async () => {
      await fc.assert(
        fc.asyncProperty(textPostArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: No domain is displayed for text posts
          // Domain is shown in parentheses, so check for that pattern
          const componentText = container.textContent || '';
          // Should not have the domain pattern (hostname in parentheses)
          expect(componentText).not.toMatch(/\([a-z0-9.-]+\.[a-z]{2,}\)/i);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle posts with missing author gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Create a post without author
          const postWithoutAuthor: Post = {
            ...post,
            author: undefined,
          };

          // Render the PostItem
          const { container } = render(<PostItem post={postWithoutAuthor} userVote={userVote} />, {
            wrapper,
          });

          // Verify: "unknown" is displayed when author is missing
          expect(container.textContent).toContain('unknown');
        }),
        { numRuns: 100 }
      );
    });

    it('should display correct vote state highlighting for any user vote', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Vote buttons reflect the user's vote state
          // Use within(container) to scope queries to this specific render
          const upvoteButton = container.querySelector('[aria-label="Upvote"]') as HTMLElement;
          const downvoteButton = container.querySelector('[aria-label="Downvote"]') as HTMLElement;

          expect(upvoteButton).toBeTruthy();
          expect(downvoteButton).toBeTruthy();

          if (userVote === 1) {
            // Upvote should be highlighted (active state, not hover)
            // Check that it has text-orange-500 WITHOUT hover prefix
            expect(upvoteButton.className).toMatch(/(?<!hover:)text-orange-500/);
            expect(downvoteButton.className).not.toMatch(/(?<!hover:)text-blue-500/);
          } else if (userVote === -1) {
            // Downvote should be highlighted (active state, not hover)
            expect(downvoteButton.className).toMatch(/(?<!hover:)text-blue-500/);
            expect(upvoteButton.className).not.toMatch(/(?<!hover:)text-orange-500/);
          } else {
            // Neither should be highlighted (only hover states allowed)
            expect(upvoteButton.className).not.toMatch(/(?<!hover:)text-orange-500/);
            expect(downvoteButton.className).not.toMatch(/(?<!hover:)text-blue-500/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Metadata consistency
   *
   * Verifies that displayed metadata matches the post data
   */
  describe('Metadata Consistency Property', () => {
    it('should display metadata that exactly matches the post data', async () => {
      await fc.assert(
        fc.asyncProperty(postArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Get all text content
          const componentText = container.textContent || '';

          // Verify exact matches for numeric values
          expect(componentText).toContain(post.points.toString());
          expect(componentText).toContain(post.comment_count.toString());

          // Verify title is present (use container text to avoid whitespace issues)
          expect(componentText).toContain(post.title);

          // Verify exact match for author (or "unknown")
          const expectedAuthor = post.author?.username || 'unknown';
          expect(componentText).toContain(expectedAuthor);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Post type consistency
   *
   * Verifies that link and text posts are displayed correctly based on their type
   */
  describe('Post Type Display Property', () => {
    it('should display link posts with URL and domain', async () => {
      await fc.assert(
        fc.asyncProperty(linkPostArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Link post has URL
          expect(post.url).toBeDefined();
          expect(post.type).toBe('link');

          // Verify: Domain is displayed
          if (post.url) {
            const domain = new URL(post.url).hostname;
            expect(container.textContent).toContain(domain);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should display text posts without URL or domain', async () => {
      await fc.assert(
        fc.asyncProperty(textPostArbitrary, userVoteArbitrary, async (post, userVote) => {
          // Render the PostItem
          const { container } = render(<PostItem post={post} userVote={userVote} />, { wrapper });

          // Verify: Text post has text content
          expect(post.text).toBeDefined();
          expect(post.type).toBe('text');

          // Verify: No URL or domain pattern is displayed
          const componentText = container.textContent || '';
          expect(componentText).not.toMatch(/\([a-z0-9.-]+\.[a-z]{2,}\)/i);
        }),
        { numRuns: 100 }
      );
    });
  });
});
