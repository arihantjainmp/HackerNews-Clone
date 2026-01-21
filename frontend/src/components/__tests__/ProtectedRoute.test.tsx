/**
 * ProtectedRoute Component Tests
 *
 * Tests for the ProtectedRoute component that guards authenticated routes.
 *
 * Requirements:
 * - 11.5: Redirect unauthenticated users to login page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestChild = () => <div>Protected Content</div>;

  const renderProtectedRoute = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestChild />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      // Mock loading state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderProtectedRoute();

      // Check for loading spinner (it has specific classes)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Protected content should not be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('should redirect to login when user is not authenticated', () => {
      // Mock unauthenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderProtectedRoute();

      // Protected content should not be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Should show login page (Navigate component redirects)
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('should render children when user is authenticated', () => {
      // Mock authenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderProtectedRoute();

      // Protected content should be visible
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Login page should not be visible
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('should not display loading spinner when authenticated', () => {
      // Mock authenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderProtectedRoute();

      // Loading spinner should not be present
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });
});
