/**
 * CreatePost Page Component Tests
 *
 * Tests for the CreatePost page component including:
 * - Form validation (title, URL, text)
 * - Post type toggle
 * - Submission handling
 * - Error display
 * - Loading states
 *
 * Requirements: 3.1, 3.2, 3.3, 3.7, 3.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreatePost from '../CreatePost';
import * as postApi from '../../services/postApi';

// Mock the post API
vi.mock('../../services/postApi');

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CreatePost Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCreatePost = () => {
    return render(
      <MemoryRouter>
        <CreatePost />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render form with title field', () => {
      renderCreatePost();

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('should render post type toggle buttons', () => {
      renderCreatePost();

      expect(screen.getByRole('button', { name: /^link$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^text$/i })).toBeInTheDocument();
    });

    it('should default to link post type', () => {
      renderCreatePost();

      const linkButton = screen.getByRole('button', { name: /^link$/i });
      expect(linkButton).toHaveClass('bg-orange-500');
    });

    it('should show URL field for link posts', () => {
      renderCreatePost();

      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });

    it('should show text field when text post type is selected', () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      expect(screen.getByLabelText(/^text/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderCreatePost();

      expect(screen.getByRole('button', { name: /submit post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Post Type Toggle', () => {
    it('should switch to text post type when text button is clicked', () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      expect(textButton).toHaveClass('bg-orange-500');
      expect(screen.getByLabelText(/^text/i)).toBeInTheDocument();
    });

    it('should clear URL field when switching to text post', () => {
      renderCreatePost();

      const urlInput = screen.getByLabelText(/url/i);
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      // Switch back to link
      const linkButton = screen.getByRole('button', { name: /^link$/i });
      fireEvent.click(linkButton);

      expect(screen.getByLabelText(/url/i)).toHaveValue('');
    });

    it('should clear text field when switching to link post', () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const textInput = screen.getByLabelText(/^text/i);
      fireEvent.change(textInput, { target: { value: 'Some text content' } });

      const linkButton = screen.getByRole('button', { name: /^link$/i });
      fireEvent.click(linkButton);

      // Switch back to text
      fireEvent.click(textButton);

      expect(screen.getByLabelText(/^text/i)).toHaveValue('');
    });
  });

  describe('Form Validation - Title', () => {
    it('should show error when title is empty', async () => {
      renderCreatePost();

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show error when title is only whitespace', async () => {
      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: '   ' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show error when title exceeds 300 characters', async () => {
      renderCreatePost();

      const longTitle = 'a'.repeat(301);
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: longTitle } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title must be at most 300 characters/i)).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show character count for title', () => {
      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Test' } });

      expect(screen.getByText('4/300 characters')).toBeInTheDocument();
    });
  });

  describe('Form Validation - Link Post', () => {
    it('should show error when URL is empty for link post', async () => {
      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/url is required for link posts/i)).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show error when URL format is invalid', async () => {
      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'not-a-url' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid url \(must start with http/i)
        ).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should accept valid http URL', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post1',
          title: 'Test Title',
          type: 'link',
          url: 'http://example.com',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'http://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(postApi.createPost).toHaveBeenCalledWith('Test Title', 'http://example.com', undefined);
      });
    });

    it('should accept valid https URL', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post1',
          title: 'Test Title',
          type: 'link',
          url: 'https://example.com',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(postApi.createPost).toHaveBeenCalledWith('Test Title', 'https://example.com', undefined);
      });
    });
  });

  describe('Form Validation - Text Post', () => {
    it('should show error when text is empty for text post', async () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/text content is required for text posts/i)).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show error when text exceeds 10000 characters', async () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const longText = 'a'.repeat(10001);
      const titleInput = screen.getByLabelText(/title/i);
      const textInput = screen.getByLabelText(/^text/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(textInput, { target: { value: longText } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/text content must be at most 10000 characters/i)
        ).toBeInTheDocument();
      });

      expect(postApi.createPost).not.toHaveBeenCalled();
    });

    it('should show character count for text', () => {
      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const textInput = screen.getByLabelText(/^text/i);
      fireEvent.change(textInput, { target: { value: 'Test content' } });

      expect(screen.getByText('12/10000 characters')).toBeInTheDocument();
    });

    it('should accept valid text post', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post1',
          title: 'Test Title',
          type: 'text',
          text: 'Test content',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const titleInput = screen.getByLabelText(/title/i);
      const textInput = screen.getByLabelText(/^text/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(textInput, { target: { value: 'Test content' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(postApi.createPost).toHaveBeenCalledWith('Test Title', undefined, 'Test content');
      });
    });
  });

  describe('Form Submission', () => {
    it('should create link post and redirect on success', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post1',
          title: 'Test Title',
          type: 'link',
          url: 'https://example.com',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/posts/post1');
      });
    });

    it('should create text post and redirect on success', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post2',
          title: 'Test Title',
          type: 'text',
          text: 'Test content',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const textButton = screen.getByRole('button', { name: /^text$/i });
      fireEvent.click(textButton);

      const titleInput = screen.getByLabelText(/title/i);
      const textInput = screen.getByLabelText(/^text/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(textInput, { target: { value: 'Test content' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/posts/post2');
      });
    });

    it('should trim whitespace from inputs before submission', async () => {
      vi.mocked(postApi.createPost).mockResolvedValue({
        post: {
          _id: 'post1',
          title: 'Test Title',
          type: 'link',
          url: 'https://example.com',
          author_id: 'user1',
          points: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
        },
      });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: '  Test Title  ' } });
      fireEvent.change(urlInput, { target: { value: '  https://example.com  ' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(postApi.createPost).toHaveBeenCalledWith('Test Title', 'https://example.com', undefined);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      vi.mocked(postApi.createPost).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          post: {
            _id: 'post1',
            title: 'Test Title',
            type: 'link',
            url: 'https://example.com',
            author_id: 'user1',
            points: 0,
            comment_count: 0,
            created_at: new Date().toISOString(),
          },
        }), 100))
      );

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submitting\.\.\./i)).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      vi.mocked(postApi.createPost).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          post: {
            _id: 'post1',
            title: 'Test Title',
            type: 'link',
            url: 'https://example.com',
            author_id: 'user1',
            points: 0,
            comment_count: 0,
            created_at: new Date().toISOString(),
          },
        }), 100))
      );

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(titleInput).toBeDisabled();
        expect(urlInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });

    it('should prevent double submission', async () => {
      vi.mocked(postApi.createPost).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          post: {
            _id: 'post1',
            title: 'Test Title',
            type: 'link',
            url: 'https://example.com',
            author_id: 'user1',
            points: 0,
            comment_count: 0,
            created_at: new Date().toISOString(),
          },
        }), 100))
      );

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      
      // Click multiple times
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      }, { timeout: 200 });

      // API should only be called once despite multiple clicks
      expect(postApi.createPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display server error message on submission failure', async () => {
      vi.mocked(postApi.createPost).mockRejectedValue({
        response: { data: { error: 'Post creation failed' } },
      });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Post creation failed')).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no response', async () => {
      vi.mocked(postApi.createPost).mockRejectedValue(new Error('Network error'));

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display fallback error message when error has no message', async () => {
      vi.mocked(postApi.createPost).mockRejectedValue({});

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create post\. please try again\./i)).toBeInTheDocument();
      });
    });

    it('should clear server error when submitting again', async () => {
      vi.mocked(postApi.createPost)
        .mockRejectedValueOnce({
          response: { data: { error: 'Post creation failed' } },
        })
        .mockResolvedValueOnce({
          post: {
            _id: 'post1',
            title: 'Test Title',
            type: 'link',
            url: 'https://example.com',
            author_id: 'user1',
            points: 0,
            comment_count: 0,
            created_at: new Date().toISOString(),
          },
        });

      renderCreatePost();

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/url/i);

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit post/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Post creation failed')).toBeInTheDocument();
      });

      // Submit again
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Post creation failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cancel Button', () => {
    it('should navigate to home when cancel is clicked', () => {
      renderCreatePost();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
