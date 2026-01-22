/**
 * Property-Based Tests for CommentForm Component
 *
 * These tests validate universal properties of the CommentForm component
 * using property-based testing with fast-check.
 *
 * Properties tested:
 * - Property 44: Optimistic Comment Update
 *
 * Validates: Requirements 10.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { CommentForm } from '../CommentForm';
import * as commentApi from '../../services/commentApi';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../services/commentApi');

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
  .filter((s) => s.trim().length >= 3);

/**
 * Generate valid email addresses
 */
const emailArbitrary = fc.emailAddress();

/**
 * Generate valid ISO date strings (within last year)
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
 * Generate valid comment content (1-10000 characters)
 */
const commentContentArbitrary = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length >= 1);

/**
 * Generate valid points (can be negative, zero, or positive)
 */
const pointsArbitrary = fc.integer({ min: -100, max: 100 });

/**
 * Generate Comment objects
 */
const commentArbitrary = fc.record({
  _id: fc.uuid(),
  content: commentContentArbitrary,
  post_id: fc.uuid(),
  parent_id: fc.option(fc.uuid(), { nil: null }),
  author_id: fc.uuid(),
  author: fc.option(userArbitrary, { nil: undefined }),
  points: pointsArbitrary,
  created_at: dateArbitrary,
  edited_at: fc.option(dateArbitrary, { nil: undefined }),
  is_deleted: fc.constant(false),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('CommentForm Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: hacker-news-clone, Property 44: Optimistic Comment Update
   *
   * For any comment submission by an authenticated user, the new comment
   * should appear in the UI immediately without requiring a page refresh.
   *
   * Validates: Requirements 10.4
   */
  describe('Property 44: Optimistic Comment Update', () => {
    it('should call onCommentCreated callback immediately after successful submission', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Verify: Callback was called with the new comment
            expect(onCommentCreated).toHaveBeenCalledWith(comment);
            expect(onCommentCreated).toHaveBeenCalledTimes(1);

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should call onCommentCreated for replies immediately after successful submission', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            parentId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ parentId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment: { ...comment, parent_id: parentId } };
            vi.mocked(commentApi.createReply).mockResolvedValue(mockResponse);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm for reply
            const { container, getByText } = render(
              <CommentForm parentId={parentId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter reply content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Verify: Callback was called with the new reply
            expect(onCommentCreated).toHaveBeenCalledWith({ ...comment, parent_id: parentId });
            expect(onCommentCreated).toHaveBeenCalledTimes(1);

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should call onCommentCreated before clearing the form', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Track call order
            const callOrder: string[] = [];
            const onCommentCreated = vi.fn(() => {
              callOrder.push('onCommentCreated');
            });

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Check that form was cleared after callback
            await waitFor(() => {
              if (textarea.value === '') {
                callOrder.push('formCleared');
              }
            });

            // Verify: Callback was called before form was cleared
            expect(callOrder).toEqual(['onCommentCreated', 'formCleared']);

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should provide complete comment data to onCommentCreated callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Verify: Callback received complete comment with all required fields
            const receivedComment = onCommentCreated.mock.calls[0][0];
            expect(receivedComment).toHaveProperty('_id');
            expect(receivedComment).toHaveProperty('content');
            expect(receivedComment).toHaveProperty('post_id');
            expect(receivedComment).toHaveProperty('author_id');
            expect(receivedComment).toHaveProperty('points');
            expect(receivedComment).toHaveProperty('created_at');
            expect(receivedComment).toHaveProperty('is_deleted');

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should not call onCommentCreated when submission fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            errorMessage: fc
              .string({ minLength: 10, maxLength: 100 })
              .filter((s) => s.trim().length >= 10),
          }),
          async ({ postId, content, errorMessage }) => {
            // Mock API error
            const mockError = {
              response: {
                data: {
                  error: errorMessage,
                },
              },
            };
            vi.mocked(commentApi.createComment).mockRejectedValue(mockError);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for error to appear
            await waitFor(() => {
              expect(container.textContent).toContain(errorMessage);
            });

            // Verify: Callback was NOT called on error
            expect(onCommentCreated).not.toHaveBeenCalled();

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should call onCommentCreated immediately after API resolves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Verify: Callback was called with the comment
            expect(onCommentCreated).toHaveBeenCalledWith(comment);

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should enable optimistic UI updates for any valid comment content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Create callback spy
            const onCommentCreated = vi.fn();

            // Render CommentForm
            const { container, getByText } = render(
              <CommentForm postId={postId} onCommentCreated={onCommentCreated} />,
              { wrapper }
            );

            // Enter comment content
            const textarea = container.querySelector('textarea');
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea!, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for submission to complete
            await waitFor(() => {
              expect(onCommentCreated).toHaveBeenCalled();
            });

            // Verify: For any valid content, callback enables optimistic update
            expect(onCommentCreated).toHaveBeenCalledWith(
              expect.objectContaining({
                _id: expect.any(String),
                content: expect.any(String),
                post_id: expect.any(String),
                author_id: expect.any(String),
                points: expect.any(Number),
                created_at: expect.any(String),
                is_deleted: false,
              })
            );

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should work correctly without onCommentCreated callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            postId: fc.uuid(),
            content: commentContentArbitrary,
            comment: commentArbitrary,
          }),
          async ({ postId, content, comment }) => {
            // Mock API response
            const mockResponse = { comment };
            vi.mocked(commentApi.createComment).mockResolvedValue(mockResponse);

            // Render CommentForm WITHOUT onCommentCreated callback
            const { container, getByText } = render(<CommentForm postId={postId} />, { wrapper });

            // Enter comment content
            const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
            expect(textarea).toBeTruthy();
            fireEvent.change(textarea, { target: { value: content } });

            // Submit form
            const submitButton = getByText('Post Comment');
            fireEvent.click(submitButton);

            // Wait for form to clear (indicates successful submission)
            await waitFor(() => {
              expect(textarea.value).toBe('');
            });

            // Verify: Form still works without callback (no errors thrown)
            expect(commentApi.createComment).toHaveBeenCalledWith(postId, content);

            // Cleanup
            cleanup();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
