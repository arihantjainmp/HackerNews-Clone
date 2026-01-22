/**
 * Property-Based Tests for PostList Component - Error Handling
 *
 * These tests validate universal properties of error handling in the PostList component
 * using property-based testing with fast-check.
 *
 * Properties tested:
 * - Property 42: Error Message Display
 *
 * Validates: Requirements 9.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { PostList } from '../PostList';
import * as postApi from '../../services/postApi';

// ============================================================================
// Mocks
// ============================================================================

// Mock the postApi module
vi.mock('../../services/postApi');

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
 * Generate various error messages that might come from the backend
 */
const errorMessageArbitrary = fc.oneof(
  // Network errors
  fc.constant('Network error'),
  fc.constant('Failed to fetch'),
  fc.constant('Connection timeout'),
  fc.constant('ERR_NETWORK'),

  // HTTP errors
  fc.constant('Request failed with status code 500'),
  fc.constant('Request failed with status code 503'),
  fc.constant('Internal Server Error'),
  fc.constant('Service Unavailable'),

  // API errors
  fc.constant('Database connection failed'),
  fc.constant('Invalid request parameters'),
  fc.constant('Rate limit exceeded'),

  // Generic errors
  fc.constant('Something went wrong'),
  fc.constant('An unexpected error occurred'),

  // Custom error messages (arbitrary strings)
  fc.string({ minLength: 5, maxLength: 100 }).filter((s) => s.trim().length >= 5)
);

/**
 * Generate Error objects with various messages
 */
const errorObjectArbitrary = errorMessageArbitrary.map((message) => new Error(message));

// ============================================================================
// Property Tests
// ============================================================================

describe('PostList Property Tests - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: hacker-news-clone, Property 42: Error Message Display
   *
   * For any error response from the backend, the frontend should display
   * a user-friendly error message to the user.
   *
   * Validates: Requirements 9.6
   */
  describe('Property 42: Error Message Display', () => {
    it('should display error message for any backend error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: Error message is displayed
          await waitFor(() => {
            // Should show the "Something went wrong" heading
            const headings = screen.getAllByText(/something went wrong/i);
            expect(headings.length).toBeGreaterThan(0);
          });

          // Verify: The specific error message is displayed
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toContain(error.message);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should display "Try Again" button for any error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          render(<PostList />, { wrapper });

          // Verify: "Try Again" button is displayed
          await waitFor(() => {
            const tryAgainButtons = screen.getAllByRole('button', { name: /try again/i });
            expect(tryAgainButtons.length).toBeGreaterThan(0);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should display error icon for any error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: Error icon (SVG) is displayed
          await waitFor(() => {
            const errorIcons = container.querySelectorAll('.text-red-500 svg');
            expect(errorIcons.length).toBeGreaterThan(0);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should display user-friendly heading for any error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: User-friendly heading is displayed
          await waitFor(() => {
            const headings = container.querySelectorAll('h3');
            const hasErrorHeading = Array.from(headings).some((h) =>
              /oops.*something went wrong/i.test(h.textContent || '')
            );
            expect(hasErrorHeading).toBe(true);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should not display posts list when error occurs', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: Error message is shown
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toMatch(/something went wrong/i);
          });

          // Verify: The posts list container is not present
          const postsList = container.querySelector('.divide-y');
          expect(postsList).not.toBeInTheDocument();

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should display complete error UI structure for any error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with the generated error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: Complete error UI is present
          await waitFor(() => {
            const componentText = container.textContent || '';

            // 1. Error icon
            const errorIcons = container.querySelectorAll('.text-red-500 svg');
            expect(errorIcons.length).toBeGreaterThan(0);

            // 2. Error heading
            expect(componentText).toMatch(/something went wrong/i);

            // 3. Error message
            expect(componentText).toContain(error.message);

            // 4. Try Again button
            const tryAgainButtons = screen.getAllByRole('button', { name: /try again/i });
            expect(tryAgainButtons.length).toBeGreaterThan(0);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should handle non-Error objects gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (errorString) => {
          // Mock API to reject with a non-Error object (string)
          vi.mocked(postApi.getPosts).mockRejectedValue(errorString);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: Fallback error message is displayed
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toMatch(/something went wrong/i);
            // Should show the fallback message since it's not an Error object
            expect(componentText).toMatch(/failed to load posts/i);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });

    it('should preserve error message text exactly as received', async () => {
      await fc.assert(
        fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
          // Create error with specific message
          const error = new Error(errorMessage);

          // Mock API to reject with the error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Verify: The exact error message is displayed (not modified)
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toContain(errorMessage);
          });

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Additional property: Error state isolation
   *
   * Verifies that error state doesn't interfere with other UI elements
   */
  describe('Error State Isolation Property', () => {
    it('should only show error UI when in error state', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Wait for error state
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toMatch(/something went wrong/i);
          });

          // Verify: Loading spinner is NOT displayed
          const spinner = container.querySelector('.animate-spin');
          expect(spinner).not.toBeInTheDocument();

          // Verify: Empty state message is NOT displayed
          expect(screen.queryByText(/no posts found/i)).not.toBeInTheDocument();

          // Verify: Load More button is NOT displayed
          expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Additional property: Error recovery
   *
   * Verifies that the Try Again button is always functional
   */
  describe('Error Recovery Property', () => {
    it('should have clickable Try Again button for any error', async () => {
      await fc.assert(
        fc.asyncProperty(errorObjectArbitrary, async (error) => {
          // Mock API to reject with error
          vi.mocked(postApi.getPosts).mockRejectedValue(error);

          // Render the PostList
          const { container } = render(<PostList />, { wrapper });

          // Wait for error state
          await waitFor(() => {
            const componentText = container.textContent || '';
            expect(componentText).toMatch(/something went wrong/i);
          });

          // Verify: Try Again button is enabled and clickable
          const tryAgainButtons = screen.getAllByRole('button', { name: /try again/i });
          expect(tryAgainButtons.length).toBeGreaterThan(0);

          const tryAgainButton = tryAgainButtons[0];
          expect(tryAgainButton).toBeDefined();
          expect(tryAgainButton).not.toBeDisabled();

          // Verify button has proper styling for interactivity
          if (tryAgainButton) {
            expect(tryAgainButton.className).toContain('bg-orange-500');
            expect(tryAgainButton.className).toContain('hover:bg-orange-600');
          }

          // Cleanup after each property test iteration
          cleanup();
        }),
        { numRuns: 5 }
      );
    });
  });
});
