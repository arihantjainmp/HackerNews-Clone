/**
 * Home Page Component Tests
 *
 * Tests for the Home page component including:
 * - Search debouncing (300ms)
 * - Sort controls
 * - URL parameter updates
 *
 * Requirements: 9.7, 9.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';
import * as postApi from '../../services/postApi';

// Mock the post API
vi.mock('../../services/postApi');

// Mock the auth context
const mockLogout = vi.fn();
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
    logout: mockLogout,
    refreshToken: vi.fn(),
  })),
}));

describe('Home Page - Search Debouncing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getPosts to return empty results
    vi.mocked(postApi.getPosts).mockResolvedValue({
      posts: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
  });

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  };

  describe('Search Debouncing', () => {
    it('should debounce search input with 300ms delay', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type in search input
      fireEvent.change(searchInput, { target: { value: 't' } });

      // Should not trigger search immediately
      expect(postApi.getPosts).toHaveBeenCalledTimes(1); // Initial load only

      // Wait for debounce (300ms + buffer)
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: 't',
        });
      }, { timeout: 500 });
    });

    it('should reset debounce timer on each keystroke', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type characters quickly (within 300ms of each other)
      fireEvent.change(searchInput, { target: { value: 't' } });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fireEvent.change(searchInput, { target: { value: 'te' } });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fireEvent.change(searchInput, { target: { value: 'tes' } });

      // Should still only have initial load at this point
      expect(postApi.getPosts).toHaveBeenCalledTimes(1);

      // Wait for debounce to complete
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: 'tes',
        });
      }, { timeout: 500 });
    });

    it('should only trigger one API call after typing stops', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 't' } });
      fireEvent.change(searchInput, { target: { value: 'te' } });
      fireEvent.change(searchInput, { target: { value: 'tes' } });
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for debounce
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2); // Initial + debounced search
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: 'test',
        });
      }, { timeout: 500 });
    });

    it('should clear search when clear button is clicked', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type in search
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
      }, { timeout: 500 });

      // Click clear button
      const clearButton = screen.getByLabelText(/clear search/i);
      fireEvent.click(clearButton);

      // Should clear input immediately
      expect(searchInput).toHaveValue('');

      // Should trigger search with empty query after debounce
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(3);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: undefined,
        });
      }, { timeout: 500 });
    });

    it('should show clear button only when search input has value', () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Initially no clear button
      expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();

      // Type in search
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Clear button should appear
      expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Clear button should disappear
      expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();
    });

    it('should display active search indicator after debounce', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type in search
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // Indicator should not appear immediately
      expect(screen.queryByText(/searching for:/i)).not.toBeInTheDocument();

      // Wait for debounce - indicator should appear
      await waitFor(() => {
        expect(screen.getByText(/searching for:/i)).toBeInTheDocument();
        expect(screen.getByText('test query')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should handle rapid typing followed by deletion', async () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      // Type quickly
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Wait for first debounce to trigger
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
      }, { timeout: 500 });
      
      // Now delete
      fireEvent.change(searchInput, { target: { value: '' } });

      // Should trigger search with empty query after debounce
      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(3);
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'new',
          q: undefined,
        });
      }, { timeout: 500 });
    });
  });

  describe('Sort Controls', () => {
    it('should render all sort options', () => {
      renderHome();

      expect(screen.getByRole('button', { name: /^new$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^top$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^best$/i })).toBeInTheDocument();
    });

    it('should default to "new" sort', () => {
      renderHome();

      const newButton = screen.getByRole('button', { name: /^new$/i });
      expect(newButton).toHaveClass('bg-orange-500');
    });

    it('should change sort when button is clicked', async () => {
      renderHome();

      const topButton = screen.getByRole('button', { name: /^top$/i });
      fireEvent.click(topButton);

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
          sort: 'top',
          q: undefined,
        });
      });
    });

    it('should highlight active sort button', () => {
      renderHome();

      const topButton = screen.getByRole('button', { name: /^top$/i });
      fireEvent.click(topButton);

      expect(topButton).toHaveClass('bg-orange-500');
    });

    it('should combine sort and search parameters', async () => {
      renderHome();

      // Change sort
      const topButton = screen.getByRole('button', { name: /^top$/i });
      fireEvent.click(topButton);

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenCalledTimes(2);
      });

      // Add search
      const searchInput = screen.getByPlaceholderText(/search posts/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(postApi.getPosts).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          sort: 'top',
          q: 'test',
        });
      }, { timeout: 500 });
    });
  });

  describe('Search Input', () => {
    it('should render search input', () => {
      renderHome();

      expect(screen.getByPlaceholderText(/search posts/i)).toBeInTheDocument();
    });

    it('should update input value as user types', () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(searchInput).toHaveValue('test');
    });

    it('should preserve search input value during typing', () => {
      renderHome();

      const searchInput = screen.getByPlaceholderText(/search posts/i);

      fireEvent.change(searchInput, { target: { value: 't' } });
      expect(searchInput).toHaveValue('t');

      fireEvent.change(searchInput, { target: { value: 'te' } });
      expect(searchInput).toHaveValue('te');

      fireEvent.change(searchInput, { target: { value: 'tes' } });
      expect(searchInput).toHaveValue('tes');

      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput).toHaveValue('test');
    });
  });
});
